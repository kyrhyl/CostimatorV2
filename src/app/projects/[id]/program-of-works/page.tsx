"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProjectDetailsCard from '@/components/program-of-works/ProjectDetailsCard';
import FinancialSummaryCard from '@/components/program-of-works/FinancialSummaryCard';
import DescriptionOfWorksTable, { type WorksPart } from '@/components/program-of-works/DescriptionOfWorksTable';
import EquipmentRequirements, { type Equipment } from '@/components/program-of-works/EquipmentRequirements';
import BreakdownOfExpenditures, { type ExpenditureBreakdown } from '@/components/program-of-works/BreakdownOfExpenditures';
import ProgramOfWorksKpiRow from '@/components/program-of-works/ProgramOfWorksKpiRow';
import ProgramOfWorksItemizedTable from '@/components/program-of-works/ProgramOfWorksItemizedTable';
import ProgramOfWorksApprovalStatus from '@/components/program-of-works/ProgramOfWorksApprovalStatus';
import ProgramOfWorksRevisionHistory from '@/components/program-of-works/ProgramOfWorksRevisionHistory';
import ProgramOfWorksHauling from '@/components/program-of-works/ProgramOfWorksHauling';
import DigitalSignOffs, { type Signatory } from '@/components/program-of-works/DigitalSignOffs';
import CreateEstimateModal from '@/components/cost-estimates/CreateEstimateModal';
import ManualPowManager from '@/components/program-of-works/ManualPowManager';
import { DupaTab } from '@/components/program-of-works/tabs/DupaTab';
import type { ProjectBoqItem } from '@/components/program-of-works/manual-pow/types';
import type { DupaReportData } from '@/types/dupa';
import { derivePartLabel, normalizePart } from '@/lib/utils/dpwh-constants';
import { computePercentOfProjectCost } from '@/lib/utils/pow-math';

interface Project {
  _id: string;
  projectName: string;
  projectLocation: string;
  district: string;
  cmpdVersion?: string;
  implementingOffice: string;
  appropriation: number;
  distanceFromOffice?: number;
  haulingConfig?: {
    materialName?: string;
    materialSource?: string;
    totalDistance?: number;
    freeHaulingDistance?: number;
    routeSegments?: {
      terrain: string;
      distanceKm: number;
      speedUnloadedKmh: number;
      speedLoadedKmh: number;
    }[];
    equipmentCapacity?: number;
    equipmentRentalRate?: number;
  } | null;
  startDate?: string;
  endDate?: string;
  fundSource?: {
    projectId?: string;
    fundingAgreement?: string;
    fundingOrganization?: string;
  };
  workableDays?: number;
  unworkableDays?: number;
  totalDuration?: number;
  powMode?: 'takeoff' | 'manual';
  manualPowConfig?: {
    laborLocation?: string;
    cmpdVersion?: string;
    district?: string;
    vatPercentage?: number;
    notes?: string;
  } | null;
}

interface SectionConfig {
  id: string;
  label: string;
  icon: JSX.Element;
}

interface PowAdjustment {
  _id?: string;
  lineKey: string;
  payItemNumber: string;
  quantity?: number;
  unitCost?: number;
  reason?: string;
}

interface DupaAdjustmentRecord {
  itemKey: string;
  payItemNumber: string;
  payItemDescription: string;
  part: string;
  unitOfMeasurement: string;
  outputPerHour: number;
  quantity: number;
  laborItems: DupaReportData['items'][number]['laborItems'];
  equipmentItems: DupaReportData['items'][number]['equipmentItems'];
  materialItems: DupaReportData['items'][number]['materialItems'];
  totals: DupaReportData['items'][number]['totals'];
}

const getLineKey = (line: any, index: number) => `${line?._id || line?.payItemNumber || 'line'}-${index}`;
const getDupaItemKey = (item: DupaReportData['items'][number], index: number) =>
  `${item.part}-${item.payItemNumber}-${item.payItemDescription}::${index}`;

const applyEstimateAdjustments = (estimate: any, adjustmentsByLineKey: Record<string, PowAdjustment>) => {
  if (!estimate?.estimateLines?.length) return estimate;

  const adjustedLines = estimate.estimateLines.map((line: any, index: number) => {
    const lineKey = getLineKey(line, index);
    const adjustment = adjustmentsByLineKey[lineKey];
    if (!adjustment) {
      return { ...line, lineKey };
    }

    const quantity = adjustment.quantity ?? Number(line.quantity || 0);
    const unitPrice = adjustment.unitCost ?? Number(line.unitPrice || 0);
    const totalAmount = quantity * unitPrice;
    const lineMultiplier = Number(line.quantity || 0) > 0 ? quantity / Number(line.quantity || 1) : 0;

    return {
      ...line,
      lineKey,
      quantity,
      unitPrice,
      totalAmount,
      laborCost: Number(line.laborCost || 0) * lineMultiplier,
      equipmentCost: Number(line.equipmentCost || 0) * lineMultiplier,
      materialCost: Number(line.materialCost || 0) * lineMultiplier,
      adjusted: true,
      adjustmentReason: adjustment.reason || '',
    };
  });

  const totals = adjustedLines.reduce(
    (acc: any, line: any) => {
      acc.totalDirectCost += Number(line.directCost || 0) * Number(line.quantity || 0);
      acc.grandTotal += Number(line.totalAmount || 0);
      return acc;
    },
    { totalDirectCost: 0, grandTotal: 0 },
  );

  const baseGrandTotal = Number(estimate?.costSummary?.grandTotal || 0);
  const scale = baseGrandTotal > 0 ? totals.grandTotal / baseGrandTotal : 1;
  const baseOCM = Number(estimate?.costSummary?.totalOCM || 0);
  const baseCP = Number(estimate?.costSummary?.totalCP || 0);
  const baseVAT = Number(estimate?.costSummary?.totalVAT || 0);

  return {
    ...estimate,
    estimateLines: adjustedLines,
    costSummary: {
      ...(estimate.costSummary || {}),
      totalDirectCost: totals.totalDirectCost,
      totalOCM: baseOCM * scale,
      totalCP: baseCP * scale,
      subtotalWithMarkup: totals.totalDirectCost + (baseOCM * scale) + (baseCP * scale),
      totalVAT: baseVAT * scale,
      grandTotal: totals.grandTotal,
      rateItemsCount: adjustedLines.length,
    },
  };
};

