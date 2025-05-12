import {
  CompanyAccountType,
  EnrichedGalloAccountType,
  GalloAccountType,
} from "../types";

export const enrichAccounts = (
  galloAccounts: GalloAccountType[],
  companyAccounts: CompanyAccountType[],
): EnrichedGalloAccountType[] => {
  // Create a Map for quick lookups, ensuring accountNumber is treated as a string
  const accountMap = new Map(
    companyAccounts.map((account) => [account.accountNumber, account]),
  );

  return galloAccounts.map((galloAccount) => {
    const matchedAccount = accountMap.get(galloAccount.distributorAcctId);

    return {
      ...galloAccount,
      accountName: matchedAccount?.accountName || undefined, // Use undefined for missing values
      accountAddress: matchedAccount?.accountAddress || undefined,
      salesRouteNums: matchedAccount?.salesRouteNums || [], // Default to empty array for routes
    };
  });
};
