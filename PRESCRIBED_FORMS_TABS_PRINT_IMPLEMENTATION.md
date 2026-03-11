# Prescribed Forms Tabs + Unified Print Plan
_Date: 2026-02-17_

## Objective
Implement prescribed forms as tabbed UI (`POW`, `ABC`, `DUPA`) while keeping `Print / Save as PDF` as one compiled document with separator pages.

## Confirmed Product Decision
- DUPA print must include **all pay items included in the project**.
- DUPA print output is not limited by tab filters/search.

## Target UX
- Screen mode:
  - Tabbed view for easier navigation and focused editing/review.
  - Only active tab content is visible.
- Print mode (`window.print()`):
  - A single ordered packet is rendered and exported to PDF:
    1. Program of Works forms (`13-10`, `13-11`, `13-13`)
    2. Separator page: `APPROVED BUDGET FOR THE CONTRACT`
    3. ABC forms (summary + detailed items)
    4. Separator page: `DETAILED UNIT PRICE ANALYSIS`
    5. DUPA forms (all project pay items)

## Proposed File Structure

### Workspace / Composition
- `src/components/program-of-works/PrescribedFormsWorkspace.tsx`
- `src/components/program-of-works/print/SectionSeparatorPage.tsx`
- `src/components/program-of-works/print/PowPrintBundle.tsx`
- `src/components/program-of-works/print/AbcPrintBundle.tsx`
- `src/components/program-of-works/print/DupaPrintBundle.tsx`

### Tabs
- `src/components/program-of-works/tabs/PowTab.tsx`
- `src/components/program-of-works/tabs/AbcTab.tsx`
- `src/components/program-of-works/tabs/DupaTab.tsx`

### Forms (new)
- `src/components/program-of-works/forms/FormABCSummaryPage.tsx`
- `src/components/program-of-works/forms/FormABCItemsPage.tsx`
- `src/components/program-of-works/forms/FormDUPAPage.tsx`

### Data / Types / Utils
- `src/types/abc.ts`
- `src/types/dupa.ts`
- `src/components/program-of-works/hooks/useAbcReportData.ts`
- `src/components/program-of-works/hooks/useDupaReportData.ts`
- `src/components/program-of-works/utils/abc-calculations.ts`
- `src/components/program-of-works/utils/dupa-calculations.ts`

## Print Behavior Rules
- Add CSS gates:
  - `.screenOnly` visible on screen, hidden in print.
  - `.printOnly` hidden on screen, visible in print.
- Keep A4/page break behavior consistent with existing POW print styles.
- Every section bundle starts on a new page.
- Separator pages are full-page and force page break before/after.

## DUPA Inclusion and Ordering Rules
- Data source: all project-included pay items tied to selected/active project.
- Include one DUPA form per pay item.
- Suggested stable sort:
  1. `part` (A, B, C...)
  2. `payItemNumber` (natural sort)
  3. `payItemDescription` (tie-break)

## Implementation Phases

### Phase 1 - Workspace Shell
- Add `PrescribedFormsWorkspace` with tabs and existing POW content.
- Add `Print / Save as PDF` action at workspace level.

### Phase 2 - Unified Print Composer
- Add hidden print container that renders packet order:
  - POW bundle
  - ABC separator
  - ABC bundle
  - DUPA separator
  - DUPA bundle

### Phase 3 - ABC Forms
- Build ABC Summary page from prescribed layout.
- Build ABC detailed items page from prescribed layout.
- Wire ABC totals/signatories and page breaks.

### Phase 4 - DUPA Forms
- Build DUPA page template from prescribed layout.
- Render all project pay items as separate DUPA pages.
- Ensure section calculations (A/B/C...K) match current formulas.

### Phase 5 - Hardening
- Validate data parity against existing POW/estimate outputs.
- Verify print pagination, repeated headers, and separator pages.
- Regression checks for totals, percentages, and unit costs.

## Regression Checklist
- [ ] Tab switching does not affect printed packet completeness.
- [ ] POW pages print unchanged from current approved output.
- [ ] ABC summary and detailed totals match computed source values.
- [ ] DUPA includes all project pay items.
- [ ] DUPA ordering is stable and deterministic.
- [ ] Separator pages appear at correct boundaries.
- [ ] Print/PDF page breaks are correct on Chrome/Edge.

## Implementation Status (2026-02-17)
- Implemented workspace shell with tabs and shared print action in `src/components/program-of-works/PrescribedFormsWorkspace.tsx`.
- Implemented unified print packet composer with section separators and fixed sequence (POW -> ABC -> DUPA).
- Added ABC and DUPA API routes:
  - `src/app/api/projects/[id]/abc-report/route.ts`
  - `src/app/api/projects/[id]/dupa-report/route.ts`
- Added ABC and DUPA data hooks:
  - `src/components/program-of-works/hooks/useAbcReportData.ts`
  - `src/components/program-of-works/hooks/useDupaReportData.ts`
- Added new forms:
  - `src/components/program-of-works/forms/FormABCSummaryPage.tsx`
  - `src/components/program-of-works/forms/FormABCItemsPage.tsx`
  - `src/components/program-of-works/forms/FormDUPAPage.tsx`
- Added print bundles and separator page:
  - `src/components/program-of-works/print/PowPrintBundle.tsx`
  - `src/components/program-of-works/print/AbcPrintBundle.tsx`
  - `src/components/program-of-works/print/DupaPrintBundle.tsx`
  - `src/components/program-of-works/print/SectionSeparatorPage.tsx`
- Added supporting types and calculation helpers:
  - `src/types/abc.ts`
  - `src/types/dupa.ts`
  - `src/components/program-of-works/utils/abc-calculations.ts`
  - `src/components/program-of-works/utils/dupa-calculations.ts`
- Updated form constants to include `13-14` and `13-16` and expanded shared header support.

## Validation Log (2026-02-17)
- `npm run typecheck` passed.
- `npm run test -- --run` passed (`11` files, `180` tests).
- `npm run lint` blocked by existing tooling compatibility issue in repository (`@rushstack/eslint-patch`).

## Patch Notes (2026-02-17)
- Fixed duplicate React keys in `src/components/program-of-works/forms/FormABCItemsPage.tsx` by emitting division headers only on division transition and using unique composite keys.
- Added server-side merged PDF endpoint with mixed orientation support:
  - `src/app/api/projects/[id]/prescribed-forms-pdf/route.ts`
- Added workspace action `Download Merged PDF` in `src/components/program-of-works/PrescribedFormsWorkspace.tsx`.
- DUPA section in server-generated packet is rendered in portrait orientation; POW and ABC sections are landscape.

## Notes for Other Agents
- Prioritize no-behavior-change for already working POW forms.
- Reuse shared components (`DpwhFormHeader`, `ProjectInfoSection`, `A4PageWrapper`) where possible.
- Keep calculations in pure utility modules (avoid JSX-embedded formulas).
- Do not tie print data to active tab state.
