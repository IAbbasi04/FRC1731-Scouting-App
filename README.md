# FRC1731 Scouting App

A scouting and analytics platform for FRC Team 1731 combining public FRC data, Team 1731 scouting observations, statistical analysis, comparisons, and alliance-selection workflows.

## Current milestone

The app currently includes:

- Next.js App Router + React + TypeScript + Tailwind CSS
- Team 1731-inspired blue/yellow visual system
- The Blue Alliance event metadata, rosters, rankings, schedules, results, and OPR data
- Statbotics data ingestion
- event-specific team profiles
- side-by-side team comparison workspace
- persistent public-metric visibility controls; 1731 defaults currently show OPR and hide EPA/DPR/CCWM
- mobile-first match scouting form
- offline scouting queue stored on the scout's device
- raw scouting JSON export
- Convex dependency and a validated `scoutingEntries` database schema ready for cloud synchronization
- starter statistical utilities

## Local setup

1. Install Node.js 20+.
2. Clone this repository.
3. Run `npm install`.
4. Copy `.env.example` to `.env.local`.
5. Add a The Blue Alliance API v3 key as `TBA_AUTH_KEY`.
6. Run `npm run typecheck`.
7. Run `npm run dev`.
8. Open `http://localhost:3000`.

### Getting a TBA key

Sign into The Blue Alliance and generate an API key from your account page. Do not commit the key to GitHub. `.env.local` is ignored by git.

## Scouting data status

Match scouting is currently **offline-first and local-only**. Each browser stores raw entries in localStorage and can export them as JSON. This is intentional while the data model is being validated.

The Convex schema now defines the cloud `scoutingEntries` table and indexes. The next backend step is to initialize a Convex deployment, add upload/query mutations, and synchronize queued local entries when connectivity is available.

## Architecture principles

1. **Keep raw data raw.** Scouting submissions should never be overwritten by derived calculations.
2. **Preserve provenance.** Public models and 1731-derived metrics should always identify their source.
3. **Season-configurable scouting.** Game-specific fields should be separated from core application logic.
4. **Offline-first scouting is a requirement.** Competition internet cannot be assumed.
5. **Human strategy remains authoritative.** Pick-list models inform decisions; they do not replace scout/strategy judgment.
6. **Build in small milestones.** The app should remain usable as features are added.

## Roadmap

### FRC browser — in progress
- event roster, rankings, schedule, results ✅
- event team metrics ✅
- event-specific team profiles ✅
- metric visibility preferences ✅
- additional external metrics as useful

### Scouting — in progress
- mobile match scouting form ✅
- offline queue ✅
- raw data export ✅
- Convex scouting schema ✅
- cloud synchronization
- scout identity/authentication
- match assignments
- pit scouting
- season-specific form configuration

### Analytics
- mean/median/std dev/percentiles
- scoring accuracy and cycle analysis
- consistency and reliability
- recent-match trends
- schedule-adjusted performance
- expected vs actual performance

### Pick list
- custom metric weighting
- role-specific presets
- manual ordering
- team tags and do-not-pick flags
- alliance compatibility

### Advanced analysis
- scout reliability
- predictive models
- custom 1731 rating
- film/video integration

## Important

This project is intentionally being developed incrementally. Avoid large rewrites or adding dependencies without a concrete feature need.
