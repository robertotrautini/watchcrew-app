# 0001 — React Native + Expo als App-Framework

**Status:** Entschieden (2026-09-19)

## Kontext

"Filmkritiker Trautmanns" (aktuell eine Vanilla-JS/PHP/MySQL-PWA) soll als echte, store-taugliche, plattformübergreifende native Mobile-App (Android + iOS) neu geschrieben werden — kein gewrapptes WebView/Hybrid-Setup. Robin will damit perspektivisch auch andere Familien/Gruppen als Zielgruppe erschließen (Multi-Tenant-Marketing-Ambition, zunächst kostenlos, Monetarisierung als spätere Option). Es musste entschieden werden, mit welchem Cross-Platform-Framework die App gebaut wird, und ob dabei Capacitor/ein WebView-Wrapper eine Option ist.

## Entscheidung

Die App wird mit **React Native + Expo** als vollständige UI-Neuentwicklung gebaut — kein Capacitor, kein WebView-Wrapper um die bestehende PWA. Das bestehende JS/PHP-Team-Know-how überträgt sich direkt (JavaScript/TypeScript-Ökosystem).

Workflow: **Expo Managed Workflow** (nicht Bare Workflow) — alle gewählten nativen Module (MMKV, Sentry, Supabase, Push-Notifications) haben Config-Plugin-Support, wodurch Managed Workflow ausreicht. Gepaart mit **EAS Build** für Cloud-Builds — notwendig ohnehin, da die Entwicklungsmaschine ein Raspberry Pi ist und es keinen lokalen Mac für iOS-Builds gibt.

## Begründung

- **Framework-Wahl (React Native vs. Flutter):** React Native wurde primär wegen der JS/PHP-Team-Passung gewählt. Der Marktanteilsvergleich zwischen RN und Flutter ist knapp/gemischt (RN leicht vorne bei Enterprise-Einsatz/Stellenanzeigen, Flutter vorne bei Rohentwickler-Adoption, Stand 2026) — kein klarer technischer Showstopper auf einer der beiden Seiten, daher gab die Team-Fit-Überlegung den Ausschlag.
- **Kein Wrapper/Capacitor:** Explizit verworfen, weil Robin einen professionellen, store-tauglichen App-Charakter will, keine "verpackte Website".
- **Managed statt Bare Workflow:** Alle benötigten nativen Fähigkeiten sind über offizielle Expo-Config-Plugins abgedeckt, sodass kein Eject/Bare-Workflow nötig ist — reduziert Build-Komplexität und Wartungsaufwand für einen Solo-Entwickler.
- **EAS Build zwingend:** Da kein lokaler macOS-Rechner für native iOS-Builds/Simulator verfügbar ist (Raspberry Pi als Dev-Maschine), ist Cloud-Building über EAS nicht optional, sondern die einzig praktikable Option für iOS.

## Konsequenzen

- Vollständige UI-Neuentwicklung in React Native/TypeScript, keine Wiederverwendung von HTML/CSS/JS-Code aus der alten PWA.
- iOS-Builds laufen ausschließlich über EAS Build (Cloud-macOS-Builder), Tests über TestFlight — es gibt aktuell kein bestätigtes physisches iOS-Testgerät im eigenen Besitz (siehe ADR 0010 für das Test-Distributions-Setup über das iPhone des Bruders).
- Für Geräte-Tests auf Android steht ein Pixel 10 zur Verfügung; die Entwicklungsstrategie ist Android-first, iOS-Verifikation folgt danach.
- Playwright (bisheriges E2E-Tool der PWA) ist für die native App nicht anwendbar (kein DOM) — siehe ADR 0008 für das neue Test-Tooling (Maestro).
