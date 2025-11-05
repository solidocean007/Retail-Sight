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
import { doc, getDoc } from "@firebase/firestore";
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
    [companyUsers]
  );
  const [draftGoal, setDraftGoal] = useState<CompanyGoalType | null>(null);
  const [goalAssignments, setGoalAssignments] = useState<GoalAssignmentType[]>(
    []
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
    "sales"
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
        const firestoreAccounts = await fetchAllAccountsFromFirestore(
          accountsId
        );
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
    users: { uid: string; salesRouteNum?: string }[]
  ): string[] => {
    if (!account.salesRouteNums || account.salesRouteNums.length === 0)
      return [];

    return users
      .filter(
        (user) =>
          user.salesRouteNum &&
          account.salesRouteNums.includes(user.salesRouteNum)
      )
      .map((user) => user.uid);
  };

  const userIdsByAccount = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const account of accounts) {
      map[account.accountNumber] = getUserIdsForAccount(
        account,
        normalizedCompanyUsers
      );
    }
    return map;
  }, [accounts, normalizedCompanyUsers]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        (!filters.chains.length ||
          filters.chains.some(
            (c) => c.toLowerCase() === (a.chain || "").toLowerCase()
          )) &&
        (!filters.chainType || a.chainType === filters.chainType) &&
        (!filters.typeOfAccounts.length ||
          filters.typeOfAccounts.includes(a.typeOfAccount || "")) &&
        (!filters.userIds.length ||
          userIdsByAccount[a.accountNumber]?.some((id) =>
            filters.userIds.includes(id)
          )) &&
        (!filters.supervisorIds.length ||
          userIdsByAccount[a.accountNumber]?.some((repUid) => {
            const supUid = reportsToMap.get(repUid);
            return supUid && filters.supervisorIds.includes(supUid);
          }))
    );
  }, [accounts, filters, userIdsByAccount, reportsToMap]);

  useEffect(() => {
    // If scope is "all" we assign every account; if "selected", only filtered
    const scopedAccounts = accountScope === "all" ? accounts : filteredAccounts;

    // Build list of (accountNumber + uid) pairs dynamically based on assigneeType
    let newAssignments: GoalAssignmentType[] = [];

    if (assigneeType === "sales") {
      // 🔹 Assign all matching reps for each account
      newAssignments = scopedAccounts.flatMap((acc) => {
        const reps = normalizedCompanyUsers.filter(
          (u) =>
            u.salesRouteNum &&
            (acc.salesRouteNums || []).includes(u.salesRouteNum)
        );
        return reps.map((rep) => ({
          accountNumber: acc.accountNumber.toString(),
          uid: rep.uid,
        }));
      });
    } else if (assigneeType === "supervisor") {
      newAssignments = scopedAccounts.flatMap((acc) => {
        const routeNums = acc.salesRouteNums || [];

        // 1️⃣ Find reps who sell this account
        const reps = normalizedCompanyUsers.filter(
          (u) => u.salesRouteNum && routeNums.includes(u.salesRouteNum)
        );

        // 2️⃣ Collect supervisors of those reps
        const supervisorUids = new Set(
          reps.map((r) => r.reportsTo).filter(Boolean) as string[]
        );

        // 3️⃣ Also include any supervisors who personally sell the route
        normalizedCompanyUsers.forEach((u) => {
          if (
            u.role === "supervisor" &&
            u.salesRouteNum &&
            routeNums.includes(u.salesRouteNum)
          ) {
            supervisorUids.add(u.uid);
          }
        });

        // 4️⃣ Build assignment pairs
        return Array.from(supervisorUids).map((uid) => ({
          accountNumber: acc.accountNumber.toString(),
          uid,
        }));
      });
    }

    // 🔹 Deduplicate (accountNumber + uid) pairs
    const deduped = Array.from(
      new Map(
        newAssignments.map((a) => [`${a.accountNumber}-${a.uid}`, a])
      ).values()
    );

    setGoalAssignments(deduped);
  }, [
    accountScope,
    filteredAccounts,
    accounts,
    assigneeType,
    normalizedCompanyUsers,
  ]);

  const readyForCreation: boolean =
    goalTitle.trim().length > 0 &&
    goalDescription.trim().length > 0 &&
    goalMetric.trim().length > 0 &&
    Number(goalValueMin) > 0;

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
          const data = docSnap.data();
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

  const { eligibleUsersForCurrentScope, numberOfAffectedUsers } =
    useMemo(() => {
      // 🔹 Build scoped accounts from either "all" or the goalAssignments
      const scopedAccounts =
        accountScope === "all"
          ? accounts
          : accounts.filter((a) =>
              goalAssignments.some(
                (g) => g.accountNumber === a.accountNumber.toString()
              )
            );

      const routeNums = new Set(
        scopedAccounts.flatMap((a) => a.salesRouteNums || [])
      );

      const reps = normalizedCompanyUsers.filter(
        (u) => u.salesRouteNum && routeNums.has(u.salesRouteNum)
      );

      if (assigneeType === "sales") {
        return {
          eligibleUsersForCurrentScope: reps,
          numberOfAffectedUsers: reps.length,
        };
      }

      // 🔹 supervisors who manage at least one of those reps
      const supervisorUids = new Set(
        reps.map((r) => reportsToMap.get(r.uid)).filter(Boolean) as string[]
      );

      const supervisors = normalizedCompanyUsers.filter((u) =>
        supervisorUids.has(u.uid)
      );

      return {
        eligibleUsersForCurrentScope: supervisors,
        numberOfAffectedUsers: supervisors.length,
      };
    }, [
      accountScope,
      accounts,
      goalAssignments, // ✅ replaced legacy dependency
      normalizedCompanyUsers,
      assigneeType,
      reportsToMap,
    ]);

  const handleCreateGoal = async () => {
    if (!readyForCreation) {
      alert("Please fill out all required fields.");
      return;
    }
    if (!companyId) {
      alert("Missing companyId. Cannot create goal.");
      return;
    }

    // Helper: unique by uid+accountNumber
    const dedupeAssignments = (
      arr: { uid: string; accountNumber: string }[]
    ) => {
      const map = new Map<string, { uid: string; accountNumber: string }>();
      for (const a of arr) map.set(`${a.uid}-${a.accountNumber}`, a);
      return Array.from(map.values());
    };

    // Build scoped accounts using current goalAssignments when in "selected" mode.
    const selectedAccountNums = Array.from(
      new Set(goalAssignments.map((g) => g.accountNumber))
    );

    const scopedAccounts =
      accountScope === "all"
        ? accounts
        : accounts.filter((a) =>
            selectedAccountNums.includes(a.accountNumber.toString())
          );

    // Finalize assignments:
    // - If scope is "selected" and user already assigned pairs, respect them.
    // - Otherwise (scope "all" OR no manual pairs yet), generate matrix using eligibleUsersForCurrentScope.
    const finalAssignments =
      accountScope === "selected" && goalAssignments.length > 0
        ? dedupeAssignments(
            // keep only pairs whose account is inside the scope
            goalAssignments.filter((g) =>
              scopedAccounts.some(
                (a) => a.accountNumber.toString() === g.accountNumber
              )
            )
          )
        : dedupeAssignments(
            scopedAccounts.flatMap((acc) =>
              eligibleUsersForCurrentScope.map((u) => ({
                uid: u.uid,
                accountNumber: acc.accountNumber.toString(),
              }))
            )
          );

    const newGoal: CompanyGoalType = {
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
      goalAssignments: finalAssignments, // ✅ single source of truth
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
        filteredAccounts.map((a) => a.accountNumber.toString())
      );

      // Remove any assignments whose accountNumber is no longer visible
      return prev.filter((g) => inView.has(g.accountNumber));
    });
  }, [accountScope, filteredAccounts]);

  useEffect(() => {
    if (!goalStartDate) {
      setGoalStartDate(dayjs().format("YYYY-MM-DD"));
    }
    if (!goalEndDate) {
      setGoalEndDate(dayjs().endOf("month").format("YYYY-MM-DD"));
    }
  }, []);

  const hasSummary = goalTitle.length > 1 && goalDescription.length > 1;

  const confirmGoalCreation = async () => {
    if (!draftGoal || !currentUser) return;

    setIsSaving(true);
    try {
      const result = await dispatch(
        createCompanyGoalInFirestore({ goal: draftGoal, currentUser })
      );

      if (createCompanyGoalInFirestore.fulfilled.match(result)) {
        alert("Goal created!");
        setGoalTitle("");
        setGoalDescription("");
        setGoalMetric("");
        setGoalValueMin(1);
        setGoalStartDate("");
        setGoalEndDate("");
        // setSelectedAccounts([]);
      } else {
        alert(`Error: ${result.payload}`);
      }
    } catch (err) {
      console.error("Goal creation error:", err);
      alert("Something went wrong.");
    } finally {
      setIsSaving(false);
      setShowConfirmModal(false);
      setDraftGoal(null);
    }
  };

  // 🔹 Compute counts for confirmation modal
  const scopedAccounts =
    accountScope === "all"
      ? accounts
      : accounts.filter((a) =>
          goalAssignments.some(
            (g) => g.accountNumber === a.accountNumber.toString()
          )
        );

  const routeNums = new Set(
    scopedAccounts.flatMap((a) => a.salesRouteNums || [])
  );

  const repsForScope = normalizedCompanyUsers.filter(
    (u) => u.salesRouteNum && routeNums.has(u.salesRouteNum)
  );

  let supervisorsForScope: typeof normalizedCompanyUsers = [];

  if (assigneeType === "supervisor") {
    const supervisorUids = new Set(
      repsForScope.map((r) => r.reportsTo).filter(Boolean) as string[]
    );
    supervisorsForScope = normalizedCompanyUsers.filter((u) =>
      supervisorUids.has(u.uid)
    );
  }

  const affectedAccountsCount = scopedAccounts.length;
  const affectedSalesCount = assigneeType === "sales" ? repsForScope.length : 0;
  const affectedSupervisorsCount =
    assigneeType === "supervisor" ? supervisorsForScope.length : 0;

  const handleRemoveAssignment = (accountNumber: string, uid: string) => {
    // handleRemoveAssignment' is declared but its value is never read.
    setGoalAssignments((prev) =>
      prev.filter((g) => !(g.uid === uid && g.accountNumber === accountNumber))
    );
  };

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

            {accountScope === "selected" && (
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
      />
    </Container>
  );
};

export default CreateCompanyGoalView;
