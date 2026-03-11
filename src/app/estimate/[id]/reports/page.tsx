'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface IBOQLine {
  itemNo: string;
  description: string;
  unit: string;
  quantity: number;
  part?: string;
  partDescription?: string;
  division?: string;
  payItemNumber?: string;
  unitPrice?: number;
  totalAmount?: number;
  materialCost?: number;
  laborCost?: number;
  equipmentCost?: number;
  materialPercent?: number;
  laborPercent?: number;
  equipmentPercent?: number;
  breakdown?: {
    directCostSubmitted: number;
    directCostEvaluated: number;
    ocmSubmitted: number;
    ocmEvaluated: number;
    cpSubmitted: number;
    cpEvaluated: number;
    vatSubmitted: number;
    vatEvaluated: number;
    totalSubmitted: number;
    totalEvaluated: number;
  };
}

interface IEstimate {
  _id: string;
  projectName: string;
  projectLocation: string;
  implementingOffice: string;
  boqLines: IBOQLine[];
  totalDirectCostSubmitted: number;
  totalDirectCostEvaluated: number;
  totalOCMSubmitted: number;
  totalOCMEvaluated: number;
  totalCPSubmitted: number;
  totalCPEvaluated: number;
  totalVATSubmitted: number;
  totalVATEvaluated: number;
  grandTotalSubmitted: number;
  grandTotalEvaluated: number;
  createdAt: string;
  updatedAt: string;
}

