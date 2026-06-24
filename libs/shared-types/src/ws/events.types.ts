// ─── Client → Server Events ───────────────────────────────────────────────

export interface SendMessageEvent {
  type: 'send_message';
  content: string;
}

export interface ConfirmSuggestionEvent {
  type: 'confirm_suggestion';
  messageId: string;
}

export interface DismissSuggestionEvent {
  type: 'dismiss_suggestion';
  messageId: string;
}

export type ClientWsEvent =
  | SendMessageEvent
  | ConfirmSuggestionEvent
  | DismissSuggestionEvent;

// ─── Server → Client Events ───────────────────────────────────────────────

export interface StreamChunkEvent {
  type: 'stream_chunk';
  messageId: string;
  chunk: string;
}

export interface StreamCompleteEvent {
  type: 'stream_complete';
  messageId: string;
  fullContent: string;
  disclaimer: string;
}

export interface WsErrorEvent {
  type: 'error';
  code: string;
  message: string;
}

export interface DecisionAckEvent {
  type: 'decision_ack';
  messageId: string;
  decision: 'confirmed' | 'dismissed';
}

export type ServerWsEvent =
  | StreamChunkEvent
  | StreamCompleteEvent
  | WsErrorEvent
  | DecisionAckEvent;
