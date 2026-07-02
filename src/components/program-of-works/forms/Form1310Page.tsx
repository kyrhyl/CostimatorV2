import type { PowReportData } from '@/types/program-of-works';
import { useMemo } from 'react';
import { A4PageWrapper } from '../common/A4PageWrapper';
import { DpwhFormHeader } from '../common/DpwhFormHeader';
import { ProjectInfoSection } from '../common/ProjectInfoSection';
import { SignatoriesSection } from '../common/SignatoriesSection';
import { buildWorksRows } from '../utils/row-builders';

interface Form1310PageProps {
  data: PowReportData;
  totalDirectCost: number;
  formatCurrency: (value: number) => string;
}

export function Form1310Page({ data, totalDirectCost, formatCurrency }: Form1310PageProps) {
  const worksRows = useMemo(() => buildWorksRows(data.worksItems, formatCurrency), [data.worksItems, formatCurrency]);

  return (
    <A4PageWrapper pageNumber={1}>
      <DpwhFormHeader formNumber="13-10" />
      <ProjectInfoSection header={data.header} variant="full" />

      <div className="grid grid-cols-2 gap-3 mb-1">
        <div>
          <div className="mb-0 font-semibold text-[0.6rem]">Work Location:</div>
          <table className="w-full border border-black text-[0.6rem] mb-1">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th rowSpan={2} className="border border-black px-1 py-0 align-bottom text-[0.55rem]">Project Component ID</th>
                <th rowSpan={2} className="border border-black px-1 py-0 align-bottom text-[0.55rem]">Infra ID</th>
                <th colSpan={2} className="border border-black px-1 py-0 text-[0.55rem]">Chainage</th>
                <th colSpan={2} className="border border-black px-1 py-0 text-[0.55rem]">Station Limits</th>
                <th colSpan={2} className="border border-black px-1 py-0 text-[0.55rem]">Coordinates</th>
              </tr>
              <tr className="bg-gray-800 text-white">
                <th className="border border-black px-1 py-0 text-[0.55rem]">Start X</th>
                <th className="border border-black px-1 py-0 text-[0.55rem]">End Y</th>
                <th className="border border-black px-1 py-0 text-[0.55rem]">Start X</th>
                <th className="border border-black px-1 py-0 text-[0.55rem]">End Y</th>
                <th className="border border-black px-1 py-0 text-[0.55rem]">Latitude</th>
                <th className="border border-black px-1 py-0 text-[0.55rem]">Longitude</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-1 py-0">{data.projectComponent.componentId}</td>
                <td className="border border-black px-1 py-0">{data.projectComponent.infraId}</td>
                <td className="border border-black px-1 py-0">{data.projectComponent.chainage.start}</td>
                <td className="border border-black px-1 py-0">{data.projectComponent.chainage.end}</td>
                <td className="border border-black px-1 py-0">{data.projectComponent.stationLimits.start}</td>
                <td className="border border-black px-1 py-0">{data.projectComponent.stationLimits.end}</td>
                <td className="border border-black px-1 py-0">{data.projectComponent.coordinates.latitude > 0 ? data.projectComponent.coordinates.latitude : ''}</td>
                <td className="border border-black px-1 py-0">{data.projectComponent.coordinates.longitude > 0 ? data.projectComponent.coordinates.longitude : ''}</td>
              </tr>
            </tbody>
          </table>
          <div className="mb-0 font-semibold text-[0.6rem]">Allotted Amount:</div>
          <table className="w-full border border-black text-[0.6rem] mb-1">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-black px-1 py-0 text-[0.55rem]">Project Component ID</th>
                <th className="border border-black px-1 py-0 text-[0.55rem]">Estimated Project Component Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-1 py-0">{data.projectComponent.componentId}</td>
                <td className="border border-black px-1 py-0 text-right">{formatCurrency(data.estimatedComponentCost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <div className="mb-0 font-semibold text-[0.6rem]">Fund Source:</div>
          <table className="w-full border border-black text-[0.6rem] mb-1">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-black px-1 py-0 text-[0.55rem]">Project ID</th>
                <th className="border border-black px-1 py-0 text-[0.55rem]">Funding Agreement</th>
                <th className="border border-black px-1 py-0 text-[0.55rem]">Funding Organization</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-1 py-0">{data.fundingSource.projectId}</td>
                <td className="border border-black px-1 py-0">{data.fundingSource.fundingAgreement}</td>
                <td className="border border-black px-1 py-0">{data.fundingSource.fundingOrganization}</td>
              </tr>
            </tbody>
          </table>
          <div className="mb-0 font-semibold text-[0.6rem]">Physical Target:</div>
          <table className="w-full border border-black text-[0.6rem] mb-1">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-black px-1 py-0 text-[0.55rem]">Infra Type</th>
                <th className="border border-black px-1 py-0 text-[0.55rem]">Project Component ID</th>
                <th className="border border-black px-1 py-0 text-[0.55rem]">Target Amount</th>
                <th className="border border-black px-1 py-0 text-[0.55rem]">Unit of Measure</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-1 py-0">{data.physicalTarget.infraType}</td>
                <td className="border border-black px-1 py-0">{data.physicalTarget.projectComponentId}</td>
                <td className="border border-black px-1 py-0 text-right">{data.physicalTarget.targetAmount}</td>
                <td className="border border-black px-1 py-0">{data.physicalTarget.unitOfMeasure}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-1 print-break-inside">
        <table className="w-full border border-black text-[0.55rem] leading-none">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="border border-black px-1 py-0 text-[0.55rem]">Description of Works to be Done</th>
              <th className="border border-black px-1 py-0 text-[0.55rem]">Quantity</th>
              <th className="border border-black px-1 py-0 text-[0.55rem]">Unit</th>
              <th className="border border-black px-1 py-0 text-[0.55rem]">% Total</th>
              <th className="border border-black px-1 py-0 text-[0.55rem]">As Submitted<br />Total Direct Cost</th>
              <th className="border border-black px-1 py-0 text-[0.55rem]">% Total</th>
              <th className="border border-black px-1 py-0 text-[0.55rem]">As Evaluated<br />Total Direct Cost</th>
            </tr>
          </thead>
          <tbody>
            {worksRows}
            <tr className="font-bold">
              <td className="border border-black px-1 py-0 text-right text-[0.55rem]" colSpan={3}>TOTAL</td>
              <td className="border border-black px-1 py-0 text-[0.55rem]">100%</td>
              <td className="border border-black px-1 py-0 text-[0.55rem] text-right">{formatCurrency(totalDirectCost)}</td>
              <td className="border border-black px-1 py-0 text-[0.55rem]"></td>
              <td className="border border-black px-1 py-0 text-[0.55rem]"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-1">
        <div className="border border-black">
          <div className="bg-gray-800 text-white text-[0.55rem] font-bold px-2 py-[0.5px] border-b border-black">Minimum Equipment Requirement:</div>
          <table className="w-full border-collapse text-[0.55rem] border-t-0">
            <thead>
              <tr className="bg-gray-100">
                <th className="border-black border-x border-b px-1 py-0 text-[0.55rem]">Equipment Description</th>
                <th className="border-black border-r border-b px-1 py-0 text-[0.55rem]">Capacity</th>
                <th className="border-black border-r border-b px-1 py-0 text-[0.55rem]">Number of Equipment</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border border-black px-1 py-0 text-[0.55rem]"></td><td className="border border-black px-1 py-0 text-[0.55rem]"></td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
              <tr><td className="border border-black px-1 py-0 text-[0.55rem]"></td><td className="border border-black px-1 py-0 text-[0.55rem]"></td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
              <tr><td className="border border-black px-1 py-0 text-[0.55rem]"></td><td className="border border-black px-1 py-0 text-[0.55rem]"></td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
              <tr><td className="border border-black px-1 py-0 text-[0.55rem] text-center text-red-700" colSpan={3}>(SEE FORM DPWH-QMSP-13-12 Rev00)</td></tr>
              <tr><td className="border border-black px-1 py-0 text-[0.55rem]"></td><td className="border border-black px-1 py-0 text-[0.55rem]"></td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
              <tr><td className="border border-black px-1 py-0 text-[0.55rem]"></td><td className="border border-black px-1 py-0 text-[0.55rem]"></td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
            </tbody>
          </table>
        </div>
        <div className="border border-black">
          <div className="bg-gray-800 text-white text-[0.55rem] font-bold px-2 py-[0.5px]">Breakdown of Expenditures:</div>
          <table className="w-full border-collapse text-[0.55rem]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-1 py-0 text-[0.55rem]">Description</th>
                <th className="border border-black px-1 py-0 text-[0.55rem]">As Submitted</th>
                <th className="border border-black px-1 py-0 text-[0.55rem]">As Evaluated</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border border-black px-1 py-0 text-[0.55rem]">A. Labor</td><td className="border border-black px-1 py-0 text-[0.55rem] text-right">{formatCurrency(data.breakdown.labor)}</td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
              <tr><td className="border border-black px-1 py-0 text-[0.55rem]">B. Materials</td><td className="border border-black px-1 py-0 text-[0.55rem] text-right">{formatCurrency(data.breakdown.materials)}</td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
              <tr><td className="border border-black px-1 py-0 text-[0.55rem]">C. Equipment</td><td className="border border-black px-1 py-0 text-[0.55rem] text-right">{formatCurrency(data.breakdown.equipment)}</td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
              <tr><td className="border border-black px-1 py-0 text-[0.55rem]">D. Total Direct Cost (A+B+C)</td><td className="border border-black px-1 py-0 text-[0.55rem] text-right font-bold">{formatCurrency(data.breakdown.directCost)}</td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
              <tr><td className="border border-black px-1 py-0 text-[0.55rem]">E. Overhead, Contingencies and Miscellaneous (OCM) Expenses and Contractor's Profit (CP)</td><td className="border border-black px-1 py-0 text-[0.55rem] text-right">{formatCurrency(data.breakdown.ocm)}</td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
              <tr><td className="border border-black px-1 py-0 text-[0.55rem]">F. Value Added Tax (VAT)</td><td className="border border-black px-1 py-0 text-[0.55rem] text-right">{formatCurrency(data.breakdown.vat)}</td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
              <tr><td className="border border-black px-1 py-0 text-[0.55rem]">G. Total Construction Cost (D+E+F)</td><td className="border border-black px-1 py-0 text-[0.55rem] text-right font-bold">{formatCurrency(data.breakdown.totalEstimatedCost)}</td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
              <tr><td className="border border-black px-1 py-0 text-[0.55rem]">H. Engineering & Administrative Overhead (EAO), <span className="font-bold">{data.breakdown.eaoPercentage}</span>%</td><td className="border border-black px-1 py-0 text-[0.55rem] text-right">{formatCurrency(data.breakdown.eao)}</td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
              <tr className="font-bold"><td className="border border-black px-1 py-0 text-[0.55rem]">I. TOTAL ESTIMATED COST</td><td className="border border-black px-1 py-0 text-[0.55rem] text-right">{formatCurrency(data.breakdown.totalEstimatedCost + data.breakdown.eao)}</td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <SignatoriesSection signatories={data.signatories} />
    </A4PageWrapper>
  );
}
