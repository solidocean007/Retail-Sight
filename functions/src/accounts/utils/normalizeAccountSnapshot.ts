import { CompanyAccountType } from "./types";

/**
 * Normalize raw account rows into a unique account map.
 *
 * Encompass exports one row per route, so the same account
 * may appear multiple times. This function merges those rows
 * and combines route numbers into a single salesRouteNums array.
 *
 * @param accounts - Raw account rows from the Encompass Stops report
 *
 * @returns Map of accountNumber → normalized account object
 */
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
        salesRouteNums: [...(acc.salesRouteNums || [])],
      };
      return;
    }

    const existingRoutes = map[accNum].salesRouteNums || [];

    map[accNum].salesRouteNums = Array.from(
      new Set([...existingRoutes, ...(acc.salesRouteNums || [])])
    );
  });

  return map;
}