export default function EstimateReportsPage() {
  const params = useParams();
  const id = params?.id as string;
  const printRef = useRef<HTMLDivElement>(null);

  const [estimate, setEstimate] = useState<IEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'comparison'>('summary');

  const fetchEstimate = useCallback(async () => {
    try {
      const response = await fetch(`/api/estimates/${id}`);
      const data = await response.json();

      if (data.success) {
        setEstimate(data.data);
      } else {
        setError(data.error || 'Failed to load estimate');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchEstimate();
    }
  }, [id, fetchEstimate]);

  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!estimate) return;

    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('DETAILED COST ESTIMATE', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(estimate.implementingOffice, pageWidth / 2, 28, { align: 'center' });
      
      // Project details
      doc.setFontSize(10);
      let yPos = 40;
      doc.text(`Project Name: ${estimate.projectName}`, 14, yPos);
      yPos += 6;
      doc.text(`Location: ${estimate.projectLocation}`, 14, yPos);
      yPos += 6;
      doc.text(`Date Prepared: ${formatDate(estimate.createdAt)}`, 14, yPos);
      yPos += 10;
      
      if (reportType === 'summary') {
        // Summary Report
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('COST SUMMARY', 14, yPos);
        yPos += 8;
        
        // As Submitted
        autoTable(doc, {
          startY: yPos,
          head: [['Cost Component', 'As Submitted']],
          body: [
            ['Direct Cost', formatCurrency(estimate.totalDirectCostSubmitted)],
            ['OCM', formatCurrency(estimate.totalOCMSubmitted)],
            ['Contractor\'s Profit', formatCurrency(estimate.totalCPSubmitted)],
            ['VAT', formatCurrency(estimate.totalVATSubmitted)],
            ['GRAND TOTAL', formatCurrency(estimate.grandTotalSubmitted)]
          ],
          theme: 'grid',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [34, 139, 34] },
          columnStyles: { 1: { halign: 'right' } }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
        
        // As Evaluated
        autoTable(doc, {
          startY: yPos,
          head: [['Cost Component', 'As Evaluated']],
          body: [
            ['Direct Cost', formatCurrency(estimate.totalDirectCostEvaluated)],
            ['OCM', formatCurrency(estimate.totalOCMEvaluated)],
            ['Contractor\'s Profit', formatCurrency(estimate.totalCPEvaluated)],
            ['VAT', formatCurrency(estimate.totalVATEvaluated)],
            ['GRAND TOTAL', formatCurrency(estimate.grandTotalEvaluated)]
          ],
          theme: 'grid',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [37, 99, 235] },
          columnStyles: { 1: { halign: 'right' } }
        });
      } else if (reportType === 'detailed') {
        // Detailed BOQ
        const tableData = estimate.boqLines.map(line => {
          const unitPriceSubmitted = line.breakdown?.totalSubmitted || line.unitPrice || 0;
          const unitPriceEvaluated = line.breakdown?.totalEvaluated || line.unitPrice || 0;
          return [
            line.itemNo,
            line.description,
            line.unit,
            line.quantity.toLocaleString(),
            formatCurrency(unitPriceSubmitted),
            formatCurrency(unitPriceSubmitted * line.quantity),
            formatCurrency(unitPriceEvaluated),
            formatCurrency(unitPriceEvaluated * line.quantity)
          ];
        });
        
        autoTable(doc, {
          startY: yPos,
          head: [['Item No', 'Description', 'Unit', 'Qty', 'Rate (Sub.)', 'Amount (Sub.)', 'Rate (Eval.)', 'Amount (Eval.)']],
          body: tableData,
          foot: [['', '', '', '', '', formatCurrency(estimate.grandTotalSubmitted), '', formatCurrency(estimate.grandTotalEvaluated)]],
          theme: 'striped',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [55, 65, 81] },
          footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 50 },
            2: { cellWidth: 15, halign: 'center' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right' },
            7: { halign: 'right' }
          }
        });
      } else {
        // Comparison Report
        autoTable(doc, {
          startY: yPos,
          head: [['Cost Component', 'As Submitted', 'As Evaluated', 'Difference', 'Variance %']],
          body: [
            [
              'Direct Cost',
              formatCurrency(estimate.totalDirectCostSubmitted),
              formatCurrency(estimate.totalDirectCostEvaluated),
              formatCurrency(estimate.totalDirectCostEvaluated - estimate.totalDirectCostSubmitted),
              estimate.totalDirectCostSubmitted > 0 ? ((estimate.totalDirectCostEvaluated / estimate.totalDirectCostSubmitted - 1) * 100).toFixed(2) + '%' : '0.00%'
            ],
            [
              'OCM',
              formatCurrency(estimate.totalOCMSubmitted),
              formatCurrency(estimate.totalOCMEvaluated),
              formatCurrency(estimate.totalOCMEvaluated - estimate.totalOCMSubmitted),
              estimate.totalOCMSubmitted > 0 ? ((estimate.totalOCMEvaluated / estimate.totalOCMSubmitted - 1) * 100).toFixed(2) + '%' : '0.00%'
            ],
            [
              'Contractor\'s Profit',
              formatCurrency(estimate.totalCPSubmitted),
              formatCurrency(estimate.totalCPEvaluated),
              formatCurrency(estimate.totalCPEvaluated - estimate.totalCPSubmitted),
              estimate.totalCPSubmitted > 0 ? ((estimate.totalCPEvaluated / estimate.totalCPSubmitted - 1) * 100).toFixed(2) + '%' : '0.00%'
            ],
            [
              'VAT',
              formatCurrency(estimate.totalVATSubmitted),
              formatCurrency(estimate.totalVATEvaluated),
              formatCurrency(estimate.totalVATEvaluated - estimate.totalVATSubmitted),
              estimate.totalVATSubmitted > 0 ? ((estimate.totalVATEvaluated / estimate.totalVATSubmitted - 1) * 100).toFixed(2) + '%' : '0.00%'
            ],
            [
              'GRAND TOTAL',
              formatCurrency(estimate.grandTotalSubmitted),
              formatCurrency(estimate.grandTotalEvaluated),
              formatCurrency(estimate.grandTotalEvaluated - estimate.grandTotalSubmitted),
              estimate.grandTotalSubmitted > 0 ? ((estimate.grandTotalEvaluated / estimate.grandTotalSubmitted - 1) * 100).toFixed(2) + '%' : '0.00%'
            ]
          ],
          theme: 'grid',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [55, 65, 81] },
          columnStyles: {
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' }
          }
        });
      }
      
      // Save PDF
      const fileName = `${estimate.projectName.replace(/[^a-z0-9]/gi, '_')}_${reportType}_report.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading estimate...</p>
        </div>
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Estimate</h2>
          <p className="text-gray-600 mb-6">{error || 'Estimate not found'}</p>
          <Link
            href="/estimate"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Back to Estimates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header (Hidden when printing) */}
      <div className="bg-white border-b border-gray-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Link href="/estimate" className="hover:text-blue-600">Estimates</Link>
            <span>/</span>
            <Link href={`/estimate/${id}`} className="hover:text-blue-600">{estimate.projectName}</Link>
            <span>/</span>
            <span className="text-gray-900">Reports</span>
          </div>

          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Cost Estimate Report</h1>
            
            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
              <button
                onClick={handleExportPDF}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Export PDF
              </button>

            </div>
          </div>

          {/* Report Type Selector */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setReportType('summary')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                reportType === 'summary'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Summary Report
            </button>
            <button
              onClick={() => setReportType('detailed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                reportType === 'detailed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Detailed BOQ
            </button>
            <button
              onClick={() => setReportType('comparison')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                reportType === 'comparison'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Submitted vs Evaluated
            </button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div ref={printRef} className="max-w-7xl mx-auto px-4 py-8">
        {/* Report Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              DETAILED COST ESTIMATE
            </h1>
            <p className="text-lg text-gray-600">{estimate.implementingOffice}</p>
          </div>

          <div className="border-t border-b border-gray-300 py-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Project Name:</p>
                <p className="font-semibold text-gray-900">{estimate.projectName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Location:</p>
                <p className="font-semibold text-gray-900">{estimate.projectLocation}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date Prepared:</p>
                <p className="font-semibold text-gray-900">{formatDate(estimate.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Updated:</p>
                <p className="font-semibold text-gray-900">{formatDate(estimate.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Report */}
        {reportType === 'summary' && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Cost Summary</h2>
            
            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* As Submitted */}
              <div>
                <h3 className="text-lg font-semibold text-green-700 mb-4 pb-2 border-b-2 border-green-500">
                  As Submitted
                </h3>
                <table className="w-full">
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-2 text-gray-700">Direct Cost</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(estimate.totalDirectCostSubmitted)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-700">OCM (Overhead, Contingency, Miscellaneous)</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(estimate.totalOCMSubmitted)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-700">Contractor&apos;s Profit</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(estimate.totalCPSubmitted)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-700">VAT (12%)</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(estimate.totalVATSubmitted)}</td>
                    </tr>
                    <tr className="border-t-2 border-gray-300">
                      <td className="py-3 font-bold text-gray-900">GRAND TOTAL</td>
                      <td className="py-3 text-right font-bold text-green-700 text-xl">
                        {formatCurrency(estimate.grandTotalSubmitted)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* As Evaluated */}
              <div>
                <h3 className="text-lg font-semibold text-blue-700 mb-4 pb-2 border-b-2 border-blue-500">
                  As Evaluated
                </h3>
                <table className="w-full">
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-2 text-gray-700">Direct Cost</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(estimate.totalDirectCostEvaluated)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-700">OCM (Overhead, Contingency, Miscellaneous)</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(estimate.totalOCMEvaluated)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-700">Contractor&apos;s Profit</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(estimate.totalCPEvaluated)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-700">VAT (12%)</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(estimate.totalVATEvaluated)}</td>
                    </tr>
                    <tr className="border-t-2 border-gray-300">
                      <td className="py-3 font-bold text-gray-900">GRAND TOTAL</td>
                      <td className="py-3 text-right font-bold text-blue-700 text-xl">
                        {formatCurrency(estimate.grandTotalEvaluated)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-gray-300">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total BOQ Items</p>
                <p className="text-2xl font-bold text-gray-900">{estimate.boqLines.length}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Price Difference</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(Math.abs(estimate.grandTotalSubmitted - estimate.grandTotalEvaluated))}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Variance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {estimate.grandTotalSubmitted > 0
                    ? ((estimate.grandTotalEvaluated / estimate.grandTotalSubmitted - 1) * 100).toFixed(2)
                    : '0.00'}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Detailed BOQ Report */}
        {reportType === 'detailed' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-700 text-white">
                  <tr>
                    <th className="px-3 py-3 text-left font-semibold">Item No</th>
                    <th className="px-3 py-3 text-left font-semibold">Description</th>
                    <th className="px-3 py-3 text-left font-semibold">Pay Item</th>
                    <th className="px-3 py-3 text-center font-semibold">Unit</th>
                    <th className="px-3 py-3 text-right font-semibold">Quantity</th>
                    <th className="px-3 py-3 text-right font-semibold">Unit Price (Sub.)</th>
                    <th className="px-3 py-3 text-right font-semibold">Amount (Sub.)</th>
                    <th className="px-3 py-3 text-right font-semibold">Unit Price (Eval.)</th>
                    <th className="px-3 py-3 text-right font-semibold">Amount (Eval.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {estimate.boqLines.map((line, index) => {
                    const unitPriceSubmitted = line.breakdown?.totalSubmitted || line.unitPrice || 0;
                    const unitPriceEvaluated = line.breakdown?.totalEvaluated || line.unitPrice || 0;
                    const amountSubmitted = unitPriceSubmitted * line.quantity;
                    const amountEvaluated = unitPriceEvaluated * line.quantity;

                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{line.itemNo}</td>
                        <td className="px-3 py-2">
                          {line.description}
                          {line.part && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {line.part} {line.partDescription && `- ${line.partDescription}`}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{line.payItemNumber || '-'}</td>
                        <td className="px-3 py-2 text-center">{line.unit}</td>
                        <td className="px-3 py-2 text-right font-medium">{line.quantity.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(unitPriceSubmitted)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-green-700">{formatCurrency(amountSubmitted)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(unitPriceEvaluated)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-blue-700">{formatCurrency(amountEvaluated)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={6} className="px-3 py-3 text-right font-bold">GRAND TOTAL:</td>
                    <td className="px-3 py-3 text-right font-bold text-green-700 text-lg">
                      {formatCurrency(estimate.grandTotalSubmitted)}
                    </td>
                    <td className="px-3 py-3"></td>
                    <td className="px-3 py-3 text-right font-bold text-blue-700 text-lg">
                      {formatCurrency(estimate.grandTotalEvaluated)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Comparison Report */}
        {reportType === 'comparison' && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Submitted vs Evaluated Comparison</h2>
            
            <table className="w-full">
              <thead className="bg-gray-700 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Cost Component</th>
                  <th className="px-4 py-3 text-right font-semibold">As Submitted</th>
                  <th className="px-4 py-3 text-right font-semibold">As Evaluated</th>
                  <th className="px-4 py-3 text-right font-semibold">Difference</th>
                  <th className="px-4 py-3 text-right font-semibold">% Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 font-medium">Direct Cost</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(estimate.totalDirectCostSubmitted)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(estimate.totalDirectCostEvaluated)}</td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(estimate.totalDirectCostEvaluated - estimate.totalDirectCostSubmitted)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {estimate.totalDirectCostSubmitted > 0
                      ? ((estimate.totalDirectCostEvaluated / estimate.totalDirectCostSubmitted - 1) * 100).toFixed(2)
                      : '0.00'}%
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">OCM</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(estimate.totalOCMSubmitted)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(estimate.totalOCMEvaluated)}</td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(estimate.totalOCMEvaluated - estimate.totalOCMSubmitted)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {estimate.totalOCMSubmitted > 0
                      ? ((estimate.totalOCMEvaluated / estimate.totalOCMSubmitted - 1) * 100).toFixed(2)
                      : '0.00'}%
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Contractor&apos;s Profit</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(estimate.totalCPSubmitted)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(estimate.totalCPEvaluated)}</td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(estimate.totalCPEvaluated - estimate.totalCPSubmitted)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {estimate.totalCPSubmitted > 0
                      ? ((estimate.totalCPEvaluated / estimate.totalCPSubmitted - 1) * 100).toFixed(2)
                      : '0.00'}%
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">VAT</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(estimate.totalVATSubmitted)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(estimate.totalVATEvaluated)}</td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(estimate.totalVATEvaluated - estimate.totalVATSubmitted)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {estimate.totalVATSubmitted > 0
                      ? ((estimate.totalVATEvaluated / estimate.totalVATSubmitted - 1) * 100).toFixed(2)
                      : '0.00'}%
                  </td>
                </tr>
                <tr className="bg-gray-100 border-t-2 border-gray-300">
                  <td className="px-4 py-4 font-bold text-lg">GRAND TOTAL</td>
                  <td className="px-4 py-4 text-right font-bold text-green-700 text-lg">
                    {formatCurrency(estimate.grandTotalSubmitted)}
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-blue-700 text-lg">
                    {formatCurrency(estimate.grandTotalEvaluated)}
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-lg">
                    {formatCurrency(estimate.grandTotalEvaluated - estimate.grandTotalSubmitted)}
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-lg">
                    {estimate.grandTotalSubmitted > 0
                      ? ((estimate.grandTotalEvaluated / estimate.grandTotalSubmitted - 1) * 100).toFixed(2)
                      : '0.00'}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Footer (for print) */}
        <div className="mt-8 text-center text-sm text-gray-600 print:block hidden">
          <p>Generated on {new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p className="mt-1">Costimator - DPWH Cost Estimation Platform</p>
        </div>
      </div>
    </div>
  );
}
