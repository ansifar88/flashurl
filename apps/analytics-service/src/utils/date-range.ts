export interface ResolvedDateRange {
  from: string;
  to: string;
  timezone: string;
  fromUtc: Date;
  toUtcExclusive: Date;
}

interface ZonedDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getZonedParts(date: Date, timezone: string): ZonedDateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function formatDateInTimezone(date: Date, timezone: string): string {
  const parts = getZonedParts(date, timezone);

  return [
    parts.year,
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);

  const result = new Date(Date.UTC(year, month - 1, day + days));

  return result.toISOString().slice(0, 10);
}

/**
 * Converts midnight in a given timezone into a UTC instant.
 */
function zonedMidnightToUtc(date: string, timezone: string): Date {
  const [year, month, day] = date.split("-").map(Number);

  const targetUtc = Date.UTC(year, month - 1, day);

  let candidate = targetUtc;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = getZonedParts(new Date(candidate), timezone);

    const representedUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );

    const difference = targetUtc - representedUtc;

    candidate += difference;

    if (difference === 0) {
      break;
    }
  }

  return new Date(candidate);
}

export function resolveDateRange(
  query: {
    from?: string;
    to?: string;
    timezone: string;
  },
  now: Date = new Date(),
): ResolvedDateRange {
  const { timezone } = query;

  let from = query.from;
  let to = query.to;

  // Default to the latest 30 calendar days, including today.
  if (!from && !to) {
    to = formatDateInTimezone(now, timezone);
    from = addCalendarDays(to, -29);
  }

  if (!from || !to) {
    throw new Error("Both from and to dates are required.");
  }

  return {
    from,
    to,
    timezone,
    fromUtc: zonedMidnightToUtc(from, timezone),
    toUtcExclusive: zonedMidnightToUtc(addCalendarDays(to, 1), timezone),
  };
}
