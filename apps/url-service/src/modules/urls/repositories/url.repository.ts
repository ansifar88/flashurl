import { Url } from "../models/url.model";
import type { Transaction } from "sequelize";
import { Op, literal } from "sequelize";
interface CreateUrlRecord {
  shortCode: string;
  originalUrl: string;
  expiresAt: Date | null;
  userId: string | null;
}
export interface UrlStatistics {
  totalUrls: number;
  guestUrls: number;
  registeredUserUrls: number;
}

export async function createUrlRecord(
  data: CreateUrlRecord,
  transaction: Transaction,
): Promise<Url> {
  return Url.create(
    {
      shortCode: data.shortCode,
      originalUrl: data.originalUrl,
      expiresAt: data.expiresAt,
      userId: data.userId,
      customAlias: false,
      isActive: true,
    },
    { transaction },
  );
}

export async function findUrlByShortCode(
  shortCode: string,
  transaction?: Transaction,
): Promise<Url | null> {
  return Url.findOne({
    where: { shortCode },
    ...(transaction ? { transaction } : {}),
  });
}

export async function updateUrlRecord(
  shortCode: string,
  userId: string,
  data: {
    originalUrl?: string;
    expiresAt?: Date | null;
  },
  transaction: Transaction,
): Promise<number> {
  const [affectedRows] = await Url.update(
    {
      ...data,
      aggregateVersion: literal("aggregate_version + 1"),
    },
    {
      where: {
        shortCode,
        userId,
        isActive: true,
      },
      transaction,
    },
  );

  return affectedRows;
}

export async function deactivateUrlRecord(
  shortCode: string,
  userId: string,
  transaction: Transaction,
): Promise<number> {
  const [affectedRows] = await Url.update(
    {
      isActive: false,
      aggregateVersion: literal("aggregate_version + 1"),
    },
    {
      where: {
        shortCode,
        userId,
        isActive: true,
      },
      transaction,
    },
  );

  return affectedRows;
}

export async function findUrlByShortCodeAndUserId(
  shortCode: string,
  userId: string,
  transaction?: Transaction,
): Promise<Url | null> {
  return Url.findOne({
    where: {
      shortCode,
      userId,
    },
    ...(transaction
      ? {
          transaction,
          lock: transaction.LOCK.UPDATE,
        }
      : {}),
  });
}

export async function getUrlStatistics(): Promise<UrlStatistics> {
  const [guestUrls, registeredUserUrls] = await Promise.all([
    Url.count({
      where: { userId: null },
    }),
    Url.count({
      where: {
        userId: {
          [Op.not]: null,
        },
      },
    }),
  ]);

  return {
    totalUrls: guestUrls + registeredUserUrls,
    guestUrls,
    registeredUserUrls,
  };
}
