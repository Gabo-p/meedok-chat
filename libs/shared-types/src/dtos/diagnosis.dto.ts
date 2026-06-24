export interface DiagnosisDto {
  id: string;
  patientId: string;
  tenantId: string;
  diagnosedBy: string;
  diagnosisText: string;
  notes: string | null;
  diagnosedAt: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiagnosisDto {
  diagnosisText: string;
  notes?: string;
  diagnosedAt: string; // ISO 8601
}
