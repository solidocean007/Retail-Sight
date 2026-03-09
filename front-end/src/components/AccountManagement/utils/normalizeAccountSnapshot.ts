import { CompanyAccountType } from "../../../utils/types";

export function normalizeAccountSnapshot(
  accounts: Partial<CompanyAccountType>[]
): Record<string, Partial<CompanyAccountType>> {

  const map: Record<string, Partial<CompanyAccountType>> = {};

  accounts.forEach((acc) => {

    const accNum = acc.accountNumber;
    if (!accNum) return;

    if (!map[accNum]) {
      map[accNum] = {
        ...acc,
        salesRouteNums: [...(acc.salesRouteNums || [])]
      };
      return;
    }

    const existingRoutes = map[accNum].salesRouteNums || [];

    map[accNum].salesRouteNums = Array.from(
      new Set([
        ...existingRoutes,
        ...(acc.salesRouteNums || [])
      ])
    );

  });

  return map;
}