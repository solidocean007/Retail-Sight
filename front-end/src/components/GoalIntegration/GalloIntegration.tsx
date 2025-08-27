// components/Gallo/GalloIntegration.tsx
import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Switch,
} from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";

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
  dev?:  { exists: boolean; lastFour?: string; updatedAt?: any };
};

interface GalloIntegrationProps {
  setValue: (newValue: number) => void; // tab switcher from parent
}

/**
 * authedFetch:
 * Grabs the current user's Firebase ID token and sends it as an Authorization Bearer.
 * Your Vercel API checks/uses this token server-side to identify the user/company securely.
 * (A UID from Redux alone is not verifiable by the server; the token is.)
 */
async function authedFetch(path: string, init: RequestInit = {}) {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Not signed in.");
  const token = await user.getIdToken();
  const headers = {
    ...(init.headers || {}),
    Authorization: `Bearer ${token}`,
  };
  return fetch(path, { ...init, headers });
}

const GalloIntegration: React.FC<GalloIntegrationProps> = ({ setValue }) => {
  // ---- UI state ------------------------------------------------------------
  const [isLoading, setIsLoading] = useState(false);
  const [isProduction, setIsProduction] = useState(true);
  const env = useMemo<"prod" | "dev">(() => (isProduction ? "prod" : "dev"), [isProduction]);

  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs());
  const [noProgramsMessage, setNoProgramsMessage] = useState("");

  // ---- Data state ----------------------------------------------------------
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);

  const [programs, setPrograms] = useState<GalloProgramType[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<GalloProgramType | null>(null);

  const [goals, setGoals] = useState<GalloGoalType[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<GalloGoalType | null>(null);

  const [enrichedAccounts, setEnrichedAccounts] = useState<EnrichedGalloAccountType[]>([]);
  const [unmatchedAccounts, setUnmatchedAccounts] = useState<GalloAccountType[]>([]);

  // ---- Store data ----------------------------------------------------------
  const companyId = useSelector((s: RootState) => s.user.currentUser?.companyId);
  const companyUsers = useSelector((s: RootState) => s.user.companyUsers || []);

  // ---- Key status (both prod & dev) ---------------------------------------
  useEffect(() => {
    authedFetch("/api/gallo/key-status")
      .then((r) => r.json())
      .then(setKeyStatus)
      .catch((e) => console.error("key-status error:", e));
  }, []);

  // ---- Handlers ------------------------------------------------------------
  const onDateChangeHandler = (newDate: Dayjs | null) => {
    setStartDate(newDate);
    setNoProgramsMessage("");
  };

  const refreshKeyStatus = async () => {
    const s = await authedFetch("/api/gallo/key-status").then((x) => x.json());
    setKeyStatus(s);
  };

  const setOrRotateKey = async () => {
    const envInput = window.prompt("env? prod/dev", isProduction ? "prod" : "dev");
    if (!envInput) return;
    const normalized = envInput.trim().toLowerCase();
    if (normalized !== "prod" && normalized !== "dev") return alert("Invalid env. Use prod or dev.");
    const key = window.prompt(`Paste ${normalized} Gallo API key`);
    if (!key) return;
    const r = await authedFetch("/api/gallo/upsert-key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ env: normalized, key }),
    });
    if (!r.ok) {
      console.error(await r.json());
      return alert("Failed to set key.");
    }
    refreshKeyStatus();
  };

  const deleteKey = async () => {
    const envInput = window.prompt("Delete which env? prod/dev", "dev");
    if (!envInput) return;
    const normalized = envInput.trim().toLowerCase();
    if (normalized !== "prod" && normalized !== "dev") return alert("Invalid env.");
    if (!confirm(`Delete ${normalized} key?`)) return;
    await authedFetch("/api/gallo/delete-key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ env: normalized }),
    });
    refreshKeyStatus();
  };

  // ---- Gallo API calls via Vercel proxy -----------------------------------
  const fetchPrograms = async () => {
    setIsLoading(true);
    try {
      const startDateUnix = startDate?.unix()?.toString() ?? "";
      const r = await authedFetch("/api/gallo/proxy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: "programs", env, qs: { startDate: startDateUnix } }),
      });
      const data: GalloProgramType[] = await r.json();
      setPrograms(data);
      setSelectedProgram(null);
      setGoals([]);
      setSelectedGoal(null);
      setEnrichedAccounts([]);
      setUnmatchedAccounts([]);
      if (!Array.isArray(data) || data.length === 0) {
        setNoProgramsMessage("No programs found for the selected start date.");
      } else {
        setNoProgramsMessage("");
      }
    } catch (e) {
      console.error("fetchPrograms error:", e);
      setNoProgramsMessage("Failed to load programs.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGoals = async () => {
    if (!selectedProgram) return;
    setIsLoading(true);
    try {
      const { programId, marketId } = selectedProgram;
      const r = await authedFetch("/api/gallo/proxy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: "goals", env, qs: { programId, marketId } }),
      });
      const data: GalloGoalType[] = await r.json();
      setGoals(data);
      setSelectedGoal(null);
      setEnrichedAccounts([]);
      setUnmatchedAccounts([]);
    } catch (e) {
      console.error("fetchGoals error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccounts = async () => {
    if (!selectedProgram || !selectedGoal || !companyId) return;
    setIsLoading(true);
    try {
      // 1) Pull from Gallo
      const r = await authedFetch("/api/gallo/proxy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          endpoint: "accounts",
          env,
          qs: { marketId: selectedProgram.marketId, goalId: selectedGoal.goalId },
        }),
      });
      const galloAccs: GalloAccountType[] = await r.json();

      // 2) Pull your company accounts
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

      if (unmatchedAccounts.length > 0) {
        console.warn(`⚠️ ${unmatchedAccounts.length} unmatched accounts`, unmatchedAccounts);
      }
    } catch (e) {
      console.error("fetchAccounts error:", e);
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

      return allAccounts.filter((a) => galloAccountIds.includes(String(a.accountNumber)));
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
      (g) => !companyAccounts.some((c) => String(c.accountNumber) === String(g.distributorAcctId))
    );

    const enrichedAccounts = galloAccounts.map((g) => {
      const match = companyAccounts.find(
        (c) => Number(c.accountNumber) === Number(g.distributorAcctId)
      );
      const salesPerson = users.find(
        (u) => u.salesRouteNum && match?.salesRouteNums?.includes(u.salesRouteNum)
      );
      return {
        ...g,
        accountName: match?.accountName || "N/A",
        accountAddress: match?.accountAddress || "N/A",
        salesRouteNums: match?.salesRouteNums || ["N/A"],
        salesPersonsName: salesPerson ? `${salesPerson.firstName} ${salesPerson.lastName}` : "N/A",
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
      <Box>
        {/* Env switch */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Typography sx={{ fontWeight: isProduction ? "bold" : "normal" }}>Production</Typography>
          <Switch checked={isProduction} onChange={() => setIsProduction((v) => !v)} />
          <Typography sx={{ fontWeight: !isProduction ? "bold" : "normal" }}>Development</Typography>
        </Box>

        {/* Key manager */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Typography variant="body2">
            Gallo keys — prod: {keyStatus?.prod?.exists ? `••••${keyStatus.prod.lastFour}` : "none"},
            dev: {keyStatus?.dev?.exists ? `••••${keyStatus.dev.lastFour}` : "none"}
          </Typography>
          <Button size="small" onClick={setOrRotateKey}>Set/Rotate</Button>
          <Button size="small" color="error" onClick={deleteKey}>Delete</Button>
        </Box>

        {/* Date + actions */}
        <Box sx={{ display: "flex", width: "90%", justifyContent: "space-between", mb: 2 }}>
          <DateSelector
            startDate={startDate}
            onDateChange={onDateChangeHandler}
            onFetchPrograms={fetchPrograms}
          />
          {(programs.length > 0 || goals.length > 0 || enrichedAccounts.length > 0) && (
            <Button variant="contained" color="secondary" onClick={handleCancel}>
              Cancel
            </Button>
          )}
        </Box>

        {/* Programs */}
        {noProgramsMessage ? (
          <Typography color="error" variant="body1">{noProgramsMessage}</Typography>
        ) : (
          <ProgramTable
            programs={programs}
            selectedProgram={selectedProgram}
            onSelectProgram={setSelectedProgram}
          />
        )}

        {programs.length > 0 && (
          <Button variant="contained" color="primary" onClick={fetchGoals} disabled={!selectedProgram}>
            Search Goals
          </Button>
        )}

        {/* Goals */}
        {goals.length > 0 && (
          <GoalTable goals={goals} selectedGoal={selectedGoal} onSelectGoal={setSelectedGoal} />
        )}

        {goals.length > 0 && (
          <Button variant="contained" color="primary" onClick={fetchAccounts} disabled={!selectedGoal}>
            Fetch Accounts
          </Button>
        )}

        {/* Warnings / Results */}
        {unmatchedAccounts.length > 0 && (
          <Box sx={{ border: "1px solid #ffeeba", borderRadius: "8px", p: 1.5, mb: 2 }}>
            <Typography color="warning.main" variant="body2">
              ⚠️ {unmatchedAccounts.length} account(s) from Gallo are not in your Displaygram database.
              These won’t be included when saving the goal.
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

      {/* Loading Overlay */}
      {isLoading && (
        <Box sx={{
          position: "fixed", inset: 0, display: "flex", justifyContent: "center",
          alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999
        }}>
          <CircularProgress color="inherit" />
        </Box>
      )}
    </Container>
  );
};

export default GalloIntegration;
