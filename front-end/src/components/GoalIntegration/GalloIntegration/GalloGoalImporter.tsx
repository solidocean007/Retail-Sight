// components/Gallo/GalloIntegration.tsx
import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
} from "@mui/material";
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
import { RootState, useAppDispatch } from "../../../utils/store";
import { useSelector } from "react-redux";
import GalloProgramImportCard from "./GalloProgramImportCard";
import {
  addOrUpdateGalloGoal,
  selectAllGalloGoals,
} from "../../../Slices/galloGoalsSlice";
import GalloScheduledImportPanel from "./GalloScheduledImportPanel";
import { selectUser } from "../../../Slices/userSlice";
import GalloProgramManager from "./GalloProgramManager";
import { useGalloPrograms } from "../../../hooks/useGalloPrograms";
import ManualGalloProgramImport from "../ManualGalloProgramImport";
import { showMessage } from "../../../Slices/snackbarSlice";
import { isProgramExpired } from "../utils/galloProgramGoalsHelpers";
import { Stepper, Step, StepLabel } from "@mui/material";
import { createGalloGoal } from "../../../utils/helperFunctions/createGalloGoal";
import { saveSingleGalloGoalToIndexedDB } from "../../../utils/database/goalsStoreUtils";
import { sendGalloGoalAssignedEmails } from "../../../utils/helperFunctions/sendGalloGoalAssignedEmails";

export type EnrichedGalloProgram = GalloProgramType & {
  status?: "active" | "expired";
  __debug?: {
    hasMarketId: boolean;
    startDateUnix?: number;
    endDateUnix?: number;
    rawKeys: string[];
  };
};
const IMPORT_STEPS: ImportStep[] = ["program", "goals", "accounts"];

const stepIndexMap: Record<ImportStep, number> = {
  program: 0,
  goals: 1,
  accounts: 2,
};

type ImportStep = "program" | "goals" | "accounts";

export type KeyStatusType = {
  prod?: { exists: boolean; lastFour?: string; updatedAt?: any };
  dev?: { exists: boolean; lastFour?: string; updatedAt?: any };
};

interface GalloGoalImporterProps {
  setValue: (newValue: number) => void; // tab switcher from parent
}

