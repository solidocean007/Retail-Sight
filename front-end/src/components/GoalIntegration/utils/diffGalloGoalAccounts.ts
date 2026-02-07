import { EnrichedGalloAccountType } from "../../../utils/types";

export type GalloGoalAccountDiffType = {
  activated: EnrichedGalloAccountType[];
  deactivated: EnrichedGalloAccountType[];
  reassigned: {
    account: EnrichedGalloAccountType;
    before: string;
    after: string;
  }[];
};

export const diffGalloGoalAccounts = (
  original: EnrichedGalloAccountType[],
  current: EnrichedGalloAccountType[]
): GalloGoalAccountDiffType => {
  const byId = (arr: EnrichedGalloAccountType[]) =>
    new Map(arr.map((a) => [a.distributorAcctId, a]));

  const origMap = byId(original);
  const currMap = byId(current);

  const activated: EnrichedGalloAccountType[] = [];
  const deactivated: EnrichedGalloAccountType[] = [];
  const reassigned: GalloGoalAccountDiffType["reassigned"] = [];

  currMap.forEach((curr, id) => {
    const prev = origMap.get(id);
    if (!prev) return;

    if (prev.status !== curr.status) {
      curr.status === "active"
        ? activated.push(curr)
        : deactivated.push(curr);
    }

    const prevRoute = prev.salesRouteNums?.[0];
    const currRoute = curr.salesRouteNums?.[0];

    if (prevRoute !== currRoute && curr.status === "active") {
      reassigned.push({
        account: curr,
        before: prevRoute ?? "Unassigned",
        after: currRoute ?? "Unassigned",
      });
    }
  });

  return { activated, deactivated, reassigned };
};
