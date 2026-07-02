interface PartSummary {
  part: string;
  description: string;
  totalAmount: number;
}

interface EquipmentSummary {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

interface ExpenditureSummary {
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  ocmCost?: number;
  profitMargin?: number;
  vat?: number;
  totalEstimatedCost: number;
}

interface ProgramOfWorksOverviewSummaryProps {
  projectName: string;
  projectLocation: string;
  implementingOffice: string;
  district: string;
  appropriation?: number;
  fundSourceLabel: string;
  startDate?: string;
  endDate?: string;
  workableDays?: number;
  unworkableDays?: number;
  totalDuration?: number;
  totalProjectCost: number;
  partSummaries: PartSummary[];
  equipment: EquipmentSummary[];
  expenditureBreakdown: ExpenditureSummary;
  prescribedEao?: number;
  prescribedEaoPercentage?: number;
  onOpenItemized: () => void;
  onOpenDupa: () => void;
  reportLink?: string;
}

const formatCurrency = (value: number) =>
  `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatPercent = (value: number) => `${Number(value || 0).toFixed(2)}%`;

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDays = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '-';
  return `${value} day${value === 1 ? '' : 's'}`;
};

export default function ProgramOfWorksOverviewSummary({
  projectName,
  projectLocation,
  implementingOffice,
  district,
  appropriation,
  fundSourceLabel,
  startDate,
  endDate,
  workableDays,
  unworkableDays,
  totalDuration,
  totalProjectCost,
  partSummaries,
  equipment,
  expenditureBreakdown,
  prescribedEao,
  prescribedEaoPercentage,
  onOpenItemized,
  onOpenDupa,
  reportLink,
}: ProgramOfWorksOverviewSummaryProps) {
  const topParts = [...partSummaries]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 3);

  const partsTotal = partSummaries.reduce((sum, part) => sum + Number(part.totalAmount || 0), 0);
  const partsShareBase = partsTotal > 0 ? partsTotal : totalProjectCost;

  const directExpenditureTotal =
    (expenditureBreakdown.laborCost || 0) +
    (expenditureBreakdown.materialCost || 0) +
    (expenditureBreakdown.equipmentCost || 0);

  const ocm = expenditureBreakdown.ocmCost || 0;
  const cp = expenditureBreakdown.profitMargin || 0;
  const vat = expenditureBreakdown.vat || 0;
  const vatBase = directExpenditureTotal + ocm + cp;
  const ocmPercentage = directExpenditureTotal > 0 ? (ocm / directExpenditureTotal) * 100 : 0;
  const cpPercentage = directExpenditureTotal > 0 ? (cp / directExpenditureTotal) * 100 : 0;
  const vatPercentage = vatBase > 0 ? (vat / vatBase) * 100 : 0;
  const eaoPercentage = prescribedEaoPercentage ?? 1;
  const eao = prescribedEao ?? Math.round((expenditureBreakdown.totalEstimatedCost || 0) * (eaoPercentage / 100) * 100) / 100;
  const totalWithEao = (expenditureBreakdown.totalEstimatedCost || 0) + eao;
  const appropriationValue = Number(appropriation || 0);
  const balance = appropriationValue - totalWithEao;
  const exceedsAppropriation = balance < 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <h2 className="text-sm font-semibold text-slate-900">Program of Works Summary Sheet</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onOpenItemized} className="rounded-md border border-blue-200 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50">Itemized</button>
          <button type="button" onClick={onOpenDupa} className="rounded-md border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50">DUPA</button>
          {reportLink && (
            <a href={reportLink} target="_blank" rel="noreferrer" className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800">Full Report</a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-0 border-b border-slate-200 lg:grid-cols-2">
        <dl className="grid grid-cols-[170px_1fr] gap-x-3 gap-y-1.5 px-3 py-3 text-[14px]">
          <dt className="text-slate-600">Project Name</dt><dd className="font-semibold text-slate-900">{projectName || '-'}</dd>
          <dt className="text-slate-600">Location</dt><dd className="text-slate-900">{projectLocation || '-'}</dd>
          <dt className="text-slate-600">District</dt><dd className="text-slate-900">{district || '-'}</dd>
          <dt className="text-slate-600">Implementing Office</dt><dd className="text-slate-900">{implementingOffice || '-'}</dd>
          <dt className="text-slate-600">Fund Source</dt><dd className="text-slate-900">{fundSourceLabel || '-'}</dd>
        </dl>

        <dl className="grid grid-cols-[170px_1fr] gap-x-3 gap-y-1.5 border-t border-slate-200 px-3 py-3 text-[14px] lg:border-l lg:border-t-0">
          <dt className="text-slate-600">Target Start</dt><dd className="text-slate-900">{formatDate(startDate)}</dd>
          <dt className="text-slate-600">Target Completion</dt><dd className="text-slate-900">{formatDate(endDate)}</dd>
          <dt className="text-slate-600">Workable Days</dt><dd className="text-slate-900">{formatDays(workableDays)}</dd>
          <dt className="text-slate-600">Unworkable Days</dt><dd className="text-slate-900">{formatDays(unworkableDays)}</dd>
          <dt className="text-slate-600">Total Duration</dt><dd className="font-semibold text-slate-900">{formatDays(totalDuration)}</dd>
        </dl>
      </div>

      <div className="space-y-3 p-3">
        <section className="rounded-md border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
            Appropriation Summary
          </div>
          <div className="grid grid-cols-1 gap-0 text-[14px] md:grid-cols-3">
            <div className="border-b border-slate-100 px-3 py-2 md:border-b-0 md:border-r">
              <p className="text-xs uppercase tracking-wide text-slate-600">Appropriation</p>
              <p className="mt-1 font-semibold text-slate-900 tabular-nums">{formatCurrency(appropriationValue)}</p>
            </div>
            <div className="border-b border-slate-100 px-3 py-2 md:border-b-0 md:border-r">
              <p className="text-xs uppercase tracking-wide text-slate-600">Total Estimated Cost (with EAO)</p>
              <p className="mt-1 font-semibold text-slate-900 tabular-nums">{formatCurrency(totalWithEao)}</p>
            </div>
            <div className={`px-3 py-2 ${exceedsAppropriation ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <p className={`text-xs uppercase tracking-wide ${exceedsAppropriation ? 'text-red-700' : 'text-emerald-700'}`}>Balance (Appropriation - Total)</p>
              <p className={`mt-1 font-bold tabular-nums ${exceedsAppropriation ? 'text-red-700' : 'text-emerald-700'}`}>
                {formatCurrency(balance)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
            Description of Works (Direct Cost Summary)
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-[14px]">
              <thead className="text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Part</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-right">Direct Cost</th>
                  <th className="px-3 py-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {partSummaries.map((part) => {
                  const share = partsShareBase > 0 ? (part.totalAmount / partsShareBase) * 100 : 0;
                  return (
                    <tr key={part.part} className="border-t border-slate-100 odd:bg-white even:bg-slate-50/60">
                      <td className="px-3 py-1.5 font-semibold text-slate-900">{part.part}</td>
                      <td className="px-3 py-1.5 text-slate-800">{part.description}</td>
                      <td className="px-3 py-1.5 text-right text-slate-900 tabular-nums">{formatCurrency(part.totalAmount)}</td>
                      <td className="px-3 py-1.5 text-right text-slate-700 tabular-nums">{share.toFixed(2)}%</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-slate-300 bg-slate-100/70">
                  <td className="px-3 py-2 font-semibold text-slate-900" colSpan={2}>TOTAL</td>
                  <td className="px-3 py-2 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(partsTotal)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800 tabular-nums">
                    {partsShareBase > 0 ? '100.00%' : '0.00%'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {topParts.length > 0 && (
            <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-600">
              Top Components: {topParts.map((part) => part.part).join(' • ')}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <section className="rounded-md border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
              Minimum Equipment Requirement
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-[14px]">
                <thead className="text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Equipment</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-left">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.length === 0 ? (
                    <tr className="border-t border-slate-100">
                      <td colSpan={3} className="px-3 py-3 text-[14px] text-slate-600">No minimum equipment listed.</td>
                    </tr>
                  ) : (
                    equipment.slice(0, 8).map((item) => (
                      <tr key={item.id} className="border-t border-slate-100 odd:bg-white even:bg-slate-50/60">
                        <td className="px-3 py-1.5 text-slate-900">{item.name}</td>
                        <td className="px-3 py-1.5 text-right font-semibold text-slate-900 tabular-nums">{item.quantity.toLocaleString('en-PH')}</td>
                        <td className="px-3 py-1.5 text-slate-800">{item.unit}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-md border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
              Breakdown of Expenditures
            </div>
            <div className="px-3 py-2 text-[14px] tabular-nums">
              <div className="flex items-center justify-between py-1.5"><span className="text-slate-700">Labor</span><span className="font-medium text-slate-900">{formatCurrency(expenditureBreakdown.laborCost || 0)}</span></div>
              <div className="flex items-center justify-between py-1.5"><span className="text-slate-700">Materials</span><span className="font-medium text-slate-900">{formatCurrency(expenditureBreakdown.materialCost || 0)}</span></div>
              <div className="flex items-center justify-between py-1.5"><span className="text-slate-700">Equipment</span><span className="font-medium text-slate-900">{formatCurrency(expenditureBreakdown.equipmentCost || 0)}</span></div>
              <div className="mt-1 border-t border-dashed border-slate-200 pt-1.5 flex items-center justify-between"><span className="text-slate-600">Direct Cost Subtotal</span><span className="font-semibold text-slate-900">{formatCurrency(directExpenditureTotal)}</span></div>
              <div className="flex items-center justify-between py-1.5"><span className="text-slate-700">OCM ({formatPercent(ocmPercentage)})</span><span className="font-medium text-slate-900">{formatCurrency(ocm)}</span></div>
              <div className="flex items-center justify-between py-1.5"><span className="text-slate-700">Contractor's Profit ({formatPercent(cpPercentage)})</span><span className="font-medium text-slate-900">{formatCurrency(cp)}</span></div>
              <div className="flex items-center justify-between py-1.5"><span className="text-slate-700">VAT ({formatPercent(vatPercentage)})</span><span className="font-medium text-slate-900">{formatCurrency(vat)}</span></div>
              <div className="flex items-center justify-between py-1.5"><span className="text-slate-700">EAO ({formatPercent(eaoPercentage)})</span><span className="font-medium text-slate-900">{formatCurrency(eao)}</span></div>
              <div className="mt-1 border-t border-slate-300 pt-1.5 flex items-center justify-between"><span className="font-semibold text-slate-800">Total Estimated Cost</span><span className="font-bold text-slate-900">{formatCurrency(expenditureBreakdown.totalEstimatedCost || 0)}</span></div>
              <div className="mt-1 rounded-md bg-teal-50 px-2.5 py-2 flex items-center justify-between"><span className="font-semibold text-teal-800">Total with EAO</span><span className="font-bold text-teal-900">{formatCurrency(totalWithEao)}</span></div>
            </div>
          </section>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
        Submitted Total Project Cost: <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(totalProjectCost)}</span>
        <span className="mx-2 text-slate-400">|</span>
        Description of Works Direct Cost Total: <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(partsTotal)}</span>
      </div>
    </div>
  );
}
