import { MessageRole } from '../enums/message-role.enum';
import { DoctorDecision } from '../enums/doctor-decision.enum';

export interface ChatMessageDto {
  id: string;
  sessionId: string;
  tenantId: string;
  role: MessageRole;
  content: string;
  disclaimerShown: boolean;
  doctorDecision: DoctorDecision | null;
  createdAt: string;
  updatedAt: string;
}
