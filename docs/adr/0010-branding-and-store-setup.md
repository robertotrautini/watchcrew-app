# 0010 — Branding und Store-Setup

**Status:** Entschieden (2026-09-19)

## Kontext

Die alte App heißt "Filmkritiker Trautmanns" — ein Name, der zu familienspezifisch ist angesichts der Ambition, die App später auch an andere Familien/Gruppen zu vermarkten. Für den Rewrite mussten ein neuer App-Name, eine Bundle-Identifier-Konvention, eine Domain-Strategie (für Invite-Links) sowie ein Weg zur iOS-Testverteilung an das einzige verfügbare iOS-Testgerät entschieden werden.

## Entscheidung

**App-Name: WatchCrew** (Arbeitsname). "Filmkritiker Trautmanns" wurde als zu familienspezifisch verworfen; die früheren Kandidaten "Reelmates" und "CineCircle" wurden verworfen, nachdem sich bereits existierende, konzeptionell nahezu identische Apps mit sehr ähnlichen Namen auf Google Play/App Store fanden — **Store-/Trademark-Verfügbarkeit ist vor jeder Namensfinalisierung zwingend zu prüfen.**

**Schreibweise-Regel:** "WatchCrew" wird überall **zusammengeschrieben, ohne internen Bindestrich** — außer in der Domain (`watch-crew.app`, mit Bindestrich). Dieser Bindestrich ist ausschließlich domain-spezifisch, nicht im App-Namen, Repo-Namen oder Bundle-Identifier zu verwenden.

**Bundle-Identifier / Package-Name:** `com.watchcrew.app` — keine echte Domain wird benötigt/besessen, das Reverse-DNS-Format ist nur eine Eindeutigkeits-Konvention, keine geprüfte Domain-Besitz-Kontrolle.

**Repo-Name:** `watchcrew-app` (korrigiert von einem ursprünglich erwogenen `filmkritiker-app` — das gesamte Projekt wurde auf die WatchCrew-Marke umbenannt). Robin wird zusätzlich die Supabase-Projekte (`watchcrew-dev`/`watchcrew-prod`) und das Sentry-Projekt selbst passend umbenennen (siehe ADR 0002).

**Domain: `watch-crew.app`** (gekauft) — konkret benötigt für iOS Universal Links / Android App Links, damit der per WhatsApp geteilte Gruppen-Invite-Link auch für Personen funktioniert, die die App noch nicht installiert haben (öffnet die App falls installiert, fällt sonst auf eine Landingpage mit Store-Badges zurück). Ein reines `watchcrew://`-URL-Schema würde für jeden ohne bereits installierte App lautlos fehlschlagen — das würde den zentralen "neue Person einladen"-Use-Case unterlaufen. Benötigt `.well-known/apple-app-site-association` und `assetlinks.json`, gehostet auf dieser Domain, plus eine einfache Fallback-Landingpage.

**iOS-Testverteilung an das iPhone des Bruders:** **TestFlight Internal Testing** (Bruder wird als Team-Mitglied via seiner Apple-ID-E-Mail im kostenpflichtigen Apple-Developer-Program-Account hinzugefügt) — umgeht Apples Beta App Review und vermeidet den umständlicheren Ad-Hoc-Distributionsweg (der zusätzlich eine Vorab-Registrierung der exakten Geräte-UDID vor jedem Build verlangen würde).

## Begründung

- Store-/Trademark-Konflikte sind ein K.o.-Kriterium für einen App-Namen — zwei Kandidaten wurden konkret deswegen verworfen, was zeigt, dass diese Prüfung nicht übersprungen werden darf, bevor ein Name als final gilt.
- Die konsistente Schreibweise ("WatchCrew" solid, nur Domain mit Bindestrich) verhindert Verwirrung/Uneinheitlichkeit über Repo, Bundle-ID, App-Store-Listing und Marketing-Domain hinweg.
- Eine eigene Domain für Universal/App-Links ist keine kosmetische Entscheidung, sondern technisch notwendig für einen funktionierenden Deep-Link-Invite-Flow, der auch Nicht-Installierte erreicht — ohne sie bräche der zentrale Einladungs-Use-Case für neue Nutzer.
- TestFlight Internal Testing ist der mit Abstand reibungsärmste Weg, eine Vorab-Version an eine einzelne bekannte Person (den Bruder) zu verteilen, ohne Apples vollen Review-Prozess zu durchlaufen oder UDID-Verwaltung zu betreiben.

## Konsequenzen

- `app.config.ts` / `app.json` (Expo) trägt `com.watchcrew.app` als Bundle-Identifier/Package-Name für beide Plattformen.
- Die Domain `watch-crew.app` benötigt eine eigene, wenn auch minimale, Infrastruktur (statische Landingpage + `.well-known`-Dateien) — das ist ein eigenständiges Deliverable, unabhängig vom Mobile-App-Code selbst.
- Marketing-/Store-Texte, App-Icon, Screenshots etc. müssen konsistent den Namen "WatchCrew" (ohne Bindestrich) verwenden.
- Vor dem finalen Store-Listing muss noch einmal aktiv geprüft werden, ob "WatchCrew" weiterhin frei von Namenskonflikten ist (Zeitpunkt der Prüfung in dieser Session: 2026-09-19) — Namensverfügbarkeit kann sich bis zum tatsächlichen Store-Launch ändern.
- Die iOS-Teststrategie hängt von einem aktiven, kostenpflichtigen Apple-Developer-Program-Account ab, in dem der Bruder als Internal Tester eingetragen wird.
