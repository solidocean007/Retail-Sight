// MissionIntegrationView.tsx
import { useState, useEffect } from "react";
import { Box, Container, Typography, Button } from "@mui/material";
import { CompanyAccountType, EnrichedGalloAccountType, GalloAccountType, GoalType, ProgramType } from "../../utils/types";
import fetchExternalApiKey from "../ApiKeyLogic/fetchExternalApiKey";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../utils/store";
import dayjs, { Dayjs } from "dayjs";
import DateSelector from "./DateSelector";
import ProgramTable from "./ProgramTable";
import GoalTable from "./GoalTable";
import AccountTable from "./AccountTable";
import { loadMatchingAccounts, selectMatchedAccounts } from "../../Slices/allAccountsSlice";
import getCompanyAccountId from "../../utils/helperFunctions/getCompanyAccountId";
import { doc, getDoc } from "@firebase/firestore";
import { db } from "../../utils/firebase";

const MissionIntegrationViewGallo = () => {
  const dispatch = useAppDispatch();
  const [apiKey, setApiKey] = useState("");
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs());
  const [programs, setPrograms] = useState<ProgramType[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<ProgramType | null>(
    null
  );
  const [goals, setGoals] = useState<GoalType[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(null); // Track selected goal
  const [galloAccounts, setGalloAccounts] = useState<GalloAccountType[]>([]);
  const [enrichedAccounts, setEnrichedAccounts] = useState<GalloAccountType[]>([]);


  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const matchedAccounts = useSelector(selectMatchedAccounts);
  const baseUrl = "https://6w7u156vcb.execute-api.us-west-2.amazonaws.com";


   // New variables for controlling sample size
   const accountSampleSize = 3;
   const isSampleMode = true;

   

  useEffect(() => {
    // Fetch API key only once
    if (companyId) {
      fetchExternalApiKey(companyId, "galloApiKey").then(setApiKey);
    }
  }, [companyId]);

  const getUnixTimestamp = (date: Dayjs | null): string => {
    return date ? date.unix().toString() : "";
  };

  const fetchPrograms = async () => {
    if (!companyId || !apiKey) return;

    const startDateUnix = getUnixTimestamp(startDate);
    const url = `${baseUrl}/healy/programs?startDate=${startDateUnix}`;

    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    };

    try {
      const response = await fetch(
        "https://my-fetch-data-api.vercel.app/api/fetchData",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...requestOptions, baseUrl: url }),
        }
      );

      const data = await response.json();
      setPrograms(data); // Assuming data contains program list
    } catch (error) {
      console.error("Error fetching programs:", error);
    }
  };

  const fetchGoals = async () => {
    if (!selectedProgram || !apiKey) return;

    const url = `${baseUrl}/healy/goals?programId=${selectedProgram.programId}&marketId=${selectedProgram.marketId}`;
    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    };

    try {
      const response = await fetch(
        "https://my-fetch-data-api.vercel.app/api/fetchData",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...requestOptions, baseUrl: url }),
        }
      );

      const data = await response.json();
      console.log(data);
      setGoals(data); // Assuming data contains goals list
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };



  const fetchAccounts = async () => {
    if (!selectedProgram || !selectedGoal || !apiKey || !companyId) return;
  
    try {
      // Step 1: Fetch accounts from Gallo API
      const galloAccounts = await fetchGalloAccounts(apiKey, selectedProgram.marketId, selectedGoal.goalId);
      console.log("Fetched Gallo Accounts:", galloAccounts);
  
      // Extract distributorAcctIds to filter company accounts
      const galloAccountIds = galloAccounts.map(account => account.distributorAcctId);
  
      // Step 2: Fetch only matching company accounts from Firestore
      const companyAccounts = await fetchCompanyAccounts(companyId, galloAccountIds);
      console.log("Filtered Company Accounts:", companyAccounts);
  
      // Step 3: Directly enrich the Gallo accounts with company account details without additional matching
      const enrichedAccounts = enrichAccounts(galloAccounts, companyAccounts);
      console.log("Enriched Accounts:", enrichedAccounts);
  
      // Set state for enriched accounts
      setEnrichedAccounts(enrichedAccounts);
    } catch (error) {
      console.error("Error fetching or enriching accounts:", error);
    }
  };
  
  
  



  const fetchGalloAccounts = async (apiKey: string, marketId: string, goalId: string): Promise<GalloAccountType[]> => {
    const url = `${baseUrl}/healy/accounts?marketId=${marketId}&goalId=${goalId}`;
    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    };

    try {
      const response = await fetch("https://my-fetch-data-api.vercel.app/api/fetchData", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...requestOptions, baseUrl: url }),
      });
      const data = await response.json();
      return isSampleMode ? data.slice(0, accountSampleSize) : data;
    } catch (error) {
      console.error("Error fetching Gallo accounts:", error);
      return [];
    }
  };
  



  const fetchCompanyAccounts = async (
    companyId: string,
    galloAccountIds: string[]
  ): Promise<CompanyAccountType[]> => {
    const accountsId = await getCompanyAccountId(companyId);
    if (!accountsId) {
      console.error("No accountsId found for company");
      return [];
    }
  
    const accountsDocRef = doc(db, "accounts", accountsId);
    const accountsSnapshot = await getDoc(accountsDocRef);
  
    if (!accountsSnapshot.exists()) {
      console.error("No accounts found in Firestore");
      return [];
    }
  
    const accountsData = accountsSnapshot.data();
    const allAccounts = (accountsData.accounts || []).map((account: CompanyAccountType) => ({
      ...account,
      salesRouteNums: Array.isArray(account.salesRouteNums)
        ? account.salesRouteNums
        : [account.salesRouteNums].filter(Boolean),
    }));
  
    // Convert galloAccountIds to numbers for a direct comparison
    const galloAccountIdsAsNumbers = galloAccountIds.map(id => Number(id));
  
    // Filter to only return accounts with matching accountNumbers in galloAccountIds
    const filteredAccounts = allAccounts.filter(account =>
      galloAccountIdsAsNumbers.includes(account.accountNumber)
    );
  
    // Return sample size if isSampleMode is enabled
    return isSampleMode ? filteredAccounts.slice(0, accountSampleSize) : filteredAccounts;
  };
  
  
  





  // Revised enrichAccounts function without additional filtering
