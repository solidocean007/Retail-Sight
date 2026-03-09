import { CompanyAccountType } from "../../../utils/types";
import { UnifiedDiffType } from "../UploadReviewModal";

// Fields we care about when checking updates
const FIELDS_TO_CHECK: (keyof CompanyAccountType)[] = [
  "accountName",
  "accountAddress",
  "streetAddress",
  "city",
  "state",
  "typeOfAccount",
  "chain",
  "chainType",
  "salesRouteNums",
];

const normalizeRoutes = (routes?: string[]) =>
  [...(routes || [])].map(String).sort();

const mergeRoutesSafely = (oldRoutes: string[], newRoutes: string[]) => {
  return Array.from(new Set([...oldRoutes, ...newRoutes])).sort();
};

const computeRouteDelta = (oldRoutes: string[], newRoutes: string[]) => {
  const added = newRoutes.filter((r) => !oldRoutes.includes(r));
  const removed = oldRoutes.filter((r) => !newRoutes.includes(r));
  return { added, removed };
};

export function getAccountDiffs(
  parsed: Record<string, Partial<CompanyAccountType>>,
  existingAccounts: CompanyAccountType[],
): UnifiedDiffType[] {
  const existingMap = new Map(
    existingAccounts.map((a) => [a.accountNumber, a]),
  );
  const diffs: UnifiedDiffType[] = [];

  for (const [accNum, incoming] of Object.entries(parsed)) {
    const existing = existingMap.get(accNum);

    // 🆕 New account
    if (!existing) {
      const newAccount: CompanyAccountType = {
        accountNumber: accNum,
        accountName: incoming.accountName ?? "",
        accountAddress: incoming.accountAddress ?? "",
        streetAddress: incoming.streetAddress ?? "",
        city: incoming.city ?? "",
        state: incoming.state ?? "",
        typeOfAccount: incoming.typeOfAccount,
        chain: incoming.chain ?? "",
        chainType: incoming.chainType ?? "independent",
        salesRouteNums: (incoming.salesRouteNums || []).map(String),
      };

      diffs.push({
        type: "new",
        accountNumber: accNum,
        updated: newAccount,
        fieldsChanged: [], // ✅ always include this
      });
      continue;
    }

    // ✏️ Existing account: check for changes
    let fieldsChanged: (keyof CompanyAccountType)[] = [];
    let routeNumChange:
      | {
          old: string[];
          new: string[];
          added: string[];
          removed: string[];
        }
      | undefined;
    const updated: CompanyAccountType = { ...existing };

    FIELDS_TO_CHECK.forEach((field) => {
      const newValue = incoming[field];
      const oldValue = existing[field];

      const normNew =
        field === "salesRouteNums" && Array.isArray(newValue)
          ? newValue.map(String)
          : newValue;

      const normOld =
        field === "salesRouteNums" && Array.isArray(oldValue)
          ? oldValue.map(String)
          : oldValue;

      if (normNew === undefined) return;

      // ROUTE FIELD SPECIAL HANDLING
      if (field === "salesRouteNums") {
        const oldRoutes = normalizeRoutes(normOld as string[]);
        const newRoutes = normalizeRoutes(normNew as string[]);

        const mergedRoutes = mergeRoutesSafely(oldRoutes, newRoutes);

        const delta = computeRouteDelta(oldRoutes, mergedRoutes);

        if (delta.added.length || delta.removed.length) {
          updated[field] = mergedRoutes as any;

          fieldsChanged.push(field);

          routeNumChange = {
            old: oldRoutes,
            new: mergedRoutes,
            added: delta.added,
            removed: delta.removed,
          };
        }

        return;
      }

      // NORMAL FIELD COMPARISON
      if (JSON.stringify(normNew) !== JSON.stringify(normOld)) {
        updated[field] = normNew as any;
        fieldsChanged.push(field);
      }
    });

    if (fieldsChanged.length > 0) {
      diffs.push({
        type: "update",
        accountNumber: accNum,
        old: existing,
        updated,
        fieldsChanged,
        routeNumChange,
      });
    }
  }

  return diffs;
}
