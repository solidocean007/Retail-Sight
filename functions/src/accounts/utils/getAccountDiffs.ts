//functions/src/accounts/utils/getAccountDiffs.ts
import { CompanyAccountType, UnifiedDiffType } from "./types";

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
  [
    ...new Set((routes || []).map((r) => String(r).trim()).filter(Boolean)),
  ].sort();

/**
 * Compare imported accounts with existing Firestore accounts
 * and produce a list of account changes.
 *
 * Detects:
 * - New accounts
 * - Updated fields on existing accounts
 *
 * @param parsed - Normalized map of imported accounts keyed by accountNumber
 * @param existingAccounts - Current accounts stored in Firestore
 * @returns Array of UnifiedDiff objects describing account changes
 */
export function getAccountDiffs(
  parsed: Record<string, Partial<CompanyAccountType>>,
  existingAccounts: CompanyAccountType[]
): UnifiedDiffType[] {
  const existingMap = new Map(
    existingAccounts.map((a) => [a.accountNumber, a])
  );
  const diffs: UnifiedDiffType[] = [];

  for (const [accNum, incoming] of Object.entries(parsed)) {
    const existing = existingMap.get(accNum);

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
        salesRouteNums: normalizeRoutes(incoming.salesRouteNums),
      };

      diffs.push({
        type: "new",
        accountNumber: accNum,
        updated: newAccount,
        fieldsChanged: [],
      });
      continue;
    }

    const fieldsChanged: (keyof CompanyAccountType)[] = [];
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

      if (newValue === undefined) return;

      if (field === "salesRouteNums") {
        const oldRoutes = normalizeRoutes(oldValue as string[]);
        const newRoutes = normalizeRoutes(newValue as string[]);

        const added = newRoutes.filter((r) => !oldRoutes.includes(r));
        const removed = oldRoutes.filter((r) => !newRoutes.includes(r));

        if (added.length || removed.length) {
          updated.salesRouteNums = newRoutes;
          fieldsChanged.push("salesRouteNums");

          routeNumChange = {
            old: oldRoutes,
            new: newRoutes,
            added,
            removed,
          };
        }

        return;
      }

      const normNew = newValue;
      const normOld = oldValue;

      if (JSON.stringify(normNew) !== JSON.stringify(normOld)) {
        updated[field] = normNew as any;
        fieldsChanged.push(field);
      }
    });

    if (fieldsChanged.length > 0) {
      const diff: UnifiedDiffType = {
        type: "update",
        accountNumber: accNum,
        old: existing,
        updated,
        fieldsChanged,
      };

      if (routeNumChange) {
        diff.routeNumChange = routeNumChange;
      }

      diffs.push(diff);
    }
  }

  return diffs;
}
