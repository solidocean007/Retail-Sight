// PickStore.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  CompanyAccountType,
  CompanyGoalWithIdType,
  FireStoreGalloGoalDocType,
  PostInputType,
  PostType,
} from "../../utils/types";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../utils/store";
import { Box, CircularProgress, Typography, Button, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { getActiveGalloGoalsForAccount } from "../../utils/helperFunctions/getActiveGalloGoalsForAccount";
import {
  getAllCompanyAccountsFromIndexedDB,
  saveAllCompanyAccountsToIndexedDB,
} from "../../utils/database/indexedDBUtils";
import { selectCompanyUsers, selectUser } from "../../Slices/userSlice";
import { fetchAllCompanyAccounts } from "../../utils/helperFunctions/fetchAllCompanyAccounts";
import { getActiveCompanyGoalsForAccount } from "../../utils/helperFunctions/getActiveCompanyGoalsForAccount";
import GalloGoalDropdown from "./GalloGoalDropdown";
import CompanyGoalDropdown from "./CompanyGoalDropdown";
import "./pickstore.css";
import AccountModalSelector from "./AccountModalSelector";
import {
  selectAllGalloGoals,
  selectUsersGalloGoals,
} from "../../Slices/galloGoalsSlice";
import { selectAllCompanyGoals } from "../../Slices/companyGoalsSlice";
import { setAllAccounts } from "../../Slices/allAccountsSlice";
import ManualAccountForm from "./ManualAccountForm";
import { showMessage } from "../../Slices/snackbarSlice";
import { useCompanyIntegrations } from "../../hooks/useCompanyIntegrations";
import { selectIsSupplier } from "../../Slices/currentCompanySlice";
import {
  getConnectedStores,
  NearbyStoreCandidate,
} from "./storeDiscovery";

// Normalize abbreviations and compare address similarity
const normalizeCache = new Map<string, string>();
const normalizeAddress = (input: string) => {
  if (!input) return "";
  if (normalizeCache.has(input)) return normalizeCache.get(input)!;
  const result = input
    .toLowerCase()
    // strip city/state/zip if present
    .replace(/,.*/, "")
    // expand direction abbreviations
    .replace(/\b(n|north)\b/g, "north")
    .replace(/\b(s|south)\b/g, "south")
    .replace(/\b(e|east)\b/g, "east")
    .replace(/\b(w|west)\b/g, "west")
    // expand common suffixes
    .replace(/\brd\b/g, "road")
    .replace(/\bst\b/g, "street")
    .replace(/\bave\b/g, "avenue")
    .replace(/\bdr\b/g, "drive")
    .replace(/\bblvd\b/g, "boulevard")
    .replace(/\bln\b/g, "lane")
    .replace(/\bct\b/g, "court")
    // remove punctuation/spaces
    .replace(/[^a-z0-9]/g, "")
    .trim();
  normalizeCache.set(input, result);

  return result;
};

const fuzzyMatch = (a: string, b: string) => {
  const cleanA = normalizeAddress(a);
  const cleanB = normalizeAddress(b);
  if (!cleanA || !cleanB) return 0;
  const base = Math.min(cleanA.length, cleanB.length);
  let matches = 0;
  for (let i = 0; i < base; i++) if (cleanA[i] === cleanB[i]) matches++;
  const ratio = matches / Math.max(cleanA.length, cleanB.length);
  return ratio >= 0.8
    ? ratio
    : ratio + (cleanA.includes(cleanB) || cleanB.includes(cleanA) ? 0.2 : 0);
};

// simple util to extract city/state from formatted address
const extractCityState = (address: string) => {
  if (!address) return { city: "", state: "" };

  // Example: "7701 S Raeford Rd, Fayetteville, NC 28304, USA"
  const parts = address.split(",").map((p) => p.trim());

  if (parts.length < 3) return { city: "", state: "" };

  // City is always the second segment from the end before the state line
  const city = parts[parts.length - 3] || "";

  // State comes from the second-to-last part (e.g. "NC 28304")
  const stateZip = parts[parts.length - 2] || "";
  const stateMatch = stateZip.match(/[A-Z]{2}/);
  const state = stateMatch ? stateMatch[0] : "";

  return { city, state };
};

interface PickStoreProps {
  post: PostInputType;
  setPost: React.Dispatch<React.SetStateAction<PostInputType>>;
  handleFieldChange: (
    field: keyof PostInputType,
    value: PostType[keyof PostType],
  ) => void;
  setSelectedCompanyAccount: (account: CompanyAccountType | null) => void;
  setSelectedGalloGoal: (goal: FireStoreGalloGoalDocType | null) => void;
  prefetchedNearbyStores: NearbyStoreCandidate[] | null;
  isPrefetchingNearbyStores: boolean;
  nearbyStorePrefetchError?: string;
}

export const PickStore: React.FC<PickStoreProps> = ({
  post,
  setPost,
  handleFieldChange,
  setSelectedCompanyAccount,
  setSelectedGalloGoal,
  prefetchedNearbyStores,
  isPrefetchingNearbyStores,
  nearbyStorePrefetchError,
}) => {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const companyUsers = useSelector(selectCompanyUsers);
  const isAdminOrAbove = ["admin", "super-admin"].includes(user?.role || "");
  const [openManualAccountForm, setOpenManualAccountForm] = useState(false);
  const salesRouteNum = user?.salesRouteNum;
  const companyId = user?.companyId;
  const isSupplier = useSelector(selectIsSupplier);
  const connections = useSelector(
    (state: RootState) => state.companyConnections.connections,
  );
  const connectionsLoading = useSelector(
    (state: RootState) => state.companyConnections.loading,
  );
  const connectionsError = useSelector(
    (state: RootState) => state.companyConnections.error,
  );
  const partnerCompanies = useMemo(() => {
    if (!isSupplier || !companyId) return [];
    const map = new Map<string, string>();
    connections.forEach((connection) => {
      if (connection.status !== "approved") return;
      if (connection.requestFromCompanyId === companyId && connection.requestToCompanyType === "distributor") {
        map.set(connection.requestToCompanyId, connection.requestToCompanyName);
      } else if (connection.requestToCompanyId === companyId && connection.requestFromCompanyType === "distributor") {
        map.set(connection.requestFromCompanyId, connection.requestFromCompanyName);
      }
    });
    return [...map.entries()].map(([id, name]) => ({ id, name: name || "Connected company" }));
  }, [isSupplier, companyId, connections]);
  const [partnerAccounts, setPartnerAccounts] = useState<CompanyAccountType[]>([]);
  const [loadingPartnerAccounts, setLoadingPartnerAccounts] = useState(false);
  const [partnerStoreProblem, setPartnerStoreProblem] = useState("");
  useEffect(() => {
    if (!isSupplier || partnerCompanies.length === 0) {
      setPartnerAccounts([]);
      setPartnerStoreProblem("");
      return;
    }
    let cancelled = false;
    setLoadingPartnerAccounts(true);
    setPartnerStoreProblem("");
    Promise.allSettled(partnerCompanies.map(async (partner) => {
      const accounts = await getConnectedStores(partner.id);
      return accounts.map((account) => ({
        ...account,
        originCompanyId: partner.id,
        originCompanyName: partner.name,
      }));
    })).then((results) => {
      if (cancelled) return;
      setPartnerAccounts(results.flatMap((result) =>
        result.status === "fulfilled" ? result.value : [],
      ));
      const failedPartners = results.flatMap((result, index) => {
        if (result.status !== "rejected") return [];
        console.error("Failed to load connected company stores:", result.reason);
        return [partnerCompanies[index].name];
      });
      if (failedPartners.length > 0) {
        setPartnerStoreProblem(`Could not load stores from ${failedPartners.join(", ")}. Refresh and try again.`);
      } else if (results.every((result) =>
        result.status === "fulfilled" && result.value.length === 0
      )) {
        setPartnerStoreProblem("Your connected distributors have no stores available.");
      }
    }).finally(() => {
      if (!cancelled) setLoadingPartnerAccounts(false);
    });
    return () => { cancelled = true; };
  }, [isSupplier, partnerCompanies]);
  const { isEnabled } = useCompanyIntegrations(companyId);
  const galloEnabled = isEnabled("galloAxis");
  const [nearbyStores, setNearbyStores] = useState<
    { name: string; address: string; placeId?: string }[]
  >([]);
  // Raw Places API results stored separately so matching can retry after accounts load
  const [fetchedPlaces, setFetchedPlaces] = useState<
    NearbyStoreCandidate[] | null
  >(prefetchedNearbyStores);
  const [suggestedAccount, setSuggestedAccount] =
    useState<CompanyAccountType | null>(null);
  const [nearbyLookupComplete, setNearbyLookupComplete] = useState(false);
  const [selectedNearbyStore, setSelectedNearbyStore] = useState<{
    name: string;
    address: string;
    city: string;
    state: string;
  } | null>(null);

  const allCompanyAccounts = useSelector(
    (state: RootState) => state.allAccounts.accounts,
  );
  const userAccounts = useSelector(
    (state: RootState) => state.userAccounts.accounts,
  );
  const [isAllStoresShown, setIsAllStoresShown] = useState(
    isAdminOrAbove || user?.role === "supervisor",
  );

  const combinedAccounts = useMemo(
    () => isSupplier
      ? partnerAccounts
      : (isAllStoresShown ? allCompanyAccounts : userAccounts),
    [isSupplier, partnerAccounts, isAllStoresShown, allCompanyAccounts, userAccounts],
  );
  const resolvePartnerForStore = (account: CompanyAccountType) => {
    if (account.originCompanyId && partnerCompanies.some((partner) =>
      partner.id === account.originCompanyId)) {
      return partnerCompanies.find((partner) => partner.id === account.originCompanyId) ?? null;
    }
    const address = normalizeAddress(account.streetAddress || account.accountAddress);
    if (!address) return null;
    const matches = new Set(partnerAccounts.filter((candidate) =>
      normalizeAddress(candidate.streetAddress || candidate.accountAddress) === address,
    ).map((candidate) => candidate.originCompanyId).filter(Boolean));
    if (matches.size !== 1) return null;
    return partnerCompanies.find((partner) => partner.id === [...matches][0]) ?? null;
  };

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const allCompanyGoals = useSelector(selectAllCompanyGoals);

  const usersGalloGoals = useSelector((state: RootState) =>
    selectUsersGalloGoals(state, salesRouteNum),
  );

  const [selectedCompanyGoal, setSelectedCompanyGoal] =
    useState<CompanyGoalWithIdType>();
  const allGalloGoals = useSelector(selectAllGalloGoals);
  const [openAccountModal, setOpenAccountModal] = useState(false);
  const onlyUsersStores = !isAllStoresShown;

  const usersActiveGalloGoals = galloEnabled
    ? getActiveGalloGoalsForAccount(
        post.account?.accountNumber,
        usersGalloGoals,
      )
    : [];

  const allActiveGalloGoals = galloEnabled
    ? getActiveGalloGoalsForAccount(post.account?.accountNumber, allGalloGoals)
    : [];

  const galloGoals = galloEnabled
    ? onlyUsersStores
      ? usersActiveGalloGoals
      : allActiveGalloGoals
    : [];

  const activeCompanyGoals = useMemo(() => {
    if (!post.account?.accountNumber || !allCompanyGoals.length) return [];
    return getActiveCompanyGoalsForAccount(
      post.account.accountNumber,
      allCompanyGoals,
    );
  }, [post.account?.accountNumber, allCompanyGoals]);

  const goalsForAccount = useMemo(() => {
    if (!post.account) return [];

    const { accountNumber, salesRouteNums = [] } = post.account;
    const accountKey = accountNumber.toString();

    return activeCompanyGoals.filter((goal) => {
      const assignedUsersForAccount = goal.goalAssignments?.filter(
        (a) => a.accountNumber === accountKey,
      );

      if (assignedUsersForAccount?.length === 0) return false;

      // 🧑‍💼 Employee — only sales goals matching this account
      if (user?.role === "employee" && goal.targetRole === "sales") {
        return assignedUsersForAccount?.some((a) => a.uid === user.uid);
      }

      // 🧑‍🏫 Supervisor — only supervisor goals
      if (user?.role === "supervisor" && goal.targetRole === "supervisor") {
        const repsReportingToMe = (companyUsers || []).filter(
          (u) => u.reportsTo === user?.uid && u.salesRouteNum,
        );
        const myRepsRouteNums = repsReportingToMe.map((r) => r.salesRouteNum);

        // Does any of this account's routeNums match a route from my reps?
        const overlap = salesRouteNums.some((rn) =>
          myRepsRouteNums.includes(rn),
        );

        return overlap;
      }

      // 👑 Admin sees any goal for this account
      if (isAdminOrAbove) return true;

      return false;
    });
  }, [
    activeCompanyGoals,
    post.account,
    user?.role,
    companyUsers,
    user?.uid,
    isAdminOrAbove,
  ]);

  useEffect(() => {
    if (post.account) setOpenManualAccountForm(false);
  }, [post.account]);

  useEffect(() => {
    if (prefetchedNearbyStores !== null) {
      setFetchedPlaces(prefetchedNearbyStores);
    }
  }, [prefetchedNearbyStores]);

  // 🎯 Effect 2: run account matching once BOTH places AND accounts are ready
  // This fixes the race where Places returned before accounts finished loading.
  useEffect(() => {
    if (
      fetchedPlaces === null ||
      loadingAccounts ||
      loadingPartnerAccounts ||
      post.account ||
      suggestedAccount
    ) {
      return;
    }

    if (!fetchedPlaces.length) {
      setNearbyLookupComplete(true);
      return;
    }

    if (!combinedAccounts.length) {
      // No company accounts — show raw Google places for manual account creation
      setNearbyStores(fetchedPlaces);
      setNearbyLookupComplete(true);
      return;
    }

    const bestMatch = fetchedPlaces
      .map((place) => {
        const placeAddr = place.address.split(",")[0];

        let best = {
          score: 0,
          account: null as CompanyAccountType | null,
          matchedAgainst: "",
        };

        for (const acc of combinedAccounts) {
          const possibleAccountAddresses = [
            acc.accountAddress,
            acc.streetAddress,
            [acc.streetAddress, acc.city, acc.state].filter(Boolean).join(", "),
          ].filter(Boolean);

          for (const accountAddr of possibleAccountAddresses) {
            const score = fuzzyMatch(placeAddr, accountAddr);

            if (score > best.score) {
              best = {
                score,
                account: acc,
                matchedAgainst: accountAddr,
              };
            }
          }
        }

        return { place, ...best };
      })
      .sort((a, b) => b.score - a.score)[0];

    const ambiguousDistributor = isSupplier && bestMatch?.account?.originCompanyId &&
      partnerAccounts.some((account) =>
        account.originCompanyId !== bestMatch.account?.originCompanyId &&
        normalizeAddress(account.streetAddress || account.accountAddress) ===
          normalizeAddress(bestMatch.account?.streetAddress || bestMatch.account?.accountAddress || ""),
      );
    if (bestMatch?.score > 0.45 && bestMatch.account && !ambiguousDistributor) {
      setSuggestedAccount(bestMatch.account);
      setNearbyLookupComplete(true);
      setOpenAccountModal(false);
    } else {
      setNearbyLookupComplete(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fetchedPlaces,
    combinedAccounts,
    loadingAccounts,
    loadingPartnerAccounts,
    post.account,
    suggestedAccount,
  ]);

  useEffect(() => {
    const fetchAccounts = async () => {
      setLoadingAccounts(true);
      const cached = await getAllCompanyAccountsFromIndexedDB();
      if (cached.length > 0) {
        dispatch(setAllAccounts(cached));
        setLoadingAccounts(false);
        return;
      }
      const fresh = await fetchAllCompanyAccounts(user?.companyId);
      dispatch(setAllAccounts(fresh));
      await saveAllCompanyAccountsToIndexedDB(fresh);
      setLoadingAccounts(false);
    };
    if (!isSupplier && isAllStoresShown) fetchAccounts();
    else setLoadingAccounts(false);
  }, [isSupplier, isAllStoresShown, user?.role, user?.companyId, dispatch]);

  const handleCompanyGoalSelection = (goal?: CompanyGoalWithIdType) => {
    if (!goal) {
      setSelectedCompanyGoal(undefined);
      setPost((previous) => ({
        ...previous,
        companyGoalId: undefined,
        companyGoalDescription: undefined,
        companyGoalTitle: undefined,
      }));
      return;
    }
    setSelectedCompanyGoal(goal);
    handleFieldChange("companyGoalId", goal.id);
    handleFieldChange("companyGoalDescription", goal.goalDescription);
    handleFieldChange("companyGoalTitle", goal.goalTitle);
  };

  const handleGalloGoalSelection = (goal?: FireStoreGalloGoalDocType) => {
    if (!goal) {
      setSelectedGalloGoal(null);
      setPost((previous) => ({
        ...previous,
        galloGoal: undefined,
      }));
      return;
    }
    if (!post.account) return;

    const match = goal.accounts.find(
      (a) => a.distributorAcctId === post.account?.accountNumber,
    );

    if (!match?.oppId) {
      dispatch(showMessage("Selected goal has no oppId for this account"));
      return;
    }

    setSelectedGalloGoal(goal);

    setPost((prev) => ({
      ...prev,
      galloGoal: {
        goalId: goal.goalDetails.goalId,
        title: goal.goalDetails.goal,
        env: goal.goalDetails.goalEnv,
        oppId: match.oppId,
      },
    }));
  };

  const handleAccountSelect = (
    account: CompanyAccountType,
    keepNearbySuggestion = false,
  ) => {
    const partner = isSupplier ? resolvePartnerForStore(account) : null;
    const originCompanyId = isSupplier ? partner?.id : account.originCompanyId;
    const originCompanyName = isSupplier ? partner?.name : account.originCompanyName;
    const {
      accountName,
      accountAddress,
      streetAddress,
      city,
      state,
      accountNumber,
      salesRouteNums,
      typeOfAccount,
      chain,
      chainType,
    } = account;

    setPost((p) => ({
      ...p,
      brands: [],
      brandIds: [],
      productType: [],
      companyGoalId: undefined,
      companyGoalDescription: undefined,
      companyGoalTitle: undefined,
      galloGoal: undefined,
      account: {
        accountName,
        accountAddress,
        ...(originCompanyId && { originCompanyId, originCompanyName }),
        streetAddress,
        city,
        state,
        accountNumber,
        salesRouteNums,
        typeOfAccount,
        chain,
        chainType,
      },
      accountNumber,
      address: accountAddress,
      accountType: typeOfAccount,
      chain,
      chainType,
    }));
    setSuggestedAccount(keepNearbySuggestion ? account : null);
    setSelectedCompanyGoal(undefined);
    setSelectedGalloGoal(null);
    setSelectedCompanyAccount(account);
  };

  useEffect(() => {
    if (!suggestedAccount || post.account) return;
    handleAccountSelect(suggestedAccount, true);
    // The nearby suggestion changes only when a completed lookup finds a match.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedAccount, post.account]);

  const openManualEntry = () => {
    const nearbyStore = nearbyStores[0];
    if (nearbyStore) {
      const { city, state } = extractCityState(nearbyStore.address);
      setSelectedNearbyStore({
        name: nearbyStore.name,
        address: nearbyStore.address,
        city,
        state,
      });
    } else {
      setSelectedNearbyStore(null);
    }
    setOpenAccountModal(false);
    setSuggestedAccount(null);
    setOpenManualAccountForm(true);
  };

  if (loadingAccounts || loadingPartnerAccounts) return <CircularProgress />;

  return (
    <div className="pick-store">
      {isSupplier && partnerCompanies.length === 0 && (
        <Typography variant="body2" color={connectionsError ? "error" : "textSecondary"} px={3} mt={2}>
          {connectionsLoading
            ? "Loading your distributor connections..."
            : connectionsError
              ? "Could not load your distributor connections. Refresh and try again."
              : "No approved distributor connection was found for this supplier."}
        </Typography>
      )}
      {isSupplier && partnerStoreProblem && (
        <Typography variant="body2" color="error" px={3} mt={2}>
          {partnerStoreProblem}
        </Typography>
      )}
      {post.account && (
        <section className="store-suggestion" aria-live="polite">
          <span className="store-suggestion__eyebrow">
            {suggestedAccount ? "Nearby account selected" : "Selected account"}
          </span>
          <strong>{post.account.accountName}</strong>
          <span>{post.account.accountAddress}</span>
          {isSupplier && post.account.originCompanyId && (
            <span className="store-suggestion__partner">
              Connected distributor: {post.account.originCompanyName ||
                partnerCompanies.find((partner) =>
                  partner.id === post.account?.originCompanyId)?.name}
            </span>
          )}
          <div className="store-suggestion__actions">
            <Button
              variant="outlined"
              onClick={() => {
                setSuggestedAccount(null);
                if (combinedAccounts.length > 0) {
                  setOpenAccountModal(true);
                } else {
                  openManualEntry();
                }
              }}
            >
              Change account
            </Button>
          </div>
        </section>
      )}
      {!post.account && isPrefetchingNearbyStores && (
        <Typography className="store-prefetch-status" variant="body2">
          Finding nearby accounts while you work…
        </Typography>
      )}
      {!post.account && nearbyStorePrefetchError && !nearbyLookupComplete && (
        <Typography className="store-prefetch-status" variant="body2">
          Nearby lookup is unavailable. Search your account list instead.
        </Typography>
      )}
      {!post.account &&
        !isPrefetchingNearbyStores &&
        (nearbyLookupComplete || !!nearbyStorePrefetchError) && (
        <section className="store-fallback" aria-live="polite">
          <span className="store-suggestion__eyebrow">No nearby account matched</span>
          <strong>
            {isSupplier
              ? "Choose a connected distributor account"
              : "Choose an account from your store list"}
          </strong>
          <p>
            {isSupplier
              ? "If this store is outside a connected distributor’s market, add it manually and select the distributor it belongs to."
              : "Search your available accounts, or add this store manually."}
          </p>
          <div className="store-suggestion__actions">
            {combinedAccounts.length > 0 && (
              <Button variant="contained" onClick={() => setOpenAccountModal(true)}>
                {isSupplier ? "Choose distributor account" : "Choose account"}
              </Button>
            )}
            <Button variant="outlined" onClick={openManualEntry}>
              Add store manually
            </Button>
          </div>
        </section>
      )}

      {post.account && isSupplier && !post.account.originCompanyId && partnerCompanies.length > 0 && (
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="unmatched-store-partner-label">Connected distributor</InputLabel>
          <Select
            labelId="unmatched-store-partner-label"
            value=""
            label="Connected distributor"
            onChange={(event) => {
              const partner = partnerCompanies.find((item) => item.id === event.target.value);
              if (!partner) return;
              setPost((previous) => ({
                ...previous,
                brands: [],
                brandIds: [],
                productType: [],
                account: previous.account ? {
                  ...previous.account,
                  originCompanyId: partner.id,
                  originCompanyName: partner.name,
                } : null,
              }));
            }}
          >
            {partnerCompanies.map((partner) => (
              <MenuItem key={partner.id} value={partner.id}>{partner.name}</MenuItem>
            ))}
          </Select>
          <Typography variant="caption" mt={1}>
            Select the connected distributor responsible for this manually entered store.
          </Typography>
        </FormControl>
      )}

      {/* Fallback manual form */}
      {openManualAccountForm && (
        <ManualAccountForm
          open={openManualAccountForm}
          onSave={(account) => {
            handleAccountSelect(account);
            setSelectedNearbyStore(null);
            setOpenManualAccountForm(false);
          }}
          initialValues={
            selectedNearbyStore
              ? {
                  accountName: selectedNearbyStore.name,
                  accountAddress: selectedNearbyStore.address,
                  city: selectedNearbyStore.city,
                  state: selectedNearbyStore.state,
                }
              : undefined
          }
        />
      )}

      {/* Account modal */}
      {combinedAccounts.length > 0 && (
        <AccountModalSelector
          open={openAccountModal}
          onClose={() => setOpenAccountModal(false)}
          accounts={combinedAccounts}
          onAccountSelect={handleAccountSelect}
          isAllStoresShown={isAllStoresShown}
          setIsAllStoresShown={setIsAllStoresShown}
          showStoreScopeToggle={!isSupplier && (isAdminOrAbove || user?.role === "supervisor")}
          showOriginCompany={isSupplier}
          title={post.account ? "Change account" : "Choose account"}
          onAddManual={openManualEntry}
        />
      )}

      {/* Goal dropdowns */}
      {post.account && (
        <Box mt={1}>
          <CompanyGoalDropdown
            goals={goalsForAccount}
            label="Company Goals"
            loading={false}
            onSelect={handleCompanyGoalSelection}
            selectedGoal={selectedCompanyGoal}
          />
          {galloEnabled && (
            <Box mt={0}>
              <GalloGoalDropdown
                goals={galloGoals}
                label="Gallo Goals"
                loading={false}
                onSelect={handleGalloGoalSelection}
                selectedGoalId={post.galloGoal?.goalId ?? null}
              />
            </Box>
          )}
        </Box>
      )}
    </div>
  );
};
