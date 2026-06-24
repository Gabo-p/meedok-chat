export interface DiagnosisSummary {
  id: string;
  diagnosisText: string;
  notes: string | null;
  diagnosedAt: Date;
}

export interface PatientContext {
  patientId: string;
  currentSymptoms: string | null;
  diagnosisHistory: DiagnosisSummary[];
}
