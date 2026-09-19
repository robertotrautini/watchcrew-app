# WatchCrew

WatchCrew is a cross-platform mobile app (Android + iOS) for tracking movies with your watch group — a shared watchlist, per-member star ratings, a payment-rotation tracker, and TMDB/Trakt-powered discovery. It is the planned successor to the family-only PWA "Filmkritiker Trautmanns."

- **Visual overview:** see [`docs/planning-report.html`](docs/planning-report.html) for the full architecture overview, design tokens, and milestone roadmap (M0–M12).
- **Decision log:** see [`docs/adr/`](docs/adr/) for the architecture decision records — every major tooling/architecture choice made so far, with context and reasoning.
- **Functional spec:** see [`docs/feature-inventory.md`](docs/feature-inventory.md) for the full feature inventory of the legacy app (screens, API behavior, business rules) that this rewrite is based on.

## Tech stack

React Native + Expo + TypeScript, Supabase (Postgres + Auth + Realtime + Edge Functions) as the backend. See `docs/adr/` for the full stack and the reasoning behind each choice.
