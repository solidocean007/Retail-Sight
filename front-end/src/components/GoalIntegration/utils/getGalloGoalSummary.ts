import { FireStoreGalloGoalWithId } from "../../../Slices/galloGoalsSlice";

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate();
  }
  const parsed = new Date(value as string | number | Date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatAuditDate = (value: unknown) => {
  const date = toDate(value);
  return date
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date)
    : null;
};

export const formatGalloGoalDate = (value?: unknown) => {
  if (!value) return "—";

  if (typeof value === "string") {
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      const [, year, month, day] = dateOnly;
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
      ).toLocaleDateString();
    }
  }

  return toDate(value)?.toLocaleDateString() ?? "—";
};

export const getGalloGoalSummary = (goal: FireStoreGalloGoalWithId) => {
  const activeAccounts = goal.accounts.filter(
    (account) => account.status === "active",
  );
  const excludedAccounts = goal.accounts.filter(
    (account) => account.status !== "active",
  );
  const submittedCount = activeAccounts.filter(
    (account) => account.submittedPostId,
  ).length;
  const totalAccounts = activeAccounts.length;
  const percent =
    totalAccounts > 0 ? Math.round((submittedCount / totalAccounts) * 100) : 0;
  const importedBy = [goal.createdByFirstName, goal.createdByLastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    activeAccounts,
    excludedAccounts,
    submittedCount,
    totalAccounts,
    percent,
    importedAtLabel: formatAuditDate(goal.importedAt),
    importedByLabel: importedBy || null,
  };
};
