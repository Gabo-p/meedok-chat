export type SessionStatus = 'open' | 'closed';

export interface ChatSession {
  id: string;
  patientId: string;
  doctorId: string;
  tenantId: string;
  status: SessionStatus;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
