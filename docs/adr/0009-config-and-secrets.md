# 0009 — Konfiguration und Secrets-Handling

**Status:** Entschieden (2026-09-19)

## Kontext

Das alte `filmkritiker`-Repo nutzt eine klassische `.env`-Datei (lokal gitignored, `.env.example` committed als Vorlage) für Konfigurationswerte. Für das neue Repo musste entschieden werden, wie lokale Entwicklungskonfiguration (Supabase-URL/-Key, Sentry-DSN) sowie echte Secrets (Supabase Service-Role-Key, TMDB/Trakt-API-Keys) gehandhabt werden — insbesondere, ob dasselbe `.env`-Muster übernommen wird oder ob Expo-eigene Mechanismen genutzt werden.

## Entscheidung

**Keine `.env`-Dateien im Projekt** — bewusst ersetzt durch `app.config.ts` + Expo's `extra`-Feld + `expo-constants`.

`app.config.ts` ist eine normale, committete TypeScript-Quelldatei (offizielles, unterstütztes Expo-Pattern) mit einem `extra: {...}`-Block, der zur Laufzeit über `expo-constants` gelesen wird. Dev- vs. Prod-Wertumschaltung erfolgt weiterhin pro EAS-Build-Profil, nur eben ohne irgendeine `.env*`-Datei im Repo.

Betroffen sind ausschließlich die **nicht-geheimen** lokalen Entwicklungswerte: Supabase-Dev-URL, Supabase-Publishable-Key, Sentry-DSN.

**Echte Secrets** (Supabase Service-Role-Key, TMDB/Trakt-API-Keys) laufen **niemals** über diesen `app.config.ts`/`extra`-Mechanismus. Sie leben ausschließlich in:
- **Supabase Edge Function Secrets** (`supabase secrets set`) — für Edge-Function-seitige Env-Vars wie TMDB/Trakt-Keys.
- **GitHub Actions Secrets** — für CI.
- **EAS Secrets** (`eas secret:create`) — für Build-Zeit-Secrets.

Kein zusätzliches Tool wie Vault — das wäre Over-Engineering für die Projektgröße.

Die TMDB/Trakt-API-Keys werden von den bereits existierenden Keys aus dem alten `filmkritiker`-`.env` wiederverwendet; Robin platziert sie selbst in die Supabase-Edge-Function-Secrets.

## Begründung

- Alle lokalen Dev-Zeit-Werte (Supabase-Dev-URL, Publishable-Key, Sentry-DSN) sind **by design nicht geheim** (bereits vorher bestätigt) — es gibt also kein echtes lokales Secret zu schützen. Eine wörtlich `.env` genannte Datei erzeugte in der Praxis nur unnötige Reibung (manuelles Copy-Paste bei jedem frischen Clone/Rechner) für keinen echten Sicherheitsgewinn.
- Zusätzliches Risiko einer `.env`-Datei: sie normalisiert die Gewohnheit "leg einfach was in `.env`", was irgendwann ein echtes Secret dort landen lassen könnte. Der bewusste Verzicht auf `.env` insgesamt vermeidet dieses schleichende Risiko strukturell.
- `app.config.ts` + `extra` ist ein offiziell unterstütztes, idiomatisches Expo-Pattern — kein Custom-Hack.
- Echte Secrets gehören grundsätzlich nie in den App-Bundle-/EAS-Kontext, sondern ausschließlich serverseitig in Supabase Edge Function Secrets — das ist unabhängig von der `.env`-Frage eine harte Grundregel.

## Konsequenzen

- Es gibt kein `.env.example` und keine `.env`-Datei in diesem Repo — abweichend vom Muster des alten `filmkritiker`-Repos.
- `.gitignore` enthält dennoch vorsorglich einen `.env*`-Eintrag als Sicherheitsnetz, auch wenn laut dieser Entscheidung keine echten `.env`-Dateien genutzt werden sollen — falls versehentlich doch mal eine entsteht, landet sie nicht im Repo.
- Lokale Entwicklungskonfiguration wird über `app.config.ts` gelesen, nicht über `process.env` aus einer `.env`-Datei.
- CI-/Build-/Runtime-Secrets sind klar getrennten Kanälen zugeordnet: GitHub Actions Secrets (CI) / EAS Secrets (Build) / Supabase Secrets Manager (Edge Functions) — jedes Secret hat genau einen zuständigen Kanal, keine Vermischung.
- **Hinweis zur Quellenlage:** Eine frühere, allgemeinere Zusammenfassung im Planungsprotokoll erwähnte "dasselbe Muster wie im `filmkritiker`-Repo — `.env` lokal gitignored, `.env.example` committed". Diese Formulierung ist durch die spätere, deutlich detailliertere und explizit begründete Entscheidung gegen jegliche `.env`-Datei (oben) überholt; sie wird hier dokumentiert, damit keine Information stillschweigend verloren geht, ist aber nicht die gültige Vorgabe.
