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
  Checkbox,
  Select,
  MenuItem,
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

import dayjs from "dayjs";
import "./createCompanyGoalView.css";
import GoalTitleInput from "./GoalTitleInput";
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

const wizardSteps = [
  "Details",
  "Measure",
  "Schedule",
  "Audience",
  "Accounts",
  "Review",
];

type CreateCompanyGoalViewProps = {
  onCancel: () => void;
  onCreated: () => void;
};

const CreateCompanyGoalView = ({
  onCancel,
  onCreated,
}: CreateCompanyGoalViewProps) => {
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
  const [currentStep, setCurrentStep] = useState(0);
  const [emailOnCreate, setEmailOnCreate] = useState(true);
  const [goalAssignments, setGoalAssignments] = useState<GoalAssignmentType[]>(
    [],
  );
  const [supplierMap, setSupplierMap] = useState<Record<string, string>>({});
  const [supplierIdForGoal, setSupplierIdForGoal] = useState<string | null>(
    null,
  );
  const connections = useSelector(
    (state: RootState) => state.companyConnections.connections,
  );
  const [isSupplierGoal, setIsSupplierGoal] = useState(false);
  const [customerTypes, setCustomerTypes] = useState<string[]>([]);
  const [chainNames, setChainNames] = useState<string[]>([]);
  const [enforcePerUserQuota, setEnforcePerUserQuota] = useState(false);
  const [perUserQuota, setPerUserQuota] = useState<number | string>("1");
  const [isSaving, setIsSaving] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const allCompanyAccounts = useSelector(selectAllCompanyAccounts);
  const [accounts, setAccounts] = useState<CompanyAccountType[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

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

  const supplierOptions = useMemo(() => {
    if (!companyId) return [];

    return connections
      .filter((c) => c.status === "approved")
      .flatMap((c) => {
        const isRequester = c.requestFromCompanyId === companyId;
        const connectedCompanyType = isRequester
          ? c.requestToCompanyType
          : c.requestFromCompanyType;

        if (connectedCompanyType !== "supplier") return [];

        return [
          {
            companyId: isRequester
              ? c.requestToCompanyId
              : c.requestFromCompanyId,
            connectionId: c.id,
          },
        ];
      });
  }, [connections, companyId]);

  useEffect(() => {
    async function loadSupplierNames() {
      const ids = supplierOptions.map((s) => s.companyId);

      const results: Record<string, string> = {};

      await Promise.all(
        ids.map(async (id) => {
          try {
            const snap = await getDoc(doc(db, "companies", id));
            if (snap.exists()) {
              results[id] = snap.data().companyName || id;
            } else {
              results[id] = id;
            }
          } catch {
            results[id] = id;
          }
        }),
      );

      setSupplierMap(results);
    }

    if (supplierOptions.length) {
      loadSupplierNames();
    }
  }, [supplierOptions]);

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
  }, [activeCompanyUsers]);

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

  const detailsComplete =
    !!goalTitle.trim() &&
    !!goalDescription.trim() &&
    !!goalMetric.trim() &&
    goalValueMin > 0 &&
    Boolean(goalStartDate) &&
    Boolean(goalEndDate) &&
    goalEndDate >= goalStartDate;

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

  const validAssignments = goalAssignments.filter(
    (assignment) => assignment.uid && assignment.accountNumber,
  );
  const affectedAccountsCount = new Set(
    validAssignments.map((assignment) => assignment.accountNumber),
  ).size;
  const numberOfAffectedUsers = new Set(
    validAssignments.map((assignment) => assignment.uid),
  ).size;
  const audienceLabel =
    assigneeType === "sales"
      ? numberOfAffectedUsers === 1
        ? "sales representative"
        : "sales representatives"
      : numberOfAffectedUsers === 1
        ? "supervisor"
        : "supervisors";
  const accountLabel = affectedAccountsCount === 1 ? "account" : "accounts";
  const metricLabel =
    Number(goalValueMin) === 1 ? goalMetric.replace(/s$/, "") : goalMetric;
  const basicsComplete =
    goalTitle.trim().length > 1 && goalDescription.trim().length > 1;
  const measureComplete =
    Boolean(goalMetric) &&
    Number(goalValueMin) > 0 &&
    (!enforcePerUserQuota || Number(perUserQuota) > 0);
  const scheduleComplete =
    Boolean(goalStartDate) &&
    Boolean(goalEndDate) &&
    goalEndDate >= goalStartDate &&
    (!isSupplierGoal || Boolean(supplierIdForGoal));
  const stepReady = [
    basicsComplete,
    measureComplete,
    scheduleComplete,
    true,
    !accountsLoading && validAssignments.length > 0,
    detailsComplete && scheduleComplete && validAssignments.length > 0,
  ];

  const stepGuidance = [
    "Add a title and a short description before continuing.",
    "Choose a positive target and, when enabled, a positive per-user quota.",
    isSupplierGoal && !supplierIdForGoal
      ? "Choose the supplier that should see this goal."
      : "Choose a valid start and end date.",
    "Choose who owns the work and whether it covers all or selected accounts.",
    accountsLoading
      ? "Accounts are still loading."
      : "At least one account must map to an active assigned user.",
    "Review the goal before creating it.",
  ];

  const resetForm = () => {
    setCurrentStep(0);
    setGoalTitle("");
    setGoalDescription("");
    setGoalMetric("cases");
    setGoalValueMin(1);
    setGoalStartDate(dayjs().format("YYYY-MM-DD"));
    setGoalEndDate(dayjs().endOf("month").format("YYYY-MM-DD"));
    setAssigneeType("sales");
    setAccountScope("all");
    setIsSupplierGoal(false);
    setSupplierIdForGoal(null);
    setEnforcePerUserQuota(false);
    setPerUserQuota("1");
    setEmailOnCreate(true);
    setReviewConfirmed(false);
    setFilters({
      chains: [],
      chainType: "",
      typeOfAccounts: [],
      userIds: [],
      supervisorIds: [],
    });
  };

  const goToNextStep = () => {
    if (!stepReady[currentStep]) return;
    if (currentStep === wizardSteps.length - 2) setReviewConfirmed(false);
    setCurrentStep((step) => Math.min(step + 1, wizardSteps.length - 1));
  };

  const confirmGoalCreation = async () => {
    if (!currentUser || !companyId) {
      dispatch(
        showMessage({
          text: "Your company could not be identified.",
          severity: "error",
        }),
      );
      return;
    }

    if (!stepReady[5] || !reviewConfirmed) return;

    const cleanSupplierId = supplierIdForGoal || null;
    const newGoal: CompanyGoalType & {
      notifications?: { emailOnCreate: boolean };
    } = {
      companyId,
      goalTitle: goalTitle.trim(),
      ...(cleanSupplierId ? { supplierIdForGoal: cleanSupplierId } : {}),
      targetRole: assigneeType,
      goalDescription: goalDescription.trim(),
      goalMetric,
      goalValueMin: Number(goalValueMin),
      goalStartDate,
      goalEndDate,
      createdAt: new Date().toISOString(),
      deleted: false,
      goalAssignments: validAssignments,
      notifications: { emailOnCreate },
      ...(enforcePerUserQuota && perUserQuota
        ? { perUserQuota: Number(perUserQuota) }
        : {}),
    };

    setIsSaving(true);
    try {
      const result = await dispatch(
        createCompanyGoalInFirestore({ goal: newGoal, currentUser }),
      );

      if (createCompanyGoalInFirestore.fulfilled.match(result)) {
        dispatch(
          showMessage({
            text: "Goal created successfully",
            severity: "success",
          }),
        );

        resetForm();
        onCreated();
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
    }
  };

  return (
    <div className="goal-wizard">
      <nav className="goal-wizard__steps" aria-label="Goal creation progress">
        {wizardSteps.map((label, index) => (
          <button
            key={label}
            type="button"
            className={`${index === currentStep ? "is-current" : ""} ${
              index < currentStep && stepReady[index] ? "is-complete" : ""
            }`}
            aria-current={index === currentStep ? "step" : undefined}
            onClick={() => {
              if (index === wizardSteps.length - 1) {
                setReviewConfirmed(false);
              }
              setCurrentStep(index);
            }}
          >
            <span>
              {index < currentStep && stepReady[index] ? "✓" : index + 1}
            </span>
            <small>{label}</small>
          </button>
        ))}
      </nav>

      <div className="goal-wizard__progress" aria-hidden="true">
        <span
          style={{
            width: `${((currentStep + 1) / wizardSteps.length) * 100}%`,
          }}
        />
      </div>

      <section className="goal-wizard__stage">
        <header className="goal-wizard__stage-header">
          <span>
            Step {currentStep + 1} of {wizardSteps.length}
          </span>
          <h2>{wizardSteps[currentStep]}</h2>
          <p>
            {currentStep === 0 &&
              "Give the team a clear name and a short definition of success."}
            {currentStep === 1 &&
              "Set the measurable result without adding unnecessary complexity."}
            {currentStep === 2 &&
              "Choose when the goal runs and whether a supplier can follow it."}
            {currentStep === 3 &&
              "Choose the people responsible and the breadth of the account scope."}
            {currentStep === 4 &&
              "Confirm the accounts and people who will receive this goal."}
            {currentStep === 5 &&
              "Check the final scope and notification choice before creating the goal."}
          </p>
        </header>

        {currentStep === 0 && (
          <div className="goal-wizard__fields goal-wizard__fields--narrow">
            <GoalTitleInput value={goalTitle} setValue={setGoalTitle} />

            <div className="goal-form-group">
              <label htmlFor="goalDescription">What should happen?</label>
              <textarea
                id="goalDescription"
                value={goalDescription}
                onChange={(event) => setGoalDescription(event.target.value)}
                className="custom-textarea"
                rows={5}
                placeholder="Describe the display outcome and what counts as success."
                autoFocus={false}
              />
              <small>
                Keep this practical—the assigned team will see this description.
              </small>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="goal-wizard__fields goal-wizard__fields--narrow">
            <div className="goal-wizard__field-card">
              <Typography variant="subtitle1" fontWeight={700}>
                What are you measuring?
              </Typography>
              <ToggleButtonGroup
                value={goalMetric}
                exclusive
                onChange={(_event, value) => value && setGoalMetric(value)}
                aria-label="Goal metric"
                fullWidth
              >
                <ToggleButton value="cases">Cases</ToggleButton>
                <ToggleButton value="bottles">Bottles</ToggleButton>
              </ToggleButtonGroup>
            </div>

            <div className="goal-wizard__field-card">
              <Typography variant="subtitle1" fontWeight={700}>
                Minimum display quantity
              </Typography>
              <Box className="goal-wizard__quantity">
                <Button
                  variant="outlined"
                  aria-label="Decrease minimum quantity"
                  onClick={() =>
                    setGoalValueMin((previous) => Math.max(1, previous - 1))
                  }
                >
                  −
                </Button>
                <TextField
                  type="number"
                  value={goalValueMin}
                  onChange={(event) =>
                    setGoalValueMin(Math.max(1, Number(event.target.value)))
                  }
                  size="small"
                  inputProps={{ min: 1, "aria-label": "Minimum quantity" }}
                />
                <Button
                  variant="outlined"
                  aria-label="Increase minimum quantity"
                  onClick={() => setGoalValueMin((previous) => previous + 1)}
                >
                  +
                </Button>
              </Box>
            </div>

            <div className="goal-wizard__option-card">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={enforcePerUserQuota}
                    onChange={(event) =>
                      setEnforcePerUserQuota(event.target.checked)
                    }
                  />
                }
                label="Require a minimum number of submissions per user"
              />

              {enforcePerUserQuota && (
                <TextField
                  label="Submissions per user"
                  type="number"
                  size="small"
                  value={perUserQuota}
                  onChange={(event) => setPerUserQuota(event.target.value)}
                  inputProps={{ min: 1 }}
                  helperText="This requirement applies to every assigned user."
                />
              )}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="goal-wizard__fields goal-wizard__fields--narrow">
            <div className="goal-wizard__date-grid">
              <TextField
                type="date"
                label="Start date"
                value={goalStartDate}
                onChange={(event) => setGoalStartDate(event.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: "2023-01-01" }}
              />
              <TextField
                type="date"
                label="End date"
                value={goalEndDate}
                onChange={(event) => setGoalEndDate(event.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: goalStartDate }}
              />
            </div>

            {goalStartDate && goalEndDate && goalEndDate < goalStartDate && (
              <p className="goal-wizard__error">
                The end date must be on or after the start date.
              </p>
            )}

            <div className="goal-wizard__option-card">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isSupplierGoal}
                    onChange={(event) => {
                      setIsSupplierGoal(event.target.checked);
                      if (!event.target.checked) setSupplierIdForGoal(null);
                    }}
                  />
                }
                label="Let a connected supplier follow this goal"
              />
              <small>
                Suppliers receive read-only progress visibility. They cannot
                edit or assign the goal.
              </small>

              {isSupplierGoal && (
                <Select
                  value={supplierIdForGoal || ""}
                  onChange={(event) =>
                    setSupplierIdForGoal(event.target.value || null)
                  }
                  displayEmpty
                  size="small"
                  fullWidth
                >
                  <MenuItem value="">Select a supplier</MenuItem>
                  {supplierOptions.map((supplier) => (
                    <MenuItem
                      key={supplier.companyId}
                      value={supplier.companyId}
                    >
                      {supplierMap[supplier.companyId] || "Loading…"}
                    </MenuItem>
                  ))}
                </Select>
              )}

              {isSupplierGoal && supplierOptions.length === 0 && (
                <p className="goal-wizard__error">
                  No approved supplier connections are available.
                </p>
              )}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="goal-wizard__choice-grid">
            <FormControl component="fieldset" className="goal-wizard__choice">
              <Typography variant="subtitle1" fontWeight={700}>
                Assign the work to
              </Typography>
              <RadioGroup
                value={assigneeType}
                onChange={(event) =>
                  setAssigneeType(event.target.value as "sales" | "supervisor")
                }
              >
                <FormControlLabel
                  value="sales"
                  control={<Radio />}
                  label="Sales representatives"
                />
                <FormControlLabel
                  value="supervisor"
                  control={<Radio />}
                  label="Supervisors"
                />
              </RadioGroup>
              <small>
                Accounts are matched through routes and reporting relationships.
              </small>
            </FormControl>

            <FormControl component="fieldset" className="goal-wizard__choice">
              <Typography variant="subtitle1" fontWeight={700}>
                Account scope
              </Typography>
              <RadioGroup
                value={accountScope}
                onChange={(event) =>
                  setAccountScope(event.target.value as "all" | "selected")
                }
              >
                <FormControlLabel
                  value="all"
                  control={<Radio />}
                  label="All company accounts"
                />
                <FormControlLabel
                  value="selected"
                  control={<Radio />}
                  label="A filtered account group"
                />
              </RadioGroup>
              <small>
                You can inspect and adjust the resulting assignments next.
              </small>
            </FormControl>
          </div>
        )}

        {currentStep === 4 && (
          <div className="goal-wizard__assignment-step">
            {accountsLoading ? (
              <div className="goal-wizard__loading">
                Loading company accounts…
              </div>
            ) : (
              <>
                {accountScope === "selected" && (
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
                    filteredAccounts={filteredAccounts}
                    assigneeType={assigneeType}
                    allAccounts={accounts}
                  />
                )}

                <div className="goal-wizard__assignment-summary">
                  <div>
                    <strong>{affectedAccountsCount}</strong>
                    <span>accounts</span>
                  </div>
                  <div>
                    <strong>{numberOfAffectedUsers}</strong>
                    <span>
                      {assigneeType === "sales" ? "sales reps" : "supervisors"}
                    </span>
                  </div>
                </div>

                <GoalAssignmentsSection
                  readyForCreation
                  accountScope={accountScope}
                  goalAssignments={goalAssignments}
                  setGoalAssignments={setGoalAssignments}
                  accounts={accounts}
                  filteredAccounts={filteredAccounts}
                  companyUsers={normalizedCompanyUsers}
                  assigneeType={assigneeType}
                />
              </>
            )}
          </div>
        )}

        {currentStep === 5 && (
          <div className="goal-wizard__review">
            <div className="goal-wizard__review-hero">
              <span>Natural-language review</span>
              <h3>{goalTitle.trim() || "Untitled goal"}</h3>
              <div className="goal-wizard__review-copy">
                <p>
                  This goal asks <strong>{numberOfAffectedUsers}</strong>{" "}
                  <strong>{audienceLabel}</strong> to complete qualifying
                  displays across <strong>{affectedAccountsCount}</strong>{" "}
                  <strong>{accountLabel}</strong> from{" "}
                  <strong>{goalStartDate || "the selected start date"}</strong>{" "}
                  through{" "}
                  <strong>{goalEndDate || "the selected end date"}</strong>.
                </p>
                <p>
                  A qualifying display must include at least{" "}
                  <strong>{goalValueMin || 0}</strong>{" "}
                  <strong>{metricLabel || "units"}</strong>. The team’s
                  objective is: “
                  {goalDescription.trim() || "No description has been entered."}
                  ”
                </p>
                {enforcePerUserQuota && (
                  <p>
                    Each assigned user must submit at least{" "}
                    <strong>{perUserQuota || 0}</strong> qualifying display
                    {Number(perUserQuota) === 1 ? "" : "s"} during the goal
                    period.
                  </p>
                )}
                {isSupplierGoal && supplierIdForGoal && (
                  <p>
                    Progress will also be visible, read-only, to{" "}
                    <strong>
                      {supplierMap[supplierIdForGoal] ||
                        "the connected supplier"}
                    </strong>
                    .
                  </p>
                )}
              </div>
            </div>

            <div className="goal-wizard__notification-choice">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={emailOnCreate}
                    onChange={(event) => setEmailOnCreate(event.target.checked)}
                  />
                }
                label="Email assigned users when the goal is created"
              />
              <small>
                An in-app assignment notification is always created. Email is
                optional.
              </small>
            </div>

            <div className="goal-wizard__review-confirmation">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={reviewConfirmed}
                    onChange={(event) =>
                      setReviewConfirmed(event.target.checked)
                    }
                    disabled={!stepReady[5]}
                  />
                }
                label="I reviewed this summary and the assignments are correct"
              />
              {!stepReady[5] && (
                <small>
                  This preview is available for observation, but the goal is not
                  complete enough to create.
                </small>
              )}
            </div>
          </div>
        )}

        {!stepReady[currentStep] && currentStep < 5 && (
          <p className="goal-wizard__guidance" role="status">
            {stepGuidance[currentStep]}
          </p>
        )}
      </section>

      <footer className="goal-wizard__actions">
        <button
          type="button"
          className="goal-wizard__back"
          onClick={() =>
            currentStep === 0
              ? onCancel()
              : setCurrentStep((step) => Math.max(0, step - 1))
          }
          disabled={isSaving}
        >
          {currentStep === 0 ? "Cancel" : "Back"}
        </button>

        {currentStep < wizardSteps.length - 1 ? (
          <button
            type="button"
            className="goal-wizard__next"
            onClick={goToNextStep}
            disabled={!stepReady[currentStep]}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            className="goal-wizard__next"
            onClick={confirmGoalCreation}
            disabled={isSaving || !stepReady[5] || !reviewConfirmed}
          >
            {isSaving ? "Creating goal…" : "Confirm and create goal"}
          </button>
        )}
      </footer>
    </div>
  );
};

export default CreateCompanyGoalView;
