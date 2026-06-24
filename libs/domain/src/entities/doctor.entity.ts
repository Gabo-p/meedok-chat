export type DoctorRole = 'doctor' | 'admin';

export interface Doctor {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: DoctorRole;
  refreshTokenHash: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
