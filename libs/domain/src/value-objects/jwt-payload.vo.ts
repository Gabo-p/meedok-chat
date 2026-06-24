import { DoctorRole } from '../entities/doctor.entity';

export interface JwtPayload {
  sub: string; // doctorId
  tenantId: string;
  role: DoctorRole;
  iat: number;
  exp: number;
}
