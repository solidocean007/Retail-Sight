import { CompanyAccountType } from "../../../utils/types";
import { UnifiedDiff } from "../UploadReviewModal";

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

export function getAccountDiffs(
  parsed: Record<string, Partial<CompanyAccountType>>,
  existingAccounts: CompanyAccountType[]
): UnifiedDiff[] {
  const existingMap = new Map(existingAccounts.map((a) => [a.accountNumber, a]));
  const diffs: UnifiedDiff[] = [];

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
    let routeNumChange: { old: string[]; new: string[] } | undefined;
    const updated: CompanyAccountType = { ...existing };

    FIELDS_TO_CHECK.forEach((field) => {
      const newValue = incoming[field];
      const oldValue = existing[field];

      // Normalize arrays
      const normNew =
        field === "salesRouteNums" && Array.isArray(newValue)
          ? newValue.map(String)
          : newValue;

      const normOld =
        field === "salesRouteNums" && Array.isArray(oldValue)
          ? oldValue.map(String)
          : oldValue;

      if (
        normNew !== undefined &&
        JSON.stringify(normNew) !== JSON.stringify(normOld)
      ) {
        updated[field] = normNew as any;
        fieldsChanged.push(field);

        if (field === "salesRouteNums") {
          routeNumChange = {
            old: (normOld as string[]) || [],
            new: (normNew as string[]) || [],
          };
        }
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
