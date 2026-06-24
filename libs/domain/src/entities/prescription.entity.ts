export type PrescriptionStatus = 'active' | 'inactive' | 'cancelled';

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  tenantId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate: Date | null;
  status: PrescriptionStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
