# Vertrag: Edge Function `tmdb-proxy` — Action `refresh_movie` + EN-Titel-Fallback

Stand: 2026-10-10 (vom Nutzer freigegebenes Design). Dieser Vertrag ist stabil; Aenderungen nur mit Hinweis im Bericht.

## Transport / Auth

- `POST https://<ref>.supabase.co/functions/v1/tmdb-proxy`, Body JSON `{ "kind": "...", ... }` (wie alle Actions; Feld heisst `kind`, camelCase fuer Parameter).
- Das Gateway prueft das JWT (`verify_jwt` = Default `true`, `supabase/config.toml` hat keinen Eintrag fuer `tmdb-proxy`). Header: `Authorization: Bearer <token>` (+ `apikey`).
- Bisherige Actions: unveraendert, jedes gueltige JWT (anon/authenticated/service_role) wird akzeptiert; die Function selbst prueft keine Rolle.
- `refresh_movie` ist **nur mit Service-Role-Token** erlaubt (Bearer == `SUPABASE_SERVICE_ROLE_KEY` oder JWT-Claim `role = service_role`; Signatur hat das Gateway bereits geprueft). Normale Nutzer-JWTs bekommen `403`. Grund: Massen-Schreibzugriff auf den globalen Filmkatalog.

## Action `refresh_movie`

Request:

```json
{ "kind": "refresh_movie", "tmdbId": 603, "fillGapsOnly": true }
```

- `tmdbId` (number, Pflicht, ganze Zahl > 0).
- `fillGapsOnly` (boolean, optional, Default `true`). `true`: nur leere Felder fuellen. `false` ("force"): Felder mit vorhandenen TMDB-Werten ueberschreiben (TMDB-Wert fehlt/leer => bestehender Wert bleibt, es wird nie auf NULL gesetzt).

Verhalten:

1. Zeile in `movies` per `tmdb_id` suchen. Nicht vorhanden => `404 movie_not_found`, es wird **nichts** angelegt.
2. TMDB abrufen: Details de-DE, Details en-US, Credits, deutsche Release-Dates (wie `details`/`credits`/`release_dates`).
3. Felder (Spalte <- TMDB):
   - `release_date` <- DE-Release-Date, sonst globales `release_date` (gleiche Prioritaet wie `upsert_movie`)
   - `overview` <- de-DE overview (leer => en-US overview)
   - `runtime` <- details.runtime (0/null zaehlt als "kein Wert")
   - `director`, `director_id` <- erster Crew-Eintrag mit job "Director" (je Feld einzeln gefuellt)
   - `vote_average` <- details.vote_average
   - `poster` <- poster_path
   - Genres: `genres` (Zeile je `tmdb_genre_id` bei Bedarf anlegen) + `movie_genres`-Links. Nur Links ergaenzen, nie loeschen. Bei `fillGapsOnly=true` nur wenn der Film noch **keine** Links hat; bei `false` fehlende Links ergaenzen.
   - "Leer" = `NULL`, leerer/Whitespace-String.
4. Titel `movies.name` (Sonderregel, gilt auch bei `fillGapsOnly=true`):
   - Deutscher Titel, wenn TMDB eine echte deutsche Uebersetzung hat; sonst englischer Titel; sonst bestehender Name bleibt.
   - "Echt" = Titel nicht leer UND (`title != original_title` ODER `original_language == "de"` bzw. `"en"` fuer die englische Stufe). Bekanntes TMDB-Verhalten: fehlt die Uebersetzung, liefert TMDB bei `language=de-DE` den **Originaltitel** (`title == original_title`); daran erkennt man "nicht uebersetzt" (gleiche Logik wie die bestehende Suche).
   - Der Name wird nur geschrieben, wenn er sich vom aktuellen Wert unterscheidet.
5. Idempotent: zweiter Aufruf ohne TMDB-Aenderung => `status: "unchanged"`, keine Schreibzugriffe.

Response `200`:

```json
{
  "data": {
    "status": "updated",
    "movieId": "b1c2...-uuid",
    "tmdbId": 603,
    "updatedFields": ["name", "overview", "runtime", "genres"],
    "titleSource": "de"
  }
}
```

- `status`: `"updated"` | `"unchanged"`.
- `updatedFields`: Teilmenge von `name, release_date, overview, runtime, director, director_id, vote_average, poster, genres` (leer bei `unchanged`).
- `titleSource`: `"de"` | `"en"` | `"kept"` (welcher Titel in die Regel gefallen ist; `kept` = weder DE noch EN uebersetzt, Name unveraendert).

Fehler (Form wie bisher `{ "error": "<Text>" }`, plus `code`):

| HTTP | `code` | Bedeutung |
|---|---|---|
| 400 | – | `tmdbId` fehlt/ungueltig, `fillGapsOnly` nicht boolean |
| 403 | `forbidden` | Token ist kein Service-Role-Token |
| 404 | `movie_not_found` | keine `movies`-Zeile mit diesem `tmdb_id` |
| 404 | `tmdb_not_found` | TMDB kennt die ID nicht (HTTP 404 von TMDB) |
| 405 | – | nicht POST |
| 500 | – | sonstiger Fehler (`{"error":"Internal error"}`) |

Beispiel (Service-Role, curl, Key aus Umgebung, nie im Repo):

```bash
curl -sS -X POST "https://vketnadfeyovguikpaao.supabase.co/functions/v1/tmdb-proxy" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"kind":"refresh_movie","tmdbId":603}'
```

## EN-Fallback in `details` (und damit `upsert_movie` fuer neue Zeilen)

- `details.title` = deutscher Titel (de-DE), wenn echt uebersetzt; sonst englischer Titel (en-US), wenn echt (oder Originalsprache en); sonst Originaltitel (TMDB-Fallback).
- Der zweite Request (en-US) erfolgt nur, wenn der deutsche Titel nicht echt ist. Schlaegt er fehl, wird still auf den Originaltitel zurueckgefallen.
- Antwortform unveraendert (`NormalizedMovieDetails`, gleiche Felder). Nur der Wert von `title` kann sich aendern.
- `details` ist cache-aside ohne TTL: bereits gecachte Eintraege behalten ihren alten Titel.
