// apiService.ts
import { GalloAccountType, GoalType, ProgramType, CompanyAccountType } from "./utils/types";
import { doc, getDoc } from "@firebase/firestore";
import { db } from "./utils/firebase";

const baseUrl = import.meta.env.REACT_APP_GALLO_BASE_URL;

export const fetchPrograms = async (apiKey: string, startDateUnix: string): Promise<ProgramType[]> => {
  const url = `${baseUrl}/healy/programs?startDate=${startDateUnix}`;
  const requestOptions = {
    method: "GET",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
  };

  const response = await fetch("https://my-fetch-data-api.vercel.app/api/fetchData", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...requestOptions, baseUrl: url }),
  });

  if (!response.ok) throw new Error(`Failed to fetch programs: ${response.statusText}`);
  return response.json();
};

export const fetchGoals = async (apiKey: string, program: ProgramType): Promise<GoalType[]> => {
  const url = `${baseUrl}/healy/goals?programId=${program.programId}&marketId=${program.marketId}`;
  const requestOptions = {
    method: "GET",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
  };

  const response = await fetch("https://my-fetch-data-api.vercel.app/api/fetchData", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...requestOptions, baseUrl: url }),
  });

  if (!response.ok) throw new Error(`Failed to fetch goals: ${response.statusText}`);
  return response.json();
};

export const fetchGalloAccounts = async (
  apiKey: string,
  marketId: string,
  goalId: string
): Promise<GalloAccountType[]> => {
  const url = `${baseUrl}/healy/accounts?marketId=${marketId}&goalId=${goalId}`;
  const requestOptions = {
    method: "GET",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
  };

  const response = await fetch("https://my-fetch-data-api.vercel.app/api/fetchData", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...requestOptions, baseUrl: url }),
  });

  if (!response.ok) throw new Error(`Failed to fetch Gallo accounts: ${response.statusText}`);
  return response.json();
};

export const fetchCompanyAccounts = async (
  companyId: string,
  galloAccountIds: string[]
): Promise<CompanyAccountType[]> => {
  const accountsIdDocRef = doc(db, "accounts", companyId);
  const accountsSnapshot = await getDoc(accountsIdDocRef);

  if (!accountsSnapshot.exists()) throw new Error("No company accounts found in Firestore");

  const accountsData = accountsSnapshot.data();
  const allAccounts = (accountsData.accounts || []).map((account: CompanyAccountType) => ({
    ...account,
    salesRouteNums: Array.isArray(account.salesRouteNums) ? account.salesRouteNums : [account.salesRouteNums].filter(Boolean),
  }));

  return allAccounts.filter(account => galloAccountIds.includes(account.accountNumber)); // Parameter 'account' implicitly has an 'any' type.
};

