// CreateCompanyGoalView.tsx
import { useState, useEffect, useMemo } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  MenuItem,
  Chip,
  Checkbox,
  Dialog,
  DialogTitle,
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
import AccountMultiSelector from "./AccountMultiSelector";
import { selectCompanyUsers } from "../../Slices/userSlice";
import { selectCurrentCompany } from "../../Slices/currentCompanySlice";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import TrackChangesIcon from "@mui/icons-material/TrackChanges"; // MUI's target icon

import dayjs from "dayjs";
import "./newEditCompanyGoalModal.css";
import GoalTitleInput from "./GoalTitleInput";
import FilterMultiSelect from "./FilterMultiSelect";
import AssignmentsPreview from "./AssignmentsPreview";
import {
  selectAllCompanyAccounts,
  setAllAccounts,
} from "../../Slices/allAccountsSlice";
import { getAllCompanyAccountsFromIndexedDB } from "../../utils/database/accountStoreUtils";
import { fetchAllAccountsFromFirestore } from "../../utils/helperFunctions/fetchAllAccountsFromFirestore";

const defaultCustomerTypes: string[] = [
  "CONVENIENCE",
  "RESTAURANTS",
  "SUPERMARKET",
  "BARS",
  "OTHER",
];

interface NewEditCompanyGoalModalProps {
  open: boolean;
  onClose: () => void;
  goal: CompanyGoalType;
  onSave: (updatedGoal: Partial<CompanyGoalType>) => void;
}

