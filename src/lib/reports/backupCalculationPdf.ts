'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BOQLine, TakeoffLine } from '@/types';
import { classifyDPWHItem, sortDPWHParts } from '@/lib/dpwhClassification';

type ProjectInfo = {
  projectName?: string;
  projectLocation?: string;
  implementingOffice?: string;
  district?: string;
  cmpdVersion?: string;
  settings?: {
    rounding?: {
      concrete?: number;
      rebar?: number;
      formwork?: number;
    };
    waste?: {
      concrete?: number;
      rebar?: number;
      formwork?: number;
    };
  };
};

type CalcRun = {
  runId?: string;
  timestamp?: string;
  takeoffLines: TakeoffLine[];
  summary?: {
    totalConcrete?: number;
    totalRebar?: number;
    totalFormwork?: number;
    takeoffLineCount?: number;
    boqLineCount?: number;
  };
};

type ExportBackupCalculationParams = {
  project: ProjectInfo;
  calcRun: CalcRun;
  boqLines?: BOQLine[];
};

type ItemGroup = {
  dpwhItemNumber: string;
  part: string;
  partName: string;
  subcategory: string;
  description?: string;
  lines: TakeoffLine[];
};

const normalizeKey = (value: string) =>
  value.replace(/\s+/g, ' ').trim().toLowerCase();

const formatNumber = (value: number, maxDecimals = 3) =>
  value.toLocaleString('en-US', { maximumFractionDigits: maxDecimals });

const extractTagValues = (tags: string[], prefix: string) =>
  tags
    .filter((tag) => tag.startsWith(prefix))
    .map((tag) => tag.replace(prefix, '').trim())
    .filter((value) => value.length > 0);

const formatInputsSnapshot = (inputsSnapshot: Record<string, number>) => {
  const entries = Object.entries(inputsSnapshot || {});
  if (entries.length === 0) return '-';
  return entries
    .map(([key, value]) => `${key}=${formatNumber(value, 3)}`)
    .join(', ');
};

const summarizeAssumptions = (lines: TakeoffLine[]) => {
  const all = lines.flatMap((line) => line.assumptions || []).map((item) => item.trim());
  const unique = Array.from(new Set(all)).filter((item) => item.length > 0);
  return unique.slice(0, 5);
};

const getDpwhItemNumber = (line: TakeoffLine) => {
  const dpwhTag = line.tags.find((tag) => tag.startsWith('dpwh:'));
  return dpwhTag ? dpwhTag.replace('dpwh:', '').trim() : '-';
};

const groupLinesByItem = (lines: TakeoffLine[], boqLines?: BOQLine[]) => {
  const descriptionMap = new Map<string, string>();

  if (boqLines) {
    for (const line of boqLines) {
      if (line.dpwhItemNumberRaw) {
        descriptionMap.set(normalizeKey(line.dpwhItemNumberRaw), line.description);
      }
    }
  }

  const groups = new Map<string, ItemGroup>();

  for (const line of lines) {
    const dpwhItemNumber = getDpwhItemNumber(line);
    const classification = classifyDPWHItem(dpwhItemNumber, line.trade);
    const key = `${classification.part}-${classification.subcategory}-${dpwhItemNumber}`;
    const normalizedKey = normalizeKey(dpwhItemNumber);
    const description = descriptionMap.get(normalizedKey);

    if (!groups.has(key)) {
      groups.set(key, {
        dpwhItemNumber,
        part: classification.part,
        partName: classification.partName,
        subcategory: classification.subcategory,
        description,
        lines: [],
      });
    }

    groups.get(key)?.lines.push(line);
  }

  return groups;
};