const GalloGoalImporter: React.FC<GalloGoalImporterProps> = ({ setValue }) => {
  const dispatch = useAppDispatch();
  const functions = getFunctions();
  const [openSyncModal, setOpenSyncModal] = useState(false);
  const [openManualSearchModal, setOpenManualSearchModal] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>("program");
  const [openImportModal, setOpenImportModal] = useState(false);
  const [hasFetchedGoals, setHasFetchedGoals] = useState(false);
  const [hasFetchedAccounts, setHasFetchedAccounts] = useState(false);

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

  const handleBack = () => {
    setImportStep((prev) => {
      if (prev === "accounts") {
        setHasFetchedAccounts(false);
        setEnrichedAccounts([]);
        setUnmatchedAccounts([]);
        return "goals";
      }

      if (prev === "goals") {
        setHasFetchedGoals(false);
        setGoals([]);
        setSelectedGoal(null);
        return "program";
      }

      return prev;
    });
  };

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

  // const handleCreateGalloGoal = async () => {
  //     if (!selectedGoal || !selectedProgram || selectedEnv === null) {
  //       alert("Please select a goal and program before saving.");
  //       return;
  //     }

  //     const env: "prod" | "dev" = selectedEnv; // ✅ explicit narrowing

  //     setIsSaving(true);

  //     try {
  //       const savedGoal = await createGalloGoal(
  //         env,
  //         {
  //           ...selectedGoal,
  //           notifications: {
  //             emailOnCreate: sendEmail,
  //           },
  //         },
  //         selectedProgram,
  //         selectedAccounts,
  //         companyId || ""
  //       );

  //       const savedGoalWithId = {
  //         ...savedGoal,
  //         id: selectedGoal.goalId,
  //       };

  //       dispatch(addOrUpdateGalloGoal(savedGoalWithId));
  //       await saveSingleGalloGoalToIndexedDB(savedGoal);

  //       await sendGalloGoalAssignedEmails({
  //         savedGoal,
  //         selectedAccounts,
  //         companyUsers,
  //       });

  //       alert("Goal saved successfully!");
  //       onSaveComplete();
  //     } catch (err) {
  //       console.error("Save error:", err);
  //       alert("Failed to save the goal. Please try again.");
  //     } finally {
  //       setIsSaving(false);
  //     }
  //   };

  // ---- Key status (both prod & dev) ---------------------------------------

  const handleCreateGalloGoal = async (
    selectedAccounts: EnrichedGalloAccountType[],
    notifyUserIds: string[]
  ) => {
    if (!selectedGoal || !selectedProgram || !selectedEnv || !companyId) {
      showMessage({
        text: "Missing required data to create goal.",
        severity: "error",
      });
      return;
    }

    setIsLoading(true);

    try {
      const savedGoal = await createGalloGoal(
        selectedEnv,
        {
          ...selectedGoal,
          notifications: {
            emailOnCreate: notifyUserIds.length > 0,
          },
        },
        selectedProgram,
        selectedAccounts,
        companyId
      );

      const goalWithId = {
        ...savedGoal,
        id: savedGoal.goalDetails.goalId,
      };

      dispatch(addOrUpdateGalloGoal(goalWithId));
      await saveSingleGalloGoalToIndexedDB(goalWithId);

      if (notifyUserIds.length > 0) {
        await sendGalloGoalAssignedEmails({
          savedGoal: goalWithId,
          selectedAccounts,
          companyUsers,
          notifyUserIds,
        });
      }

      showMessage({
        text: "Goal created successfully.",
        severity: "success",
      });
    } catch (err) {
      console.error("handleCreateGalloGoal error:", err);
      showMessage({
        text: "Failed to create goal.",
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  const fetchGoals = async () => {
    if (!env || !selectedProgram || hasFetchedGoals) return;

    setIsLoading(true);
    try {
      const fetchGoalsCF = httpsCallable(functions, "galloFetchGoals");
      const res = await fetchGoalsCF({
        env,
        programId: selectedProgram.programId,
        marketId: selectedProgram.marketId,
      });

      setGoals(res.data as GalloGoalType[]);
      setSelectedGoal(null);
      setHasFetchedGoals(true); // ✅ explicit
    } catch (err) {
      console.error("Error fetching goals:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccounts = async () => {
    if (!env || !selectedProgram || !selectedGoal || hasFetchedAccounts) return;

    setIsLoading(true);
    try {
      const fetchAccountsCF = httpsCallable(functions, "galloFetchAccounts");
      const res = await fetchAccountsCF({
        env,
        marketId: selectedProgram.marketId,
        goalId: selectedGoal.goalId,
      });

      const galloAccs = res.data as GalloAccountType[];
      const galloIds = galloAccs.map((a) => String(a.distributorAcctId));
      const companyAccs = await fetchCompanyAccounts(companyId!, galloIds);

      const { enrichedAccounts, unmatchedAccounts } = enrichAccounts(
        galloAccs,
        companyAccs,
        companyUsers
      );

      setEnrichedAccounts(enrichedAccounts);
      setUnmatchedAccounts(unmatchedAccounts);
      setHasFetchedAccounts(true); // ✅ explicit
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
    setOpenImportModal(false);

    setImportStep("program");

    setSelectedProgram(null);
    setSelectedGoal(null);

    setGoals([]);
    setEnrichedAccounts([]);
    setUnmatchedAccounts([]);

    setHasFetchedGoals(false);
    setHasFetchedAccounts(false);
  };

  const handleSelectProgram = (program: GalloProgramType | null) => {
    if (!program) return;

    setSelectedProgram(program);
    setGoals([]);
    setSelectedGoal(null);
    setEnrichedAccounts([]);
    setUnmatchedAccounts([]);
    setImportStep("program");
    setOpenImportModal(true);
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

  // ---- Render --------------------------------------------------------------
  return (
    <Container className="gallo-integration">
      {/* <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}> */}

      {/* 📅 Program Import Section */}
      <div className="gallo-section">
        <div className="gallo-section-title">📅 Gallo Axis Programs</div>

        <div className="gallo-actions-bar">
          <button
            className="btn-secondary"
            onClick={() => setOpenSyncModal(true)}
          >
            🔁 Program Sync Status
          </button>

          <button
            className="btn-secondary"
            onClick={() => setOpenManualSearchModal(true)}
          >
            🔍 Manual Axis Program Search
          </button>
        </div>

        {/* Programs */}
        {programs.length > 0 && (
          <GalloProgramManager
            selectedEnv={env}
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

          {/* {goals.length > 0 && (
            <GoalTable
              goals={goals}
              selectedGoal={selectedGoal}
              onSelectGoal={setSelectedGoal}
            />
          )} */}

          {/* {selectedGoal && enrichedAccounts.length === 0 && (
            <button className="btn-secondary" onClick={fetchAccounts}>
              Fetch Accounts
            </button>
          )} */}
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

        {/* {enrichedAccounts.length > 0 && (
          <GalloAccountImportTable
            selectedEnv={env}
            accounts={enrichedAccounts}
            unmatchedAccounts={unmatchedAccounts}
            selectedGoal={selectedGoal}
            selectedProgram={selectedProgram}
            onSaveComplete={() => setValue(0)}
          />
        )} */}
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
      <Dialog
        open={openSyncModal}
        onClose={() => setOpenSyncModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>🔁 Gallo Axis Program Sync</DialogTitle>
        <DialogContent dividers>
          <GalloScheduledImportPanel
            companyId={companyId}
            canRunManually={user?.role === "super-admin"}
          />
        </DialogContent>
        <DialogActions>
          <button
            className="btn-secondary"
            onClick={() => setOpenSyncModal(false)}
          >
            Close
          </button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={openManualSearchModal}
        onClose={() => setOpenManualSearchModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Manual Gallo Program Search</DialogTitle>
        <DialogContent dividers>
          <ManualGalloProgramImport
            startDate={startDate}
            onDateChange={onDateChangeHandler}
            onFetchPrograms={async () => {
              await manualFetchPrograms();
              setOpenManualSearchModal(false);
            }}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions>
          <button
            className="btn-secondary"
            onClick={() => setOpenManualSearchModal(false)}
          >
            Cancel
          </button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={openImportModal}
        onClose={(_, reason) => {
          if (reason === "backdropClick" || reason === "escapeKeyDown") return;
          setOpenImportModal(false);
        }}
        maxWidth="md"
        fullWidth
      >
        <div className="gallo-import-header">
          <DialogTitle>Import Gallo Program</DialogTitle>
          <DialogActions>
            {importStep !== "program" && (
              <button className="btn-secondary" onClick={handleBack}>
                ← Back
              </button>
            )}
            <button
              className="btn-secondary"
              onClick={() => setOpenImportModal(false)}
            >
              Cancel
            </button>
          </DialogActions>
        </div>

        <DialogContent dividers>
          <Stepper activeStep={stepIndexMap[importStep]} sx={{ mb: 3 }}>
            <Step completed={stepIndexMap[importStep] > 0}>
              <StepLabel>Program</StepLabel>
            </Step>

            <Step completed={stepIndexMap[importStep] > 1}>
              <StepLabel>Goals</StepLabel>
            </Step>

            <Step>
              <StepLabel>Accounts</StepLabel>
            </Step>
          </Stepper>

          <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
            {importStep === "program" &&
              "Review the Gallo program before importing goals."}
            {importStep === "goals" &&
              "Select a goal to import accounts from Gallo Axis."}
            {importStep === "accounts" &&
              "Review and save matched Displaygram accounts."}
          </Typography>

          {importStep === "program" && selectedProgram && (
            <GalloProgramImportCard
              program={selectedProgram}
              alreadyImported={importedProgramIds.has(
                selectedProgram.programId
              )}
              expired={isProgramExpired(selectedProgram)}
              canFetchGoals={
                !isProgramExpired(selectedProgram) && goals.length === 0
              }
              isLoading={isLoading}
              onFetchGoals={async () => {
                await fetchGoals();
                setImportStep("goals");
              }}
            />
          )}

          {importStep === "goals" && (
            <>
              <GoalTable
                goals={goals}
                selectedGoal={selectedGoal}
                onSelectGoal={setSelectedGoal}
              />

              {selectedGoal && (
                <button
                  className="btn-secondary"
                  onClick={async () => {
                    await fetchAccounts();
                    setImportStep("accounts");
                  }}
                >
                  Fetch Accounts
                </button>
              )}
            </>
          )}

          {importStep === "accounts" && selectedProgram && selectedGoal && (
            <GalloAccountImportTable
              accounts={enrichedAccounts}
              unmatchedAccounts={unmatchedAccounts}
              program={selectedProgram}
              goal={selectedGoal}
              onConfirm={async ({ selectedAccounts, notifyUserIds }) => {
                await handleCreateGalloGoal(selectedAccounts, notifyUserIds);
                setOpenImportModal(false);
                setValue(0);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default GalloGoalImporter;
