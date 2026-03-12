import type { DupaItemBreakdown, DupaReportData } from '@/types/dupa';
import { A4PageWrapper } from '../common/A4PageWrapper';
import { DpwhFormHeader } from '../common/DpwhFormHeader';

interface FormDUPAPageProps {
  report: DupaReportData;
  item: DupaItemBreakdown;
  pageNumber: string;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
  editable?: boolean;
  laborSuggestions?: string[];
  equipmentSuggestions?: string[];
  materialSuggestions?: string[];
  onLaborFieldChange?: (index: number, field: 'designation' | 'noOfPersons' | 'noOfHours' | 'hourlyRate', value: string | number) => void;
  onEquipmentFieldChange?: (index: number, field: 'description' | 'noOfUnits' | 'noOfHours' | 'hourlyRate', value: string | number) => void;
  onMaterialFieldChange?: (index: number, field: 'description' | 'unit' | 'quantity' | 'unitCost', value: string | number) => void;
  onAddLaborRow?: () => void;
  onAddEquipmentRow?: () => void;
  onAddMaterialRow?: () => void;
  onRemoveLaborRow?: (index: number) => void;
  onRemoveEquipmentRow?: (index: number) => void;
  onRemoveMaterialRow?: (index: number) => void;
}

function toInputNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : '0';
}

