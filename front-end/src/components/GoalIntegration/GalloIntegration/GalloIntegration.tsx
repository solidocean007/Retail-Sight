// components/Gallo/GalloIntegration.tsx
import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
} from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../utils/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import DateSelector from "../DateSelector";
import ProgramTable from "../ProgramTable";
import GoalTable from "../GoalTable";
import GalloAccountImportTable from "../GalloAccountImportTable";

import {
  CompanyAccountType,
  EnrichedGalloAccountType,
  GalloAccountType,
  GalloGoalType,
  GalloProgramType,
  UserType,
} from "../../../utils/types";
import getCompanyAccountId from "../../../utils/helperFunctions/getCompanyAccountId";
import { RootState } from "../../../utils/store";
import { useSelector } from "react-redux";
import GalloKeyManager from "./GalloKeyManager";

export type KeyStatusType = {
  prod?: { exists: boolean; lastFour?: string; updatedAt?: any };
  dev?: { exists: boolean; lastFour?: string; updatedAt?: any };
};

interface GalloIntegrationProps {
  setValue: (newValue: number) => void; // tab switcher from parent
}

const GalloIntegration: React.FC<GalloIntegrationProps> = ({ setValue }) => {
  const functions = getFunctions();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<"prod" | "dev">("dev");

  useEffect(() => {
    const fetchClaims = async () => {
      const user = getAuth().currentUser;
      if (user) {
        const tokenResult = await user.getIdTokenResult(true); // force refresh
        console.log("Custom claims:", tokenResult.claims);
      }
    };

    fetchClaims();
  }, []);

  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs());
  const [noProgramsMessage, setNoProgramsMessage] = useState("");

  // ---- Data state ----------------------------------------------------------
  const [keyStatus, setKeyStatus] = useState<KeyStatusType | null>(null);

  const [programs, setPrograms] = useState<GalloProgramType[]>([]);
  const [selectedProgram, setSelectedProgram] =
    useState<GalloProgramType | null>(null);

  const [goals, setGoals] = useState<GalloGoalType[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<GalloGoalType | null>(null);

  const [enrichedAccounts, setEnrichedAccounts] = useState<
    EnrichedGalloAccountType[]
  >([]);
  const [unmatchedAccounts, setUnmatchedAccounts] = useState<
    GalloAccountType[]
  >([]);

  // ---- Store data ----------------------------------------------------------
  const companyId = useSelector(
    (s: RootState) => s.user.currentUser?.companyId
  );
  const companyUsers = useSelector((s: RootState) => s.user.companyUsers || []);

  // ---- Key status (both prod & dev) ---------------------------------------
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const functions = getFunctions();
        const getExternalApiKeyStatus = httpsCallable<
          { integration: string },
          {
            prod: { exists: boolean; lastFour?: string; updatedAt?: any };
            dev: { exists: boolean; lastFour?: string; updatedAt?: any };
          }
        >(functions, "getExternalApiKeyStatus");

        const res = await getExternalApiKeyStatus({ integration: "galloAxis" });
        setKeyStatus(res.data);
        console.log("Gallo Axis key status:", res.data);
      } catch (err) {
        console.error("getExternalApiKeyStatus error:", err);
      }
    };

    fetchStatus();
  }, []);

  // ---- Handlers ------------------------------------------------------------
  const onDateChangeHandler = (newDate: Dayjs | null) => {
    setStartDate(newDate);
    setNoProgramsMessage("");
  };

  const fetchPrograms = async () => {
    if (!keyStatus?.[selectedEnv]?.exists) {
      alert(`No ${selectedEnv.toUpperCase()} key configured`);
      return;
    }
    setIsLoading(true);
    setNoProgramsMessage("");

    const startDateUnix = startDate?.unix()?.toString() ?? "";

    try {
      const fetchProgramsCF = httpsCallable(functions, "galloFetchPrograms");
      const res = await fetchProgramsCF({
        env: selectedEnv, // <-- MUST be "env"
        startDate: startDateUnix, // <-- MUST be "startDate"
      });

      const programs = res.data as GalloProgramType[];

      setPrograms(programs);
      setSelectedProgram(null);
      setGoals([]);
      setSelectedGoal(null);
      setEnrichedAccounts([]);
      setUnmatchedAccounts([]);

      if (!Array.isArray(programs) || programs.length === 0) {
        setNoProgramsMessage("No programs found for the selected start date.");
      }
    } catch (err) {
      console.error("Error fetching programs:", err);
      setNoProgramsMessage("Failed to load programs.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGoals = async () => {
    if (!keyStatus?.[selectedEnv]?.exists) {
      alert(`No ${selectedEnv.toUpperCase()} key configured`);
      return;
    }
    if (!selectedProgram) return;
    setIsLoading(true);

    try {
      const fetchGoalsCF = httpsCallable(functions, "galloFetchGoals");

      const res = await fetchGoalsCF({
        env: selectedEnv, // MUST be "env"
        programId: selectedProgram.programId,
        marketId: selectedProgram.marketId,
      });

      const goals = res.data as GalloGoalType[];

      setGoals(goals);
      setSelectedGoal(null);
      setEnrichedAccounts([]);
      setUnmatchedAccounts([]);
    } catch (err) {
      console.error("Error fetching goals:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccounts = async () => {
    if (!keyStatus?.[selectedEnv]?.exists) {
      alert(`No ${selectedEnv.toUpperCase()} key configured`);
      return;
    }
    if (!selectedProgram || !selectedGoal || !companyId) return;
    setIsLoading(true);

    try {
      const fetchAccountsCF = httpsCallable(functions, "galloFetchAccounts");

      const res = await fetchAccountsCF({
        env: selectedEnv, // MUST be "env"
        marketId: selectedProgram.marketId,
        goalId: selectedGoal.goalId,
      });

      const galloAccs = res.data as GalloAccountType[];

      // Step 2: get matching Displaygram accounts
      const galloIds = galloAccs.map((a) => String(a.distributorAcctId));
      const companyAccs = await fetchCompanyAccounts(companyId, galloIds);

      // Step 3: Enrich & separate unmatched accounts
      const { enrichedAccounts, unmatchedAccounts } = enrichAccounts(
        galloAccs,
        companyAccs,
        companyUsers
      );

      setEnrichedAccounts(enrichedAccounts);
      setUnmatchedAccounts(unmatchedAccounts);
    } catch (err) {
      console.error("Error fetching accounts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Firestore helpers ---------------------------------------------------
  const fetchCompanyAccounts = async (
    companyId: string,
    galloAccountIds: string[]
  ): Promise<CompanyAccountType[]> => {
    try {
      const accountsId = await getCompanyAccountId(companyId);
      if (!accountsId) return [];
      const ref = doc(db, "accounts", accountsId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return [];

      const accountsData = snap.data();
      const allAccounts = (accountsData.accounts || []).map(
        (account: Partial<CompanyAccountType>) => ({
          ...account,
          salesRouteNums: Array.isArray(account.salesRouteNums)
            ? account.salesRouteNums
            : [account.salesRouteNums].filter(Boolean),
          accountNumber: String(account.accountNumber),
        })
      ) as CompanyAccountType[];

      return allAccounts.filter((a) =>
        galloAccountIds.includes(String(a.accountNumber))
      );
    } catch (e) {
      console.error("fetchCompanyAccounts error:", e);
      return [];
    }
  };

  const enrichAccounts = (
    galloAccounts: GalloAccountType[],
    companyAccounts: CompanyAccountType[],
    users: UserType[]
  ): {
    enrichedAccounts: EnrichedGalloAccountType[];
    unmatchedAccounts: GalloAccountType[];
  } => {
    const unmatchedAccounts = galloAccounts.filter(
      (g) =>
        !companyAccounts.some(
          (c) => String(c.accountNumber) === String(g.distributorAcctId)
        )
    );

    const enrichedAccounts = galloAccounts.map((g) => {
      const match = companyAccounts.find(
        (c) => Number(c.accountNumber) === Number(g.distributorAcctId)
      );
      const salesPerson = users.find(
        (u) =>
          u.salesRouteNum && match?.salesRouteNums?.includes(u.salesRouteNum)
      );
      return {
        ...g,
        accountName: match?.accountName || "N/A",
        accountAddress: match?.accountAddress || "N/A",
        salesRouteNums: match?.salesRouteNums || ["N/A"],
        salesPersonsName: salesPerson
          ? `${salesPerson.firstName} ${salesPerson.lastName}`
          : "N/A",
      } as EnrichedGalloAccountType;
    });

    return { enrichedAccounts, unmatchedAccounts };
  };

  // ---- Cancel / reset ------------------------------------------------------
  const handleCancel = () => {
    setSelectedProgram(null);
    setSelectedGoal(null);
    setPrograms([]);
    setGoals([]);
    setEnrichedAccounts([]);
    setUnmatchedAccounts([]);
    setValue(0); // back to previous tab
  };

  // ---- Render --------------------------------------------------------------
  return (
    <Container>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <GalloKeyManager
          selectedEnv={selectedEnv}
          setSelectedEnv={setSelectedEnv}
          keyStatus={keyStatus}
        />

        {/* 📅 Program Import Section */}
        <Box
          sx={{
            border: "1px solid #ccc",
            borderRadius: "8px",
            p: 2,
            backgroundColor: "#fafafa",
          }}
        >
          <Typography variant="h6" gutterBottom>
            📅 Program Import
          </Typography>

          {/* Date + actions */}
          <Box
            sx={{
              display: "flex",
              width: "100%",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <DateSelector
              startDate={startDate}
              onDateChange={onDateChangeHandler}
              onFetchPrograms={fetchPrograms}
            />
            {(programs.length > 0 ||
              goals.length > 0 ||
              enrichedAccounts.length > 0) && (
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            )}
          </Box>

          {/* Programs */}
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

            <Button
              variant="contained"
              color="primary"
              onClick={fetchGoals}
              disabled={!selectedProgram}
            >
              Search Goals
            </Button>
          

          {/* Goals */}
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
              disabled={!selectedGoal}
            >
              Fetch Accounts
            </Button>

          {/* Warnings / Results */}
          {unmatchedAccounts.length > 0 && (
            <Box
              sx={{
                border: "1px solid #ffeeba",
                borderRadius: "8px",
                p: 1.5,
                mb: 2,
                backgroundColor: "#fff8e1",
              }}
            >
              <Typography color="warning.main" variant="body2">
                ⚠️ {unmatchedAccounts.length} account(s) from Gallo are not in
                your Displaygram database. These won’t be included when saving
                the goal.
              </Typography>
            </Box>
          )}

          {enrichedAccounts.length > 0 && (
            <GalloAccountImportTable
              selectedEnv={selectedEnv}
              accounts={enrichedAccounts}
              selectedGoal={selectedGoal}
              selectedProgram={selectedProgram}
              onSaveComplete={() => setValue(0)}
            />
          )}
        </Box>
      </Box>

      {/* Loading Overlay */}
      {isLoading && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 9999,
          }}
        >
          <CircularProgress color="inherit" />
        </Box>
      )}
    </Container>
  );
};

export default GalloIntegration;
