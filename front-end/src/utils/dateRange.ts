import { PostQueryFilters } from "./types";

type DateBoundary = "start" | "end";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses an HTML date-input value as a local calendar day.
 *
 * JavaScript treats `new Date("YYYY-MM-DD")` as UTC. That moves the boundary
 * into the prior evening for users west of UTC and can exclude evening posts
 * from an inclusive end date. Constructing from date parts keeps the selected
 * day aligned with the user's local timezone.
 */
export const parseDateBoundary = (
  value: string | null | undefined,
  boundary: DateBoundary,
): Date | null => {
  if (!value) return null;

  const dateOnlyMatch = DATE_ONLY_PATTERN.exec(value);

  if (dateOnlyMatch) {
    const [, yearText, monthText, dayText] = dateOnlyMatch;
    const year = Number(yearText);
    const monthIndex = Number(monthText) - 1;
    const day = Number(dayText);
    const date =
      boundary === "start"
        ? new Date(year, monthIndex, day, 0, 0, 0, 0)
        : new Date(year, monthIndex, day, 23, 59, 59, 999);

    // Reject impossible values rather than silently rolling into another day.
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== monthIndex ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getDateRangeBounds = (
  dateRange: PostQueryFilters["dateRange"],
): { start: Date | null; end: Date | null } => ({
  start: parseDateBoundary(dateRange?.startDate, "start"),
  end: parseDateBoundary(dateRange?.endDate, "end"),
});

export const formatDateInputForDisplay = (
  value: string | null | undefined,
): string => parseDateBoundary(value, "start")?.toLocaleDateString() ?? "";
