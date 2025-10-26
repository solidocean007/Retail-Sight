// components/Gallo/GalloIntegration.tsx
import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  DialogActions,
} from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db, functions } from "../../utils/firebase";
import { httpsCallable } from "firebase/functions";
import DateSelector from "./DateSelector";
import ProgramTable from "./ProgramTable";
import GoalTable from "./GoalTable";
import GalloAccountImportTable from "./GalloAccountImportTable";

import {
  CompanyAccountType,
  EnrichedGalloAccountType,
  GalloAccountType,
  GalloGoalType,
  GalloProgramType,
  UserType,
} from "../../utils/types";
import getCompanyAccountId from "../../utils/helperFunctions/getCompanyAccountId";
import { RootState } from "../../utils/store";
import { useSelector } from "react-redux";

type KeyStatus = {
  prod?: { exists: boolean; lastFour?: string; updatedAt?: any };
  dev?: { exists: boolean; lastFour?: string; updatedAt?: any };
};

interface GalloIntegrationProps {
  setValue: (newValue: number) => void; // tab switcher from parent
}

const GalloIntegration: React.FC<GalloIntegrationProps> = ({ setValue }) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // const [isProduction, setIsProduction] = useState(true);
  const [selectedEnv, setSelectedEnv] = useState<"prod" | "dev">("dev");
  const [newKey, setNewKey] = useState("");
  const [openKeyModal, setOpenKeyModal] = useState(false);
  const [openDeleteKeyModal, setOpenDeleteKeyModal] = useState(false);
  const [modalEnv, setModalEnv] = useState<"prod" | "dev">("dev");
  const [modalKey, setModalKey] = useState("");

  const isProduction = selectedEnv === "prod";

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

  useEffect(() => {
    const fetchKey = async () => {
      try {
        const getExternalApiKey = httpsCallable<
          { name: string },
          { key: string }
        >(functions, "getExternalApiKey");

        const keyName = isProduction ? "galloApiKeyProd" : "galloApiKeyDev";
        const res = await getExternalApiKey({ name: keyName });
        const key = (res.data as any).key;
        setApiKey(key);
        console.log("Fetched Gallo Axis key:", key.slice(-4));
      } catch (err) {
        console.error("Failed to fetch Gallo Axis key:", err);
        setApiKey(null);
      }
    };
    fetchKey();
  }, [isProduction]);

  // ---- UI state ------------------------------------------------------------

  // const env = useMemo<"prod" | "dev">(
  //   () => (isProduction ? "prod" : "dev"),
  //   [isProduction]
  // );

  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs());
  const [noProgramsMessage, setNoProgramsMessage] = useState("");

  // ---- Data state ----------------------------------------------------------
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);

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

  const setOrRotateKey = async (env: "prod" | "dev", key: string) => {
    if (!key) {
      alert("Please enter a key value.");
      return;
    }
    try {
      const upsertGalloAxisKey = httpsCallable<
        { env: "prod" | "dev"; key: string },
        { success: boolean }
      >(functions, "upsertGalloAxisKey");

      const res = await upsertGalloAxisKey({ env, key });
      if (res.data.success) {
        console.log("✅ Key upserted successfully");
        await refreshKeyStatus();
      } else {
        alert("Failed to set key.");
      }
    } catch (err) {
      console.error("setOrRotateKey error:", err);
      alert("Error setting key. Check console for details.");
    }
  };

  const deleteKey = async (env: "prod" | "dev") => {
    try {
      const deleteGalloAxisKey = httpsCallable<
        { env: "prod" | "dev" },
        { success: boolean }
      >(functions, "deleteGalloAxisKey");

      const res = await deleteGalloAxisKey({ env });
      if (res.data.success) {
        console.log("✅ Key deleted successfully");
        await refreshKeyStatus();
      } else {
        alert("Failed to delete key.");
      }
    } catch (err) {
      console.error("deleteKey error:", err);
      alert("Error deleting key. Check console for details.");
    }
  };

  const refreshKeyStatus = async () => {
    try {
      const getExternalApiKeyStatus = httpsCallable<
        { integration: string },
        {
          prod: { exists: boolean; lastFour?: string; updatedAt?: any };
          dev: { exists: boolean; lastFour?: string; updatedAt?: any };
        }
      >(functions, "getExternalApiKeyStatus");

      const res = await getExternalApiKeyStatus({ integration: "galloAxis" });
      setKeyStatus(res.data);
    } catch (err) {
      console.error("refreshKeyStatus error:", err);
    }
  };

  // ---- Gallo API calls via Vercel proxy -----------------------------------
  const fetchPrograms = async () => {
    if (!companyId || !apiKey) return;
    setIsLoading(true);
    setNoProgramsMessage("");

    const baseUrl = isProduction
      ? "https://q2zgrnmnvl.execute-api.us-west-2.amazonaws.com"
      : "https://6w7u156vcb.execute-api.us-west-2.amazonaws.com";

    const startDateUnix = startDate?.unix()?.toString() ?? "";
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...requestOptions, baseUrl: url }),
        }
      );

      const data: GalloProgramType[] = await response.json();
      setPrograms(data);
      setSelectedProgram(null);
      setGoals([]);
      setSelectedGoal(null);
      setEnrichedAccounts([]);
      setUnmatchedAccounts([]);
      if (!Array.isArray(data) || data.length === 0) {
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
    if (!selectedProgram || !apiKey) return;
    setIsLoading(true);

    const baseUrl = isProduction
      ? "https://q2zgrnmnvl.execute-api.us-west-2.amazonaws.com"
      : "https://6w7u156vcb.execute-api.us-west-2.amazonaws.com";

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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...requestOptions, baseUrl: url }),
        }
      );

      const data: GalloGoalType[] = await response.json();
      setGoals(data);
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
    if (!selectedProgram || !selectedGoal || !companyId || !apiKey) return;
    setIsLoading(true);

    const baseUrl = isProduction
      ? "https://q2zgrnmnvl.execute-api.us-west-2.amazonaws.com"
      : "https://6w7u156vcb.execute-api.us-west-2.amazonaws.com";

    const url = `${baseUrl}/healy/accounts?marketId=${selectedProgram.marketId}&goalId=${selectedGoal.goalId}`;
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

      const galloAccs: GalloAccountType[] = await response.json();

      // 2) Pull company accounts
      const galloIds = galloAccs.map((a) => String(a.distributorAcctId));
      const companyAccs = await fetchCompanyAccounts(companyId, galloIds);

      // 3) Enrich + partition
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
        {/* 🔑 Key Management Section */}
        <Box
          sx={{
            border: "1px solid #ccc",
            borderRadius: "8px",
            p: 2,
            backgroundColor: "#fafafa",
          }}
        >
          <Typography variant="h6" gutterBottom>
            🔑 Gallo Axis Key Management
          </Typography>

          {/* Env toggle */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Typography
              sx={{
                fontWeight: !isProduction ? "bold" : "normal",
                color: !isProduction ? "text.secondary" : "text.disabled",
              }}
            >
              Development
            </Typography>

            <Switch
              checked={isProduction}
              onChange={() => setSelectedEnv(isProduction ? "dev" : "prod")}
              color="primary"
            />

            <Typography
              sx={{
                fontWeight: isProduction ? "bold" : "normal",
                color: isProduction ? "primary.main" : "text.secondary",
              }}
            >
              Production
            </Typography>
          </Box>

          {/* Key status */}
          <Typography variant="body2" sx={{ mb: 1 }}>
            Current Keys — prod:{" "}
            {keyStatus?.prod?.exists
              ? `••••${keyStatus.prod.lastFour}`
              : "none"}
            , dev:{" "}
            {keyStatus?.dev?.exists ? `••••${keyStatus.dev.lastFour}` : "none"}
          </Typography>

          {/* Key actions */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                setModalEnv(selectedEnv);
                setOpenKeyModal(true);
              }}
            >
              Set/Rotate
            </Button>

            <Button
              variant="contained"
              color="error"
              onClick={() => setOpenDeleteKeyModal(true)}
            >
              Delete Key
            </Button>
          </Box>
        </Box>

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

          {/* Goals */}
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
      <Dialog
        open={openDeleteKeyModal}
        onClose={() => setOpenDeleteKeyModal(false)}
      >
        <DialogTitle>Delete Gallo Axis API Key</DialogTitle>
        <DialogContent>
          <Typography color="error" sx={{ mb: 2 }}>
            ⚠️ Deleting the {selectedEnv.toUpperCase()} key will break all
            program imports for that environment until a new key is set. This
            action cannot be undone.
          </Typography>
          <Typography variant="body2">
            Are you sure you want to delete the{" "}
            <strong>{selectedEnv.toUpperCase()}</strong> key?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteKeyModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              await deleteKey(selectedEnv); // pass env into your delete handler
              setOpenDeleteKeyModal(false);
            }}
          >
            Delete Key
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openKeyModal} onClose={() => setOpenKeyModal(false)}>
        <DialogTitle>Set or Rotate Gallo Axis API Key</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
        >
          <Typography variant="body2" color="warning.main">
            ⚠️ Rotating this key will immediately replace the existing{" "}
            {modalEnv.toUpperCase()} key.
          </Typography>

          <FormControl fullWidth>
            <InputLabel id="env-label">Environment</InputLabel>
            <Select
              labelId="env-label"
              value={modalEnv}
              onChange={(e) => setModalEnv(e.target.value as "prod" | "dev")}
            >
              <MenuItem value="prod">Production</MenuItem>
              <MenuItem value="dev">Development</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label={`Enter ${modalEnv} API Key`}
            type="password"
            value={modalKey}
            onChange={(e) => setModalKey(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenKeyModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              await setOrRotateKey(modalEnv, modalKey);
              setOpenKeyModal(false);
              setModalKey("");
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GalloIntegration;
