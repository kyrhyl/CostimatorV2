# Program of Works Refactor Plan (Agent Workboard)

Status: Active  
Decision: Legacy workspace/report paths are deprecated immediately (Option 1)

## Goal

Refactor `src/components/program-of-works` into a cleaner, faster, and easier-to-maintain module while preserving current POW/ABC/DUPA behavior and print output.

## Scope

- In scope
  - Architecture cleanup for Program of Works components and routes
  - Data-fetching consolidation for prescribed forms
  - Large component decomposition (`ManualPowManager`)
  - Render/performance optimization for large table/form pages
  - Test baseline for critical calculations and report behavior
  - Docs alignment with actual architecture
- Out of scope
  - UI redesign/retheme
  - Backend model schema changes not required for refactor
  - New business features

## Mandatory Constraints

- Preserve existing report values and print output structure.
- Avoid changing API payload contracts unless explicitly coordinated.
- Use shared constants in `src/lib/utils/dpwh-constants.ts` (no duplicate normalize/part mappings).
- Keep each PR focused to one workstream.

## Deprecation Policy (Immediate)

Remove or decommission the following legacy paths/components in this refactor cycle:

- `src/components/program-of-works/ProgramOfWorksWorkspace.tsx`
- `src/components/program-of-works/ProgramOfWorksReport.tsx`
- `src/app/program-of-works-example/page.tsx`
- `src/app/estimate/[id]/program-of-works-report/page.tsx`
- `src/app/cost-estimates/[id]/program-of-works-report/page.tsx`

Retain the current canonical flow:

- `src/components/program-of-works/ProgramOfWorksForm.tsx`
- `src/components/program-of-works/PrescribedFormsWorkspace.tsx`
- `src/app/projects/[id]/pow-report/page.tsx`

## Workstreams

### Agent A - Architecture + Deprecation

Objective: Remove legacy entry points and align public exports.

Tasks:

1. Remove deprecated pages/components listed above.
2. Update `src/components/program-of-works/index.ts` to export only active, supported modules.
3. Verify there are no remaining imports/usages of removed modules.
4. Update any links/buttons that still point to deprecated routes.

Acceptance criteria:

- No references to removed legacy components/routes.
- App builds and main POW report route works.

---

### Agent B - Data Layer Consolidation

Objective: Eliminate duplicated report-fetch hook logic.

Tasks:

1. Create shared report fetch helper in `src/components/program-of-works/hooks/`.
2. Consolidate:
   - `usePowReportData.ts`
   - `useAbcReportData.ts`
   - `useDupaReportData.ts`
   into one orchestrator hook (for example `usePrescribedFormsData.ts`).
3. Keep error/loading states explicit and consistent.
4. Add `refetch` support.

Acceptance criteria:

- `PrescribedFormsWorkspace` consumes unified hook.
- No behavior regression in loading/error UI.

---

### Agent C - Manual POW Decomposition

Objective: Break `ManualPowManager.tsx` into maintainable feature components/hooks.

Tasks:

1. Split UI into subcomponents (suggested):
   - `ManualPowConfigPanel`
   - `ManualPowTemplatePicker`
   - `ManualPowStagingTable`
   - `ManualPowItemsTable`
   - `ManualPowSaveVersionModal`
2. Move API-heavy logic into hooks/services.
3. Keep behavior and validations unchanged.

Acceptance criteria:

- No single replacement file should be excessively large.
- Existing manual POW flows still work end-to-end.

---

### Agent D - Performance + Rendering

Objective: Reduce unnecessary rerenders and heavy inline computations.

Tasks:

1. Memoize expensive table row transforms where applicable.
2. Ensure stable keys (avoid index-only keys when a better id exists).
3. Consider lazy-loading print bundles when not printing.
4. Remove unused style module(s), especially:
   - `src/components/program-of-works/styles/tableStyles.ts` (if confirmed unused).

Acceptance criteria:

- No visual regressions in tabs and print views.
- Improved responsiveness on large datasets.

---

### Agent E - Tests + Guardrails

Objective: Add safety net before and during refactor.

Tasks:

1. Add unit tests for:
   - `utils/abc-calculations.ts`
   - `utils/dupa-calculations.ts`
   - deterministic pieces of `utils/row-builders.tsx`
2. Add integration tests for:
   - tab switch behavior in prescribed forms
   - loading/error states
3. Include edge cases: zero values, empty items, missing optional fields.

Acceptance criteria:

- Tests pass in CI/local and cover critical computation paths.

---

### Agent F - Documentation + Migration Notes

Objective: Make module usage clear and current.

Tasks:

1. Rewrite `src/components/program-of-works/README.md` to reflect active architecture only.
2. Document extension points:
   - how to add a new prescribed form
   - where shared constants/types live
3. Add migration note summarizing removed legacy routes/components.

Acceptance criteria:

- Docs match code and route behavior.

## Suggested Execution Order

1. Agent E (minimal tests first for calculation safety)
2. Agent A (deprecate legacy surface area)
3. Agent B (unify fetch hooks)
4. Agent C (decompose Manual POW)
5. Agent D (perf polish)
6. Agent F (final docs/migration notes)

## PR Rules

- One workstream per PR.
- Include before/after notes and explicit verification steps.
- Do not mix refactor + feature work.
- If behavior changes are unavoidable, document exactly why.

## Verification Checklist

- `pow-report` route renders and prints correctly.
- POW, ABC, DUPA tabs all load with correct data.
- Manual POW config, staging, save-as-version still functional.
- No broken links to removed legacy routes.
- Lint/build/tests pass.

## Done Definition

- Legacy paths removed.
- Canonical path stable.
- Shared data layer in place.
- Manual POW module split.
- Tests added for critical math/render logic.
- README/docs updated.
