# Arbeitsprozess WatchCrew (Single Source of Truth)

Wie wir an WatchCrew arbeiten. Zu Sitzungsbeginn lesen. Jede Änderung am Prozess sofort hier eintragen (plus Memory + Pointer in `CLAUDE.md`) und aktuell halten.

1. **Subagents:** Implementierungen, Datei-Edits und Codebase-Reads per Subagent (Agent-Tool) delegieren; bei grösseren Aufgaben unabhängige Teile parallel. Implementierungs-Subagents spawnen keine eigenen Sub-Agents (keine rekursive Delegation).
2. **Code-Stil:** TDD (red-green-refactor). NativeWind-/CSS-Klassen statt Inline-Styles.
3. **Verifikation nach jeder App-Änderung:**
   - `npx tsc --noEmit` + `npx jest` grün.
   - `scripts/maestro-all.sh --changed` (nur Flows der betroffenen Bereiche, `.maestro/areas.json`, `docs/maestro-areas.md`) auf dem Pixel 6 Pro.
   - Screenshots selbst ansehen, dann ALLE entstandenen Screenshots per SendUserFile an den Nutzer schicken, plus kurze Zusammenfassung.
   - Voller Lauf (`scripts/maestro-all.sh` ohne Flag) bei cross-cutting/Shared-Komponenten-Änderungen, auf Wunsch des Nutzers und vor Meilensteinen.
   - Flows (mit benannten Screenshots) für neue Features gehören zur Definition of Done; `docs/maestro-coverage.md` und `docs/maestro-areas.md` (+ `.maestro/areas.json`) mitpflegen.
4. **Geschwindigkeit der Flows:** kein `waitForAnimationToEnd` (auf konkretes Zielelement per testID warten); System-Animationen im Runner aus, mit trap-Restore; bedingter Start (`subflows/ensure-app.yaml`) statt Relaunch; Tab-Wechsel über `subflows/go-<tab>.yaml`. Verifikation läuft über Dev-Client + Metro auf dem Pixel 6 Pro; eine EAS-Preview-APK wird NICHT dafür verwendet. Details: `.maestro/README.md`.
4a. **Destruktive Maestro-Schritte nur auf Selbst-Angelegtem:** Flows loeschen/resetten nur Daten, die sie im selben Lauf selbst angelegt haben. Checkliste: kein "erste Zeile"/`index: 0` vor Delete/Reset (Ziel per sichtbarem Filmtitel); Vorbedingungs-Guard (`assertNotVisible` auf den Flow-Titel vor dem Anlegen, sonst laut abbrechen statt loeschen); vor dem Bestaetigen Titel im Sheet/Detail pruefen; Ziel nicht gefunden = Fehler, nie auf andere Zeile ausweichen; nie "Tracker leer" annehmen (Nutzer legt echte Eintraege in der Dev-Gruppe an). Flow-eigener Film: The Matrix (603). Details: `.maestro/README.md`.
5. **UI-Referenz:** `docs/style-guide.md` ist massgeblich (flaches Material, ein Border-Token, Backdrop-Dim-Stufen: nur Tracker/Watchlist/Tagebuch zeigen das ungedimmte Foto, einheitlicher Danger-Look, Icons über `src/components/ui/Icon.tsx` mit MaterialIcons-Rollen).
5a. **UI-Regel Aktionsreihen:** In jeder Button-Reihe steht die zerstoerende Aktion (Loeschen/Entfernen/Verlassen) immer ganz rechts bzw. zuletzt, nie in der Mitte. Details: `docs/style-guide.md` "Aktionsreihen". Jeder Toast hat ein Schliessen-X.
6. **Benachrichtigung:** Bei langen Läufen (z.B. Maestro-Vollsuite) nach Abschluss eine Push-Notification (PushNotification-Tool) senden; der Nutzer hat `agentPushNotifEnabled=true`.
7. **Git:** Kein Commit/Push, bis der Nutzer es freigibt. Kein blindes `git add -A`. Parallele Agents führen keine schreibenden Git-Befehle aus (kein stash/checkout/reset). `package.json`, `deno.lock`, `scripts/android-build-env.sh` nur auf Anweisung anfassen.
8. **Supabase/Daten:** Deploys auf Dev-Remote und additive Migrationen sind ohne Rückfrage ok; Prod, destruktive Änderungen und Secrets brauchen Freigabe. Die Legacy-Produktionsdatenbank wird nie angefasst (Migration nur read-only).
9. **Harte Regel aus `CLAUDE.md`:** Entscheidungen, die nicht in `docs/adr/` stehen, werden vor der Umsetzung dem Nutzer vorgelegt (Ausnahmen/Milestone-Autonomie siehe `CLAUDE.md` und Memory).
10. **Meta-Regel:** Jede Prozessänderung wird sofort in `docs/working-process.md`, im Memory und (falls nötig) im Pointer in `CLAUDE.md` nachgezogen.
11. **Reports:** Analyse-/Code-Health-Reports gehören ins Projekt (docs/), nicht nur nach /tmp: docs/code-health-report.html, docs/code-health-r-items.md. Fortschritt und Abschluss von Code-Health-Punkten (R1–R10) wird laufend in docs/code-health-r-items.md ("Fortschritt & Abschluss") dokumentiert; jede Charge aktualisiert Status-Tabelle und Protokoll.

## Autostart after reboot

- `~/.config/autostart/watchcrew.desktop` startet `scripts/boot-watchcrew.sh` (ersetzt den alten `filmkritiker.desktop`; Backup in `~/.config/autostart-backup/`).
- Skript öffnet kitty im Repo und startet `claude -c --dangerously-skip-permissions --remote-control` (Fallback ohne `-c`, falls keine Konversation existiert), danach `exec bash`. Duplikat-Schutz: läuft schon ein claude mit cwd `watchcrew-app`, passiert nichts. Test ohne Start: `scripts/boot-watchcrew.sh --dry-run`.
- Neu: `boot-watchcrew.sh` startet im Hintergrund `scripts/boot-device-setup.sh` (Log `~/logs/watchcrew-boot.log`): Crash-Capture des vorherigen Boots (`~/logs/crash-reports/<ts>.txt`, Zeiger `~/logs/LAST_CRASH.txt`, Einzeiler clean/hard), `adb start-server`, bis 3 Min auf das Pixel 6 Pro warten, `KEYCODE_WAKEUP`, `adb reverse tcp:8081 tcp:8081`, danach Metro (`expo start --dev-client --port 8081`, Log `~/logs/metro.log`, abschaltbar mit `WATCHCREW_BOOT_METRO=0`; nur wenn :8081 frei). Taucht das Handy nicht per USB auf, hilft nur Neustecken (Software kann es nicht beheben). Dry-run: `scripts/boot-watchcrew.sh --dry-run`.
- Persistentes Journal (braucht einmalig sudo): `/etc/systemd/journald.conf.d/90-persistent.conf` (Storage=persistent), sonst bleibt `/usr/lib/systemd/journald.conf.d/40-rpi-volatile-storage.conf` (volatile) aktiv.
- **Regel:** Nach jedem unerwarteten Reboot ZUERST `~/logs/crash-reports/` (neuester Report) und `~/logs/LAST_CRASH.txt` lesen und die Ursache analysieren, bevor weitergearbeitet wird; Befund dem User melden.
