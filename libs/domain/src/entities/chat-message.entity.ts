export type MessageRole = 'doctor' | 'assistant';
export type DoctorDecision = 'confirmed' | 'dismissed';

export interface ChatMessage {
  id: string;
  sessionId: string;
  tenantId: string;
  role: MessageRole;
  content: string;
  disclaimerShown: boolean;
  doctorDecision: DoctorDecision | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
