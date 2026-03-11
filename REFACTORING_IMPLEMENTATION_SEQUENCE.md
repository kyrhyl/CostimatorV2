# ProgramOfWorksForm Refactor Plan
_Date: 2026-02-17_

Target file: `src/components/program-of-works/ProgramOfWorksForm.tsx`

## Purpose
Refactor `ProgramOfWorksForm.tsx` to reduce duplication, improve maintainability, and preserve current output and behavior for DPWH Forms `13-10`, `13-11`, and `13-13`.

## Current Problems Identified
1. Duplicate type definitions inside `ProgramOfWorksForm.tsx` that already exist in `src/types/program-of-works.ts`.
2. Repeated formatting helpers (`formatCurrency`, `formatNumber`) scoped locally.
3. Repeated division label mapping logic in multiple sections.
4. Monolithic component (1000+ LOC) mixing data fetching, print CSS, full page rendering, and row construction.
5. Existing reusable common components are not consistently leveraged.

## Refactor Goals
- Keep output visually and numerically identical (screen and print).
- Make `ProgramOfWorksForm.tsx` an orchestrator instead of a monolithic renderer.
- Centralize types, constants, and helper functions.
- Extract reusable page and table logic.
- Reduce regression risk with staged commits.

## Non-Goals (Phase 1)
- No UI redesign.
- No API contract change.
- No business-rule changes.
- No data model migration.

## Dependency Map (Execution Order)

### Foundation
- `src/types/program-of-works.ts` (source of truth for POW types)
- `src/lib/utils/dpwh-constants.ts` (division and part naming)
- Existing shared UI:
  - `src/components/program-of-works/common/DpwhFormHeader.tsx`
  - `src/components/program-of-works/common/ProjectInfoSection.tsx`
  - `src/components/program-of-works/common/SignatoriesSection.tsx`
  - `src/components/program-of-works/common/A4PageWrapper.tsx`

### New modules to introduce
- `src/components/program-of-works/hooks/usePowReportData.ts`
- `src/components/program-of-works/forms/Form1310Page.tsx`
- `src/components/program-of-works/forms/Form1311Page.tsx`
- `src/components/program-of-works/forms/Form1313Page.tsx`
- `src/components/program-of-works/utils/formatters.ts` (or `src/lib/utils/formatters.ts`)
- `src/components/program-of-works/utils/row-builders.ts`
- `src/components/program-of-works/styles/pow-print.module.css`

## Task-by-Task Checklist

## Phase 0 - Baseline and Safety
- [ ] Capture baseline screenshots and print previews for a representative project.
- [ ] Record expected critical values:
  - total direct cost
  - per-part totals
  - per-division totals
  - grand totals
  - percentages
- [x] Note edge cases (empty arrays, zero values, missing fields).

Acceptance criteria:
- Baseline evidence is available for regression comparison.

## Phase 1 - Type Consolidation
- [x] Remove inline interfaces from `ProgramOfWorksForm.tsx`.
- [x] Import shared interfaces from `src/types/program-of-works.ts`.
- [x] Extend shared types only if compile errors require it.

Acceptance criteria:
- `ProgramOfWorksForm.tsx` contains no duplicate POW interfaces.
- App compiles with shared types only.

## Phase 2 - Data Fetch Extraction
- [x] Create `usePowReportData(projectId)` hook with `data`, `loading`, and `error`.
- [x] Move fetch/loading/error logic out of component.
- [x] Keep endpoint and behavior unchanged (`/api/projects/${projectId}/pow-report`).

Acceptance criteria:
- Loading/error flows remain identical.
- `ProgramOfWorksForm.tsx` becomes UI-centric.

## Phase 3 - Utility Extraction
- [x] Create shared number and currency formatters.
- [x] Replace local `formatCurrency` and `formatNumber`.
- [x] Replace inline division label mapping with `getDivisionName`.

Acceptance criteria:
- Formatted output remains identical.
- No ad hoc division mappings remain in `ProgramOfWorksForm.tsx`.

## Phase 4 - Page Component Split
- [x] Extract Form 13-10 markup to `Form1310Page.tsx`.
- [x] Extract Form 13-11 markup to `Form1311Page.tsx`.
- [x] Extract Form 13-13 markup to `Form1313Page.tsx`.
- [x] Keep data flow explicit through typed props.

Acceptance criteria:
- `ProgramOfWorksForm.tsx` composes pages only.
- Visual output remains unchanged.

