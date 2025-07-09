// CreateGalloGoalView.tsx
import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Switch,
} from "@mui/material";
import {
  CompanyAccountType,
  EnrichedGalloAccountType,
  GalloAccountType,
  GalloGoalType,
  GalloProgramType,
  UserType,
} from "../../utils/types";
import fetchExternalApiKey from "../ApiKeyLogic/fetchExternalApiKey";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../utils/store";
import dayjs, { Dayjs } from "dayjs";
import DateSelector from "./DateSelector";
import ProgramTable from "./ProgramTable";
import GoalTable from "./GoalTable";
import {
  loadMatchingAccounts,
  selectMatchedAccounts,
} from "../../Slices/allAccountsSlice";
import getCompanyAccountId from "../../utils/helperFunctions/getCompanyAccountId";
import { doc, getDoc } from "@firebase/firestore";
import { db } from "../../utils/firebase";
import GalloAccountImportTable from "./GalloAccountImportTable";

interface CreateGalloGoalViewProps {
  setValue: (newValue: number) => void; // Function to change tabs
}

const CreateGalloGoalView: React.FC<CreateGalloGoalViewProps> = ({
  setValue,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isProduction, setIsProdution] = useState(true);
  const [productionApiKey, setProductionApiKey] = useState("");
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs());
  const [programs, setPrograms] = useState<GalloProgramType[]>([]);
  const [selectedProgram, setSelectedProgram] =
    useState<GalloProgramType | null>(null);
  const [goals, setGoals] = useState<GalloGoalType[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<GalloGoalType | null>(null); // Track selected goal
  const [galloAccounts, setGalloAccounts] = useState<GalloAccountType[]>([]);
  const [enrichedAccounts, setEnrichedAccounts] = useState<GalloAccountType[]>(
    []
  );
  const [noProgramsMessage, setNoProgramsMessage] = useState("");

  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const companyUsers = useSelector(
    (state: RootState) => state.user.companyUsers || []
  );

  const matchedAccounts = useSelector(selectMatchedAccounts);
  // const baseUrl = "https://6w7u156vcb.execute-api.us-west-2.amazonaws.com";
  const baseUrlProduction =
    "https://q2zgrnmnvl.execute-api.us-west-2.amazonaws.com";
  const baseUrlDevelopment =
    "https://6w7u156vcb.execute-api.us-west-2.amazonaws.com";

  const developmentApiKey = "hFu935h2k71ONztCRr98Q69OkMJDbI9818Z7HRRj"; // temp get development programs

  const baseUrl = isProduction ? baseUrlProduction : baseUrlDevelopment;
  const apiKey = isProduction ? productionApiKey : developmentApiKey;

  // New variables for controlling sample size
  const accountSampleSize = 3;
  const isSampleMode = false;

  const onDateChangeHandler = (newDate: Dayjs | null) => {
    setStartDate(newDate);
    setNoProgramsMessage(""); // Clear the no programs message
  };

  useEffect(() => {
    // Fetch API key only once

    if (companyId && apiKey === "") {
      fetchExternalApiKey(companyId, "galloApiKey").then(setProductionApiKey);
    }
  }, [companyId]);

  const getUnixTimestamp = (date: Dayjs | null): string => {
    return date ? date.unix().toString() : "";
  };

  const fetchPrograms = async () => {
    setIsLoading(true);
    setNoProgramsMessage(""); // Reset message

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
      if (data.length === 0) {
        setNoProgramsMessage("No programs found for the selected start date.");
      }
      setPrograms(data); // Assuming data contains program list
    } catch (error) {
      console.error("Error fetching programs:", error); // this never logs
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGoals = async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccounts = async () => {
    setIsLoading(true);
    if (!selectedProgram || !selectedGoal || !apiKey || !companyId) return;

    try {
      // Step 1: Fetch accounts from Gallo API
      const galloAccounts = await fetchGalloAccounts(
        apiKey,
        selectedProgram.marketId,
        selectedGoal.goalId
      );

      // Extract distributorAcctIds to filter company accounts
      const galloAccountIds = galloAccounts.map(
        (account) => account.distributorAcctId
      );

      // Step 2: Fetch only matching company accounts from Firestore
      const companyAccounts = await fetchCompanyAccounts(
        companyId,
        galloAccountIds
      );

      // Step 3: Directly enrich the Gallo accounts with company account details without additional matching
      const enrichedAccounts = enrichAccounts(
        galloAccounts,
        companyAccounts,
        companyUsers
      );

      // Set state for enriched accounts
      setEnrichedAccounts(enrichedAccounts);
    } catch (error) {
      console.error("Error fetching or enriching accounts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGalloAccounts = async (
    apiKey: string,
    marketId: string,
    goalId: string
  ): Promise<GalloAccountType[]> => {
    const url = `${baseUrl}/healy/accounts?marketId=${marketId}&goalId=${goalId}`;
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...requestOptions, baseUrl: url }),
        }
      );
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
    try {
      const accountsId = await getCompanyAccountId(companyId); // Ensure this function returns a valid string or null
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
      const allAccounts = (accountsData.accounts || []).map(
        (account: Partial<CompanyAccountType>) => ({
          ...account,
          salesRouteNums: Array.isArray(account.salesRouteNums)
            ? account.salesRouteNums
            : [account.salesRouteNums].filter(Boolean),
          accountNumber: String(account.accountNumber), // Ensure accountNumber is a string
        })
      ) as CompanyAccountType[];

      // Filter to only return accounts with matching accountNumbers in galloAccountIds
      const filteredAccounts = allAccounts.filter(
        (account) => galloAccountIds.includes(account.accountNumber) // Compare as strings
      );

      // Return sample size if isSampleMode is enabled
      return isSampleMode
        ? filteredAccounts.slice(0, accountSampleSize)
        : filteredAccounts;
    } catch (error) {
      console.error("Error fetching company accounts:", error);
      return [];
    }
  };

  // Revised enrichAccounts function without additional filtering
  const enrichAccounts = (
    galloAccounts: GalloAccountType[],
    companyAccounts: CompanyAccountType[],
    companyUsers: UserType[]
  ): EnrichedGalloAccountType[] => {
    return galloAccounts.map((galloAccount) => {
      const matchingCompanyAccount = companyAccounts.find(
        (companyAccount) =>
          Number(companyAccount.accountNumber) ===
          Number(galloAccount.distributorAcctId)
      );

      // Find salesperson for the matched account
      const salesPerson = companyUsers.find(
        (user) =>
          user.salesRouteNum &&
          matchingCompanyAccount?.salesRouteNums?.includes(user.salesRouteNum)
      );

      console.log('salesPerson: ', salesPerson)

      return {
        ...galloAccount,
        accountName: matchingCompanyAccount?.accountName || "N/A",
        accountAddress: matchingCompanyAccount?.accountAddress || "N/A",
        salesRouteNums: matchingCompanyAccount?.salesRouteNums || ["N/A"],
        salesPersonsName: salesPerson
          ? `${salesPerson.firstName} ${salesPerson.lastName}`
          : "N/A",
      };
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

  const handleCancel = () => {
    setSelectedProgram(null);
    setSelectedGoal(null);
    setEnrichedAccounts([]); // Clear enriched accounts
    setValue(0); // Navigate back
  };

  return (
    <Container>
      <Box>
        <Box>
          <Typography
            sx={{
              fontWeight: isProduction ? "bold" : "normal",
              fontSize: isProduction ? "1.5rem" : "1rem",
            }}
          >
            Production
          </Typography>
          <Switch
            checked={isProduction}
            onChange={() => setIsProdution(!isProduction)}
          />
          <Typography
            sx={{
              fontWeight: !isProduction ? "bold" : "normal",
              fontSize: !isProduction ? "1.5rem" : "1rem",
            }}
          >
            Development
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            width: "90%",
            justifyContent: "space-between",
          }}
        >
          <DateSelector
            startDate={startDate}
            onDateChange={onDateChangeHandler}
            onFetchPrograms={fetchPrograms}
          />
          {programs.length > 0 && (
            <Button
              variant="contained"
              color="secondary"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          )}
        </Box>
        {noProgramsMessage ? (
          <Typography color="error" variant="body1">
            {noProgramsMessage}
          </Typography>
        ) : (
          <ProgramTable
            programs={programs}
            selectedProgram={selectedProgram}
            onSelectProgram={setSelectedProgram}
          />
        )}
        {programs.length > 0 && (
          <Button
            variant="contained"
            color="primary"
            onClick={fetchGoals}
            disabled={!selectedProgram}
          >
            Search Goals
          </Button>
        )}
        {goals.length > 0 && (
          <GoalTable
            goals={goals}
            selectedGoal={selectedGoal}
            onSelectGoal={setSelectedGoal}
          />
        )}
        {goals.length > 0 && (
          <Button
            variant="contained"
            color="primary"
            onClick={fetchAccounts}
            disabled={!selectedGoal}
          >
            Fetch Accounts
          </Button>
        )}
        {enrichedAccounts.length > 0 && (
          <GalloAccountImportTable
            accounts={enrichedAccounts}
            selectedGoal={selectedGoal} // Pass the selected goal from the parent
            selectedProgram={selectedProgram} // Pass the selected program from the parent
            onSaveComplete={() => setValue(0)}
          />
        )}{" "}
        {/* Pass enriched data */}
      </Box>
      {/* Loading Overlay */}
      {isLoading && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
          }}
        >
          <CircularProgress color="inherit" />
        </Box>
      )}
    </Container>
  );
};

export default CreateGalloGoalView;
