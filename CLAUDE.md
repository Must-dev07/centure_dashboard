# Dashboard — Claude Code Instructions

## Project scope

This repository contains the Next.js dashboard used by doctors and administrators.

## General rules

* Preserve the existing architecture.
* Do not perform unrelated refactors.
* Do not modify backend code from this repository.
* Do not modify mobile application code.
* Do not invent new API endpoints or API behavior.
* Before changing existing behavior, inspect the existing implementation and how it communicates with the backend.
* Preserve existing API contracts unless the current task explicitly requires a change.

## Task boundaries

* Work only on the current task or phase.
* Do not implement requirements belonging to later phases.
* Do not make speculative changes to prepare for future work.
* Do not modify unrelated components.

## Testing

* Run the relevant existing tests/checks after changes.
* Do not modify tests merely to hide a regression.
* If an existing test/check must change because the requested behavior intentionally changed, make only the necessary change.

## API integration

* Treat the backend API as the source of truth for API behavior.
* Do not silently change endpoint names, request formats, response handling, or authentication behavior.
* If a backend change requires dashboard changes, update only the dashboard files required by the current task.

## Security

* Treat environment files, credentials, tokens, and other secrets as sensitive.
* Do not read or expose files blocked by `.claude/settings.json`.
* Never place secret values, credentials, tokens, or passwords in `CLAUDE.md`, source code, tests, or documentation.

## Git

Git operations are allowed for local inspection and local commits when requested.

Do not automatically:

* push to a remote
* pull from a remote
* change remotes
* perform remote Git operations

## Refonte workflow

The enrollment workflow refonte is divided into separate implementation phases.

Do not implement the entire refonte at once.

The current phase specification is authoritative for the work being performed. Requirements belonging to other phases must wait until their corresponding phase is started.

## Phase workflow and stop rule

* Work strictly within the currently authorized phase.
* Do not start, implement, or prepare changes belonging to a later phase unless explicitly requested.
* When the current phase is complete, STOP.
* Before stopping, summarize:
  1. files changed,
  2. functional changes,
  3. checks/tests/typechecks/builds performed,
  4. any warnings, failures, or unresolved issues.
* Then wait for explicit validation before proceeding to the next phase.
* Never automatically continue into the next phase.

## Stack compatibility for `react-best-practices`

This rule applies to the installed `react-best-practices` skill (`vercel-react-best-practices`).

* The dashboard currently uses React 18.3.x and Next.js 14.2.x with the App Router and a fully client-side architecture.
* Apply recommendations from `react-best-practices` only when they are compatible with this existing stack.
* Do NOT introduce React 19, Next.js 15+, Server Components, Server Actions, SWR, a new state-management library, or architectural changes merely to satisfy a recommendation.
* Preserve the existing frontend architecture unless the authorized phase explicitly requires changing it.
