import { QueryTypes } from "sequelize";

import { sequelize } from "../../../infrastructure/database/connection";

interface DateRangeFilter {
  from?: string;
  to?: string;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface DailyClicksOptions extends DateRangeFilter, PaginationOptions {
  order?: "asc" | "desc";
}

export interface ReferrerStatsOptions
  extends DateRangeFilter, PaginationOptions {
  search?: string;
  sortBy?: "clicks" | "referrer";
  order?: "asc" | "desc";
}

export interface ClickOverview {
  totalClicks: number;
  uniqueReferrers: number;
}

export interface DailyClickStat {
  date: string;
  clicks: number;
}

export interface ReferrerStat {
  referrer: string;
  clicks: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CountRow {
  total: number | string;
}

interface OverviewRow {
  totalClicks: number | string;
  uniqueReferrers: number | string;
}

interface DailyClickRow {
  date: string;
  clicks: number | string;
}

interface ReferrerRow {
  referrer: string;
  clicks: number | string;
}

export interface DashboardOverview {
  totalUrls: number;
  activeUrls: number;
  expiredUrls: number;
  deletedUrls: number;
  totalClicks: number;
  urlsWithClicks: number;
}

export interface DashboardOverviewOptions {
  userId: string;
  fromUtc: Date;
  toUtcExclusive: Date;
}

interface DashboardOverviewRow {
  totalUrls: number | string;
  activeUrls: number | string;
  expiredUrls: number | string;
  deletedUrls: number | string;
  totalClicks: number | string;
  urlsWithClicks: number | string;
}

function buildDateConditions(filters: DateRangeFilter): {
  conditions: string[];
  replacements: Record<string, string>;
} {
  const conditions: string[] = [];
  const replacements: Record<string, string> = {};

  if (filters.from) {
    conditions.push("clicked_at >= :from");
    replacements.from = filters.from;
  }

  if (filters.to) {
    conditions.push("clicked_at < DATE_ADD(:to, INTERVAL 1 DAY)");
    replacements.to = filters.to;
  }

  return { conditions, replacements };
}

function buildPagination(options: PaginationOptions) {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

function createPaginatedResult<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResult<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getClickOverview(
  shortCode: string,
): Promise<ClickOverview> {
  const rows = await sequelize.query<OverviewRow>(
    `
      SELECT
        COUNT(*) AS totalClicks,
        COUNT(
          DISTINCT COALESCE(
            NULLIF(referrer, ''),
            'Direct / None'
          )
        ) AS uniqueReferrers
      FROM click_events
      WHERE short_code = :shortCode
    `,
    {
      replacements: { shortCode },
      type: QueryTypes.SELECT,
    },
  );

  const result = rows[0];

  return {
    totalClicks: Number(result?.totalClicks ?? 0),
    uniqueReferrers: Number(result?.uniqueReferrers ?? 0),
  };
}

export async function getDailyClicks(
  shortCode: string,
  options: DailyClicksOptions = {},
): Promise<PaginatedResult<DailyClickStat>> {
  const { page, limit, offset } = buildPagination(options);

  const { conditions, replacements } = buildDateConditions(options);

  const whereClause = ["short_code = :shortCode", ...conditions].join(" AND ");

  const order = options.order === "asc" ? "ASC" : "DESC";

  const queryReplacements = {
    ...replacements,
    shortCode,
    limit,
    offset,
  };

  const [rows, countRows] = await Promise.all([
    sequelize.query<DailyClickRow>(
      `
        SELECT
          DATE_FORMAT(clicked_at, '%Y-%m-%d') AS date,
          COUNT(*) AS clicks
        FROM click_events
        WHERE ${whereClause}
        GROUP BY DATE(clicked_at)
        ORDER BY DATE(clicked_at) ${order}
        LIMIT :limit OFFSET :offset
      `,
      {
        replacements: queryReplacements,
        type: QueryTypes.SELECT,
      },
    ),

    sequelize.query<CountRow>(
      `
        SELECT COUNT(*) AS total
        FROM (
          SELECT DATE(clicked_at)
          FROM click_events
          WHERE ${whereClause}
          GROUP BY DATE(clicked_at)
        ) AS daily_groups
      `,
      {
        replacements: {
          ...replacements,
          shortCode,
        },
        type: QueryTypes.SELECT,
      },
    ),
  ]);

  const data = rows.map((row) => ({
    date: row.date,
    clicks: Number(row.clicks),
  }));

  return createPaginatedResult(
    data,
    page,
    limit,
    Number(countRows[0]?.total ?? 0),
  );
}

export async function getReferrerStats(
  shortCode: string,
  options: ReferrerStatsOptions = {},
): Promise<PaginatedResult<ReferrerStat>> {
  const { page, limit, offset } = buildPagination(options);

  const { conditions, replacements } = buildDateConditions(options);

  const whereClause = ["short_code = :shortCode", ...conditions];

  if (options.search?.trim()) {
    whereClause.push(
      `
        COALESCE(
          NULLIF(referrer, ''),
          'Direct / None'
        ) LIKE :search
      `,
    );

    replacements.search = `%${options.search.trim()}%`;
  }

  const where = whereClause.join(" AND ");

  const sortBy = options.sortBy === "referrer" ? "referrer" : "clicks";

  const order = options.order === "asc" ? "ASC" : "DESC";

  const rows = await sequelize.query<ReferrerRow>(
    `
      SELECT
        COALESCE(
          NULLIF(referrer, ''),
          'Direct / None'
        ) AS referrer,
        COUNT(*) AS clicks
      FROM click_events
      WHERE ${where}
      GROUP BY COALESCE(
        NULLIF(referrer, ''),
        'Direct / None'
      )
      ORDER BY ${sortBy} ${order}
      LIMIT :limit OFFSET :offset
    `,
    {
      replacements: {
        ...replacements,
        shortCode,
        limit,
        offset,
      },
      type: QueryTypes.SELECT,
    },
  );

  const countRows = await sequelize.query<CountRow>(
    `
      SELECT COUNT(*) AS total
      FROM (
        SELECT
          COALESCE(
            NULLIF(referrer, ''),
            'Direct / None'
          )
        FROM click_events
        WHERE ${where}
        GROUP BY COALESCE(
          NULLIF(referrer, ''),
          'Direct / None'
        )
      ) AS referrer_groups
    `,
    {
      replacements: {
        ...replacements,
        shortCode,
      },
      type: QueryTypes.SELECT,
    },
  );

  const data = rows.map((row) => ({
    referrer: row.referrer,
    clicks: Number(row.clicks),
  }));

  return createPaginatedResult(
    data,
    page,
    limit,
    Number(countRows[0]?.total ?? 0),
  );
}

export async function getUserDashboardOverview(
  options: DashboardOverviewOptions,
): Promise<DashboardOverview> {
  const [result] = await sequelize.query<DashboardOverviewRow>(
    `
      SELECT
        COUNT(DISTINCT d.url_id) AS totalUrls,

        COUNT(DISTINCT CASE
          WHEN d.deleted_at IS NULL
            AND (
              d.expires_at IS NULL
              OR d.expires_at > UTC_TIMESTAMP(3)
            )
          THEN d.url_id
        END) AS activeUrls,

        COUNT(DISTINCT CASE
          WHEN d.deleted_at IS NULL
            AND d.expires_at IS NOT NULL
            AND d.expires_at <= UTC_TIMESTAMP(3)
          THEN d.url_id
        END) AS expiredUrls,

        COUNT(DISTINCT CASE
          WHEN d.deleted_at IS NOT NULL
          THEN d.url_id
        END) AS deletedUrls,

        COUNT(c.event_id) AS totalClicks,

        COUNT(DISTINCT CASE
          WHEN c.event_id IS NOT NULL
          THEN d.url_id
        END) AS urlsWithClicks

      FROM url_dimensions d

      LEFT JOIN click_events c
        ON c.short_code = d.short_code
        AND c.clicked_at >= :fromUtc
        AND c.clicked_at < :toUtcExclusive

      WHERE d.user_id = :userId
    `,
    {
      replacements: {
        userId: options.userId,
        fromUtc: options.fromUtc,
        toUtcExclusive: options.toUtcExclusive,
      },
      type: QueryTypes.SELECT,
    },
  );

  return {
    totalUrls: Number(result.totalUrls),
    activeUrls: Number(result.activeUrls),
    expiredUrls: Number(result.expiredUrls),
    deletedUrls: Number(result.deletedUrls),
    totalClicks: Number(result.totalClicks),
    urlsWithClicks: Number(result.urlsWithClicks),
  };
}
