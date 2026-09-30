import { normalizeDateToMidnight } from "@/lib/bookingService";

export type DateRangePreset =
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "THIS_YEAR"
  | "CUSTOM";

export interface ParsedDateRange {
  startDate: Date;
  endDate: Date;
  prevStartDate: Date;
  prevEndDate: Date;
  preset: DateRangePreset;
  label: string;
}

/**
 * Standardized server-side date range parser for all hotel reports.
 * Calculates both the current evaluation window [startDate, endDate]
 * and the equivalent preceding period [prevStartDate, prevEndDate] for delta trends.
 */
export function parseReportDateRange(
  presetParam?: string | null,
  customStart?: string | null,
  customEnd?: string | null
): ParsedDateRange {
  const preset: DateRangePreset = (
    presetParam?.toUpperCase() || "LAST_30_DAYS"
  ) as DateRangePreset;

  const now = new Date();
  const todayStart = normalizeDateToMidnight(now);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  let startDate = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);
  let endDate = tomorrowStart;
  let prevStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  let prevEndDate = startDate;
  let label = "Last 30 Days";

  if (preset === "TODAY") {
    startDate = todayStart;
    endDate = tomorrowStart;
    prevStartDate = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    prevEndDate = todayStart;
    label = "Today";
  } else if (preset === "YESTERDAY") {
    startDate = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    endDate = todayStart;
    prevStartDate = new Date(todayStart.getTime() - 48 * 60 * 60 * 1000);
    prevEndDate = startDate;
    label = "Yesterday";
  } else if (preset === "LAST_7_DAYS") {
    startDate = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    endDate = tomorrowStart;
    prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    prevEndDate = startDate;
    label = "Last 7 Days";
  } else if (preset === "LAST_30_DAYS") {
    startDate = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);
    endDate = tomorrowStart;
    prevStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    prevEndDate = startDate;
    label = "Last 30 Days";
  } else if (preset === "THIS_MONTH") {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    endDate = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));

    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    prevStartDate = new Date(Date.UTC(prevYear, prevMonth, 1, 0, 0, 0, 0));
    prevEndDate = startDate;
    label = "This Month";
  } else if (preset === "LAST_MONTH") {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const lastMonth = month === 0 ? 11 : month - 1;
    const lastMonthYear = month === 0 ? year - 1 : year;

    startDate = new Date(Date.UTC(lastMonthYear, lastMonth, 1, 0, 0, 0, 0));
    endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

    const prevPrevMonth = lastMonth === 0 ? 11 : lastMonth - 1;
    const prevPrevYear = lastMonth === 0 ? lastMonthYear - 1 : lastMonthYear;
    prevStartDate = new Date(Date.UTC(prevPrevYear, prevPrevMonth, 1, 0, 0, 0, 0));
    prevEndDate = startDate;
    label = "Last Month";
  } else if (preset === "THIS_YEAR") {
    const year = now.getUTCFullYear();
    startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    endDate = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));
    prevStartDate = new Date(Date.UTC(year - 1, 0, 1, 0, 0, 0, 0));
    prevEndDate = startDate;
    label = "This Year";
  } else if (preset === "CUSTOM" && customStart && customEnd) {
    const parsedStart = normalizeDateToMidnight(customStart);
    const parsedEnd = new Date(normalizeDateToMidnight(customEnd).getTime() + 24 * 60 * 60 * 1000);

    if (parsedStart >= parsedEnd) {
      throw new Error("Start date must be before or equal to end date.");
    }

    startDate = parsedStart;
    endDate = parsedEnd;
    const durationMs = endDate.getTime() - startDate.getTime();
    prevStartDate = new Date(startDate.getTime() - durationMs);
    prevEndDate = startDate;
    label = `Custom (${new Date(customStart).toLocaleDateString()} – ${new Date(customEnd).toLocaleDateString()})`;
  }

  return {
    startDate,
    endDate,
    prevStartDate,
    prevEndDate,
    preset,
    label,
  };
}

/**
 * Sanitizes and formats an array of objects into a secure CSV string.
 * Prevents CSV formula injection by stripping leading '=', '+', '-', '@'.
 */
export function formatCsv(
  headers: Array<{ key: string; label: string }>,
  rows: Array<Record<string, any>>
): string {
  const sanitizeCell = (val: any): string => {
    if (val === null || val === undefined) return '""';
    let str = String(val).replace(/"/g, '""');
    // Prevent CSV formula injection in spreadsheet viewers
    if (str.startsWith("=") || str.startsWith("+") || str.startsWith("-") || str.startsWith("@")) {
      str = `'${str}`;
    }
    return `"${str}"`;
  };

  const headerRow = headers.map((h) => `"${h.label}"`).join(",");
  const dataRows = rows.map((row) =>
    headers.map((h) => sanitizeCell(row[h.key])).join(",")
  );

  return [headerRow, ...dataRows].join("\r\n");
}
