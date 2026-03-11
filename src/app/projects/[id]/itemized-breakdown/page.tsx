'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ItemizedLineItem {
  payItemNumber: string;
  payItemDescription: string;
  quantity: number;
  quantityEvaluated: number;
  unitOfMeasurement: string;
  directCostTotal: number;
  directCostTotalEvaluated: number;
  directCostUnit: number;
  directCostUnitEvaluated: number;
  totalUnitCost: number;
  totalUnitCostEvaluated: number;
  percentDirectCost: number;
}

interface PartGroup {
  part: string;
  partDescription: string;
  division: string;
  items: ItemizedLineItem[];
  partTotal: number;
  partPercent: number;
}

interface ItemizedBreakdownData {
  header: {
    implementingOffice: string;
    address: string;
    projectName: string;
    projectLocation: string;
    datePrepared: string;
  };
  parts: PartGroup[];
  summary: {
    totalDirectCost: number;
    totalParts: number;
    totalItems: number;
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ItemizedBreakdownPage({ params }: PageProps) {
  const [data, setData] = useState<ItemizedBreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectId, setProjectId] = useState<string>('');

  useEffect(() => {
    params.then(({ id }) => {
      setProjectId(id);
      loadData(id);
    });
  }, [params]);

  const loadData = async (id: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/projects/${id}/itemized-breakdown`);
      const json = await response.json();

      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to load itemized breakdown data');
      }
    } catch (err) {
      console.error('Failed to load itemized breakdown:', err);
      setError('Failed to load itemized breakdown data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (!value || value === 0) return '-';
    return value.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatNumber = (value: number) => {
    if (!value || value === 0) return '-';
    return value.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading itemized breakdown...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-xl text-center bg-white border border-gray-200 rounded-lg p-8">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to load report</h2>
          <p className="text-gray-600 mb-6">{error || 'Missing report data.'}</p>
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Project
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 8mm;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .no-print,
          [data-print-hide="true"] { 
            display: none !important; 
            visibility: hidden !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          body, .min-h-screen, .bg-gray-50 { 
            background-color: white !important; 
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-container {
            box-shadow: none !important;
            border: none !important;
            width: 277mm !important;
            min-height: 190mm !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: none !important;
          }
          .sheet {
            page-break-after: always;
          }
          .sheet:last-child {
            page-break-after: auto;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50">
        <div className="no-print print:hidden bg-white border-b border-gray-200" style={{ display: 'block' }} data-print-hide="true">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link href={`/projects/${projectId}`} className="text-sm text-blue-600 hover:text-blue-800">
                ← Back to Project
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Itemized Breakdown</h1>
              <p className="text-sm text-gray-600">DPWH-QMSP-13-11 Rev00</p>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/projects/${projectId}/pow-report`}
                className="inline-flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700"
              >
                ← POW Report
              </Link>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
                </svg>
                Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
            
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="print-container">
            {data.parts.map((part, partIndex) => (
              <section key={part.part} className="sheet bg-white border border-slate-900 p-5 mb-4 shadow-lg relative">
                {partIndex === 0 && (
                  <>
                    <header className="flex items-start justify-between mb-4">
                      <div className="w-20">
                        <div className="w-16 h-16 bg-slate-100 flex items-center justify-center text-[0.5rem] text-center text-slate-500 rounded border border-slate-300">
                          DPWH<br/>Logo
                        </div>
                      </div>
                      <div className="flex-1 text-center pt-2">
                        <div className="text-[11px] font-normal">Republic of the Philippines</div>
                        <div className="text-[11px] font-bold uppercase tracking-wide">Department of Public Works and Highways</div>
                        <div className="text-[12px] font-bold uppercase tracking-[0.2em] mt-2">Itemized Breakdown</div>
                      </div>
                      <div className="w-32 text-right pt-1">
                        <div className="text-[10px] font-semibold">DPWH-QMSP-13-11 Rev00</div>
                      </div>
                    </header>

                    <div className="space-y-1 mb-4">
                      <div className="flex items-baseline">
                        <span className="text-[10px] font-semibold w-28">Implementing Office:</span>
                        <span className="flex-1 border-b border-slate-900 text-[10px] px-1">{data.header.implementingOffice}</span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-[10px] font-semibold w-28">Address:</span>
                        <span className="flex-1 border-b border-slate-900 text-[10px] px-1">{data.header.address}</span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-[10px] font-semibold w-28">Project Name:</span>
                        <span className="flex-1 border-b border-slate-900 text-[10px] px-1">{data.header.projectName}</span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-[10px] font-semibold w-28">Project Location:</span>
                        <span className="flex-1 border-b border-slate-900 text-[10px] px-1">{data.header.projectLocation}</span>
                      </div>
                    </div>
                  </>
                )}

                <table className="w-full border-collapse text-[9px]" style={{ border: '1px solid #000' }}>
                  <thead>
                    <tr className="bg-[#4a4a4a] text-white">
                      <th rowSpan={2} className="px-2 py-2 text-left font-normal w-16" style={{ border: '1px solid #000' }}>ITEM NO.</th>
                      <th rowSpan={2} className="px-2 py-2 text-left font-normal w-48" style={{ border: '1px solid #000' }}>DESCRIPTION</th>
                      <th colSpan={2} className="px-2 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>QUANTITY</th>
                      <th rowSpan={2} className="px-2 py-2 text-center font-normal w-12" style={{ border: '1px solid #000' }}>UNIT</th>
                      <th colSpan={2} className="px-2 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>DIRECT COST<br/>TOTAL</th>
                      <th colSpan={2} className="px-2 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>DIRECT COST<br/>UNIT COST</th>
                      <th colSpan={2} className="px-2 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>TOTAL UNIT COST<br/>DIRECT + INDIRECT</th>
                      <th rowSpan={2} className="px-2 py-2 text-center font-normal w-16" style={{ border: '1px solid #000' }}>% DIRECT COST</th>
                    </tr>
                    <tr className="bg-[#4a4a4a] text-white">
                      <th className="px-2 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS SUBMITTED</th>
                      <th className="px-2 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS EVALUATED</th>
                      <th className="px-2 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS SUBMITTED</th>
                      <th className="px-2 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS EVALUATED</th>
                      <th className="px-2 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS SUBMITTED</th>
                      <th className="px-2 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS EVALUATED</th>
                      <th className="px-2 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS SUBMITTED</th>
                      <th className="px-2 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS EVALUATED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {part.division && (
                      <tr className="bg-[#808080] font-semibold uppercase">
                        <td className="px-2 py-1" style={{ border: '1px solid #000' }}>{part.division}</td>
                        <td className="px-2 py-1" colSpan={11} style={{ border: '1px solid #000' }}>
                          {part.division === 'DIVISION I' ? 'General' : 
                           part.division === 'DIVISION II' ? 'Buildings' : 
                           part.division === 'DIVISION III' ? 'Water Supply and Sewerage' : 
                           part.division === 'DIVISION IV' ? 'Bridges' : 
                           part.division === 'DIVISION V' ? 'Flood Control' : ''}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-[#a9a9a9] font-semibold uppercase">
                      <td className="px-2 py-1" style={{ border: '1px solid #000' }}>{part.part}</td>
                      <td className="px-2 py-1" colSpan={11} style={{ border: '1px solid #000' }}>{part.partDescription}</td>
                    </tr>
                    {part.items.map((item, itemIndex) => (
                      <tr key={itemIndex}>
                        <td className="px-2 py-[3px] text-center" style={{ border: '1px solid #000' }}>{item.payItemNumber}</td>
                        <td className="px-2 py-[3px]" style={{ border: '1px solid #000' }}>{item.payItemDescription}</td>
                        <td className="px-2 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatNumber(item.quantity)}</td>
                        <td className="px-2 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatNumber(item.quantityEvaluated)}</td>
                        <td className="px-2 py-[3px] text-center" style={{ border: '1px solid #000' }}>{item.unitOfMeasurement}</td>
                        <td className="px-2 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.directCostTotal)}</td>
                        <td className="px-2 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.directCostTotalEvaluated)}</td>
                        <td className="px-2 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.directCostUnit)}</td>
                        <td className="px-2 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.directCostUnitEvaluated)}</td>
                        <td className="px-2 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.totalUnitCost)}</td>
                        <td className="px-2 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.totalUnitCostEvaluated)}</td>
                        <td className="px-2 py-[3px] text-right" style={{ border: '1px solid #000' }}>{item.percentDirectCost.toFixed(2)}%</td>
                      </tr>
                    ))}
                    <tr className="bg-[#d3d3d3] font-semibold">
                      <td className="px-2 py-[3px]" colSpan={5} style={{ border: '1px solid #000' }}>Total of {part.part}</td>
                      <td className="px-2 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.partTotal)}</td>
                      <td className="px-2 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.partTotal)}</td>
                      <td className="px-2 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
                      <td className="px-2 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
                      <td className="px-2 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
                      <td className="px-2 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
                      <td className="px-2 py-[3px] text-right" style={{ border: '1px solid #000' }}>{part.partPercent.toFixed(2)}%</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            ))}

            {data.parts.length === 0 && (
              <div className="sheet bg-white border border-slate-900 p-5 shadow-lg text-center py-12">
                <p className="text-gray-500">No items found for this project.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