const NewEditCompanyGoalModal: React.FC<NewEditCompanyGoalModalProps> = ({
  open,
  onClose,
  goal,
  onSave,
}) => {
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
  const [customerTypes, setCustomerTypes] = useState<string[]>([]);
  const [chainNames, setChainNames] = useState<string[]>([]);
  const [enforcePerUserQuota, setEnforcePerUserQuota] = useState(false);
  const [perUserQuota, setPerUserQuota] = useState<number | string>("1");
  const [_isSaving, setIsSaving] = useState(false);
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
  // 🧩 Initialize from new or old goal data
  const [goalAssignments, setGoalAssignments] = useState<GoalAssignmentType[]>(
    goal.goalAssignments || []
  );
  const [accountNumbersForThisGoal, setAccountNumbersForThisGoal] = useState<
    string[]
  >([]);

  // ✅ add this above state that uses it
  type Filters = {
    chains: string[];
    chainType: string;
    typeOfAccounts: string[];
    userIds: string[];
    supervisorIds: string[];
  };
  type SavedFilterSet = Filters;

  // then:
  const [filters, setFilters] = useState<Filters>({
    chains: [],
    chainType: "",
    typeOfAccounts: [],
    userIds: [],
    supervisorIds: [],
  });

  useEffect(() => {
    if (!goal) return;

    setGoalTitle(goal.goalTitle);
    setGoalDescription(goal.goalDescription);
    setGoalMetric(goal.goalMetric);
    setGoalValueMin(goal.goalValueMin);
    setGoalStartDate(goal.goalStartDate);
    setGoalEndDate(goal.goalEndDate);
    setAccountScope(
      goal.accountNumbersForThisGoal?.length ? "selected" : "all"
    );
    setGoalAssignments(goal.goalAssignments || []);
    setAccountNumbersForThisGoal(goal.accountNumbersForThisGoal || []);
    setAssigneeType(goal.targetRole || "sales");
    setEnforcePerUserQuota(!!goal.perUserQuota);
    setPerUserQuota(goal.perUserQuota?.toString() || "1");
  }, [goal]);

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
  }, [activeCompanyUsers]);

  const reportsToMap = useMemo(() => {
    const map = new Map<string, string>(); // repUid -> supervisorUid
    normalizedCompanyUsers.forEach((u) => {
      if (u.reportsTo) map.set(u.uid, u.reportsTo);
    });
    return map;
  }, [normalizedCompanyUsers]);

  const supervisorsByUid = useMemo(() => {
    // should i use this for my selector?
    const sup = new Map<string, (typeof normalizedCompanyUsers)[number]>();
    normalizedCompanyUsers.forEach((u) => {
      if (u.role === "supervisor") sup.set(u.uid, u);
    });
    return sup;
  }, [normalizedCompanyUsers]);

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

  const readyForUpdating: boolean =
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

  const saveCurrentFilterSet = () => {
    if (!filterSetName.trim())
      return alert("Enter a name to save this filter set.");

    const updated = { ...savedFilterSets, [filterSetName]: filters };
    setSavedFilterSets(updated);
    localStorage.setItem("displaygram_filter_sets", JSON.stringify(updated));
    setFilterSetName("");
  };

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
      // 🔹 Build scoped accounts from either "all" or the accountNumbersForThisGoal array
      const scopedAccounts =
        accountScope === "all"
          ? accounts
          : accounts.filter((a) =>
              accountNumbersForThisGoal.includes(a.accountNumber.toString())
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
      accountNumbersForThisGoal,
      normalizedCompanyUsers,
      assigneeType,
      reportsToMap,
    ]);

  // // ✅ Do not auto-select anything. Only prune selections that fell out of view.
  useEffect(() => {
    if (accountScope !== "selected") return;
    setAccountNumbersForThisGoal((prev) => {
      const inView = new Set(
        filteredAccounts.map((a) => a.accountNumber.toString())
      );
      return prev.filter((id) => inView.has(id));
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

  // 🔹 Compute counts for confirmation modal
  const scopedAccounts =
    accountScope === "all"
      ? accounts
      : accounts.filter((a) =>
          accountNumbersForThisGoal.includes(a.accountNumber.toString())
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
    setGoalAssignments((prev) =>
      prev.filter((g) => !(g.uid === uid && g.accountNumber === accountNumber))
    );
  };

  const handleUpdateGoal = async () => {
    if (!goal || !currentUser) return;
    setIsSaving(true);

    try {
      const updatedGoal: Partial<CompanyGoalType> = {
        goalTitle,
        goalDescription,
        goalMetric,
        goalValueMin,
        goalStartDate,
        goalEndDate,
        goalAssignments,
        accountNumbersForThisGoal:
          accountScope === "all" ? [] : accountNumbersForThisGoal,
        targetRole: assigneeType,
        perUserQuota: enforcePerUserQuota
          ? Math.max(1, Number(perUserQuota) || 0)
          : null,
      };

      await onSave(updatedGoal);
      alert("Goal updated successfully!");
      onClose();
    } catch (err) {
      console.error("Error updating goal:", err);
      alert("Error updating goal");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ className: "goal-modal" }}
    >
      <DialogTitle className="goal-modal__title">Edit Company Goal</DialogTitle>
      <Box mb={4}>
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
                <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                  {/* Chain Filter */}
                  <FilterMultiSelect
                    label="Chain"
                    options={chainNames}
                    selected={filters.chains}
                    onChange={(newChains) =>
                      setFilters((prev) => ({ ...prev, chains: newChains }))
                    }
                  />

                  {/* Chain Type - Single Select (still TextField) */}
                  <TextField
                    select
                    label="Chain Type"
                    value={filters.chainType}
                    onChange={(e) =>
                      setFilters({ ...filters, chainType: e.target.value })
                    }
                    sx={{ minWidth: 160 }}
                    size="small"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="chain">Chain</MenuItem>
                    <MenuItem value="independent">Independent</MenuItem>
                  </TextField>

                  {/* Type of Account */}
                  <FilterMultiSelect
                    label="Type of Account"
                    options={customerTypes}
                    selected={filters.typeOfAccounts}
                    onChange={(newTypes) =>
                      setFilters((prev) => ({
                        ...prev,
                        typeOfAccounts: newTypes,
                      }))
                    }
                  />

                  {/* Salesperson */}
                  <FilterMultiSelect
                    label="Salesperson"
                    options={normalizedCompanyUsers.map(
                      (u) => `${u.firstName} ${u.lastName}`
                    )}
                    selected={filters.userIds.map((id) =>
                      `${
                        normalizedCompanyUsers.find((u) => u.uid === id)
                          ?.firstName || ""
                      } ${
                        normalizedCompanyUsers.find((u) => u.uid === id)
                          ?.lastName || ""
                      }`.trim()
                    )}
                    onChange={(selectedNames) => {
                      const userIds = selectedNames
                        .map(
                          (name) =>
                            normalizedCompanyUsers.find(
                              (u) => `${u.firstName} ${u.lastName}` === name
                            )?.uid
                        )
                        .filter(Boolean) as string[];
                      setFilters((prev) => ({ ...prev, userIds }));
                    }}
                  />
                  {/* Salesperson */}
                  <FilterMultiSelect
                    label="Supervisor"
                    options={normalizedCompanyUsers
                      .filter((u) => u.role === "supervisor")
                      .map((u) => `${u.firstName} ${u.lastName}`)}
                    selected={filters.supervisorIds.map((id) =>
                      `${
                        normalizedCompanyUsers.find((u) => u.uid === id)
                          ?.firstName || ""
                      } ${
                        normalizedCompanyUsers.find((u) => u.uid === id)
                          ?.lastName || ""
                      }`.trim()
                    )}
                    onChange={(selectedNames) => {
                      const supervisorIds = selectedNames
                        .map(
                          (name) =>
                            normalizedCompanyUsers.find(
                              (u) =>
                                `${u.firstName} ${u.lastName}` === name &&
                                u.role === "supervisor"
                            )?.uid
                        )
                        .filter(Boolean) as string[];
                      setFilters((prev) => ({ ...prev, supervisorIds }));
                    }}
                  />

                  {/* Clear Button */}
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() =>
                      setFilters({
                        chains: [],
                        chainType: "",
                        typeOfAccounts: [],
                        userIds: [],
                        supervisorIds: [],
                      })
                    }
                  >
                    Clear Filters
                  </Button>
                </Box>

                {(filters.chains.length > 0 ||
                  filters.chainType ||
                  filters.typeOfAccounts.length > 0 ||
                  filters.userIds ||
                  filters.supervisorIds.length > 0) && (
                  <Box
                    display="flex"
                    gap={2}
                    flexWrap="wrap"
                    sx={{ mb: 1, mt: 1 }}
                  >
                    Filters applied:
                    <div className="chains-container">
                      {filters.chains.map((c) => (
                        <Chip
                          key={c}
                          label={`Chain: ${c}`}
                          onDelete={() =>
                            setFilters({
                              ...filters,
                              chains: filters.chains.filter((x) => x !== c),
                            })
                          }
                        />
                      ))}
                    </div>
                    <div className="chain-type-container">
                      {filters.chainType && (
                        <Chip
                          label={`Chain Type: ${filters.chainType}`}
                          onDelete={() =>
                            setFilters({ ...filters, chainType: "" })
                          }
                        />
                      )}
                    </div>
                    <div className="types-of-account-container">
                      {filters.typeOfAccounts.map((t) => (
                        <Chip
                          key={t}
                          label={`Type: ${t}`}
                          onDelete={() =>
                            setFilters({
                              ...filters,
                              typeOfAccounts: filters.typeOfAccounts.filter(
                                (x) => x !== t
                              ),
                            })
                          }
                        />
                      ))}
                    </div>
                    {filters.userIds.length > 0 && (
                      <Box
                        className="sales-people-container"
                        sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}
                      >
                        <Typography variant="subtitle2" sx={{ mr: 1 }}>
                          Salespeople:
                        </Typography>
                        {filters.userIds.map((uid) => {
                          const user = normalizedCompanyUsers.find(
                            (u) => u.uid === uid
                          );
                          const name = user
                            ? `${user.firstName} ${user.lastName}`
                            : "Unknown User";

                          return (
                            <Chip
                              key={uid}
                              label={`User: ${name}`}
                              color={
                                filteredAccounts.some((account) =>
                                  account.salesRouteNums?.includes(
                                    user?.salesRouteNum || ""
                                  )
                                )
                                  ? "default"
                                  : "error"
                              }
                              onDelete={() =>
                                setFilters({
                                  ...filters,
                                  userIds: filters.userIds.filter(
                                    (id) => id !== uid
                                  ),
                                })
                              }
                            />
                          );
                        })}
                      </Box>
                    )}
                    {filters.supervisorIds.length > 0 && (
                      <Box
                        className="supervisors-container"
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 1,
                          mt: 1,
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ mr: 1 }}>
                          Supervisors:
                        </Typography>
                        {filters.supervisorIds.map((uid) => {
                          const sup = normalizedCompanyUsers.find(
                            (u) => u.uid === uid
                          );
                          const name = sup
                            ? `${sup.firstName} ${sup.lastName}`
                            : "Unknown Supervisor";
                          return (
                            <Chip
                              key={uid}
                              label={`Supervisor: ${name}`}
                              onDelete={() =>
                                setFilters({
                                  ...filters,
                                  supervisorIds: filters.supervisorIds.filter(
                                    (id) => id !== uid
                                  ),
                                })
                              }
                            />
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                )}

                <Box display="flex" gap={2} alignItems="center" mt={2}>
                  <TextField
                    label="Save Filter Set As"
                    value={filterSetName}
                    onChange={(e) => setFilterSetName(e.target.value)}
                    size="small"
                  />
                  <Button variant="outlined" onClick={saveCurrentFilterSet}>
                    Save Filters
                  </Button>
                </Box>

                {Object.keys(savedFilterSets).length > 0 && (
                  <Box mt={1}>
                    <Typography variant="caption">Saved Filters:</Typography>
                    <Box display="flex" gap={1} flexWrap="wrap" mt={0.5}>
                      {Object.entries(savedFilterSets).map(([name, set]) => (
                        <Chip
                          key={name}
                          label={name}
                          onClick={() => setFilters(set)}
                          onDelete={() => {
                            const updated = { ...savedFilterSets };
                            delete updated[name];
                            setSavedFilterSets(updated);
                            localStorage.setItem(
                              "displaygram_filter_sets",
                              JSON.stringify(updated)
                            );
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </>
            )}

            {/* new accounts view showing them combined */}
            {accountScope === "selected" && (
              <>
                {accountNumbersForThisGoal.length === 0 ||
                goalAssignments.length == 0 ? (
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ mb: 2 }}
                  >
                    Please select accounts from the table below
                  </Typography>
                ) : (
                  <Typography variant="h5" sx={{ mt: 4 }}>
                    Selected Accounts
                  </Typography>
                )}
                {/* <Typography variant="caption" color="textSecondary">
                  {`${
                    new Set(goalAssignments.map((g) => g.accountNumber)).size
                  } accounts, ${
                    new Set(goalAssignments.map((g) => g.uid)).size
                  } users assigned`}
                </Typography> */}

                {goalAssignments.length > 0 && (
                  <AssignmentsPreview
                    assignments={goalAssignments}
                    accounts={accounts}
                    users={normalizedCompanyUsers}
                    onRemoveAssignment={handleRemoveAssignment}
                    onClearAll={() => setGoalAssignments([])}
                  />
                )}

                <AccountMultiSelector
                  allAccounts={filteredAccounts}
                  selectedAccounts={accounts.filter((acc) =>
                    accountNumbersForThisGoal.includes(
                      acc.accountNumber.toString()
                    )
                  )}
                  setSelectedAccounts={(updated) =>
                    setAccountNumbersForThisGoal(
                      updated.map((a) => a.accountNumber.toString())
                    )
                  }
                  selectedAssignments={goalAssignments}
                  setSelectedAssignments={setGoalAssignments}
                  companyUsers={normalizedCompanyUsers}
                />
              </>
            )}
          </Box>
          {hasSummary && (
            <aside className="goal-summary-panel">
              <Box
                mt={3}
                p={3}
                border="1px solid #555"
                borderRadius="12px"
                bgcolor="background.paper"
                boxShadow={3}
                sx={{
                  textAlign: "left",
                  lineHeight: 1.6,
                  fontSize: "0.95rem",
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
                  You are about to update a goal titled{" "}
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
                    : `${accountNumbersForThisGoal.length} selected account${
                        accountNumbersForThisGoal.length !== 1 ? "s" : ""
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
                  <button className="button-primary" onClick={handleUpdateGoal}>
                    Save Changes
                  </button>
                </Box>
              </Box>
            </aside>
          )}
        </div>
      </Box>
    </Dialog>
  );
};

export default NewEditCompanyGoalModal;
