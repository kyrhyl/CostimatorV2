# Program of Works Module

This module renders the canonical DPWH prescribed forms packet for a project:

- Form 13-10/13-11/13-13 (POW)
- Form 13-14/13-15 (ABC)
- Form 13-16 (DUPA)

It is used by the active route `src/app/projects/[id]/pow-report/page.tsx`.

## Active Architecture

Entry flow:

1. `src/app/projects/[id]/pow-report/page.tsx`
2. `src/components/program-of-works/ProgramOfWorksForm.tsx`
3. `src/components/program-of-works/PrescribedFormsWorkspace.tsx`

Within `PrescribedFormsWorkspace`:

- Data is loaded via `hooks/usePrescribedFormsData.ts`.
- POW/ABC/DUPA screen tabs render via `tabs/PowTab.tsx`, `tabs/AbcTab.tsx`, `tabs/DupaTab.tsx`.
- Print bundles render via `print/PowPrintBundle.tsx`, `print/AbcPrintBundle.tsx`, `print/DupaPrintBundle.tsx`.

## Data Layer

Unified data loading lives in:

- `src/components/program-of-works/hooks/usePrescribedFormsData.ts`
- `src/components/program-of-works/hooks/fetchReportData.ts`

Current API endpoints consumed:

- `/api/projects/:id/pow-report`
- `/api/projects/:id/abc-report`
- `/api/projects/:id/dupa-report`

The hook exposes explicit per-form and aggregate states:

- `data.pow | data.abc | data.dupa`
- `loading.pow | loading.abc | loading.dupa | loading.any`
- `error.pow | error.abc | error.dupa | error.any`
- `refetch()`

## Shared Types and Constants

Use shared definitions instead of duplicating mappings or report types:

- POW types: `src/types/program-of-works.ts`
- ABC types: `src/types/abc.ts`
- DUPA types: `src/types/dupa.ts`
- DPWH part/division/form mappings: `src/lib/utils/dpwh-constants.ts`

## How to Add a New Prescribed Form

Use this sequence to add a new form safely.

1. Add form types in `src/types` (or extend existing report types).
2. Add fetch wiring in `usePrescribedFormsData.ts` using `fetchReportData.ts`.
3. Create tab UI in `src/components/program-of-works/tabs/`.
4. Create print bundle in `src/components/program-of-works/print/` and form page(s) in `forms/`.
5. Register the tab in `PrescribedFormsWorkspace.tsx` and render screen + print outputs.
6. Keep loading/error behavior aligned with existing `loading.any` and `error.any` handling.

Notes:

- Preserve print structure and report values.
- Keep API payload contracts backward compatible unless coordinated.

## Manual POW Area

Manual POW management is implemented in:

- `src/components/program-of-works/ManualPowManager.tsx`
- `src/components/program-of-works/manual-pow/*`

This area is separate from prescribed report rendering and handles manual BOQ staging/version flows.

## Public Exports

`src/components/program-of-works/index.ts` exports:

- `ProgramOfWorksForm` (canonical entry)
- Reusable dashboard cards/components used by project screens

## Migration Notes (Legacy Removal)

The following legacy components/routes were removed or decommissioned in this refactor cycle:

- `src/components/program-of-works/ProgramOfWorksWorkspace.tsx`
- `src/components/program-of-works/ProgramOfWorksReport.tsx`
- `src/app/program-of-works-example/page.tsx`
- `src/app/estimate/[id]/program-of-works-report/page.tsx`
- `src/app/cost-estimates/[id]/program-of-works-report/page.tsx`

Use `src/app/projects/[id]/pow-report/page.tsx` as the only supported prescribed-forms route.

## Verification

Recommended checks after changes:

- `npm run typecheck`
- `npm run build`
- Manual check of `projects/[id]/pow-report` for tab rendering and print output.
