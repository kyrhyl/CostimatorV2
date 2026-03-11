import type { ManualPowConfigForm, StagedTemplate } from './types';

interface ManualPowApiResponse<T = unknown> {
  success?: boolean;
  error?: string;
  message?: string;
  data?: T;
  estimateId?: string;
}

function getErrorMessage(json: ManualPowApiResponse, fallback: string): string {
  return json.error || fallback;
}

export async function saveManualPowConfig(
  projectId: string,
  configForm: ManualPowConfigForm,
  district?: string,
): Promise<void> {
  const payload = {
    powMode: 'manual' as const,
    manualPowConfig: {
      laborLocation: configForm.laborLocation,
      district: configForm.district || district || '',
      cmpdVersion: configForm.cmpdVersion,
      vatPercentage: configForm.vatPercentage,
      notes: configForm.notes,
    },
    manualPowMetadata: {
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: 'manual-config',
      notes: configForm.notes || undefined,
    },
  };

  const res = await fetch(`/api/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as ManualPowApiResponse;
  if (!res.ok || !data.success) {
    throw new Error(getErrorMessage(data, 'Failed to save manual configuration'));
  }
}

interface SaveManualPowVersionResult {
  success?: boolean;
  error?: string;
  message?: string;
  estimateId?: string;
  data?: { _id?: string };
}

export async function saveManualPowDraft(
  projectId: string,
  input: { name?: string; description?: string; estimateId?: string },
): Promise<SaveManualPowVersionResult> {
  const response = await fetch(`/api/projects/${projectId}/manual-pow`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = (await response.json()) as SaveManualPowVersionResult;
  if (!response.ok || !data.success) {
    throw new Error(getErrorMessage(data, 'Failed to save Manual Program of Works'));
  }
  return data;
}

export async function instantiateDupaTemplate(
  templateId: string,
  input: { location: string; projectId: string },
) {
  const instantiateRes = await fetch(`/api/dupa-templates/${templateId}/instantiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const instantiateData = (await instantiateRes.json()) as ManualPowApiResponse<any>;
  if (!instantiateData.success) {
    throw new Error(getErrorMessage(instantiateData, 'Failed to instantiate DUPA template'));
  }
  return instantiateData.data;
}

export async function createProjectBoqItem(payload: Record<string, unknown>): Promise<void> {
  const createRes = await fetch('/api/project-boq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const createData = (await createRes.json()) as ManualPowApiResponse;
  if (!createData.success) {
    throw new Error(getErrorMessage(createData, 'Failed to add BOQ item'));
  }
}

export async function saveStagedManualPowItems(
  projectId: string,
  laborLocation: string,
  stagedTemplates: StagedTemplate[],
): Promise<void> {
  for (const staged of stagedTemplates) {
    const computed = await instantiateDupaTemplate(staged._id, {
      location: laborLocation,
      projectId,
    });

    const payload = {
      projectId,
      templateId: staged._id,
      payItemNumber: computed.payItemNumber,
      payItemDescription: computed.payItemDescription,
      unitOfMeasurement: computed.unitOfMeasurement,
      outputPerHour: computed.outputPerHour,
      category: computed.category || staged.category,
      part: staged.part || '',
      quantity: staged.quantity,
      laborItems: computed.laborComputed,
      equipmentItems: computed.equipmentComputed,
      materialItems: computed.materialComputed,
      directCost: computed.directCost,
      ocmPercentage: computed.ocmPercentage,
      ocmCost: computed.ocmCost,
      cpPercentage: computed.cpPercentage,
      cpCost: computed.cpCost,
      subtotalWithMarkup: computed.subtotalWithMarkup,
      vatPercentage: computed.vatPercentage,
      vatCost: computed.vatCost,
      totalCost: computed.totalCost,
      unitCost: computed.unitCost,
      totalAmount: computed.totalCost * staged.quantity,
      location: computed.location,
      instantiatedAt: computed.instantiatedAt,
    };

    await createProjectBoqItem(payload);
  }
}

export async function updateProjectBoqQuantity(itemId: string, quantity: number): Promise<void> {
  const res = await fetch(`/api/project-boq/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
  const data = (await res.json()) as ManualPowApiResponse;
  if (!res.ok || !data.success) {
    throw new Error(getErrorMessage(data, 'Failed to update quantity'));
  }
}

export async function deleteProjectBoqItem(itemId: string): Promise<void> {
  const res = await fetch(`/api/project-boq/${itemId}`, { method: 'DELETE' });
  const data = (await res.json()) as ManualPowApiResponse;
  if (!res.ok || !data.success) {
    throw new Error(getErrorMessage(data, 'Failed to delete BOQ item'));
  }
}
