// CreateCompanyGoalView.tsx
import React, { useState, useEffect, useMemo } from "react";
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
  GoalTargetMode,
  // customerType,
} from "../../utils/types";
import { useSelector } from "react-redux";
import { RootState } from "../../utils/store";
import { db } from "../../utils/firebase";
import { doc, getDoc } from "@firebase/firestore";
import getCompanyAccountId from "../../utils/helperFunctions/getCompanyAccountId";
import { createCompanyGoal } from "../../utils/helperFunctions/createCompanyGoal";
import UserMultiSelector from "./UserMultiSelector";
import AccountMultiSelector from "./AccountMultiSelector";
import { selectCompanyUsers } from "../../Slices/userSlice";

const defaultCustomerTypes: string[] = [
  "CONVENIENCE",
  "RESTAURANTS",
  "SUPERMARKET",
  "BARS",
  "OTHER",
];

const CreateCompanyGoalView = () => {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const companyId = currentUser?.companyId;
  const companyUsers = useSelector(selectCompanyUsers);
  const [customerTypes, setCustomerTypes] = useState<string[]>([]);
  const [chainNames, setChainNames] = useState<string[]>([]);
  const [enforcePerUserQuota, setEnforcePerUserQuota] = useState(false);
  const [perUserQuota, setPerUserQuota] = useState<number | string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [accounts, setAccounts] = useState<CompanyAccountType[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<
    CompanyAccountType[]
  >([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [goalDescription, setGoalDescription] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalMetric, setGoalMetric] = useState("");
  const [goalValueMin, setGoalValueMin] = useState(1);
  const [goalStartDate, setGoalStartDate] = useState("");
  const [goalEndDate, setGoalEndDate] = useState("");
  const [goalTargetMode, setGoalTargetMode] =
    useState<GoalTargetMode>("goalForAllAccounts");
  const [savedFilterSets, setSavedFilterSets] = useState<
    Record<string, SavedFilterSet>
  >({});
  const [filterSetName, setFilterSetName] = useState("");

  const [filters, setFilters] = useState({
    chains: [] as string[],
    chainType: "",
    typeOfAccounts: [] as string[],
    userIds: [] as string[],
  });

  type SavedFilterSet = typeof filters;

  const normalizedCompanyUsers = useMemo(() => {
    return (companyUsers || []).map((user) => ({
      ...user,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      role: user.role || "",
      salesRouteNum: user.salesRouteNum || "",
    }));
  }, [companyUsers]);

  const getUserIdForAccount = (
    account: CompanyAccountType,
    users: { uid: string; salesRouteNum?: string }[],
  ): string | null => {
    if (!account.salesRouteNums || !account.salesRouteNums.length) return null;

    for (const routeNum of account.salesRouteNums) {
      const match = users.find(
        (u) => u.salesRouteNum && u.salesRouteNum === routeNum,
      );
      if (match) return match.uid;
    }

    return null;
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        (!filters.chains.length || filters.chains.includes(a.chain || "")) &&
        (!filters.chainType || a.chainType === filters.chainType) &&
        (!filters.typeOfAccounts.length ||
          filters.typeOfAccounts.includes(a.typeOfAccount || "")) &&
        (!filters.userIds.length ||
          filters.userIds.includes(
            getUserIdForAccount(a, normalizedCompanyUsers) || "",
          )),
    );
  }, [accounts, filters]);

  useEffect(() => {
    // Auto-select all accounts matching filters if goalTargetMode is 'goalForSelectedAccounts'
    if (goalTargetMode === "goalForSelectedAccounts") {
      setSelectedAccounts(filteredAccounts);
    }
  }, [filteredAccounts, goalTargetMode]);

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

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!companyId) return;
      try {
        const accountsId = await getCompanyAccountId(companyId);
        if (!accountsId) return;
        const accountsDocRef = doc(db, "accounts", accountsId);
        const snapshot = await getDoc(accountsDocRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          const formatted = (data.accounts as CompanyAccountType[]).map(
            (account) => ({
              ...account,
              salesRouteNums: Array.isArray(account.salesRouteNums)
                ? account.salesRouteNums
                : [account.salesRouteNums].filter(Boolean),
            }),
          );
          setAccounts(formatted);
        }
      } catch (err) {
        console.error("Error fetching accounts:", err);
      }
    };

    fetchAccounts();
  }, [companyId]);

  const accountsForSelectedUsers = useMemo(() => {
    if (!selectedUserIds.length) return [];
    return accounts.filter((account) =>
      selectedUserIds.some((uid) =>
        normalizedCompanyUsers.find(
          (user) =>
            user.uid === uid &&
            user.salesRouteNum &&
            account.salesRouteNums?.includes(user.salesRouteNum),
        ),
      ),
    );
  }, [accounts, selectedUserIds, normalizedCompanyUsers]);

  const handleCreateGoal = async () => {
    if (!readyForCreation) {
      alert("Please fill out all required fields.");
      return;
    }
    if (
      goalTargetMode === "goalForSelectedAccounts" &&
      selectedAccounts.length === 0
    ) {
      alert("You must select at least one account.");
      return;
    }
    if (
      goalTargetMode === "goalForSelectedUsers" &&
      selectedUserIds.length === 0
    ) {
      alert("You must select at least one user.");
      return;
    }

    if (enforcePerUserQuota && (!perUserQuota || Number(perUserQuota) < 1)) {
      alert(
        "Specify a valid number greater than 0 for per user submission requirement.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const newGoal = {
        companyId: companyId || "",
        appliesToAllAccounts: goalTargetMode === "goalForAllAccounts",
        targetMode: goalTargetMode,
        goalTitle,
        goalDescription,
        goalMetric,
        goalValueMin: Number(goalValueMin),
        goalStartDate,
        goalEndDate,
        accounts:
          goalTargetMode === "goalForSelectedAccounts" ? selectedAccounts : [],
        usersIdsOfGoal:
          goalTargetMode === "goalForSelectedUsers" ? selectedUserIds : [],
        perUserQuota: enforcePerUserQuota ? Number(perUserQuota) : undefined,
      };

      await createCompanyGoal(newGoal);
      alert("Goal created successfully!");

      setGoalTitle("");
      setGoalDescription("");
      setGoalMetric("");
      setGoalValueMin(1);
      setGoalTargetMode("goalForAllAccounts");
      setGoalStartDate("");
      setGoalEndDate("");
      setSelectedAccounts([]);
      setSelectedUserIds([]);
    } catch (error) {
      alert("Error creating goal. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container>
      <Box mb={4}>
        <Typography variant="h5" gutterBottom>
          Create a New Goal
        </Typography>

        <Box display="flex" flexDirection="column" gap={3}>
          <TextField
            label="Goal Title"
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
          />
          <TextField
            label="Goal Description"
            value={goalDescription}
            onChange={(e) => setGoalDescription(e.target.value)}
          />

          <Box display="flex" gap={2}>
            <TextField
              label="Start Date"
              type="date"
              value={goalStartDate}
              onChange={(e) => setGoalStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="End Date"
              type="date"
              value={goalEndDate}
              onChange={(e) => setGoalEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>

          <Box display="flex" justifyContent="space-around">
            <Box>
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
                  size="small"
                  sx={{ width: 60, mx: 1 }}
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
          <Box>
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

          <FormControl component="fieldset">
            <Typography variant="subtitle1">Target Audience</Typography>
            <RadioGroup
              value={goalTargetMode}
              onChange={(e) =>
                setGoalTargetMode(e.target.value as GoalTargetMode)
              }
              row
            >
              <FormControlLabel
                value="goalForAllAccounts"
                control={<Radio />}
                label="All Accounts"
              />
              <FormControlLabel
                value="goalForSelectedAccounts"
                control={<Radio />}
                label="Selected Accounts"
              />
              <FormControlLabel
                value="goalForSelectedUsers"
                control={<Radio />}
                label="Selected Users"
              />
            </RadioGroup>
          </FormControl>

          {goalTargetMode === "goalForSelectedAccounts" && (
            <>
              <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                {/* Chain Multi-Select */}
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel id="chain-label">Chain</InputLabel>
                  <Select
                    labelId="chain-label"
                    multiple
                    value={filters.chains}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        chains: e.target.value as unknown as string[],
                      })
                    }
                    renderValue={(selected) => `${selected.length} selected`}
                  >
                    {chainNames.map((name) => (
                      <MenuItem key={name} value={name}>
                        {name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Chain Type Single Select */}
                <TextField
                  select
                  label="Chain Type"
                  value={filters.chainType}
                  onChange={(e) =>
                    setFilters({ ...filters, chainType: e.target.value })
                  }
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="chain">Chain</MenuItem>
                  <MenuItem value="independent">Independent</MenuItem>
                </TextField>

                {/* Type of Account Multi-Select */}
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel id="type-label">Type of Account</InputLabel>
                  <Select
                    labelId="type-label"
                    multiple
                    value={filters.typeOfAccounts}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        typeOfAccounts: e.target.value as unknown as string[],
                      })
                    }
                    renderValue={(selected) => `${selected.length} selected`}
                  >
                    {customerTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Salesperson Multi-Select */}
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel id="user-label">Salesperson</InputLabel>
                  <Select
                    labelId="user-label"
                    multiple
                    value={filters.userIds}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        userIds: e.target.value as unknown as string[],
                      })
                    }
                    renderValue={(selected) => `${selected.length} selected`}
                  >
                    {normalizedCompanyUsers.map((user) => (
                      <MenuItem key={user.uid} value={user.uid}>
                        {user.firstName} {user.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="outlined"
                  size="large"
                  onClick={() =>
                    setFilters({
                      chains: [],
                      chainType: "",
                      typeOfAccounts: [],
                      userIds: [],
                    })
                  }
                >
                  Clear Filters
                </Button>
              </Box>

              {(filters.chains.length > 0 ||
                filters.chainType ||
                filters.typeOfAccounts.length > 0 ||
                filters.userIds) && (
                <Box
                  display="flex"
                  gap={2}
                  flexWrap="wrap"
                  sx={{ mb: 1, mt: 1 }}
                >
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
                              (x) => x !== t,
                            ),
                          })
                        }
                      />
                    ))}
                  </div>
                  <div className="sales-people-container">
                    {filters.userIds.map((uid) => {
                      const user = normalizedCompanyUsers.find(
                        (u) => u.uid === uid,
                      );
                      const name = user
                        ? `${user.firstName} ${user.lastName}`
                        : "Unknown User";

                      return (
                        <Chip
                          key={uid}
                          label={`User: ${name}`}
                          onDelete={() =>
                            setFilters({
                              ...filters,
                              userIds: filters.userIds.filter(
                                (id) => id !== uid,
                              ),
                            })
                          }
                        />
                      );
                    })}
                  </div>
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
                            JSON.stringify(updated),
                          );
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </>
          )}
          <Box mt={2} p={2} border="1px solid #ccc" borderRadius="8px">
            <Typography variant="subtitle1">Summary:</Typography>
            <Typography variant="body2" mt={1}>
              You are assigning this goal to{" "}
              <strong>
                {goalTargetMode === "goalForAllAccounts"
                  ? "all accounts"
                  : goalTargetMode === "goalForSelectedAccounts"
                    ? `${selectedAccounts.length} selected account(s)`
                    : `${selectedUserIds.length} selected user(s)`}
              </strong>
              .
            </Typography>
            {enforcePerUserQuota && (
              <Typography variant="body2" mt={1}>
                Each selected user must submit at least{" "}
                <strong>{perUserQuota}</strong> submission
                {Number(perUserQuota) > 1 ? "s" : ""}
              </Typography>
            )}
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateGoal}
            disabled={!readyForCreation || isSaving}
          >
            {isSaving ? "Creating..." : "Create Goal"}
          </Button>
          {goalTargetMode === "goalForSelectedAccounts" && (
            <>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {filteredAccounts.length} account
                {filteredAccounts.length !== 1 ? "s" : ""} match current filters
              </Typography>

              <AccountMultiSelector
                allAccounts={filteredAccounts}
                selectedAccounts={selectedAccounts}
                setSelectedAccounts={setSelectedAccounts}
              />
            </>
          )}

          {goalTargetMode === "goalForSelectedUsers" && (
            <>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {accountsForSelectedUsers.length} account
                {accountsForSelectedUsers.length !== 1 ? "s" : ""} assigned to
                selected user
                {selectedUserIds.length > 1 ? "s" : ""}
              </Typography>

              <UserMultiSelector
                users={normalizedCompanyUsers}
                selectedUserIds={selectedUserIds}
                setSelectedUserIds={setSelectedUserIds}
              />
            </>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default CreateCompanyGoalView;