export function FormDUPAPage({
  report,
  item,
  pageNumber,
  formatCurrency,
  formatNumber,
  editable = false,
  laborSuggestions = [],
  equipmentSuggestions = [],
  materialSuggestions = [],
  onLaborFieldChange,
  onEquipmentFieldChange,
  onMaterialFieldChange,
  onAddLaborRow,
  onAddEquipmentRow,
  onAddMaterialRow,
  onRemoveLaborRow,
  onRemoveEquipmentRow,
  onRemoveMaterialRow,
}: FormDUPAPageProps) {
  const laborRows = item.laborItems.length > 0 ? item.laborItems : [{ designation: 'None', noOfPersons: 0, noOfHours: 0, hourlyRate: 0, amount: 0 }];
  const equipmentRows = item.equipmentItems.length > 0 ? item.equipmentItems : [{ description: 'None', noOfUnits: 0, noOfHours: 0, hourlyRate: 0, amount: 0 }];
  const materialRows = item.materialItems.length > 0 ? item.materialItems : [{ description: 'None', unit: '-', quantity: 0, unitCost: 0, amount: 0 }];

  const getLaborRowKey = (row: (typeof laborRows)[number], index: number) =>
    `${row.designation}-${row.noOfPersons}-${row.noOfHours}-${row.hourlyRate}-${index}`;
  const getEquipmentRowKey = (row: (typeof equipmentRows)[number], index: number) =>
    `${row.description}-${row.noOfUnits}-${row.noOfHours}-${row.hourlyRate}-${index}`;
  const getMaterialRowKey = (row: (typeof materialRows)[number], index: number) =>
    `${row.description}-${row.unit}-${row.quantity}-${row.unitCost}-${index}`;

  const inputClass = 'w-full rounded border border-slate-300 bg-white px-1 py-[1px] text-[0.66rem] leading-tight';

  return (
    <A4PageWrapper pageNumber={pageNumber} orientation="portrait">
      <DpwhFormHeader formNumber="13-16" />

      <div className="text-[0.68rem] mb-1.5">
        <div className="flex"><span className="w-40 font-semibold">Implementing Office:</span><span>{report.header.implementingOffice}</span></div>
        <div className="flex"><span className="w-40 font-semibold">Address:</span><span>{report.header.address}</span></div>
        <div className="flex"><span className="w-40 font-semibold">Project Name:</span><span>{report.header.projectName}</span></div>
        <div className="flex"><span className="w-40 font-semibold">Project Location:</span><span>{report.header.projectLocation}</span></div>
      </div>

      <div className="text-[0.75rem] mb-1.5">
        <div><span className="font-semibold">Pay Item Number:</span> {item.payItemNumber}</div>
        <div><span className="font-semibold">Pay Item Description:</span> {item.payItemDescription}</div>
        <div><span className="font-semibold">Unit of Measurement:</span> {item.unitOfMeasurement}</div>
        <div><span className="font-semibold">Output per hour - As Submitted:</span> {formatNumber(item.outputPerHour)}</div>
      </div>

      <datalist id="dupa-labor-suggestions">
        {laborSuggestions.map((label, index) => (
          <option key={`${label}-${index}`} value={label} />
        ))}
      </datalist>
      <datalist id="dupa-equipment-suggestions">
        {equipmentSuggestions.map((label, index) => (
          <option key={`${label}-${index}`} value={label} />
        ))}
      </datalist>
      <datalist id="dupa-material-suggestions">
        {materialSuggestions.map((label, index) => (
          <option key={`${label}-${index}`} value={label} />
        ))}
      </datalist>

      <table className="w-full border-collapse text-[0.7rem] leading-tight">
        <thead>
          <tr className="bg-[#333] text-white"><th className="px-1 py-1 text-left" style={{ border: '1px solid #000' }} colSpan={6}>LABOR</th></tr>
          <tr>
            <th className="px-1 py-1" style={{ border: '1px solid #000', width: '7%' }}></th>
            <th className="px-1 py-1" style={{ border: '1px solid #000' }}>DESIGNATION</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000', width: '13%' }}>NO. OF PERSON/S</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000', width: '13%' }}>NO. OF HOUR/S</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000', width: '13%' }}>HOURLY RATE</th>
            <th className="px-1 py-1" style={{ border: '1px solid #000', width: '20%' }}>AMOUNT (PhP)</th>
          </tr>
        </thead>
        <tbody>
          {laborRows.map((row, idx) => (
            <tr key={getLaborRowKey(row, idx)}>
              <td className="px-1 py-[1px]" style={{ border: '1px solid #000' }}>{idx === 0 ? 'A.1' : ''}</td>
              <td className="px-1 py-[1px]" style={{ border: '1px solid #000' }}>
                {editable ? (
                  <div>
                    <input
                      list="dupa-labor-suggestions"
                      className={inputClass}
                      value={row.designation}
                      onChange={(e) => onLaborFieldChange?.(idx, 'designation', e.target.value)}
                    />
                    {laborRows.length > 1 && (
                      <button type="button" className="mt-[1px] text-[10px] text-red-600" onClick={() => onRemoveLaborRow?.(idx)}>Remove</button>
                    )}
                  </div>
                ) : row.designation}
              </td>
              <td className="px-1 py-[1px] text-right" style={{ border: '1px solid #000' }}>
                {editable ? (
                  <input className={inputClass} type="number" value={toInputNumber(row.noOfPersons)} onChange={(e) => onLaborFieldChange?.(idx, 'noOfPersons', Number(e.target.value || 0))} />
                ) : (row.noOfPersons > 0 ? formatNumber(row.noOfPersons) : '-')}
              </td>
              <td className="px-1 py-[1px] text-right" style={{ border: '1px solid #000' }}>
                {editable ? (
                  <input className={inputClass} type="number" value={toInputNumber(row.noOfHours)} onChange={(e) => onLaborFieldChange?.(idx, 'noOfHours', Number(e.target.value || 0))} />
                ) : (row.noOfHours > 0 ? formatNumber(row.noOfHours) : '-')}
              </td>
              <td className="px-1 py-[1px] text-right" style={{ border: '1px solid #000' }}>
                {editable ? (
                  <input className={inputClass} type="number" value={toInputNumber(row.hourlyRate)} onChange={(e) => onLaborFieldChange?.(idx, 'hourlyRate', Number(e.target.value || 0))} />
                ) : (row.hourlyRate > 0 ? formatNumber(row.hourlyRate) : '-')}
              </td>
              <td className="px-1 py-[1px] text-right" style={{ border: '1px solid #000' }}>{row.amount > 0 ? formatCurrency(row.amount) : '-'}</td>
            </tr>
          ))}
          {editable && (
            <tr>
              <td style={{ border: '1px solid #000' }}></td>
              <td colSpan={5} className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>
                <button type="button" className="text-[11px] font-semibold text-blue-700" onClick={onAddLaborRow}>+ Add labor row</button>
              </td>
            </tr>
          )}
          <tr className="font-semibold"><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }} colSpan={5}>Sub - Total for A.1 - As Submitted</td><td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.totals.laborSubmitted)}</td></tr>
          <tr><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>A.2</td><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }} colSpan={4}>Sub - Total for A.2 - As Evaluated</td><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td></tr>

          <tr className="bg-[#333] text-white"><th className="px-1 py-1 text-left" style={{ border: '1px solid #000' }} colSpan={6}>EQUIPMENT</th></tr>
          {equipmentRows.map((row, idx) => (
            <tr key={getEquipmentRowKey(row, idx)}>
              <td className="px-1 py-[1px]" style={{ border: '1px solid #000' }}>{idx === 0 ? 'B.1' : ''}</td>
              <td className="px-1 py-[1px]" style={{ border: '1px solid #000' }}>
                {editable ? (
                  <div>
                    <input
                      list="dupa-equipment-suggestions"
                      className={inputClass}
                      value={row.description}
                      onChange={(e) => onEquipmentFieldChange?.(idx, 'description', e.target.value)}
                    />
                    {equipmentRows.length > 1 && (
                      <button type="button" className="mt-[1px] text-[10px] text-red-600" onClick={() => onRemoveEquipmentRow?.(idx)}>Remove</button>
                    )}
                  </div>
                ) : row.description}
              </td>
              <td className="px-1 py-[1px] text-right" style={{ border: '1px solid #000' }}>
                {editable ? (
                  <input className={inputClass} type="number" value={toInputNumber(row.noOfUnits)} onChange={(e) => onEquipmentFieldChange?.(idx, 'noOfUnits', Number(e.target.value || 0))} />
                ) : (row.noOfUnits > 0 ? formatNumber(row.noOfUnits) : '-')}
              </td>
              <td className="px-1 py-[1px] text-right" style={{ border: '1px solid #000' }}>
                {editable ? (
                  <input className={inputClass} type="number" value={toInputNumber(row.noOfHours)} onChange={(e) => onEquipmentFieldChange?.(idx, 'noOfHours', Number(e.target.value || 0))} />
                ) : (row.noOfHours > 0 ? formatNumber(row.noOfHours) : '-')}
              </td>
              <td className="px-1 py-[1px] text-right" style={{ border: '1px solid #000' }}>
                {editable ? (
                  <input className={inputClass} type="number" value={toInputNumber(row.hourlyRate)} onChange={(e) => onEquipmentFieldChange?.(idx, 'hourlyRate', Number(e.target.value || 0))} />
                ) : (row.hourlyRate > 0 ? formatNumber(row.hourlyRate) : '-')}
              </td>
              <td className="px-1 py-[1px] text-right" style={{ border: '1px solid #000' }}>{row.amount > 0 ? formatCurrency(row.amount) : '-'}</td>
            </tr>
          ))}
          {editable && (
            <tr>
              <td style={{ border: '1px solid #000' }}></td>
              <td colSpan={5} className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>
                <button type="button" className="text-[11px] font-semibold text-blue-700" onClick={onAddEquipmentRow}>+ Add equipment row</button>
              </td>
            </tr>
          )}
          <tr className="font-semibold"><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }} colSpan={5}>Sub - Total for B.1 - As Submitted</td><td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.totals.equipmentSubmitted)}</td></tr>
          <tr><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>B.2</td><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }} colSpan={4}>Sub - Total for B.2 - As Evaluated</td><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td></tr>

          <tr><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>C.1</td><td className="px-1 py-[2px] font-semibold" style={{ border: '1px solid #000' }} colSpan={4}>Total(A.1 + B.1) - As Submitted</td><td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.totals.directCostSubmitted)}</td></tr>
          <tr><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>C.2</td><td className="px-1 py-[2px] font-semibold" style={{ border: '1px solid #000' }} colSpan={4}>Total(A.2 + B.2) - As Evaluated</td><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td></tr>
          <tr><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>D.1</td><td className="px-1 py-[2px] font-semibold" style={{ border: '1px solid #000' }} colSpan={4}>Output per hour - As Submitted</td><td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatNumber(item.totals.outputSubmitted)}</td></tr>
          <tr><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>D.2</td><td className="px-1 py-[2px] font-semibold" style={{ border: '1px solid #000' }} colSpan={4}>Output per hour - As Evaluated</td><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td></tr>
          <tr><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>E.1</td><td className="px-1 py-[2px] font-semibold" style={{ border: '1px solid #000' }} colSpan={4}>Direct Unit Cost(C.1 / D.1) - As Submitted</td><td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.totals.directUnitCostSubmitted)}</td></tr>
          <tr><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>E.2</td><td className="px-1 py-[2px] font-semibold" style={{ border: '1px solid #000' }} colSpan={4}>Direct Unit Cost(C.2 / D.2) - As Evaluated</td><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td></tr>

          <tr className="bg-[#333] text-white"><th className="px-1 py-1 text-left" style={{ border: '1px solid #000' }} colSpan={6}>MATERIAL</th></tr>
          {materialRows.map((row, idx) => (
            <tr key={getMaterialRowKey(row, idx)}>
              <td className="px-1 py-[1px]" style={{ border: '1px solid #000' }}>{idx === 0 ? 'F.1' : ''}</td>
              <td className="px-1 py-[1px]" style={{ border: '1px solid #000' }}>
                {editable ? (
                  <div>
                    <input
                      list="dupa-material-suggestions"
                      className={inputClass}
                      value={row.description}
                      onChange={(e) => onMaterialFieldChange?.(idx, 'description', e.target.value)}
                    />
                    {materialRows.length > 1 && (
                      <button type="button" className="mt-[1px] text-[10px] text-red-600" onClick={() => onRemoveMaterialRow?.(idx)}>Remove</button>
                    )}
                  </div>
                ) : row.description}
              </td>
              <td className="px-1 py-[1px] text-center" style={{ border: '1px solid #000' }}>
                {editable ? (
                  <input className={inputClass} value={row.unit} onChange={(e) => onMaterialFieldChange?.(idx, 'unit', e.target.value)} />
                ) : row.unit}
              </td>
              <td className="px-1 py-[1px] text-right" style={{ border: '1px solid #000' }}>
                {editable ? (
                  <input className={inputClass} type="number" value={toInputNumber(row.quantity)} onChange={(e) => onMaterialFieldChange?.(idx, 'quantity', Number(e.target.value || 0))} />
                ) : (row.quantity > 0 ? formatNumber(row.quantity) : '-')}
              </td>
              <td className="px-1 py-[1px] text-right" style={{ border: '1px solid #000' }}>
                {editable ? (
                  <input className={inputClass} type="number" value={toInputNumber(row.unitCost)} onChange={(e) => onMaterialFieldChange?.(idx, 'unitCost', Number(e.target.value || 0))} />
                ) : (row.unitCost > 0 ? formatCurrency(row.unitCost) : '-')}
              </td>
              <td className="px-1 py-[1px] text-right" style={{ border: '1px solid #000' }}>{row.amount > 0 ? formatCurrency(row.amount) : '-'}</td>
            </tr>
          ))}
          {editable && (
            <tr>
              <td style={{ border: '1px solid #000' }}></td>
              <td colSpan={5} className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>
                <button type="button" className="text-[11px] font-semibold text-blue-700" onClick={onAddMaterialRow}>+ Add material row</button>
              </td>
            </tr>
          )}
          <tr className="font-semibold"><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }} colSpan={5}>Sub - Total for F.1 - As Submitted</td><td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.totals.materialsSubmitted)}</td></tr>
          <tr><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>F.2</td><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }} colSpan={4}>Sub - Total for F.2 - As Evaluated</td><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td></tr>

          <tr><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>G.1</td><td className="px-1 py-[2px] font-semibold" style={{ border: '1px solid #000' }} colSpan={4}>Direct Unit Cost(E.1 + F.1) - As Submitted</td><td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.totals.directUnitPlusMaterialsSubmitted)}</td></tr>
          <tr><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>G.2</td><td className="px-1 py-[2px] font-semibold" style={{ border: '1px solid #000' }} colSpan={4}>Direct Unit Cost(E.2 + F.2) - As Evaluated</td><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td></tr>
          <tr><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>H.1</td><td className="px-1 py-[2px] font-semibold" style={{ border: '1px solid #000' }} colSpan={3}>Overhead, Contingencies & Miscellaneous (OCM) Expenses - As Submitted</td><td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{item.totals.ocmPercent.toFixed(0)}%</td><td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.totals.ocmValue)}</td></tr>
          <tr><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>H.2</td><td className="px-1 py-[2px] font-semibold" style={{ border: '1px solid #000' }} colSpan={4}>Overhead, Contingencies & Miscellaneous (OCM) Expenses - As Evaluated</td><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td></tr>
          <tr><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>I.1</td><td className="px-1 py-[2px] font-semibold" style={{ border: '1px solid #000' }} colSpan={3}>Contractor&apos;s Profit (CP) - As Submitted</td><td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{item.totals.cpPercent.toFixed(0)}%</td><td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.totals.cpValue)}</td></tr>
          <tr><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>I.2</td><td className="px-1 py-[2px] font-semibold" style={{ border: '1px solid #000' }} colSpan={4}>Contractor&apos;s Profit (CP) - As Evaluated</td><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td></tr>
          <tr><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>J.1</td><td className="px-1 py-[2px] font-semibold" style={{ border: '1px solid #000' }} colSpan={3}>Value Added Tax (VAT) - As Submitted</td><td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{item.totals.vatPercent.toFixed(0)}%</td><td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.totals.vatValue)}</td></tr>
          <tr><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>J.2</td><td className="px-1 py-[2px] font-semibold" style={{ border: '1px solid #000' }} colSpan={4}>Value Added Tax (VAT) - As Evaluated</td><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td></tr>
          <tr className="bg-[#ffff66] font-semibold"><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>K.1</td><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }} colSpan={4}>Total Unit Cost - As Submitted</td><td className="px-1 py-[2px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.totals.totalUnitCostSubmitted)}</td></tr>
          <tr><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}>K.2</td><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }} colSpan={4}>Total Unit Cost - As Evaluated</td><td className="px-1 py-[2px]" style={{ border: '1px solid #000' }}></td></tr>
        </tbody>
      </table>

      <div className="mt-2 text-[0.75rem] print-break-inside">
        <div className="font-semibold">Prepared by:</div>
        <div className="mt-5 border-t border-black w-[300px] pt-1 text-center">
          <div className="font-semibold">{report.signatories.preparedBy.name || 'Signature Name'}</div>
          <div>{report.signatories.preparedBy.position || 'Position'}</div>
          <div>{report.signatories.preparedBy.section || 'Section'}</div>
        </div>
      </div>
    </A4PageWrapper>
  );
}