export default function ProgramOfWorksWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null);
  const [selectedEstimate, setSelectedEstimate] = useState<any>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [manualBoqItems, setManualBoqItems] = useState<ProjectBoqItem[]>([]);
  const [loadingManualBoq, setLoadingManualBoq] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [dupaData, setDupaData] = useState<DupaReportData | null>(null);
  const [dupaLoading, setDupaLoading] = useState(false);
  const [dupaError, setDupaError] = useState<string | null>(null);
  const [dupaAdjustments, setDupaAdjustments] = useState<Record<string, DupaAdjustmentRecord>>({});
  const [selectedDupaPrintKey, setSelectedDupaPrintKey] = useState<string | null>(null);
  const [versionNotFound, setVersionNotFound] = useState(false);
  const [powAdjustments, setPowAdjustments] = useState<Record<string, PowAdjustment>>({});
  const [adjustmentNotice, setAdjustmentNotice] = useState<string | null>(null);
  const estimateIdFromQuery = searchParams.get('estimateId');
  const viewFromQuery = searchParams.get('view');
  const sectionFromQuery = searchParams.get('section');
  const isManualPow = project?.powMode === 'manual';
  const isManualWorkspace = isManualPow && !(viewFromQuery === 'takeoff' && Boolean(estimateIdFromQuery));
  const dupaEstimateRef = isManualWorkspace ? 'manual' : (selectedEstimateId || estimateIdFromQuery || '');

  useEffect(() => {
    if (projectId) {
      fetchProject();
      loadEstimates();
    }
  }, [projectId]);

  useEffect(() => {
    if (!estimateIdFromQuery || estimates.length === 0) return;
    const match = estimates.find((estimate) => estimate._id === estimateIdFromQuery);
    if (match && match._id !== selectedEstimateId) {
      setSelectedEstimateId(match._id);
    }
  }, [estimateIdFromQuery, estimates, selectedEstimateId]);

  useEffect(() => {
    if (loadingProject || !projectId) return;
    const takeoffContext = project?.powMode !== 'manual' || viewFromQuery === 'takeoff';
    if (takeoffContext && !estimateIdFromQuery) {
      router.replace(`/projects/${projectId}?tab=estimates`);
    }
  }, [loadingProject, project?.powMode, viewFromQuery, estimateIdFromQuery, projectId, router]);

  useEffect(() => {
    if (!sectionFromQuery) return;
    setActiveSection(sectionFromQuery);
  }, [sectionFromQuery]);

  useEffect(() => {
    if (!isManualWorkspace && activeSection === 'manual-boq') {
      setActiveSection('overview');
    }
  }, [isManualWorkspace, activeSection]);

  useEffect(() => {
    if (selectedEstimateId) {
      loadEstimateDetail(selectedEstimateId);
    }
  }, [selectedEstimateId]);

  useEffect(() => {
    if (projectId) {
      loadManualBoq();
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    if (!isManualWorkspace && !dupaEstimateRef) return;
    void loadDupaReport();
  }, [projectId, isManualWorkspace, dupaEstimateRef, manualBoqItems.length]);

  useEffect(() => {
    if (!projectId) return;
    void loadPowAdjustments();
  }, [projectId, isManualWorkspace, selectedEstimateId, manualBoqItems.length]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const result = await response.json();
      if (result.success) {
        setProject(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setLoadingProject(false);
    }
  };

  const loadEstimates = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/cost-estimates`);
      const data = await res.json();
      const estimatesList = data.data || data.estimates || [];
      setEstimates(estimatesList);

      const queryMatch = estimateIdFromQuery
        ? estimatesList.find((estimate: any) => estimate._id === estimateIdFromQuery)
        : null;

      if (queryMatch) {
        setVersionNotFound(false);
        setSelectedEstimateId(queryMatch._id);
        return;
      }

      if (estimateIdFromQuery) {
        setVersionNotFound(true);
        setSelectedEstimateId(null);
        return;
      }

      setVersionNotFound(false);

      if (estimatesList.length > 0 && !selectedEstimateId) {
        const activeEstimate = estimatesList.find((e: any) => e.status === 'approved') || estimatesList[0];
        setSelectedEstimateId(activeEstimate._id);
      }
    } catch (err) {
      console.error('Failed to load estimates:', err);
    }
  };

  const loadEstimateDetail = async (estimateId: string) => {
    setLoadingEstimate(true);
    try {
      const res = await fetch(`/api/cost-estimates/${estimateId}`);
      const data = await res.json();
      setSelectedEstimate(data.data || data);
    } catch (err) {
      console.error('Failed to load estimate detail:', err);
    } finally {
      setLoadingEstimate(false);
    }
  };

  const loadManualBoq = async () => {
    if (!projectId) return;
    setLoadingManualBoq(true);
    try {
      const res = await fetch(`/api/project-boq?projectId=${projectId}`);
      const data = await res.json();
      if (data.success) {
        setManualBoqItems(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load manual BOQ items:', err);
    } finally {
      setLoadingManualBoq(false);
    }
  };

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const handlePartClick = (part: string) => {
    setActiveSection('itemized-breakdown');
    setItemSearch(part.replace('PART ', ''));
  };

  const loadDupaReport = async () => {
    if (!projectId) return;
    setDupaLoading(true);
    setDupaError(null);
    try {
      const [baseRes, adjustmentsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/dupa-report`),
        fetch(`/api/projects/${projectId}/dupa-adjustments?estimateRef=${encodeURIComponent(dupaEstimateRef || 'manual')}`),
      ]);
      const baseJson = await baseRes.json();
      const adjustmentsJson = await adjustmentsRes.json();

      if (!baseRes.ok || !baseJson.success) {
        throw new Error(baseJson.error || 'Failed to load DUPA report');
      }

      const adjustmentMap: Record<string, DupaAdjustmentRecord> = {};
      if (adjustmentsRes.ok && adjustmentsJson.success) {
        (adjustmentsJson.data || []).forEach((row: DupaAdjustmentRecord) => {
          adjustmentMap[row.itemKey] = row;
        });
      }

      const baseData: DupaReportData = baseJson.data;
      const mergedItems = baseData.items.map((item, index) => {
        const itemKey = getDupaItemKey(item, index);
        const adjustment = adjustmentMap[itemKey];
        if (!adjustment) return item;
        return {
          ...item,
          laborItems: adjustment.laborItems,
          equipmentItems: adjustment.equipmentItems,
          materialItems: adjustment.materialItems,
          totals: adjustment.totals,
        };
      });

      setDupaAdjustments(adjustmentMap);
      setDupaData({ ...baseData, items: mergedItems });
    } catch (err: any) {
      setDupaError(err.message || 'Failed to load DUPA report');
      setDupaAdjustments({});
      setDupaData(null);
    } finally {
      setDupaLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (projectId) {
      window.open(`/projects/${projectId}/pow-report`, '_blank');
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

const buildManualEstimate = (items: ProjectBoqItem[]) => {
  if (!items || items.length === 0) {
    return null;
  }

  const estimateLines = items.map((item) => {
    const quantity = Number(item.quantity || 0);
    const laborPerUnit = (item.laborItems || []).reduce((sum, entry) => sum + (entry?.amount || 0), 0);
    const equipmentPerUnit = (item.equipmentItems || []).reduce((sum, entry) => sum + (entry?.amount || 0), 0);
    const materialPerUnit = (item.materialItems || []).reduce((sum, entry) => sum + (entry?.amount || 0), 0);
    const directPerUnit = typeof item.directCost === 'number'
      ? item.directCost
      : laborPerUnit + equipmentPerUnit + materialPerUnit;
    const unitPrice = Number(item.unitCost ?? item.totalCost ?? directPerUnit);
    const totalAmount = unitPrice * quantity;

    return {
      _id: item._id,
      payItemNumber: item.payItemNumber,
      payItemDescription: item.payItemDescription,
      unit: item.unitOfMeasurement,
      quantity,
      part: derivePartLabel(item.part, item.payItemNumber),
      laborCost: laborPerUnit * quantity,
      equipmentCost: equipmentPerUnit * quantity,
      materialCost: materialPerUnit * quantity,
      directCost: directPerUnit,
      ocmCost: (item.ocmCost || 0) * quantity,
      cpCost: (item.cpCost || 0) * quantity,
      vatCost: (item.vatCost || 0) * quantity,
      unitPrice,
      totalAmount,
      laborItems: item.laborItems || [],
      equipmentItems: item.equipmentItems || [],
      materialItems: item.materialItems || [],
    };
  });

  const totalDirectCost = items.reduce((sum, item) => sum + (Number(item.directCost || 0) * Number(item.quantity || 0)), 0);
  const totalOCM = items.reduce((sum, item) => sum + (Number(item.ocmCost || 0) * Number(item.quantity || 0)), 0);
  const totalCP = items.reduce((sum, item) => sum + (Number(item.cpCost || 0) * Number(item.quantity || 0)), 0);
  const totalVAT = items.reduce((sum, item) => sum + (Number(item.vatCost || 0) * Number(item.quantity || 0)), 0);
  const subtotalWithMarkup = totalDirectCost + totalOCM + totalCP;
  const computedGrandTotal = subtotalWithMarkup + totalVAT;
  const amountGrandTotal = items.reduce(
    (sum, item) => sum + (item.totalAmount ?? (item.totalCost ?? item.unitCost ?? 0) * Number(item.quantity || 0)),
    0
  );

  return {
    _id: 'manual-estimate',
    estimateName: 'Manual Program of Works',
    estimateType: 'manual',
    status: 'draft',
    costSummary: {
      totalDirectCost,
      totalOCM,
      totalCP,
      subtotalWithMarkup,
      totalVAT,
      grandTotal: amountGrandTotal || computedGrandTotal,
      rateItemsCount: items.length,
    },
    estimateLines,
  };
};

  const transformToWorksParts = (estimate: any): WorksPart[] => {
    const lines = estimate?.estimateLines || [];
    if (!lines.length) return [];

    const partMap = new Map<string, { asSubmitted: number; asEvaluated: number; items: number }>();

    lines.forEach((item: any) => {
      const partKey = normalizePart(item.part);

      if (!partMap.has(partKey)) {
        partMap.set(partKey, { asSubmitted: 0, asEvaluated: 0, items: 0 });
      }

      const partData = partMap.get(partKey)!;
      partData.asSubmitted += item.totalAmount || 0;
      partData.asEvaluated += item.totalAmount || 0;
      partData.items += 1;
    });

    const partDescriptions: Record<string, string> = {
      'PART A': 'Facilities for the Engineer',
      'PART B': 'Other General Requirements',
      'PART C': 'Earthworks',
      'PART D': 'Subbase and Base Course',
      'PART E': 'Surface Courses',
      'PART F': 'Buildings and Structures',
      'PART G': 'Minor Structures',
    };

    const totalProjectCost = estimate?.costSummary?.grandTotal || 0;

    return Array.from(partMap.entries()).map(([part, data]) => ({
      part,
      description: partDescriptions[part] || 'Other Works',
      asSubmitted: data.asSubmitted,
      asEvaluated: data.asEvaluated,
      percent: computePercentOfProjectCost(data.asSubmitted, totalProjectCost),
    }));
  };

  const loadPowAdjustments = async () => {
    try {
      if (!isManualWorkspace && !selectedEstimateId) {
        setPowAdjustments({});
        return;
      }
      const params = new URLSearchParams({ mode: isManualWorkspace ? 'manual' : 'takeoff' });
      if (!isManualWorkspace && selectedEstimateId) {
        params.set('estimateId', selectedEstimateId);
      }
      const res = await fetch(`/api/projects/${projectId}/pow-adjustments?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPowAdjustments({});
        return;
      }

      const next: Record<string, PowAdjustment> = {};
      (data.data || []).forEach((row: PowAdjustment) => {
        next[row.lineKey] = row;
      });
      setPowAdjustments(next);
    } catch (err) {
      console.error('Failed to load POW adjustments:', err);
      setPowAdjustments({});
    }
  };

  const savePowAdjustment = async (input: {
    lineKey: string;
    payItemNumber: string;
    quantity: number;
    unitCost: number;
    reason: string;
  }) => {
    const payload = {
      mode: isManualWorkspace ? 'manual' : 'takeoff',
      estimateId: isManualWorkspace ? undefined : selectedEstimateId,
      ...input,
    };

    const res = await fetch(`/api/projects/${projectId}/pow-adjustments`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to save adjustment');
    }
    setPowAdjustments((prev) => ({ ...prev, [data.data.lineKey]: data.data }));
    setAdjustmentNotice('POW adjustment saved.');
    window.setTimeout(() => setAdjustmentNotice(null), 2200);
  };

  const clearPowAdjustment = async (lineKey: string) => {
    const params = new URLSearchParams({ mode: isManualWorkspace ? 'manual' : 'takeoff', lineKey });
    if (!isManualWorkspace && selectedEstimateId) {
      params.set('estimateId', selectedEstimateId);
    }
    const res = await fetch(`/api/projects/${projectId}/pow-adjustments?${params.toString()}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to clear adjustment');
    }
    setPowAdjustments((prev) => {
      const next = { ...prev };
      delete next[lineKey];
      return next;
    });
    setAdjustmentNotice('POW adjustment removed.');
    window.setTimeout(() => setAdjustmentNotice(null), 2200);
  };

  const saveDupaAdjustment = async (itemKey: string, item: DupaReportData['items'][number]) => {
    const estimateRef = dupaEstimateRef || 'manual';
    const payload = {
      estimateRef,
      itemKey,
      payItemNumber: item.payItemNumber,
      payItemDescription: item.payItemDescription,
      part: item.part,
      unitOfMeasurement: item.unitOfMeasurement,
      outputPerHour: item.outputPerHour,
      quantity: item.quantity,
      laborItems: item.laborItems,
      equipmentItems: item.equipmentItems,
      materialItems: item.materialItems,
      totals: item.totals,
    };

    const res = await fetch(`/api/projects/${projectId}/dupa-adjustments`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to save DUPA adjustment');
    }

    setDupaAdjustments((prev) => ({ ...prev, [itemKey]: payload as DupaAdjustmentRecord }));
    setDupaData((prev) => {
      if (!prev) return prev;
      const merged = prev.items.map((entry, index) => (getDupaItemKey(entry, index) === itemKey ? item : entry));
      return { ...prev, items: merged };
    });

    const matchedLine = (activeEstimate?.estimateLines || []).find(
      (line: any) => String(line.payItemNumber || '') === String(item.payItemNumber || ''),
    );
    if (matchedLine) {
      await savePowAdjustment({
        lineKey: matchedLine.lineKey || getLineKey(matchedLine, 0),
        payItemNumber: String(matchedLine.payItemNumber || ''),
        quantity: Number(matchedLine.quantity || 0),
        unitCost: Number(item.totals.totalUnitCostSubmitted || 0),
        reason: 'DUPA adjustment',
      });
    }
  };

  const resetDupaAdjustment = async (itemKey: string) => {
    const estimateRef = dupaEstimateRef || 'manual';
    const params = new URLSearchParams({ estimateRef, itemKey });
    const res = await fetch(`/api/projects/${projectId}/dupa-adjustments?${params.toString()}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to reset DUPA adjustment');
    }

    setDupaAdjustments((prev) => {
      const next = { ...prev };
      delete next[itemKey];
      return next;
    });
    await loadDupaReport();
  };

  const transformToEquipment = (estimate: any): Equipment[] => {
    const equipmentMap = new Map<string, number>();
    const lines = estimate?.estimateLines || [];

    lines.forEach((item: any) => {
      item.equipmentItems?.forEach((eq: any) => {
        const name = eq.description || 'Unnamed Equipment';
        const currentQty = equipmentMap.get(name) || 0;
        equipmentMap.set(name, currentQty + eq.noOfUnits);
      });
    });

    return Array.from(equipmentMap.entries()).map(([name, quantity], index) => ({
      id: `eq-${index}`,
      name,
      quantity: Math.ceil(quantity),
      unit: 'Units',
    })).slice(0, 10);
  };

  const transformToExpenditure = (estimate: any): ExpenditureBreakdown => {
    const costSummary = estimate?.costSummary || {};
    const lines = estimate?.estimateLines || [];

    return {
      laborCost: lines.reduce((sum: number, item: any) => sum + (item.laborCost || 0), 0) || 0,
      materialCost: lines.reduce((sum: number, item: any) => sum + (item.materialCost || 0), 0) || 0,
      equipmentCost: lines.reduce((sum: number, item: any) => sum + (item.equipmentCost || 0), 0) || 0,
      ocmCost: costSummary.totalOCM || 0,
      profitMargin: costSummary.totalCP || 0,
      vat: costSummary.totalVAT || 0,
      totalEstimatedCost: costSummary.grandTotal || 0,
    };
  };

  const reportLink = projectId ? `/projects/${projectId}/pow-report` : undefined;
  const manualEstimate = useMemo(() => (manualBoqItems.length ? buildManualEstimate(manualBoqItems) : null), [manualBoqItems]);
  const activeEstimateBase = isManualWorkspace ? manualEstimate : selectedEstimate;
  const activeEstimate = useMemo(
    () => applyEstimateAdjustments(activeEstimateBase, powAdjustments),
    [activeEstimateBase, powAdjustments],
  );

  const worksParts = useMemo(() => (activeEstimate ? transformToWorksParts(activeEstimate) : []), [activeEstimate]);
  const equipment = useMemo(() => (activeEstimate ? transformToEquipment(activeEstimate) : []), [activeEstimate]);
  const expenditureBreakdown = useMemo(
    () => (activeEstimate ? transformToExpenditure(activeEstimate) : {
      laborCost: 0,
      materialCost: 0,
      equipmentCost: 0,
      ocmCost: 0,
      profitMargin: 0,
      vat: 0,
      totalEstimatedCost: 0,
    }),
    [activeEstimate]
  );

  const itemizedGroups = useMemo(() => {
    const lines = activeEstimate?.estimateLines || [];
    const total = activeEstimate?.costSummary?.grandTotal || 0;
    const partDescriptions: Record<string, string> = {
      'PART A': 'Facilities for the Engineer',
      'PART B': 'Other General Requirements',
      'PART C': 'Earthworks',
      'PART D': 'Subbase and Base Course',
      'PART E': 'Surface Courses',
      'PART F': 'Buildings and Structures',
      'PART G': 'Minor Structures',
    };

    const search = itemSearch.trim().toLowerCase();
    const filteredLines = lines.filter((line: any) => {
      if (!search) return true;
      return String(line.payItemNumber || '').toLowerCase().includes(search)
        || String(line.payItemDescription || '').toLowerCase().includes(search);
    });

    const groupsMap = new Map<string, any>();
    filteredLines.forEach((line: any) => {
      const lineIndex = lines.indexOf(line);
      const lineKey = line.lineKey || getLineKey(line, lineIndex);
      const partKey = normalizePart(line.part);
      if (!groupsMap.has(partKey)) {
        groupsMap.set(partKey, {
          part: partKey,
          description: partDescriptions[partKey] || 'Other Works',
          items: [],
          totalAmount: 0
        });
      }

      const group = groupsMap.get(partKey);
      const quantity = Number(line.quantity || 0);
      const unitCost = Number(line.unitPrice || 0);
      const directCost = Number(line.directCost || 0) * quantity;
      const totalAmount = Number(line.totalAmount || directCost);

      group.items.push({
        id: line._id || `${partKey}-${line.payItemNumber}-${group.items.length}`,
        lineKey,
        part: partKey,
        itemNo: String(line.payItemNumber || ''),
        description: String(line.payItemDescription || ''),
        quantity,
        unit: String(line.unit || ''),
        unitCost,
        directCost,
        totalAmount,
        adjusted: Boolean(line.adjusted),
        adjustmentReason: String(line.adjustmentReason || ''),
      });
      group.totalAmount += totalAmount;
    });

    const groups = Array.from(groupsMap.values());
    return { groups, total };
  }, [activeEstimate, itemSearch]);
  const signatories = useMemo<Signatory[]>(() => ([
    { id: 'sig-1', name: 'Project Engineer', role: 'Prepared By', status: 'pending' },
    { id: 'sig-2', name: 'District Engineer', role: 'Reviewed By', status: 'pending' },
    { id: 'sig-3', name: 'Regional Director', role: 'Approved By', status: 'pending' },
    { id: 'sig-4', name: 'Planning Officer', role: 'Noted By', status: 'pending' },
  ]), []);

  const sections: SectionConfig[] = useMemo(() => {
    return [
      {
        id: 'overview',
        label: 'Overview',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        )
      },
      {
        id: 'itemized-breakdown',
        label: 'Itemized Cost Breakdown',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6m-8 4h10m-10 4h10m-10 4h10M5 5h.01M5 9h.01M5 13h.01M5 17h.01" />
          </svg>
        )
      },
      {
        id: 'manual-boq',
        label: 'BOQ Entry',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m-6-8h6m3 10a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2h6l4 4v10z" />
          </svg>
        )
      },
      {
        id: 'project-details',
        label: 'Project Details',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m-6-8h6m2 10H7a2 2 0 01-2-2V6a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V18a2 2 0 01-2 2z" />
          </svg>
        )
      },
      {
        id: 'financial-summary',
        label: 'Financial Summary',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        )
      },
      {
        id: 'description',
        label: 'Description of Works',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m-6-8h6m2 10H7a2 2 0 01-2-2V6a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V18a2 2 0 01-2 2z" />
          </svg>
        )
      },
      {
        id: 'dupa-analysis',
        label: 'Detailed Unit Price Analysis',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m4-4H8m10 9H6a2 2 0 01-2-2V5a2 2 0 012-2h8l6 6v10a2 2 0 01-2 2z" />
          </svg>
        )
      },
      {
        id: 'equipment',
        label: 'Equipment Requirements',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17l6-6 4 4 8-8M3 17h4m10 0h4" />
          </svg>
        )
      },
      {
        id: 'expenditures',
        label: 'Expenditure Breakdown',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        )
      },
      {
        id: 'hauling',
        label: 'Hauling',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13l2-5h11l2 5m-3 0v6a1 1 0 01-1 1H8a1 1 0 01-1-1v-6m10 0H7m11 0h2a1 1 0 011 1v3a1 1 0 01-1 1h-2" />
          </svg>
        )
      },
      {
        id: 'sign-offs',
        label: 'Digital Sign-offs',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-8 0h8m2 0a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v8a2 2 0 002 2h10z" />
          </svg>
        )
      },
    ];
  }, []);

  const sectionGroups = useMemo(
    () => [
      {
        key: 'workspace',
        label: 'WORKSPACE',
        items: sections.filter((section) => ['overview', 'itemized-breakdown', ...(isManualWorkspace ? ['manual-boq'] : [])].includes(section.id)),
      },
      {
        key: 'analysis',
        label: 'ANALYSIS',
        items: sections.filter((section) => ['description', 'dupa-analysis', 'hauling', 'equipment', 'expenditures'].includes(section.id)),
      },
      {
        key: 'governance',
        label: 'GOVERNANCE',
        items: sections.filter((section) => ['project-details', 'sign-offs', 'reports'].includes(section.id)),
      },
    ],
    [sections, isManualWorkspace],
  );

  if (loadingProject) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading workspace...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className={`bg-white border-r border-gray-200 transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-64'} flex flex-col flex-shrink-0`}>
          <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
            {!isSidebarCollapsed && (
              <div className="text-sm font-semibold text-gray-900">Program of Works</div>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-gray-100 rounded flex-shrink-0"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSidebarCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
              </svg>
            </button>
          </div>

          <nav className="flex-1 p-2 space-y-2 overflow-y-auto">
            {sectionGroups.map((group) => (
              <div key={group.key}>
                {!isSidebarCollapsed && (
                  <div className="text-[11px] font-semibold text-gray-400 mb-1 px-2 tracking-wide">{group.label}</div>
                )}
                <div className="space-y-1">
                  {group.items.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => handleSectionClick(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        activeSection === section.id
                          ? 'bg-dpwh-blue-100 text-dpwh-blue-800'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      title={section.label}
                    >
                      {section.icon}
                      {!isSidebarCollapsed && <span className="text-sm font-medium">{section.label}</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {!isManualWorkspace && (
            <div className="p-2 border-t border-gray-200">
              <button
                onClick={() => setShowCreateModal(true)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isSidebarCollapsed
                    ? 'justify-center bg-dpwh-green-50 text-dpwh-green-700 hover:bg-dpwh-green-100'
                    : 'bg-dpwh-green-600 text-white hover:bg-dpwh-green-700'
                }`}
                title="New Program of Works"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {!isSidebarCollapsed && <span className="text-sm font-semibold">New Program of Works</span>}
              </button>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-4 flex flex-wrap gap-4 items-center justify-between">
            <div>
              <Link href={`/projects/${projectId}?tab=estimates`} className="text-sm text-blue-600 hover:text-blue-800">
                ← Back to Project Details
              </Link>
              <h1 className="text-xl font-bold text-gray-900 mt-1">{project?.projectName || 'Program of Works'}</h1>
              <p className="text-sm text-gray-600">{project?.projectLocation || 'Location not specified'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className={`px-2 py-1 rounded-full font-semibold ${isManualWorkspace ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {isManualWorkspace ? 'Manual Mode' : 'Takeoff Mode'}
                </span>
                {activeEstimate?.estimateName && (
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                    {activeEstimate.estimateName}
                  </span>
                )}
                <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                  {formatCurrency(activeEstimate?.costSummary?.grandTotal || 0)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSection('reports')}
                className="inline-flex items-center gap-2 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-50"
              >
                Reports
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('dupa-analysis')}
                className="inline-flex items-center gap-2 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-50"
              >
                DUPA Analysis
              </button>
              {!isManualWorkspace && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 bg-dpwh-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-dpwh-green-700 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Program of Works
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {adjustmentNotice && (
              <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                {adjustmentNotice}
              </div>
            )}
            {project && (
              <div className="mb-3 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                <p className="text-xs font-semibold text-blue-900">
                  Program of Works Mode: {isManualWorkspace ? 'Manual BOQ Input' : 'Takeoff Linked'}
                </p>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isManualWorkspace ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {isManualWorkspace ? 'Manual Workspace' : 'Takeoff Workspace'}
                </span>
              </div>
            )}

            {versionNotFound && !isManualWorkspace && (
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">Selected version was not found.</p>
                <p className="text-xs text-amber-700 mt-1">Return to Program of Works list and choose an existing version.</p>
                <Link
                  href={`/projects/${projectId}?tab=estimates`}
                  className="inline-flex mt-3 text-xs font-semibold text-amber-800 hover:text-amber-900"
                >
                  Back to Program of Works List
                </Link>
              </div>
            )}

            {!isManualWorkspace && estimates.length === 0 && activeSection !== 'manual-boq' ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Program of Works Yet
                </h3>
                <p className="text-gray-700 mb-6">
                  Create your first cost estimate from a takeoff version to generate the Program of Works.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 bg-dpwh-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-dpwh-blue-700 transition-all shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Program of Works
                </button>
              </div>
            ) : isManualWorkspace && loadingManualBoq && activeSection !== 'manual-boq' ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-dpwh-blue-600 mb-4"></div>
                  <p className="text-gray-600">Loading BOQ entries...</p>
                </div>
              </div>
            ) : !isManualWorkspace && (loadingEstimate || !selectedEstimate) && activeSection !== 'manual-boq' ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-dpwh-blue-600 mb-4"></div>
                  <p className="text-gray-600">Loading program of works...</p>
                </div>
              </div>
            ) : isManualWorkspace && manualBoqItems.length === 0 && activeSection !== 'manual-boq' ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Start building your manual Program of Works</h3>
                <p className="text-gray-600">
                  Open BOQ Entry from the sidebar to add pay items from DUPA templates.
                </p>
              </div>
            ) : !activeEstimate && !['manual-boq', 'dupa-analysis', 'project-details', 'reports'].includes(activeSection) ? null : (
              <div className="space-y-6">
                {activeSection === 'manual-boq' && (
                  <ManualPowManager
                    projectId={projectId}
                    projectName={project?.projectName || 'Project'}
                    projectLocation={project?.projectLocation}
                    district={project?.district}
                    manualConfig={project?.manualPowConfig || undefined}
                    manualItems={manualBoqItems}
                    loading={loadingManualBoq}
                    readOnly={project?.powMode !== 'manual'}
                    onReload={loadManualBoq}
                    onManualConfigSaved={fetchProject}
                    onManualVersionSaved={async () => {
                      await loadEstimates();
                      await loadDupaReport();
                    }}
                  />
                )}

                {activeSection === 'overview' && (
                  <div className="space-y-6">
                    <ProgramOfWorksKpiRow
                      totalProjectCost={activeEstimate?.costSummary?.grandTotal || 0}
                      directCost={activeEstimate?.costSummary?.totalDirectCost || 0}
                      activeComponents={itemizedGroups.groups.length}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setActiveSection('itemized-breakdown')}
                        className="text-left rounded-lg border border-blue-200 bg-blue-50 p-4 hover:bg-blue-100 transition"
                      >
                        <p className="text-sm font-semibold text-blue-900">Open Itemized Cost Breakdown</p>
                        <p className="text-xs text-blue-700 mt-1">Review, search, and adjust line-item costs.</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSection('dupa-analysis')}
                        className="text-left rounded-lg border border-emerald-200 bg-emerald-50 p-4 hover:bg-emerald-100 transition"
                      >
                        <p className="text-sm font-semibold text-emerald-900">Open Detailed Unit Price Analysis</p>
                        <p className="text-xs text-emerald-700 mt-1">View DUPA sheets in print-style screen format.</p>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <ProgramOfWorksApprovalStatus
                        status={activeEstimate?.status}
                        preparedBy={activeEstimate?.preparedBy}
                        preparedDate={activeEstimate?.preparedDate}
                        approvedBy={activeEstimate?.approvedBy}
                        approvedDate={activeEstimate?.approvedDate}
                      />
                      <ProgramOfWorksRevisionHistory entries={[]} />
                    </div>
                  </div>
                )}

                {activeSection === 'itemized-breakdown' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Projects / Budgeting / Itemized Breakdown</p>
                          <h2 className="text-2xl font-bold text-gray-900">Itemized Cost Breakdown</h2>
                          <p className="text-sm text-gray-600 mt-1">
                            Search and adjust line-item costs from the active Program of Works version.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <div className="relative">
                            <input
                              type="text"
                              value={itemSearch}
                              onChange={(e) => setItemSearch(e.target.value)}
                              placeholder="Search pay item or description"
                              className="w-64 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-dpwh-blue-500"
                            />
                          </div>
                          <button
                            onClick={handleExportPDF}
                            disabled={!reportLink}
                            className="inline-flex items-center gap-2 bg-dpwh-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-dpwh-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Open Report
                          </button>
                        </div>
                      </div>
                    </div>

                    <ProgramOfWorksItemizedTable
                      groups={itemizedGroups.groups}
                      grandTotal={itemizedGroups.total}
                      editable
                      onSaveAdjustment={savePowAdjustment}
                      onClearAdjustment={clearPowAdjustment}
                    />
                  </div>
                )}

                {activeSection === 'project-details' && project && (
                  <ProjectDetailsCard
                    projectName={project.projectName}
                    implementingOffice={project.implementingOffice}
                    location={project.projectLocation}
                    district={project.district}
                    fundSource={project.fundSource}
                    workableDays={project.workableDays}
                    unworkableDays={project.unworkableDays}
                    totalDuration={project.totalDuration}
                    startDate={project.startDate}
                    endDate={project.endDate}
                  />
                )}

                {activeSection === 'financial-summary' && (
                  <FinancialSummaryCard
                    allottedAmount={project?.appropriation || activeEstimate?.costSummary?.grandTotal || 0}
                    budgetBreakdown={{
                      directCosts: activeEstimate?.costSummary?.totalDirectCost || 0,
                      indirectCosts: (activeEstimate?.costSummary?.totalOCM || 0) + (activeEstimate?.costSummary?.totalCP || 0),
                      vat: activeEstimate?.costSummary?.totalVAT || 0,
                    }}
                  />
                )}

                {activeSection === 'description' && (
                  <DescriptionOfWorksTable
                    parts={worksParts}
                    onPartClick={handlePartClick}
                  />
                )}

                {activeSection === 'dupa-analysis' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold text-gray-900">Detailed Unit Price Analysis</h2>
                      <span className="text-xs text-gray-500">Compact screen view</span>
                    </div>
                    {dupaLoading ? (
                      <div className="bg-white rounded-lg border border-gray-200 p-6 text-sm text-gray-600">Loading DUPA analysis...</div>
                    ) : dupaError ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-sm text-red-700">{dupaError}</div>
                    ) : dupaData ? (
                      <DupaTab
                        data={dupaData}
                        formatCurrency={(value) => `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        formatNumber={(value) => value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        selectedPrintKey={selectedDupaPrintKey}
                        onSelectedPrintKeyChange={setSelectedDupaPrintKey}
                        adjustedKeys={Object.keys(dupaAdjustments)}
                        onSaveDupaAdjustment={saveDupaAdjustment}
                        onResetDupaAdjustment={resetDupaAdjustment}
                        laborLocation={activeEstimate?.location || project?.district || ''}
                        district={project?.district || ''}
                      />
                    ) : (
                      <div className="bg-white rounded-lg border border-gray-200 p-6 text-sm text-gray-600">No DUPA data available for this project.</div>
                    )}
                  </div>
                )}

                {activeSection === 'equipment' && (
                  <EquipmentRequirements equipment={equipment} />
                )}

                {activeSection === 'expenditures' && (
                  <BreakdownOfExpenditures breakdown={expenditureBreakdown} />
                )}

                {activeSection === 'hauling' && (
                  <ProgramOfWorksHauling
                    projectId={projectId}
                    project={project}
                    powMode={project?.powMode}
                    activeEstimateId={activeEstimate?._id}
                    onEstimateRepriced={(estimateId) => {
                      setSelectedEstimateId(estimateId);
                      void loadEstimates();
                    }}
                  />
                )}

                {activeSection === 'sign-offs' && (
                  <DigitalSignOffs signatories={signatories} />
                )}

                {activeSection === 'reports' && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Program of Works Reports</h2>
                        <p className="text-sm text-gray-600 mt-1">
                          Open the DPWH Program of Works report for the selected estimate.
                        </p>
                      </div>
                      <button
                        onClick={handleExportPDF}
                        disabled={!reportLink}
                        className="inline-flex items-center gap-2 bg-dpwh-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-dpwh-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Open Reports
                      </button>
                    </div>
                    {!reportLink && (
                      <p className="text-sm text-gray-500 mt-4">
                        Select a Program of Works version to view reports.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateEstimateModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(result) => {
            setShowCreateModal(false);
            loadEstimates();
            if (result?.manualMode) {
              router.push(`/projects/${projectId}/program-of-works?section=manual-boq`);
            } else if (result?.estimateId) {
              router.push(`/projects/${projectId}/program-of-works?estimateId=${result.estimateId}&view=takeoff&section=overview`);
            }
          }}
        />
      )}
    </div>
  );
}
