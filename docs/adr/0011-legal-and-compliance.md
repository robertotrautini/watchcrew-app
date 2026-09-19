# 0011 — Rechtliches und Compliance (Datenschutz, App-Store-Vorgaben)

**Status:** Entschieden (2026-09-19)

## Kontext

Eine store-taugliche App mit echten Nutzer-Accounts (E-Mail, Bewertungsdaten) unterliegt rechtlichen Mindestanforderungen: Datenschutzerklärung/Nutzungsbedingungen sowie App-Store-spezifische Vorgaben wie das Recht auf Account-Löschung. Robin hat keinen juristischen Hintergrund und wollte klären, wie eine Datenschutzerklärung/AGB praktikabel und langfristig pflegbar erstellt werden kann, ohne diese selbst laufend aktuell halten zu müssen.

## Entscheidung

**Privacy Policy / Terms of Service:** Nutzung eines Generator-Tools statt eigenständigem Verfassen durch Robin. Empfohlen und gewählt: **iubenda** (EU-/DSGVO-fokussiert, passt zum Supabase-Frankfurt/EU-Setup) — gegenüber Termly (eher US-/CCPA-orientiert, einfacherer Fragebogen).

**Account-Löschung (App Store Guideline 5.1.1):** siehe ADR 0004 — verpflichtende In-App-"Konto löschen"-Funktion mit echter, vollständiger Löschung.

## Begründung

- iubenda wurde gegenüber Termly bevorzugt, weil das rechtliche Umfeld der App (Nutzerdaten, Server-Standort Frankfurt/EU via Supabase) primär EU-/DSGVO-relevant ist — Termlys Ausrichtung ist eher US-/CCPA-zentriert.
- Beide Tools lösen das "Richtlinie veraltet"-Problem über ein eingebettetes/gehostetes Widget, das iubenda/Termly zentral aktualisiert, wenn sich die Rechtslage ändert — kein statisches Dokument, an dessen Pflege Robin selbst denken müsste.
- **Ehrlicher Vorbehalt, explizit mitgegeben:** Ein Generator-Tool ist ein solider Startpunkt für die aktuell überschaubaren Datenkategorien dieser App (E-Mail, Bewertungen — keine Zahlungsdaten in v1). Eine echte juristische Prüfung lohnt sich aber, sobald reale Monetarisierung/Skalierung stattfindet — diese Einschränkung ist bewusst Teil der Entscheidung, nicht nur eine Randnotiz.

## Konsequenzen

- Vor dem Store-Launch muss ein iubenda-Konto eingerichtet und die generierte Datenschutzerklärung/Nutzungsbedingungen in die App (z. B. Settings, Onboarding, Registrierung) sowie ggf. auf die `watch-crew.app`-Landingpage (siehe ADR 0010) eingebunden werden.
- Sollte die App später echte Zahlungsdaten oder signifikant mehr personenbezogene Datenkategorien verarbeiten (Monetarisierungs-Track), ist an diesem Punkt eine echte juristische Prüfung nachzuholen — das ist keine Aufgabe dieses Rewrite-Scopes, sondern ein vorgemerkter künftiger Schritt.
- Diese ADR deckt ausschließlich die Beschaffung/Pflege der rechtlichen Dokumente ab, nicht deren inhaltliche Ausgestaltung — die konkreten Inhalte entstehen über den iubenda-Fragebogen zum Implementierungszeitpunkt.