## Phase 5 - Reuse Common Components
- [x] Replace repeated header blocks with `DpwhFormHeader`.
- [x] Replace repeated project info blocks with `ProjectInfoSection`.
- [x] Replace signatories section with `SignatoriesSection`.
- [x] Use `A4PageWrapper` for page containers where appropriate.

Acceptance criteria:
- Shared blocks are reused consistently.
- No output regressions.

## Phase 6 - Print Style Extraction
- [x] Move inline print/A4 styles into `pow-print.module.css`.
- [x] Preserve current selectors and page-break behavior.

Acceptance criteria:
- Print preview remains identical (page breaks, borders, hidden controls).

## Phase 7 - Row Builder Extraction
- [x] Move table-row construction logic into pure helper functions.
- [x] Cover:
  - itemized rows
  - component breakdown rows
  - division and part total rows

Acceptance criteria:
- Cleaner JSX in page components.
- Same table output and totals.

## Phase 8 - Verification and Hardening
- [ ] Run lint and type-check.
- [ ] Compare against baseline screenshots and values.
- [ ] Validate totals and percentages end-to-end.
- [x] Spot-check partial/empty data scenarios.

Acceptance criteria:
- No behavior regressions.
- All checks pass.

## Suggested Commit Plan
1. `refactor(pow): replace local report interfaces with shared POW types`
2. `refactor(pow): extract usePowReportData hook`
3. `refactor(pow): centralize POW formatters and division helper usage`
4. `refactor(pow): extract form 13-10 page component`
5. `refactor(pow): extract form 13-11 page component`
6. `refactor(pow): extract form 13-13 page component`
7. `refactor(pow): reuse common header/info/signatories/a4 wrappers`
8. `refactor(pow): move print styles to dedicated stylesheet`
9. `refactor(pow): extract table row builders and simplify page JSX`
10. `test(pow): add regression checks for totals and print rendering`

## Regression Checklist (Must Pass)
- [ ] Form 13-10 totals and percentages unchanged.
- [ ] Form 13-11 division transitions and totals unchanged.
- [ ] Form 13-13 submitted rows and totals unchanged.
- [x] Currency and number formats unchanged.
- [ ] Print page count and page breaks unchanged.
- [x] Loading and error states unchanged.

## Regression Execution Log (2026-02-17)
- `npm run typecheck` passed.
- `npm run test -- --run` passed (`11` files, `180` tests).
- `npm run lint` blocked by existing tooling compatibility issue (`@rushstack/eslint-patch` with current ESLint runtime in this repo).
- Remaining checklist items require manual visual and data-parity verification against baseline print previews.

## Implementation Status (2026-02-17)
- Completed structural refactor across phases 1 to 7.
- `ProgramOfWorksForm.tsx` now orchestrates rendering and no longer contains duplicated interfaces, inline data loading, inline print CSS, or large inline row-builder IIFEs.
- Completed visual normalization pass for forms 13-11 and 13-13 headers via compact shared header mode (`DpwhFormHeader` `compact` prop) to better match original spacing and alignment.
- Added page components:
  - `src/components/program-of-works/forms/Form1310Page.tsx`
  - `src/components/program-of-works/forms/Form1311Page.tsx`
  - `src/components/program-of-works/forms/Form1313Page.tsx`
- Added shared helpers:
  - `src/components/program-of-works/hooks/usePowReportData.ts`
  - `src/components/program-of-works/utils/formatters.ts`
  - `src/components/program-of-works/utils/row-builders.tsx`
  - `src/components/program-of-works/styles/pow-print.module.css`
- Verification:
  - `npm run typecheck` passes.
  - `npm run lint` currently fails due existing repository ESLint patch/runtime issue unrelated to this refactor (`@rushstack/eslint-patch` compatibility).

## Risks and Mitigations
- Risk: silent numeric regression in row generation.
  - Mitigation: baseline value capture, helper-level tests, side-by-side comparison.
- Risk: print output drift after CSS move.
  - Mitigation: dedicated print verification checklist before merge.
- Risk: stricter typing reveals backend shape inconsistencies.
  - Mitigation: extend shared types carefully with optional fields where needed.

## Notes for Other Agents
- Prioritize no behavior change over cleanup speed.
- Keep commits small and reversible.
- Validate each phase before moving to the next.
- Do not alter API payload contract during this refactor track.
