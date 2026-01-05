// components/Gallo/GalloIntegration.tsx
import { useState, useEffect } from "react";
import { Box, Container, Typography, CircularProgress } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../utils/firebase";
import {
  FunctionsError,
  getFunctions,
  httpsCallable,
} from "firebase/functions";
import DateSelector from "../ManualGalloProgramImport";
import GoalTable from "../GoalTable";
import GalloAccountImportTable from "../GalloAccountImportTable";
import "./galloIntegration.css";

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
import GalloProgramImportCard from "./GalloProgramImportCard";
import { selectAllGalloGoals } from "../../../Slices/galloGoalsSlice";
import GalloScheduledImportPanel from "./GalloScheduledImportPanel";
import { selectUser } from "../../../Slices/userSlice";
import GalloProgramManager from "./GalloProgramManager";
import { useGalloPrograms } from "../../../hooks/useGalloPrograms";
import ManualGalloProgramImport from "../ManualGalloProgramImport";
import { showMessage } from "../../../Slices/snackbarSlice";

export type EnrichedGalloProgram = GalloProgramType & {
  status?: "active" | "expired";
  __debug?: {
    hasMarketId: boolean;
    startDateUnix?: number;
    endDateUnix?: number;
    rawKeys: string[];
  };
};

export type KeyStatusType = {
  prod?: { exists: boolean; lastFour?: string; updatedAt?: any };
  dev?: { exists: boolean; lastFour?: string; updatedAt?: any };
};

interface GalloGoalImporterProps {
  setValue: (newValue: number) => void; // tab switcher from parent
}

