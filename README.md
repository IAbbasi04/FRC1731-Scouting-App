# FRC1731 Scouting App

A scouting and analytics platform for FRC Team 1731. The long-term goal is to combine trusted public FRC data with Team 1731's own scouting observations, statistical analysis, visualization, comparison tools, and event-specific alliance selection workflows.

## Current milestone: v0.1 foundation

The repo currently includes:

- Next.js App Router + React + TypeScript
- Tailwind CSS
- navigation for Events, Teams, Scouting, Compare, and Pick List
- a server-side The Blue Alliance API wrapper
- a working event-team lookup page once a TBA API key is configured
- a Statbotics service wrapper ready for the next milestone
- starter statistical utilities
- season-configurable scouting structure
- a documented Convex backend placeholder

## Local setup

1. Install Node.js 20+.
2. Clone this repository.
3. Run `npm install`.
4. Copy `.env.example` to `.env.local`.
5. Add a The Blue Alliance API v3 key as `TBA_AUTH_KEY`.
6. Run `npm run dev`.
7. Open `http://localhost:3000`.

### Getting a TBA key

Sign into The Blue Alliance and generate an API key from your account page. Do not commit the key to GitHub. `.env.local` is ignored by git.

## Architecture principles

1. **Keep raw data raw.** Scouting submissions should never be overwritten by derived calculations.
2. **Preserve provenance.** EPA, OPR, ACE, and 1731-derived metrics should always identify their source.
3. **Season-configurable scouting.** Game-specific fields belong in configuration rather than core application logic.
4. **Offline-first scouting is a requirement.** Competition internet cannot be assumed.
5. **Human strategy remains authoritative.** Pick-list models inform decisions; they do not replace scout/strategy judgment.
6. **Build in small milestones.** The app should remain runnable as features are added.

## Planned phases

### Phase 1 — FRC browser
- Event selection/search
- event roster
- rankings and schedule
- team profiles
- TBA OPR/DPR/CCWM
- Statbotics EPA/components
- ACE integration if a stable machine-readable source is appropriate

### Phase 2 — Scouting
- authentication/scout identity
- match assignments
- configurable mobile scouting form
- offline queue + sync
- pit scouting
- notes and reliability flags

### Phase 3 — Analytics
- mean/median/std dev/percentiles
- consistency and reliability
- recent-match trends
- cycle and accuracy analysis
- schedule-adjusted performance
- expected vs actual performance

### Phase 4 — Pick list
- custom metric weighting
- role-specific presets
- manual ordering
- team tags and do-not-pick flags
- alliance compatibility

### Phase 5 — Advanced analysis
- scout reliability
- predictive models
- custom 1731 rating
- film/video integration

## Important

This project is intentionally being developed incrementally. Avoid large rewrites or adding new dependencies without a concrete feature need.
