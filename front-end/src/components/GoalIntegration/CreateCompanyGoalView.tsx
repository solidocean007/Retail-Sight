// CreateCompanyGoalView.tsx
import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
} from "@mui/material";
import {
  CompanyAccountType,
  CompanyGoalType,
  GoalAssignmentType,
} from "../../utils/types";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../utils/store";
import { db } from "../../utils/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "@firebase/firestore";
import { selectCompanyUsers } from "../../Slices/userSlice";
import { createCompanyGoalInFirestore } from "../../thunks/companyGoalsThunk";
import { selectCurrentCompany } from "../../Slices/currentCompanySlice";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import TrackChangesIcon from "@mui/icons-material/TrackChanges"; // MUI's target icon

import dayjs from "dayjs";
import "./createCompanyGoalView.css";
import GoalTitleInput from "./GoalTitleInput";
import ConfirmGoalModal from "./ConfirmGoalModal";
import {
  selectAllCompanyAccounts,
  setAllAccounts,
} from "../../Slices/allAccountsSlice";
import { getAllCompanyAccountsFromIndexedDB } from "../../utils/database/accountStoreUtils";
import { fetchAllAccountsFromFirestore } from "../../utils/helperFunctions/fetchAllAccountsFromFirestore";
import GoalFiltersPanel from "./GoalFiltersPanel";
import GoalAssignmentsSection from "./GoalAssignmentsSection";
import { useFilteredAccounts } from "../../hooks/useFilteredAccounts";
import { buildAssignments } from "./utils/buildAssignments";
import { showMessage } from "../../Slices/snackbarSlice";
import { normalizeFirestoreData } from "../../utils/normalize";

const defaultCustomerTypes: string[] = [
  "CONVENIENCE",
  "RESTAURANTS",
  "SUPERMARKET",
  "BARS",
  "OTHER",
];