export function exportBackupCalculationPdf({ project, calcRun, boqLines }: ExportBackupCalculationParams) {
  if (!calcRun.takeoffLines || calcRun.takeoffLines.length === 0) {
    alert('No takeoff data available for export.');
    return;
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const projectName = project.projectName || 'Untitled Project';
  const projectLocation = project.projectLocation || 'N/A';
  const runId = calcRun.runId || 'N/A';
  const runDate = calcRun.timestamp ? new Date(calcRun.timestamp).toLocaleString('en-US') : 'N/A';

  // Cover page
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('BACKUP CALCULATION REPORT (QUANTITIES)', pageWidth / 2, 24, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project: ${projectName}`, pageWidth / 2, 36, { align: 'center' });
  doc.text(`Location: ${projectLocation}`, pageWidth / 2, 42, { align: 'center' });
  doc.text(`Calc Run: ${runId}`, pageWidth / 2, 48, { align: 'center' });
  doc.text(`Generated: ${reportDate}`, pageWidth / 2, 54, { align: 'center' });
  doc.text(`Run Timestamp: ${runDate}`, pageWidth / 2, 60, { align: 'center' });

  doc.setFontSize(10);
  doc.text('Prepared by:', margin, 90);
  doc.text('Reviewed by:', margin, 105);
  doc.text('Approved by:', margin, 120);
  doc.line(margin + 25, 90, pageWidth - margin, 90);
  doc.line(margin + 25, 105, pageWidth - margin, 105);
  doc.line(margin + 25, 120, pageWidth - margin, 120);

  doc.addPage();

  // Executive summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('EXECUTIVE SUMMARY', margin, 20);

  const lines = calcRun.takeoffLines;
  const tradeSummary = new Map<string, { qty: number; units: Set<string>; count: number }>();
  const partSummary = new Map<string, { qtyByUnit: Map<string, number>; count: number }>();

  for (const line of lines) {
    const trade = line.trade;
    if (!tradeSummary.has(trade)) {
      tradeSummary.set(trade, { qty: 0, units: new Set(), count: 0 });
    }
    const tradeEntry = tradeSummary.get(trade)!;
    tradeEntry.qty += line.quantity;
    tradeEntry.units.add(line.unit);
    tradeEntry.count += 1;

    const dpwhItemNumber = getDpwhItemNumber(line);
    const classification = classifyDPWHItem(dpwhItemNumber, line.trade);
    if (!partSummary.has(classification.part)) {
      partSummary.set(classification.part, { qtyByUnit: new Map(), count: 0 });
    }
    const partEntry = partSummary.get(classification.part)!;
    partEntry.count += 1;
    partEntry.qtyByUnit.set(line.unit, (partEntry.qtyByUnit.get(line.unit) || 0) + line.quantity);
  }

  const tradeBody = Array.from(tradeSummary.entries()).map(([trade, data]) => {
    const unitList = Array.from(data.units);
    const unitLabel = unitList.length === 1 ? unitList[0] : 'Mixed units';
    const qtyLabel = unitList.length === 1 ? formatNumber(data.qty, unitLabel === 'kg' ? 2 : 3) : 'Mixed';
    return [trade, qtyLabel, unitLabel, data.count.toString()];
  });

  autoTable(doc, {
    startY: 28,
    head: [['Trade', 'Total Quantity', 'Unit', 'Lines']],
    body: tradeBody,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
    margin: { left: margin, right: margin },
  });

  const partBody = Array.from(partSummary.entries())
    .sort(([a], [b]) => sortDPWHParts(a, b))
    .map(([part, data]) => {
      const qtyList = Array.from(data.qtyByUnit.entries())
        .map(([unit, qty]) => `${formatNumber(qty, unit === 'kg' ? 2 : 3)} ${unit}`)
        .join(', ');
      return [part, qtyList || '0', data.count.toString()];
    });

  const summaryStart = (doc as any).lastAutoTable.finalY + 10;
  autoTable(doc, {
    startY: summaryStart,
    head: [['DPWH Part', 'Quantities', 'Lines']],
    body: partBody,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [34, 197, 94], fontStyle: 'bold' },
    margin: { left: margin, right: margin },
  });

  let currentY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Takeoff Lines: ${lines.length}`, margin, currentY);
  currentY += 6;

  const groups = groupLinesByItem(lines, boqLines);
  const uniqueItemsCount = groups.size;
  doc.text(`Unique DPWH Items: ${uniqueItemsCount}`, margin, currentY);

  doc.addPage();
  currentY = 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('DETAILED BACKUP CALCULATIONS', margin, currentY);
  currentY += 8;

  const groupedByPart: Record<string, Record<string, ItemGroup[]>> = {};
  for (const group of groups.values()) {
    if (!groupedByPart[group.part]) {
      groupedByPart[group.part] = {};
    }
    if (!groupedByPart[group.part][group.subcategory]) {
      groupedByPart[group.part][group.subcategory] = [];
    }
    groupedByPart[group.part][group.subcategory].push(group);
  }

  const sortedParts = Object.keys(groupedByPart).sort(sortDPWHParts);
  for (const part of sortedParts) {
    if (currentY > pageHeight - 20) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(part, margin, currentY);
    currentY += 6;

    const subcategories = Object.keys(groupedByPart[part]).sort();
    for (const subcategory of subcategories) {
      if (currentY > pageHeight - 20) {
        doc.addPage();
        currentY = 18;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(subcategory, margin, currentY);
      currentY += 6;

      const items = groupedByPart[part][subcategory];
      for (const item of items) {
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = 18;
        }

        const itemTotalQty = item.lines.reduce((sum, line) => sum + line.quantity, 0);
        const itemUnits = Array.from(new Set(item.lines.map((line) => line.unit)));
        const unitLabel = itemUnits.length === 1 ? itemUnits[0] : 'Mixed units';
        const qtyLabel = itemUnits.length === 1 ? formatNumber(itemTotalQty, unitLabel === 'kg' ? 2 : 3) : 'Mixed';
        const description = item.description ? ` - ${item.description}` : '';

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${item.dpwhItemNumber}${description}`, margin, currentY);
        currentY += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Quantity: ${qtyLabel} ${unitLabel !== 'Mixed units' ? unitLabel : ''}`.trim(), margin, currentY);
        currentY += 4;

        const tradeSummaryByItem = new Map<string, { count: number; qty: number; units: Set<string> }>();
        const locationSummary = new Map<string, { count: number; qty: number; units: Set<string> }>();
        const stationSummary = new Map<string, { count: number; qty: number; units: Set<string> }>();

        for (const line of item.lines) {
          if (!tradeSummaryByItem.has(line.trade)) {
            tradeSummaryByItem.set(line.trade, { count: 0, qty: 0, units: new Set() });
          }
          const tradeEntry = tradeSummaryByItem.get(line.trade)!;
          tradeEntry.count += 1;
          tradeEntry.qty += line.quantity;
          tradeEntry.units.add(line.unit);

          const locations = extractTagValues(line.tags, 'location:');
          for (const location of locations) {
            if (!locationSummary.has(location)) {
              locationSummary.set(location, { count: 0, qty: 0, units: new Set() });
            }
            const locEntry = locationSummary.get(location)!;
            locEntry.count += 1;
            locEntry.qty += line.quantity;
            locEntry.units.add(line.unit);
          }

          const stations = extractTagValues(line.tags, 'station:');
          for (const station of stations) {
            if (!stationSummary.has(station)) {
              stationSummary.set(station, { count: 0, qty: 0, units: new Set() });
            }
            const stationEntry = stationSummary.get(station)!;
            stationEntry.count += 1;
            stationEntry.qty += line.quantity;
            stationEntry.units.add(line.unit);
          }
        }

        const tradeSummaryRows = Array.from(tradeSummaryByItem.entries()).map(([trade, data]) => {
          const unitList = Array.from(data.units);
          const unit = unitList.length === 1 ? unitList[0] : 'Mixed units';
          const qty = unitList.length === 1 ? formatNumber(data.qty, unit === 'kg' ? 2 : 3) : 'Mixed';
          return [trade, data.count.toString(), qty, unit];
        });

        autoTable(doc, {
          startY: currentY + 2,
          head: [['Similar Items (by Trade)', 'Lines', 'Quantity', 'Unit']],
          body: tradeSummaryRows,
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [245, 158, 11], fontStyle: 'bold' },
          margin: { left: margin, right: margin },
        });

        currentY = (doc as any).lastAutoTable.finalY + 4;

        if (locationSummary.size > 0) {
          const locationRows = Array.from(locationSummary.entries()).map(([location, data]) => {
            const unitList = Array.from(data.units);
            const unit = unitList.length === 1 ? unitList[0] : 'Mixed units';
            const qty = unitList.length === 1 ? formatNumber(data.qty, unit === 'kg' ? 2 : 3) : 'Mixed';
            return [location, data.count.toString(), qty, unit];
          });

          autoTable(doc, {
            startY: currentY,
            head: [['Locations', 'Lines', 'Quantity', 'Unit']],
            body: locationRows,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [16, 185, 129], fontStyle: 'bold' },
            margin: { left: margin, right: margin },
          });
          currentY = (doc as any).lastAutoTable.finalY + 4;
        }

        if (stationSummary.size > 0) {
          const stationRows = Array.from(stationSummary.entries()).map(([station, data]) => {
            const unitList = Array.from(data.units);
            const unit = unitList.length === 1 ? unitList[0] : 'Mixed units';
            const qty = unitList.length === 1 ? formatNumber(data.qty, unit === 'kg' ? 2 : 3) : 'Mixed';
            return [station, data.count.toString(), qty, unit];
          });

          autoTable(doc, {
            startY: currentY,
            head: [['Stations', 'Lines', 'Quantity', 'Unit']],
            body: stationRows,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [99, 102, 241], fontStyle: 'bold' },
            margin: { left: margin, right: margin },
          });
          currentY = (doc as any).lastAutoTable.finalY + 4;
        }

        const assumptions = summarizeAssumptions(item.lines);
        if (assumptions.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text('Assumptions Summary:', margin, currentY + 4);
          doc.setFont('helvetica', 'normal');
          currentY += 8;
          for (const assumption of assumptions) {
            const wrapped = doc.splitTextToSize(`- ${assumption}`, pageWidth - margin * 2);
            doc.text(wrapped, margin, currentY);
            currentY += wrapped.length * 4;
          }
        }

        const lineRows = item.lines.map((line, index) => [
          `${index + 1}`,
          line.trade,
          line.formulaText || '-',
          formatInputsSnapshot(line.inputsSnapshot || {}),
          formatNumber(line.quantity, line.unit === 'kg' ? 2 : 3),
          line.unit,
        ]);

        autoTable(doc, {
          startY: currentY + 2,
          head: [['Line', 'Trade', 'Formula', 'Inputs', 'Qty', 'Unit']],
          body: lineRows,
          theme: 'grid',
          styles: { fontSize: 7 },
          headStyles: { fillColor: [148, 163, 184], fontStyle: 'bold' },
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 18 },
            2: { cellWidth: 55 },
            3: { cellWidth: 50 },
            4: { cellWidth: 14, halign: 'right' },
            5: { cellWidth: 12 },
          },
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;
      }
    }
  }

  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('APPENDIX', margin, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const rounding = project.settings?.rounding || {};
  const waste = project.settings?.waste || {};
  const appendixLines = [
    `Rounding: concrete=${rounding.concrete ?? 'N/A'}, rebar=${rounding.rebar ?? 'N/A'}, formwork=${rounding.formwork ?? 'N/A'}`,
    `Waste: concrete=${waste.concrete ?? 'N/A'}, rebar=${waste.rebar ?? 'N/A'}, formwork=${waste.formwork ?? 'N/A'}`,
    `CMPD Version: ${project.cmpdVersion || 'N/A'}`,
    `Implementing Office: ${project.implementingOffice || 'N/A'}`,
    `District: ${project.district || 'N/A'}`,
  ];

  let appendixY = 28;
  for (const line of appendixLines) {
    const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2);
    doc.text(wrapped, margin, appendixY);
    appendixY += wrapped.length * 5;
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Backup Calculation Report - ${projectName}`,
      margin,
      pageHeight - 6
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  const safeProjectName = projectName.replace(/[^a-z0-9-_]+/gi, '_');
  const filename = `Backup_Calculation_${safeProjectName}_${runId}.pdf`;
  doc.save(filename);
}
