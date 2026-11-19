export interface EventEnvelope<TPayload> {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  aggregateId: string;
  payload: TPayload;
}

export interface UrlLifecycleEventEnvelope<
  TPayload,
> extends EventEnvelope<TPayload> {
  aggregateVersion: number;
}

export interface UrlCreatedPayload {
  id: string;
  shortCode: string;
  originalUrl: string;
  userId: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface UrlUpdatedPayload {
  id: string;
  shortCode: string;
  originalUrl: string;
  userId: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface UrlDeletedPayload {
  id: string;
  shortCode: string;
}

export interface UrlClickedPayload {
  shortCode: string;
  referrer: string | null;
  userAgent: string | null;
  ipAddress: string | null;
}

export type UrlCreatedEvent =
  UrlLifecycleEventEnvelope<UrlCreatedPayload>;

export type UrlUpdatedEvent =
  UrlLifecycleEventEnvelope<UrlUpdatedPayload>;

export type UrlDeletedEvent =
  UrlLifecycleEventEnvelope<UrlDeletedPayload>;

export type UrlClickedEvent =
  EventEnvelope<UrlClickedPayload>;

export const UrlEventType = {
  CREATED: "url.created",
  UPDATED: "url.updated",
  DELETED: "url.deleted",
  CLICKED: "url.clicked",
} as const;