const CreateCompanyGoalView = () => {
  const dispatch = useAppDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const companyId = currentUser?.companyId;
  const usersCompany = useSelector(selectCurrentCompany);
  const companyUsers = useSelector(selectCompanyUsers);
  const activeCompanyUsers = useMemo(
    () =>
      (companyUsers ?? []).filter((u) => (u.status ?? "active") === "active"),
    [companyUsers],
  );
  const [draftGoal, setDraftGoal] = useState<CompanyGoalType | null>(null);
  const [emailOnCreate, setEmailOnCreate] = useState(true);
  const [goalAssignments, setGoalAssignments] = useState<GoalAssignmentType[]>(
    [],
  );
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [customerTypes, setCustomerTypes] = useState<string[]>([]);
  const [chainNames, setChainNames] = useState<string[]>([]);
  const [enforcePerUserQuota, setEnforcePerUserQuota] = useState(false);
  const [perUserQuota, setPerUserQuota] = useState<number | string>("1");
  const [_isSaving, setIsSaving] = useState(false); // 'isSaving' is declared but its value is never read.
  const allCompanyAccounts = useSelector(selectAllCompanyAccounts);
  const [accounts, setAccounts] = useState<CompanyAccountType[]>([]);
  const [_accountsLoading, setAccountsLoading] = useState(true);

  const [goalDescription, setGoalDescription] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [assigneeType, setAssigneeType] = useState<"sales" | "supervisor">(
    "sales",
  );
  const [goalMetric, setGoalMetric] = useState("cases");
  const [goalValueMin, setGoalValueMin] = useState(1);
  const [goalStartDate, setGoalStartDate] = useState("");
  const [goalEndDate, setGoalEndDate] = useState("");
  const [accountScope, setAccountScope] = useState<"all" | "selected">("all");
  const [savedFilterSets, setSavedFilterSets] = useState<
    Record<string, SavedFilterSet>
  >({});
  const [filterSetName, setFilterSetName] = useState("");

  const [filters, setFilters] = useState({
    chains: [] as string[],
    chainType: "",
    typeOfAccounts: [] as string[],
    userIds: [] as string[], // Sales reps
    supervisorIds: [] as string[], // Supervisors
  });

  // const hasActiveFilters =
  //   filters.chains.length > 0 ||
  //   filters.chainType !== "" ||
  //   filters.typeOfAccounts.length > 0 ||
  //   filters.userIds.length > 0 ||
  //   filters.supervisorIds.length > 0;

  type SavedFilterSet = typeof filters;

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      setAccountsLoading(true);

      // ✅ 1. If already in Redux, use that
      if (allCompanyAccounts && allCompanyAccounts.length > 0) {
        if (!cancelled) {
          setAccounts(allCompanyAccounts);
          setAccountsLoading(false);
        }
        return;
      }

      // ✅ 2. Try IndexedDB (offline cache)
      try {
        const cached = await getAllCompanyAccountsFromIndexedDB();
        if (cached?.length && !cancelled) {
          setAccounts(cached);
          dispatch(setAllAccounts(cached)); // hydrate Redux from cache
          setAccountsLoading(false);
          return;
        }
      } catch (err) {
        console.warn("No cached accounts found:", err);
      }

      // ✅ 3. Fallback to Firestore fetch
      try {
        const accountsId = usersCompany?.accountsId;
        if (!accountsId) throw new Error("Missing accountsId");
        const firestoreAccounts =
          await fetchAllAccountsFromFirestore(accountsId);
        if (!cancelled && firestoreAccounts?.length) {
          setAccounts(firestoreAccounts);
          dispatch(setAllAccounts(firestoreAccounts));
          setAccountsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
        if (!cancelled) setAccountsLoading(false);
      }
    }

    loadAccounts();
    return () => {
      cancelled = true;
    };
  }, [allCompanyAccounts, usersCompany?.accountsId, dispatch]);

  const normalizedCompanyUsers = useMemo(() => {
    return (activeCompanyUsers || []).map((user) => ({
      ...user,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      role: user.role || "",
      salesRouteNum: user.salesRouteNum || "",
      reportsTo: user.reportsTo || "",
    }));
  }, [companyUsers]);

  const reportsToMap = useMemo(() => {
    const map = new Map<string, string>(); // repUid -> supervisorUid
    normalizedCompanyUsers.forEach((u) => {
      if (u.reportsTo) map.set(u.uid, u.reportsTo);
    });
    return map;
  }, [normalizedCompanyUsers]);

  // const supervisorsByUid = useMemo(() => {
  //   // should i use this for my selector?
  //   const sup = new Map<string, (typeof normalizedCompanyUsers)[number]>();
  //   normalizedCompanyUsers.forEach((u) => {
  //     if (u.role === "supervisor") sup.set(u.uid, u);
  //   });
  //   return sup;
  // }, [normalizedCompanyUsers]);

  const getUserIdsForAccount = (
    account: CompanyAccountType,
    users: { uid: string; salesRouteNum?: string }[],
  ): string[] => {
    if (!account.salesRouteNums || account.salesRouteNums.length === 0)
      return [];

    return users
      .filter(
        (user) =>
          user.salesRouteNum &&
          account.salesRouteNums.includes(user.salesRouteNum),
      )
      .map((user) => user.uid);
  };

  const userIdsByAccount = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const account of accounts) {
      map[account.accountNumber] = getUserIdsForAccount(
        account,
        normalizedCompanyUsers,
      );
    }
    return map;
  }, [accounts, normalizedCompanyUsers]);

  const filteredAccounts = useFilteredAccounts({
    accounts,
    filters,
    reportsToMap,
    userIdsByAccount,
  });

  useEffect(() => {
    if (accountScope === "selected" && filteredAccounts.length === 0) {
      // no accounts selected → no assignments
      setGoalAssignments([]);
      return;
    }

    const newAssignments = buildAssignments({
      accounts,
      filteredAccounts,
      normalizedUsers: normalizedCompanyUsers,
      assigneeType,
      accountScope,
    });

    setGoalAssignments(newAssignments);
  }, [
    accounts,
    filteredAccounts,
    assigneeType,
    accountScope,
    normalizedCompanyUsers,
  ]);

  const readyForCreation =
    !!goalTitle.trim() &&
    !!goalDescription.trim() &&
    !!goalMetric.trim() &&
    goalValueMin > 0;

  useEffect(() => {
    const stored = localStorage.getItem("displaygram_filter_sets");
    if (stored) {
      setSavedFilterSets(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (!companyId) return;

    const configRef = doc(db, "companies", companyId);

    getDoc(configRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          const data = normalizeFirestoreData(docSnap.data());

          setCustomerTypes(data.customerTypes || defaultCustomerTypes);
          setChainNames(data.chains || []);
        } else {
          setCustomerTypes(defaultCustomerTypes);
        }
      })
      .catch((err) => {
        console.error("Error loading customerTypes:", err);
        setCustomerTypes(defaultCustomerTypes);
      });
  }, [companyId]);

  const numberOfAffectedUsers = new Set(goalAssignments.map((a) => a.uid)).size;

  const handleCreateGoal = async () => {
    if (!readyForCreation) {
      alert("Please fill out all required fields.");
      return;
    }
    if (!companyId) {
      alert("Missing companyId. Cannot create goal.");
      return;
    }

    // 🚀 Always use the unified assignment builder
    const finalAssignments = buildAssignments({
      accounts,
      filteredAccounts,
      normalizedUsers: normalizedCompanyUsers,
      assigneeType,
      accountScope,
    });

    const newGoal: CompanyGoalType & {
      notifications?: {
        emailOnCreate: boolean;
      };
    } = {
      companyId,
      goalTitle,
      targetRole: assigneeType,
      goalDescription,
      goalMetric,
      goalValueMin: Number(goalValueMin),
      goalStartDate,
      goalEndDate,
      createdAt: new Date().toISOString(),
      deleted: false,
      goalAssignments: finalAssignments,

      notifications: {
        emailOnCreate,
      },

      ...(enforcePerUserQuota && perUserQuota
        ? { perUserQuota: Number(perUserQuota) }
        : {}),
    };

    setDraftGoal(newGoal);
    setShowConfirmModal(true);
  };

  // ✅ Keep goalAssignments in sync with current filtered view
  useEffect(() => {
    if (accountScope !== "selected") return;

    setGoalAssignments((prev) => {
      const inView = new Set(
        filteredAccounts.map((a) => a.accountNumber.toString()),
      );

      // Remove any assignments whose accountNumber is no longer visible
      return prev.filter((g) => inView.has(g.accountNumber));
    });
  }, [accountScope, filteredAccounts]);

  useEffect(() => {
    setGoalStartDate(dayjs().format("YYYY-MM-DD"));
    setGoalEndDate(dayjs().endOf("month").format("YYYY-MM-DD"));
  }, []);

  const hasSummary = goalTitle.length > 1 && goalDescription.length > 1;

  const confirmGoalCreation = async () => {
    if (!draftGoal || !currentUser) return;

    setIsSaving(true);
    try {
      const result = await dispatch(
        createCompanyGoalInFirestore({ goal: draftGoal, currentUser }),
      );

      if (createCompanyGoalInFirestore.fulfilled.match(result)) {
        const createdGoal = result.payload as CompanyGoalType;

        // ---------------------------------------------
        // 🔥 Send goal.assignment events to each assignee
        // ---------------------------------------------
        if (
          createdGoal.goalAssignments &&
          createdGoal.goalAssignments?.length > 0
        ) {
          const targetUserIds = Array.from(
            new Set(createdGoal.goalAssignments.map((a) => a.uid)),
          );

          for (const uid of targetUserIds) {
            await addDoc(collection(db, "activityEvents"), {
              type: "goal.assignment",
              goalId: createdGoal.id, // Property 'id' does not exist on type 'CompanyGoalType'
              actorUserId: currentUser.uid,
              actorName: `${currentUser.firstName} ${currentUser.lastName}`,
              targetUserIds: [uid],

              goalTitle: createdGoal.goalTitle,
              goalDescription: createdGoal.goalDescription,

              createdAt: serverTimestamp(),
            });
          }
        }

        dispatch(
          showMessage({
            text: "Goal created successfully",
            severity: "success",
          }),
        );

        setGoalTitle("");
        setGoalDescription("");
        setGoalMetric("");
        setGoalValueMin(1);
        setGoalStartDate("");
        setGoalEndDate("");
        // setSelectedAccounts([]);
      } else {
        dispatch(
          showMessage({
            text: result.payload
              ? `Failed to create goal: ${result.payload}`
              : "Failed to create goal",
            severity: "error",
          }),
        );
      }
    } catch (err) {
      console.error("Goal creation error:", err);
      dispatch(
        showMessage({
          text: "Something went wrong while creating the goal.",
          severity: "error",
        }),
      );
    } finally {
      setIsSaving(false);
      setShowConfirmModal(false);
      setDraftGoal(null);
      setEmailOnCreate(true);
    }
  };

  // 🔹 Compute counts for confirmation modal
  // 🔹 Confirmation modal data – now using the unified assignment builder
  const confirmAssignments = draftGoal?.goalAssignments ?? [];

  const affectedAccountsCount = new Set(
    confirmAssignments.map((a) => a.accountNumber),
  ).size;

  const affectedUsersCount = new Set(confirmAssignments.map((a) => a.uid)).size;

  // Sales or supervisor counts (optional, depends on target)
  const affectedSalesCount = assigneeType === "sales" ? affectedUsersCount : 0;

  const affectedSupervisorsCount =
    assigneeType === "supervisor" ? affectedUsersCount : 0;

  // useEffect(() => {
  //   if (accountScope === "selected") {
  //     setGoalAssignments([]); // Clear everything until user filters
  //   }
  // }, [accountScope]);

  return (
    <Container>
      <Box mb={4}>
        <Typography variant="h5" gutterBottom>
          Create a New Goal
        </Typography>
        <div className="goal-create-layout">
          <Box display="flex" flexDirection="column" gap={3}>
            <div className="goal-form-group">
              <GoalTitleInput value={goalTitle} setValue={setGoalTitle} />
            </div>

            <div className="goal-form-group">
              <label htmlFor="goalDescription">Goal Description</label>
              <textarea
                id="goalDescription"
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                className="custom-textarea"
                rows={4}
                placeholder="Describe what success looks like for this goal..."
              />
            </div>

            <Box display="flex" gap={2}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Box display="flex" gap={3} justifyContent="start">
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                  >
                    <TextField
                      type="date"
                      label="Start Date"
                      value={goalStartDate}
                      onChange={(e) => setGoalStartDate(e.target.value)}
                      size="small"
                      sx={{ width: 160 }}
                      inputProps={{ min: "2023-01-01" }}
                    />
                  </Box>

                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                  >
                    <TextField
                      type="date"
                      label="End Date"
                      value={goalEndDate}
                      onChange={(e) => setGoalEndDate(e.target.value)}
                      size="small"
                      sx={{ width: 160 }}
                      inputProps={{ min: goalStartDate }}
                    />
                  </Box>
                </Box>
              </LocalizationProvider>
            </Box>

            <Box display="flex" justifyContent="flex-start">
              <Box sx={{ width: 200 }}>
                <Typography variant="h6">Goal Metric</Typography>
                <ToggleButtonGroup
                  value={goalMetric}
                  exclusive
                  onChange={(_e, val) => val && setGoalMetric(val)}
                  aria-label="Goal Metric"
                >
                  <ToggleButton value="cases">Cases</ToggleButton>
                  <ToggleButton value="bottles">Bottles</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box>
                <Typography variant="h6">Minimum Value</Typography>
                <Box display="flex" alignItems="center">
                  <Button
                    variant="outlined"
                    onClick={() =>
                      setGoalValueMin((prev) => Math.max(1, prev - 1))
                    }
                  >
                    -
                  </Button>
                  <TextField
                    type="number"
                    value={goalValueMin}
                    onChange={(e) =>
                      setGoalValueMin(Math.max(1, Number(e.target.value)))
                    }
                    size="medium"
                    sx={{ width: 100, mx: 1 }}
                    inputProps={{ min: 1 }} // 'inputProps' is deprecated.
                  />
                  <Button
                    variant="outlined"
                    onClick={() => setGoalValueMin((prev) => prev + 1)}
                  >
                    +
                  </Button>
                </Box>
              </Box>
            </Box>
            <Box display="flex" justifyContent="flex-start">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={enforcePerUserQuota}
                    onChange={(e) => setEnforcePerUserQuota(e.target.checked)}
                  />
                }
                label="Require a minimum number of submissions per user"
              />

              {enforcePerUserQuota && (
                <TextField
                  label="Per User Quota"
                  type="number"
                  value={perUserQuota}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      setPerUserQuota(""); // Allow blank state
                    } else {
                      const numericValue = Number(value);
                      setPerUserQuota(isNaN(numericValue) ? 0 : numericValue);
                    }
                  }}
                  helperText="Example: Require 3 submissions per user"
                  sx={{ mt: 1 }}
                />
              )}
            </Box>
            {readyForCreation && (
              <div className="target-accounts-and-roles">
                <FormControl component="fieldset">
                  <Typography variant="subtitle1">Target Accounts</Typography>
                  <RadioGroup
                    value={accountScope}
                    onChange={(e) =>
                      setAccountScope(e.target.value as "all" | "selected")
                    }
                    row
                  >
                    <FormControlLabel
                      value="all"
                      control={<Radio />}
                      label="All Accounts"
                    />
                    <FormControlLabel
                      value="selected"
                      control={<Radio />}
                      label="Selected Accounts"
                    />
                  </RadioGroup>
                </FormControl>
                <FormControl component="fieldset">
                  <Typography variant="subtitle1">Assign To</Typography>
                  <RadioGroup
                    value={assigneeType}
                    onChange={(e) =>
                      setAssigneeType(e.target.value as "sales" | "supervisor")
                    }
                    row
                  >
                    <FormControlLabel
                      value="sales"
                      control={<Radio />}
                      label="Sales Reps"
                    />
                    <FormControlLabel
                      value="supervisor"
                      control={<Radio />}
                      label="Supervisors"
                    />
                  </RadioGroup>
                </FormControl>
              </div>
            )}

            {accountScope === "selected" && readyForCreation && (
              <>
                <GoalFiltersPanel
                  filters={filters}
                  setFilters={setFilters}
                  chains={chainNames}
                  customerTypes={customerTypes}
                  normalizedCompanyUsers={normalizedCompanyUsers}
                  savedFilterSets={savedFilterSets}
                  setSavedFilterSets={setSavedFilterSets}
                  filterSetName={filterSetName}
                  setFilterSetName={setFilterSetName}
                  filteredAccounts={filteredAccounts} // ✅ added
                  assigneeType={assigneeType}
                  allAccounts={accounts}
                />
              </>
            )}

            <GoalAssignmentsSection
              readyForCreation={readyForCreation}
              accountScope={accountScope}
              goalAssignments={goalAssignments}
              setGoalAssignments={setGoalAssignments}
              accounts={accounts}
              filteredAccounts={filteredAccounts}
              companyUsers={normalizedCompanyUsers}
              assigneeType={assigneeType}
            />
          </Box>
          {hasSummary && (
            <aside className="goal-summary-panel">
              <Box
                p={1}
                border="1px solid #555"
                borderRadius="12px"
                bgcolor="background.paper"
                boxShadow={3}
                sx={{
                  textAlign: "left",
                  lineHeight: 1.6,
                  fontSize: "0.95rem",
                  width: "100%",
                  maxWidth: "800px",
                  marginX: "auto",
                  position: "relative",
                }}
              >
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <TrackChangesIcon sx={{ color: "primary.main" }} />
                  <Typography variant="subtitle1" fontWeight="bold">
                    Summary
                  </Typography>
                </Box>

                <Typography variant="body2">
                  You are about to create a goal titled{" "}
                  <strong>"{goalTitle}"</strong>, described as "
                  {goalDescription}
                  ". This goal requires each assigned user to contribute a
                  minimum of <strong>{goalValueMin}</strong> {goalMetric}, and
                  will be active from <strong>{goalStartDate}</strong> to{" "}
                  <strong>{goalEndDate}</strong>. This goal will be assigned to{" "}
                  <strong>{numberOfAffectedUsers}</strong> user
                  {numberOfAffectedUsers !== 1 ? "s" : ""} across{" "}
                  {accountScope === "all"
                    ? `${accounts.length} account${
                        accounts.length !== 1 ? "s" : ""
                      }`
                    : `${
                        new Set(goalAssignments.map((g) => g.accountNumber))
                          .size
                      } selected account${
                        goalAssignments.length !== 1 ? "s" : ""
                      }`}
                </Typography>

                {enforcePerUserQuota && (
                  <Typography variant="body2" mt={1}>
                    Each user must complete at least{" "}
                    <strong>{perUserQuota}</strong> submission
                    {Number(perUserQuota) > 1 ? "s" : ""} during the goal
                    period.
                  </Typography>
                )}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={emailOnCreate}
                      onChange={(e) => setEmailOnCreate(e.target.checked)}
                    />
                  }
                  label="Email assigned users about this goal"
                />

                <Typography variant="caption" color="textSecondary">
                  Required operational email. Users cannot opt out.
                </Typography>

                <Box display="flex" justifyContent="flex-end" mt={2}>
                  <button className="button-primary" onClick={handleCreateGoal}>
                    Review Goal
                  </button>
                </Box>
              </Box>
            </aside>
          )}
        </div>
      </Box>
      <ConfirmGoalModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        goal={draftGoal}
        onConfirm={confirmGoalCreation}
        affectedAccountsCount={affectedAccountsCount}
        affectedSalesCount={affectedSalesCount}
        affectedSupervisorsCount={affectedSupervisorsCount}
        emailOnCreate={emailOnCreate}
        setEmailOnCreate={setEmailOnCreate}
      />
    </Container>
  );
};

export default CreateCompanyGoalView;
