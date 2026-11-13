
import { Url } from "../models/url.model";
import type { Transaction } from "sequelize";

interface CreateUrlRecord {
  shortCode: string;
  originalUrl: string;
  expiresAt: Date | null;
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
      userId: null,
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
  data: {
    originalUrl?: string;
    expiresAt?: Date | null;
  },
  transaction: Transaction,
): Promise<number> {
  const [affectedRows] = await Url.update(data, {
    where: { shortCode },
    transaction,
  });

  return affectedRows;
}

export async function deactivateUrlRecord(
  shortCode: string,
  transaction: Transaction,
): Promise<number> {
  const [affectedRows] = await Url.update(
    { isActive: false },
    {
      where: {
        shortCode,
        isActive: true,
      },
      transaction,
    },
  );

  return affectedRows;
}