const GalloGoalImporter: React.FC<GalloGoalImporterProps> = ({ setValue }) => {
  const functions = getFunctions();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<"prod" | "dev" | null>(null);
  const env: "prod" | "dev" | null = selectedEnv;
  const [envLoading, setEnvLoading] = useState(true);
  const [hasFetchedPrograms, setHasFetchedPrograms] = useState(false);
  const galloGoals = useSelector(selectAllGalloGoals);
  const user = useSelector(selectUser);
  const companyId = useSelector(
    (s: RootState) => s.user.currentUser?.companyId
  );

  const { programs, loading } = useGalloPrograms(companyId);

  const importedProgramIds = new Set(
    galloGoals
      .filter((g) => g.programDetails?.programId)
      .map((g) => g.programDetails.programId)
  );

  useEffect(() => {
    if (!companyId) return;

    const ref = doc(db, "companies", companyId, "integrations", "galloAxis");

    getDoc(ref)
      .then((snap) => {
        const env = snap.data()?.env;
        setSelectedEnv(env === "prod" ? "prod" : "dev");
      })
      .finally(() => {
        setEnvLoading(false);
      });
  }, [companyId]);

  // i wonder why i was fetching claims here.. probbably to see who had admin role defined in firebase auth
  // useEffect(() => {
  //   const fetchClaims = async () => {
  //     const user = getAuth().currentUser;
  //     if (user) {
  //       const tokenResult = await user.getIdTokenResult(true); // force refresh
  //       console.log("Custom claims:", tokenResult.claims);
  //     }
  //   };

  //   fetchClaims();
  // }, []);

  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs("2025-11-24"));

  // ---- Data state ----------------------------------------------------------
  const [keyStatus, setKeyStatus] = useState<KeyStatusType | null>(null);

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
    setHasFetchedPrograms(false); // reset intent
  };

  const manualFetchPrograms = async () => {
    if (!env) return;
    if (!keyStatus?.[env]?.exists) {
      alert(`No ${env.toUpperCase()} key configured`);
      return;
    }

    if (!startDate) {
      showMessage({
        text: "Please select a start date before running import.",
        severity: "warning",
      });
      return;
    }

    setIsLoading(true);

    try {
      const fn = httpsCallable(functions, "galloFetchPrograms");

      const formattedStartDate = startDate.unix();

      console.log("Manual Gallo fetch payload", {
        env,
        formattedStartDate,
      });

      await fn({
        env,
        startDate: formattedStartDate,
      });

      // ✅ DO NOTHING ELSE
      // Firestore listener will update programs
    } catch (err: unknown) {
      console.error("Manual program fetch failed", err);

      let message = "Program fetch failed";

      if (err instanceof FunctionsError) {
        message =
          (typeof err.details === "string" && err.details) ||
          err.message ||
          message;
      } else if (err instanceof Error) {
        message = err.message;
      }

      showMessage({
        text: message,
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrograms = async () => {
    // not used
    if (!env) return;
    if (!keyStatus?.[env]?.exists) {
      alert(`No ${env.toUpperCase()} key configured`);
      return;
    }

    setIsLoading(true);

    try {
      const fn = httpsCallable(functions, "runGalloScheduledImportNow");

      await fn({
        env, // REQUIRED
        programStartDate: startDate?.format("YYYY-MM-DD"), // REQUIRED for first run
      });

      // 🔥 DO NOTHING ELSE
      // Firestore listener will update programs automatically
    } catch (err) {
      console.error("Program sync failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGoals = async () => {
    if(!env) return;
    if (!selectedProgram || hasFetchedGoals) return;
    if (!keyStatus?.[env]?.exists) {
      alert(`No ${env.toUpperCase()} key configured`);
      return;
    }
    if (!selectedProgram) return;
    setIsLoading(true);

    try {
      const fetchGoalsCF = httpsCallable(functions, "galloFetchGoals");
      console.log(env, selectedProgram.programId, selectedProgram.marketId);
      const res = await fetchGoalsCF({
        env: env, // MUST be "env"
        programId: selectedProgram.programId,
        marketId: selectedProgram.marketId,
      });

      const goals = res.data as GalloGoalType[];
      console.log("Fetched goals:", res);
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
    if(!env) return;
    if (!selectedProgram || !selectedGoal || hasFetchedAccounts) return;
    if (!keyStatus?.[env]?.exists) {
      alert(`No ${env.toUpperCase()} key configured`);
      return;
    }
    if (!selectedProgram || !selectedGoal || !companyId) return;
    setIsLoading(true);

    try {
      const fetchAccountsCF = httpsCallable(functions, "galloFetchAccounts");

      const res = await fetchAccountsCF({
        env: env, // MUST be "env"
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

      if (!match) {
        return {
          ...g,
          status: "inactive",
          accountName: "Not in Displaygram",
          accountAddress: "",
          salesRouteNums: [],
          salesPersonsName: "N/A",
        } as EnrichedGalloAccountType;
      }

      const salesPerson = users.find(
        (u) =>
          u.salesRouteNum && match.salesRouteNums?.includes(u.salesRouteNum)
      );

      return {
        ...g,
        status: "active",
        accountName: match.accountName,
        accountAddress: match.accountAddress,
        salesRouteNums: match.salesRouteNums ?? [],
        salesPersonsName: salesPerson
          ? `${salesPerson.firstName} ${salesPerson.lastName}`
          : "Unassigned",
      } as EnrichedGalloAccountType;
    });

    return { enrichedAccounts, unmatchedAccounts };
  };

  // ---- Cancel / reset ------------------------------------------------------
  const handleCancel = () => {
    setSelectedProgram(null);
    setSelectedGoal(null);
    setGoals([]);
    setEnrichedAccounts([]);
    setUnmatchedAccounts([]);
    setHasFetchedPrograms(false);
    // setValue(0); // back to previous tab
  };

  const handleSelectProgram = (program: GalloProgramType | null) => {
    setSelectedProgram(program);
    setGoals([]);
    setSelectedGoal(null);
    setEnrichedAccounts([]);
    setUnmatchedAccounts([]);
  };

  if (envLoading) {
    return (
      <Container className="gallo-integration">
        <CircularProgress />
        <Typography>Loading Gallo environment…</Typography>
      </Container>
    );
  }

  if (!companyId) {
    return (
      <Container className="gallo-integration">
        <CircularProgress />
        <Typography>Loading Company...</Typography>
      </Container>
    );
  }

  if (!selectedEnv) {
    // This should never happen, but protects against bad data
    return (
      <Container className="gallo-integration">
        <Typography color="error">
          Failed to determine Gallo environment.
        </Typography>
      </Container>
    );
  }

  // ⬇️ MOVE THIS HERE

  const hasSelectedProgram = !!selectedProgram;
  const hasFetchedGoals = goals.length > 0;
  const hasSelectedGoal = !!selectedGoal;
  const hasFetchedAccounts = enrichedAccounts.length > 0;

  const isProgramExpired = (program: GalloProgramType) => {
    if (!program.endDate) return false;
    return dayjs(program.endDate).isBefore(dayjs(), "day");
  };

  // ---- Render --------------------------------------------------------------
  return (
    <Container className="gallo-integration">
      {/* <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}> */}
      <p className="integration-note">
        Goals created here are imported from Gallo Axis programs and are managed
        externally. Source: Gallo Axis ({selectedEnv.toUpperCase()})
      </p>

      {/* 📅 Program Import Section */}
      <div className="gallo-section">
        <div className="gallo-section-title">📅 Program Import</div>

        <GalloScheduledImportPanel
          companyId={companyId}
          canRunManually={user?.role === "super-admin"}
        />

        {/* Date + actions */}
        <div className="gallo-controls">
          <ManualGalloProgramImport
            startDate={startDate}
            onDateChange={onDateChangeHandler}
            onFetchPrograms={manualFetchPrograms} // ✅
            disabled={loading}
          />

          {(programs.length > 0 ||
            goals.length > 0 ||
            enrichedAccounts.length > 0) && (
            <button
              className="button-outline btn-secondary"
              onClick={handleCancel}
            >
              Cancel
            </button>
          )}
        </div>

        {/* Programs */}
        {programs.length > 0 && (
          <GalloProgramManager
            programs={programs}
            selectedProgram={selectedProgram}
            importedProgramIds={
              new Set(
                programs.filter((p) => p.hasGoals).map((p) => p.programId)
              )
            }
            onSelectProgram={handleSelectProgram}
          />
        )}

        {selectedProgram && (
          <GalloProgramImportCard
            program={selectedProgram}
            alreadyImported={importedProgramIds.has(selectedProgram.programId)}
            selected
            expired={isProgramExpired(selectedProgram)}
            disabled={hasFetchedGoals}
            onToggle={() => handleSelectProgram(null)}
          />
        )}

        <div className="gallo-actions">
          {selectedProgram && isProgramExpired(selectedProgram) && (
            <Typography
              variant="caption"
              color="warning.main"
              sx={{ display: "block", mt: 1 }}
            >
              This program has ended. Gallo Axis does not return goals for
              expired programs.
            </Typography>
          )}

          {selectedProgram &&
            !isProgramExpired(selectedProgram) &&
            goals.length === 0 &&
            !isLoading && <button onClick={fetchGoals}>Fetch Goals</button>}

          {goals.length > 0 && (
            <GoalTable
              goals={goals}
              selectedGoal={selectedGoal}
              onSelectGoal={setSelectedGoal}
            />
          )}

          {selectedGoal && enrichedAccounts.length === 0 && (
            <button className="btn-secondary" onClick={fetchAccounts}>
              Fetch Accounts
            </button>
          )}
        </div>

        {/* Warnings / Results */}
        {unmatchedAccounts.length > 0 && (
          <Box
            sx={{
              border: "1px solid #ffeeba",
              borderRadius: "8px",
              p: 1.5,
              mb: 2,
              // backgroundColor: "#fff8e1",
            }}
          >
            <Typography color="warning.main" variant="body2">
              ⚠️ {unmatchedAccounts.length} account(s) from Gallo are not in
              your Displaygram database. These won’t be included when saving the
              goal.
            </Typography>
          </Box>
        )}

        {enrichedAccounts.length > 0 && (
          <GalloAccountImportTable
            selectedEnv={env}
            accounts={enrichedAccounts}
            unmatchedAccounts={unmatchedAccounts}
            selectedGoal={selectedGoal}
            selectedProgram={selectedProgram}
            onSaveComplete={() => setValue(0)}
          />
        )}
      </div>
      {/* </Box> */}

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

export default GalloGoalImporter;