const enrichAccounts = (
  galloAccounts: GalloAccountType[],
  companyAccounts: CompanyAccountType[]
): EnrichedGalloAccountType[] => {
  // Map enriched accounts directly by merging the pre-filtered company accounts with galloAccounts
  return galloAccounts.map(galloAccount => {
    // Find the matching company account from the pre-filtered list
    const matchingCompanyAccount = companyAccounts.find(
      companyAccount => Number(companyAccount.accountNumber) === Number(galloAccount.distributorAcctId)
    );

    const enrichedAccount = {
      ...galloAccount,
      accountName: matchingCompanyAccount?.accountName || "N/A",
      accountAddress: matchingCompanyAccount?.accountAddress || "N/A",
      salesRouteNums: matchingCompanyAccount?.salesRouteNums || ["N/A"],
    };
    console.log("Enriched Account:", enrichedAccount);

    return enrichedAccount;
  });
};
  
  
  
  



  
  
  useEffect(() => {
    if (matchedAccounts && galloAccounts) {
      const enriched = galloAccounts.map((galloAccount) => {
        const firestoreAccount = matchedAccounts.find(
          (acc) => acc.accountNumber === galloAccount.distributorAcctId
        );
        return firestoreAccount
          ? { ...galloAccount, ...firestoreAccount } // Merge Gallo and Firestore data
          : galloAccount; // Use Gallo data if no match found
      });
      setEnrichedAccounts(enriched);
    }
  }, [matchedAccounts, galloAccounts]);

  return (
    <Container>
      <Box>
        <DateSelector
          startDate={startDate}
          onDateChange={setStartDate}
          onFetchPrograms={fetchPrograms}
        />
        <ProgramTable
          programs={programs}
          selectedProgram={selectedProgram}
          onSelectProgram={setSelectedProgram}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={fetchGoals}
          disabled={!selectedProgram}
        >
          Search Goals
        </Button>
        {goals.length > 0 && (
          <GoalTable
            goals={goals}
            selectedGoal={selectedGoal}
            onSelectGoal={setSelectedGoal}
          />
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={fetchAccounts}
          disabled={!selectedProgram}
        >
          Fetch Accounts
        </Button>
        {enrichedAccounts.length > 0 && <AccountTable accounts={enrichedAccounts} />} {/* Pass enriched data */}
      </Box>
    </Container>
  );
};

export default MissionIntegrationViewGallo;


  // const fetchAccounts = async () => {
  //   if (!selectedProgram || !selectedGoal || !apiKey || !companyId) return; // Ensure companyId is available
  
  //   const url = `${baseUrl}/healy/accounts?marketId=${selectedProgram.marketId}&goalId=${selectedGoal.goalId}`;
  //   const requestOptions = {
  //     method: "GET",
  //     headers: {
  //       "Content-Type": "application/json",
  //       "x-api-key": apiKey,
  //     },
  //   };
  
  //   try {
  //     const response = await fetch(
  //       "https://my-fetch-data-api.vercel.app/api/fetchData",
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({ ...requestOptions, baseUrl: url }),
  //       }
  //     );
  
  //     const galloAccounts: GalloAccountType[] = await response.json();
  
  //     // Extract distributor account IDs for matching
  //     const distributorIds = galloAccounts.map(account => account.distributorAcctId);
  
  //     // Dispatch loadMatchingAccounts with both distributorIds and companyId
  //     const matchedCompanyAccounts = await dispatch(
  //       loadMatchingAccounts({ distributorIds, accountId }) // i need to supply the accountId here
  //     ).unwrap();
  
  //     // Enrich the Gallo accounts with matching company account details
  //     const enrichedAccounts: EnrichedGalloAccountType[] = galloAccounts.map(galloAccount => {
  //       const matchingCompanyAccount = matchedCompanyAccounts.find(companyAccount => 
  //         companyAccount.accountNumber === galloAccount.distributorAcctId
  //       );
  
  //       return {
  //         ...galloAccount,
  //         accountName: matchingCompanyAccount?.accountName,
  //         accountAddress: matchingCompanyAccount?.accountAddress,
  //         salesRouteNums: matchingCompanyAccount?.salesRouteNums,
  //       };
  //     });
  
  //     setGalloAccounts(enrichedAccounts);
  //   } catch (error) {
  //     console.error("Error fetching accounts:", error);
  //   }
  // };

  // Watch for changes in matchedAccounts and galloAccounts to merge data
  