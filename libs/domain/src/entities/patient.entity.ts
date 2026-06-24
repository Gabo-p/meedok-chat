export interface Patient {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string | null;
  bloodType: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  nationalId: string | null;
  medicalRecordNumber: string | null;
  currentSymptoms: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
