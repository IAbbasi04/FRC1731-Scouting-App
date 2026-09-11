# Season-aware scouting configuration

Game-specific scouting fields live in `seasons.ts` rather than being hard-coded into the scouting page or analytics logic.

Each season profile defines:

- season year
- stable game key and display name
- auto fields
- teleop fields
- endgame fields
- control type for each field (counter, number, toggle, or select)

The match scouting form renders directly from this configuration. Event keys beginning with a supported year automatically switch to that season, while scouts can also choose the season manually.

Currently configured:

- 2026 — REBUILT
- 2025 — REEFSCAPE
- 2023 — CHARGED UP

Scouting records store common metadata separately from `gameData`. This lets entries from different seasons coexist in the same database without forcing unlike game mechanics into one schema.

To add another historical or future FRC game, add another `SeasonScoutingConfig` entry in `seasons.ts`. Analytics for that season should interpret only fields belonging to that game's config.
