import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Divider,
  Box,
  TextField,
  Checkbox,
  FormControlLabel,
  MenuItem,
  FormControl,
  RadioGroup,
} from "@mui/material";
import {
  CompanyGoalType,
  CompanyAccountType,
  UserType,
  GoalAssignmentType,
} from "../../utils/types";
import AccountMultiSelector from "./AccountMultiSelector";
import isEqual from "lodash.isequal";
import "./editCompanyGoalModal.css";
import AssignmentsPreview from "./AssignmentsPreview";
import FilterMultiSelect from "./FilterMultiSelect";

interface EditCompanyGoalModalProps {
  open: boolean;
  onClose: () => void;
  goal: CompanyGoalType;
  allAccounts: CompanyAccountType[];
  companyUsers: UserType[];
  onSave: (updatedGoal: Partial<CompanyGoalType>) => void;
}

const EditCompanyGoalModal: React.FC<EditCompanyGoalModalProps> = ({
  open,
  onClose,
  goal,
  allAccounts,
  companyUsers,
  onSave,
}) => {
  // 🧩 Initialize from new or old goal data
  const [goalAssignments, setGoalAssignments] = useState<GoalAssignmentType[]>(
    goal.goalAssignments || []
  );
  const [accountNumbersForThisGoal, setAccountNumbersForThisGoal] = useState<
    string[]
  >(goal.accountNumbersForThisGoal || []);

  const [goalTitle, setGoalTitle] = useState(goal.goalTitle);
  const [goalDescription, setGoalDescription] = useState(goal.goalDescription);
  const [goalMetric, setGoalMetric] = useState(goal.goalMetric);
  const [goalValueMin, setGoalValueMin] = useState(goal.goalValueMin);
  const [perUserQuota, setPerUserQuota] = useState(goal.perUserQuota ?? 0);
  const [lastValidQuota, setLastValidQuota] = useState(goal.perUserQuota ?? 1);
  const [goalStartDate, setGoalStartDate] = useState(goal.goalStartDate);
  const [goalEndDate, setGoalEndDate] = useState(goal.goalEndDate);
  const [searchSelected, setSearchSelected] = useState("");
  // === 🔹 Account Filters (reused from CreateCompanyGoalView) ===
  const [filters, setFilters] = useState({
    chains: [] as string[],
    chainType: "",
    typeOfAccounts: [] as string[],
    userIds: [] as string[],
    supervisorIds: [] as string[],
  });

  // Pull company-level metadata from accounts
  const allChains = useMemo(
    () => Array.from(new Set(allAccounts.map((a) => a.chain).filter(Boolean))),
    [allAccounts]
  );

  const customerTypes = useMemo(
    () =>
      Array.from(
        new Set(allAccounts.map((a) => a.typeOfAccount).filter(Boolean))
      ),
    [allAccounts]
  );

  const getUserIdsForAccount = (
    account: CompanyAccountType,
    users: { uid: string; salesRouteNum?: string }[]
  ): string[] => {
    if (!account.salesRouteNums?.length) return [];
    return users
      .filter(
        (u) =>
          u.salesRouteNum && account.salesRouteNums.includes(u.salesRouteNum)
      )
      .map((u) => u.uid);
  };

  // 🔹 Map accounts → user IDs
  const userIdsByAccount = useMemo(() => {
    const map: Record<string, string[]> = {};
    allAccounts.forEach((acc) => {
      map[acc.accountNumber] = getUserIdsForAccount(acc, companyUsers);
    });
    return map;
  }, [allAccounts, companyUsers]);

  // 🔹 Filter accounts
  const filteredAccounts = useMemo(() => {
    return allAccounts.filter(
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
            const supUid = companyUsers.find(
              (u) => u.uid === repUid
            )?.reportsTo;
            return supUid && filters.supervisorIds.includes(supUid);
          }))
    );
  }, [allAccounts, filters, userIdsByAccount, companyUsers]);

  // 🧩 Sync when modal opens or goal changes
  useEffect(() => {
    setGoalAssignments(goal.goalAssignments || []);
    setAccountNumbersForThisGoal(goal.accountNumbersForThisGoal || []);
  }, [goal]);

  // --- Derived data ---
  const selectedAccountObjects = useMemo(() => {
    return allAccounts.filter((acc) =>
      accountNumbersForThisGoal.includes(acc.accountNumber.toString())
    );
  }, [allAccounts, accountNumbersForThisGoal]);

  const filteredSelectedAccounts = useMemo(() => {
    return selectedAccountObjects.filter(
      (acc) =>
        acc.accountName.toLowerCase().includes(searchSelected.toLowerCase()) ||
        acc.accountNumber.toString().includes(searchSelected)
    );
  }, [selectedAccountObjects, searchSelected]);

  // --- Account selection change handler ---
  const handleAccountSelectionChange = (
    updatedAccounts: CompanyAccountType[]
  ) => {
    const updatedNumbers = updatedAccounts.map((acc) =>
      acc.accountNumber.toString()
    );
    setAccountNumbersForThisGoal(updatedNumbers);

    // 🔹 Automatically prune assignments for removed accounts
    setGoalAssignments((prev) =>
      prev.filter((a) => updatedNumbers.includes(a.accountNumber.toString()))
    );

    // 🔹 Optionally auto-add reps for new accounts
    const newAccounts = updatedAccounts.filter(
      (acc) =>
        !goalAssignments.some(
          (a) => a.accountNumber === acc.accountNumber.toString()
        )
    );
    const autoAssignments = newAccounts.flatMap((acc) => {
      const reps = companyUsers.filter(
        (u) => u.salesRouteNum && acc.salesRouteNums?.includes(u.salesRouteNum)
      );
      return reps.map((u) => ({
        uid: u.uid,
        accountNumber: acc.accountNumber.toString(),
      }));
    });

    if (autoAssignments.length) {
      setGoalAssignments((prev) => [...prev, ...autoAssignments]);
    }
  };

  // --- Form object ---
  const updatedGoal: Partial<CompanyGoalType> = useMemo(
    () => ({
      goalTitle,
      goalDescription,
      goalMetric,
      goalValueMin,
      goalStartDate,
      goalEndDate,
      perUserQuota,
      accountNumbersForThisGoal,
      goalAssignments, // ✅ persist both arrays
    }),
    [
      goalTitle,
      goalDescription,
      goalMetric,
      goalValueMin,
      goalStartDate,
      goalEndDate,
      perUserQuota,
      accountNumbersForThisGoal,
      goalAssignments,
    ]
  );

  const currentGoalComparable = useMemo(
    () => ({
      goalTitle: goal.goalTitle,
      goalDescription: goal.goalDescription,
      goalMetric: goal.goalMetric,
      goalValueMin: goal.goalValueMin,
      perUserQuota: goal.perUserQuota,
      goalStartDate: goal.goalStartDate,
      goalEndDate: goal.goalEndDate,
      accountNumbersForThisGoal: goal.accountNumbersForThisGoal || [],
      goalAssignments: goal.goalAssignments || [],
    }),
    [goal]
  );

  const isModified = useMemo(
    () => !isEqual(updatedGoal, currentGoalComparable),
    [updatedGoal, currentGoalComparable]
  );

  const handleSave = () => {
    const cleanedGoal: Partial<CompanyGoalType> = { ...updatedGoal };
    if (updatedGoal.perUserQuota === 0) delete cleanedGoal.perUserQuota;
    onSave(cleanedGoal);
    onClose();
  };

  const handleQuotaToggle = (checked: boolean) => {
    if (checked) {
      setPerUserQuota(lastValidQuota); // restore
    } else {
      setLastValidQuota(perUserQuota > 0 ? perUserQuota : 1);
      setPerUserQuota(0); // disable
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ className: "goal-modal" }}
    >
      <DialogTitle className="goal-modal__title">Edit Company Goal</DialogTitle>

      <DialogContent dividers className="goal-modal-content">
        {/* 📝 Goal Basics */}
        <section>
          <header className="goal-modal-section-head">
            <h3>Goal basics</h3>
            <span className="muted">Update the goal parameters.</span>
          </header>
          <Box
            mt={1}
            mb={3}
            display="grid"
            gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }}
            gap={2}
          >
            <TextField
              label="Title"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              fullWidth
            />
            <TextField
              label="Metric"
              value={goalMetric}
              onChange={(e) => setGoalMetric(e.target.value)}
              fullWidth
            />
            <TextField
              label="Minimum Value"
              type="number"
              value={goalValueMin}
              onChange={(e) => setGoalValueMin(Number(e.target.value))}
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={perUserQuota !== 0}
                  onChange={(e) => handleQuotaToggle(e.target.checked)}
                />
              }
              label="Require submissions per user"
            />
            {perUserQuota !== 0 && (
              <TextField
                label="Goal Quota"
                type="number"
                value={perUserQuota}
                onChange={(e) =>
                  setPerUserQuota(Math.max(1, Number(e.target.value)))
                }
                helperText="Each user must submit this many posts"
              />
            )}
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
            <Box gridColumn="1 / -1">
              <TextField
                label="Description"
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                fullWidth
                multiline
                rows={3}
              />
            </Box>
          </Box>
        </section>

        <Divider sx={{ my: 2 }} />

        {/* 🧾 Current Accounts */}
        <section>
          <header className="goal-modal__section-head">
            <h3>Accounts on this goal</h3>
            <span className="muted">
              These accounts are already linked to the goal.
            </span>
          </header>

          <div className="toolbar">
            <div className="pill">Total: {selectedAccountObjects.length}</div>
            <TextField
              label="Search Selected Accounts"
              value={searchSelected}
              onChange={(e) => setSearchSelected(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
          </div>

          <Box
            sx={{
              maxHeight: 250,
              overflowY: "auto",
              border: "1px solid #ccc",
              borderRadius: 1,
              p: 1,
              mb: 2,
            }}
          >
            {filteredSelectedAccounts.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                No matching selected accounts
              </Typography>
            ) : (
              filteredSelectedAccounts.map((acc) => (
                <Box
                  key={acc.accountNumber}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  p={0.5}
                  borderBottom="1px solid #eee"
                >
                  <Typography variant="body2">{acc.accountName}</Typography>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => {
                      const updated = selectedAccountObjects.filter(
                        (sel) => sel.accountNumber !== acc.accountNumber
                      );
                      handleAccountSelectionChange(updated);
                    }}
                  >
                    ×
                  </Button>
                </Box>
              ))
            )}
          </Box>
        </section>

        {/* 🧠 Add More Accounts */}
        <section className="goal-modal__section">
          <header className="goal-modal__section-head">
            <h3>Add more accounts</h3>
            <span className="muted">
              Search your company accounts below. Items already on the goal are
              pre-checked and auto-assign their salespeople.
            </span>
          </header>
          {/* === 🧭 Account Filters === */}
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
                <Typography variant="caption" color="textSecondary">
                  {`${
                    new Set(goalAssignments.map((g) => g.accountNumber)).size
                  } accounts, ${
                    new Set(goalAssignments.map((g) => g.uid)).size
                  } users assigned`}
                </Typography>

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

          <AccountMultiSelector
            allAccounts={filteredAccounts}
            selectedAccounts={selectedAccountObjects}
            setSelectedAccounts={handleAccountSelectionChange}
            selectedAssignments={goalAssignments}
            setSelectedAssignments={setGoalAssignments}
            companyUsers={companyUsers}
          />
        </section>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={!isModified}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditCompanyGoalModal;
