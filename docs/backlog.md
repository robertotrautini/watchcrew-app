# Backlog (zurückgestellte Punkte)

## Feature-Flags pro Nutzer (ADR 0015)

Status: zurückgestellt am 2026-10-11 ("machen wir irgendwann anders, jetzt zu viel"). Entwurf: [adr/0015-feature-flags-per-user.md](adr/0015-feature-flags-per-user.md).

- **Ziel:** Liste von Flags pro Nutzer, z. B. `premium` kostenlos für Freunde/Familie, spätere Abos/In-App-Käufe, Gates in der App, die Features je nach Flag ein-/ausblenden.
- **Empfehlung:** Option A — Tabelle `user_feature_flags`, Schreibzugriff nur Admin/`service_role`, mit Ablauf (`expires_at`) und Quelle (`source`).
- **Offene Fragen (unverändert aus ADR):**
  - [ ] 1. Option A bestätigen?
  - [ ] 2. Wer ist "Admin"? Nur Robin per SQL/Dashboard oder später Admin-Screen/Web-Tool?
  - [ ] 3. Gruppenebene von Anfang an oder zunächst nur Nutzerebene?
  - [ ] 4. Welche Features hinter `premium`/anderen Flags? Erstes konkretes Gate; ein Flag oder mehrere?
  - [ ] 5. Default ohne Cache/Netz: Premium zu oder offen? Flag/Ablauf für Nutzer sichtbar?
  - [ ] 6. In-App-Kauf für v1 geplant oder nur manuelle Freischaltung?

## Weitere zurückgestellte Punkte

- [ ] **Tab-Swipe-Pager:** braucht nativen Dev-Client-Build.
- [ ] **Maestro-Flows Bewertung in mehreren Gruppen:** zweite Testgruppe nötig.
- [ ] **Edge Function `send-push`:** Dedupe pro Empfänger (`groupIds`-Array).
- [ ] **Phase 3 Legacy-Import:** auf neue Rating-Struktur umstellen; Push-Trigger vorher abschalten.
- [ ] **Phase 4:** alte `ratings`-Tabelle entfernen.
- [ ] **Tracker:** Spaltensortierung.
- [x] **`expo-blur` entfernen:** im Code/`package.json` erledigt (2026-10-11); das native Modul steckt noch im bestehenden Dev-Client-Binary und verschwindet erst mit dem nächsten nativen Build (ungefährlich).
- [x] **`expo-web-browser` entfernen:** ungenutzt, aus `package.json` entfernt (2026-10-11); natives Modul bleibt bis zum nächsten nativen Build im Binary.
