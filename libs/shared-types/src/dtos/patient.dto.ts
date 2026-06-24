export interface PatientDto {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO 8601 date string
  gender: string | null;
  bloodType: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  nationalId: string | null;
  medicalRecordNumber: string | null;
  currentSymptoms: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientDto {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO 8601
  gender?: string;
  bloodType?: string;
  contactPhone?: string;
  contactEmail?: string;
  nationalId?: string;
  medicalRecordNumber?: string;
  currentSymptoms?: string;
}

export interface UpdatePatientDto {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  contactPhone?: string;
  contactEmail?: string;
  nationalId?: string;
  medicalRecordNumber?: string;
  currentSymptoms?: string;
}
