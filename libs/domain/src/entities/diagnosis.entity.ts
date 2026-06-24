export interface Diagnosis {
  id: string;
  patientId: string;
  tenantId: string;
  diagnosedBy: string;
  diagnosisText: string;
  notes: string | null;
  diagnosedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
