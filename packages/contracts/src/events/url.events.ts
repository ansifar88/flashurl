
export interface EventEnvelope<TPayload> {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  aggregateId: string;
  payload: TPayload;
}

export interface UrlCreatedPayload {
  id: string;
  shortCode: string;
  originalUrl: string;
  expiresAt: string | null;
}

export interface UrlUpdatedPayload {
  id: string;
  shortCode: string;
  originalUrl: string;
  expiresAt: string | null;
}

export interface UrlDeletedPayload {
  id: string;
  shortCode: string;
}

export type UrlCreatedEvent = EventEnvelope<UrlCreatedPayload>;
export type UrlUpdatedEvent = EventEnvelope<UrlUpdatedPayload>;
export type UrlDeletedEvent = EventEnvelope<UrlDeletedPayload>;

export const UrlEventType = {
  CREATED: "url.created",
  UPDATED: "url.updated",
  DELETED: "url.deleted"
} as const;
