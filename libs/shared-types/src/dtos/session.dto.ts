import { SessionStatus } from '../enums/session-status.enum';
import { ChatMessageDto } from './message.dto';

export interface SessionDto {
  id: string;
  patientId: string;
  doctorId: string;
  tenantId: string;
  status: SessionStatus;
  startedAt: string; // ISO 8601
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionWithMessagesDto extends SessionDto {
  messages: ChatMessageDto[];
}

export interface CreateSessionDto {
  patientId: string;
}
