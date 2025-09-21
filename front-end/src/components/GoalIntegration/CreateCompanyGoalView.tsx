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
  MenuItem,
  Chip,
  Select,
  InputLabel,
  Checkbox,
} from "@mui/material";
import {
  CompanyAccountType,
  CompanyGoalType,
  UserType,
} from "../../utils/types";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../utils/store";
import { db } from "../../utils/firebase";
import { doc, getDoc } from "@firebase/firestore";
import AccountMultiSelector from "./AccountMultiSelector";
import { selectCompanyUsers } from "../../Slices/userSlice";
import { createCompanyGoalInFirestore } from "../../thunks/companyGoalsThunk";
import { selectCurrentCompany } from "../../Slices/currentCompanySlice";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import TrackChangesIcon from "@mui/icons-material/TrackChanges"; // MUI's target icon

import dayjs from "dayjs";
import "./createCompanyGoalView.css";
import GoalTitleInput from "./GoalTitleInput";
import ChainMultiSelect from "./FilterMultiSelect";
import FilterMultiSelect from "./FilterMultiSelect";
import ConfirmGoalModal from "./ConfirmGoalModal";

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [customerTypes, setCustomerTypes] = useState<string[]>([]);
  const [chainNames, setChainNames] = useState<string[]>([]);
  const [enforcePerUserQuota, setEnforcePerUserQuota] = useState(false);
  const [perUserQuota, setPerUserQuota] = useState<number | string>("1");
  const [isSaving, setIsSaving] = useState(false);
  const [accounts, setAccounts] = useState<CompanyAccountType[]>([]);

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
  const [accountNumbersForThisGoal, setAccountNumbersForThisGoal] = useState<
    string[]
  >([]);

  const [filters, setFilters] = useState({
    chains: [] as string[],
    chainType: "",
    typeOfAccounts: [] as string[],
    userIds: [] as string[], // Sales reps
    supervisorIds: [] as string[], // Supervisors
  });

  type SavedFilterSet = typeof filters;

  // useEffect(() => {
  //   if (accounts.length > 0 && selectedAccounts.length === 0) {
  //     setSelectedAccounts(accounts);
  //   }
  // }, [accounts, selectedAccounts]);

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

  useEffect(() => { // i think if this useEffect doesnt return accounts then we need to ui to the user 'hey if you want goals you need to impport your accounts.. custom accounts aint gonna cut it"
    const fetchAccounts = async () => {
      if (!companyId) return;
      try {
        // const accountsId = await getCompanyAccountId(companyId);
        const accountsId = usersCompany?.accountsId;
        if (!accountsId) return;
        const accountsDocRef = doc(db, "accounts", accountsId);
        const snapshot = await getDoc(accountsDocRef);
        console.log("fetched accounts snapshot!");
        if (snapshot.exists()) {
          const data = snapshot.data();
          const formatted = (data.accounts as CompanyAccountType[]).map(
            (account) => ({
              ...account,
              salesRouteNums: Array.isArray(account.salesRouteNums)
                ? account.salesRouteNums
                : [account.salesRouteNums].filter(Boolean),
            })
          );
          setAccounts(formatted);
        }
      } catch (err) {
        console.error("Error fetching accounts:", err);
      }
    };

    fetchAccounts();
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

  const handleCreateGoal = async () => {
    if (!readyForCreation) {
      alert("Please fill out all required fields.");
      return;
    }
    if (!companyId) {
      alert("Missing companyId. Cannot create goal.");
      return;
    }

    const scopedAccounts =
      accountScope === "all"
        ? accounts
        : accounts.filter((a) =>
            accountNumbersForThisGoal.includes(a.accountNumber.toString())
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
      accountNumbersForThisGoal: scopedAccounts.map((a) =>
        a.accountNumber.toString()
      ),
      ...(enforcePerUserQuota && perUserQuota
        ? { perUserQuota: Number(perUserQuota) }
        : {}),
    };

    setDraftGoal(newGoal);
    setShowConfirmModal(true);
  };

  useEffect(() => {
    if (accountScope !== "selected") return;

    setAccountNumbersForThisGoal((prev) => {
      const inView = new Set(
        filteredAccounts.map((a) => a.accountNumber.toString())
      );

      // First time in "selected" mode -> select everything in view
      if (prev.length === 0) return Array.from(inView);

      // Otherwise, KEEP ONLY what’s still visible; do NOT auto-add new items
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
                {accountNumbersForThisGoal.length === 0 ? (
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
