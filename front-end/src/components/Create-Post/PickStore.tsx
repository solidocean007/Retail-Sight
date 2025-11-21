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
import { Box, CircularProgress, Typography, Button } from "@mui/material";
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
import { useIntegrations } from "../../hooks/useIntegrations";
import { setAllAccounts } from "../../Slices/allAccountsSlice";
import ManualAccountForm from "./ManualAccountForm";
import { showMessage } from "../../Slices/snackbarSlice";
import { ResetTvOutlined } from "@mui/icons-material";
import NoResults from "../NoResults";

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
    value: PostType[keyof PostType]
  ) => void;
  setSelectedCompanyAccount: (account: CompanyAccountType | null) => void;
  setSelectedGalloGoal: (goal: FireStoreGalloGoalDocType | null) => void;
  userLocation: { lat: number; lng: number } | null;
}

export const PickStore: React.FC<PickStoreProps> = ({
  post,
  setPost,
  handleFieldChange,
  setSelectedCompanyAccount,
  setSelectedGalloGoal,
  userLocation,
}) => {
  const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY!;
  const [locationChecked, setLocationChecked] = useState(false);
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const companyUsers = useSelector(selectCompanyUsers) || [];
  const isAdminOrAbove = ["admin", "super-admin"].includes(user?.role || "");
  const [openManualAccountForm, setOpenManualAccountForm] = useState(false);
  const salesRouteNum = user?.salesRouteNum;
  const { isEnabled } = useIntegrations();
  const galloEnabled = isEnabled("gallo");
  const [manualAccountAdded, setManualAccountAdded] = useState(false);
  const [nearbyStores, setNearbyStores] = useState<
    { name: string; address: string; placeId?: string }[]
  >([]);
  const [selectedNearbyStore, setSelectedNearbyStore] = useState<{
    name: string;
    address: string;
    city: string;
    state: string;
  } | null>(null);

  const allCompanyAccounts = useSelector(
    (state: RootState) => state.allAccounts.accounts
  );
  const userAccounts = useSelector(
    (state: RootState) => state.userAccounts.accounts
  );

  const [isAllStoresShown, setIsAllStoresShown] = useState(
    isAdminOrAbove || user?.role === "supervisor"
  );

  const combinedAccounts = useMemo(
    () => (isAllStoresShown ? allCompanyAccounts : userAccounts),
    [isAllStoresShown, allCompanyAccounts, userAccounts]
  );

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [isFetchingGoal, setIsFetchingGoal] = useState(false);
  const allCompanyGoals = useSelector(selectAllCompanyGoals);

  const usersGalloGoals = useSelector((state: RootState) =>
    selectUsersGalloGoals(state, salesRouteNum)
  );

  const [selectedGalloGoalId, setSelectedGalloGoalId] = useState<string | null>(
    null
  );
  const [selectedCompanyGoal, setSelectedCompanyGoal] =
    useState<CompanyGoalWithIdType>();
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const allGalloGoals = useSelector(selectAllGalloGoals);
  const [openAccountModal, setOpenAccountModal] = useState(true);
  const onlyUsersStores = !isAllStoresShown;

  const usersActiveGalloGoals = galloEnabled
    ? getActiveGalloGoalsForAccount(
        post.account?.accountNumber,
        usersGalloGoals
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
      allCompanyGoals
    );
  }, [post.account?.accountNumber, allCompanyGoals]);

  console.log("active company goals: ", activeCompanyGoals) // this logs the active goal now

  const goalsForAccount = useMemo(() => {
  if (!post.account) return [];

  const { accountNumber, salesRouteNums = [] } = post.account;
  const accountKey = accountNumber.toString();

  return activeCompanyGoals.filter((goal) => {
    const assignedUsersForAccount = goal.goalAssignments?.filter(
      (a) => a.accountNumber === accountKey
    );

    if (assignedUsersForAccount?.length === 0) return false;

    // 🧑‍💼 Employee — only sales goals matching this account
    if (user?.role === "employee" && goal.targetRole === "sales") {
      return assignedUsersForAccount?.some((a) => a.uid === user.uid);
    }

    // 🧑‍🏫 Supervisor — only supervisor goals
    if (user?.role === "supervisor" && goal.targetRole === "supervisor") {
      const repsReportingToMe = companyUsers.filter(
        (u) => u.reportsTo === user?.uid && u.salesRouteNum
      );
      const myRepsRouteNums = repsReportingToMe.map((r) => r.salesRouteNum);

      // Does any of this account's routeNums match a route from my reps?
      const overlap = salesRouteNums.some((rn) =>
        myRepsRouteNums.includes(rn)
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

  // ✅ New Places API (v1)
  const getNearbyStores = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        "https://places.googleapis.com/v1/places:searchNearby",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_KEY,
            "X-Goog-FieldMask":
              "places.displayName,places.formattedAddress,places.id",
          },
          body: JSON.stringify({
            includedTypes: ["store"],
            maxResultCount: 5,
            locationRestriction: {
              circle: {
                center: { latitude: lat, longitude: lng },
                radius: 600,
              },
            },
          }),
        }
      );

      const data = await res.json();
      if (data?.places?.length) {
        const formatted = data.places.map((p: any) => ({
          name: p.displayName.text,
          address: p.formattedAddress,
          placeId: p.id,
        }));
        if (combinedAccounts.length === 0) setNearbyStores(formatted);
        return formatted; // at end of getNearbyStores()
      } else {
        console.warn("No nearby stores found:", data);
      }
    } catch (err) {
      console.error("Failed to fetch nearby stores:", err);
    }
  };

  // 🧭 Get user location & fetch stores
  useEffect(() => {
    if (locationChecked || !navigator.geolocation) return;
    setLocationChecked(true);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        const places = await getNearbyStores(latitude, longitude);
        if (!places?.length) return;

        if (combinedAccounts.length) {
          // try to find a close match by address
          const bestMatch = places
            .map((place: any) => {
              const placeAddr = place.address.split(",")[0];
              let best = {
                score: 0,
                account: null as CompanyAccountType | null,
              };
              for (const acc of combinedAccounts) {
                const score = fuzzyMatch(placeAddr, acc.accountAddress);
                if (score > best.score) best = { score, account: acc };
              }

              return { place, ...best };
            })
            .sort((a: any, b: any) => b.score - a.score)[0];

          if (bestMatch?.score && bestMatch.score > 0.6 && bestMatch.account) {
            handleAccountSelect(bestMatch.account);
            dispatch(
              showMessage(
                `Auto-detected store: ${bestMatch.account.accountName}`
              )
            );
            setOpenAccountModal(false);
          } else {
            setOpenAccountModal(true);
          }
        } else {
          // ✅ No accounts available — show nearby places as options
          setNearbyStores(places);
        }
      },
      (err) => console.warn("Location lookup failed:", err),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [combinedAccounts.length, locationChecked]);

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
    if (isAllStoresShown) fetchAccounts();
    else setLoadingAccounts(false);
  }, [isAllStoresShown, user?.role, user?.companyId, dispatch]);

  const handleCompanyGoalSelection = (goal?: CompanyGoalWithIdType) => {
    if (!goal) return;
    setSelectedCompanyGoal(goal);
    handleFieldChange("companyGoalId", goal.id);
    handleFieldChange("companyGoalDescription", goal.goalDescription);
    handleFieldChange("companyGoalTitle", goal.goalTitle);
  };

  const handleGalloGoalSelection = (goal?: FireStoreGalloGoalDocType) => {
    if (!goal) return;
    setSelectedGalloGoalId(goal.goalDetails.goalId);
    setSelectedGalloGoal(goal);
    const match = goal.accounts.find(
      (a) => a.distributorAcctId === post.account?.accountNumber
    );
    if (match?.oppId) {
      handleFieldChange("oppId", match.oppId);
      handleFieldChange("galloGoalTitle", goal.goalDetails.goal);
      handleFieldChange("galloGoalId", goal.goalDetails.goalId);
    }
  };

  const handleAccountSelect = (account: CompanyAccountType) => {
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
      account: {
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
      },
      accountNumber,
      address: accountAddress,
      accountType: typeOfAccount,
      chain,
      chainType,
    }));
    setManualAccountAdded(true);
    setSelectedCompanyAccount(account);
  };

  const handleClearAccount = () => {
    setManualAccountAdded(false);
    setPost((p) => ({
      ...p,
      account: null,
      accountNumber: "",
      city: "",
      state: "",
    }));
    setSelectedCompanyAccount(null);
    setSelectedGalloGoalId(null);
    setSelectedCompanyGoal(undefined);
  };

  if (loadingAccounts) return <CircularProgress />;

  return (
    <div className="pick-store">
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mt={2}
        px={3}
      >
        {post.account && (
          <Button
            variant="contained"
            color="secondary"
            onClick={handleClearAccount}
            sx={{ minWidth: "80px" }}
          >
            Clear
          </Button>
        )}
      </Box>

      <Box className="store-selection">
        {combinedAccounts.length > 0 && (
          <Button
            onClick={() => setOpenAccountModal(true)}
            variant="contained"
            size="large"
            fullWidth
            disabled={!combinedAccounts.length}
            sx={{
              maxWidth: 400,
              mx: "auto",
              my: 1,
              fontWeight: 600,
              fontSize: "1rem",
              backgroundColor: "#1976d2",
              color: "#fff",
              "&:hover": { backgroundColor: "#1565c0" },
            }}
          >
            {post.account ? "Change Account" : "Select Account"}
          </Button>
        )}
      </Box>

      {/* My Stores / All Stores toggle */}
      {!post.account?.accountNumber && combinedAccounts.length > 0 && (
        <Box mt={3}>
          <Box mt={2} display="flex" justifyContent="center" gap={2}>
            <Typography
              className={`toggle-label ${!isAllStoresShown ? "selected" : ""}`}
              onClick={() => setIsAllStoresShown(false)}
            >
              My Stores
            </Typography>
            <Typography
              className={`toggle-label ${isAllStoresShown ? "selected" : ""}`}
              onClick={() => setIsAllStoresShown(true)}
            >
              All Stores
            </Typography>
          </Box>
        </Box>
      )}

      {/* Display selected store */}
      {post.account && (
        <Box mt={3} p={2} sx={{ border: "1px solid #ccc", borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            {post.account.accountName}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {post.account.accountAddress}
          </Typography>
          {selectedCompanyGoal && (
            <Typography variant="body2" color="primary" mt={1}>
              Goal: {selectedCompanyGoal.goalTitle}
            </Typography>
          )}
        </Box>
      )}
      {!combinedAccounts.length && nearbyStores.length > 0 && (
        <Box mt={3} p={2}>
          <Typography variant="subtitle1" color="textSecondary">
            No company accounts found. Choose a nearby store to create one:
          </Typography>
          {/* ...store cards here */}
        </Box>
      )}

      {/* Nearby stores (new API results) */}
      {!combinedAccounts.length && nearbyStores.length > 0 && (
        <Box
          mt={3}
          p={2}
          className={nearbyStores.length === 0 ? "nearby-stores-hidden" : ""}
        >
          <Typography variant="h6">Nearby Stores</Typography>
          {nearbyStores.map((store) => {
            return (
              <Box
                key={store.placeId}
                sx={{
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  p: 1.5,
                  mt: 1,
                  cursor: "pointer",
                  transition: "background-color 0.2s ease-in-out",
                  "&:hover": { backgroundColor: "#f3f3f3" },
                }}
                onClick={() => {
                  const { city, state } = extractCityState(store.address);
                  setSelectedNearbyStore({
                    name: store.name,
                    address: store.address,
                    city,
                    state,
                  });
                  setNearbyStores([]); // ✅ hide suggestions
                  setOpenManualAccountForm(true);
                }}
              >
                <Typography fontWeight="bold">{store.name}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {store.address}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
      {!post.account && !nearbyStores.length && (
        <Box textAlign="center" mt={2}>
          <Typography variant="body2" color="textSecondary" mb={1}>
            Can’t find the store in your list?
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setOpenManualAccountForm(true)}
          >
            + Add Store Manually
          </Button>
        </Box>
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
        />
      )}

      {/* Goal dropdowns */}
      {post.account && (
        <Box mt={3}>
          <CompanyGoalDropdown
            goals={goalsForAccount}
            label="Company Goals"
            loading={isFetchingGoal}
            onSelect={handleCompanyGoalSelection}
            selectedGoal={selectedCompanyGoal}
          />
          {galloEnabled && (
            <Box mt={2}>
              <GalloGoalDropdown
                goals={galloGoals}
                label="Gallo Goals"
                loading={isFetchingGoal}
                onSelect={handleGalloGoalSelection}
                selectedGoal={selectedGalloGoalId}
              />
            </Box>
          )}
        </Box>
      )}
    </div>
  );
};
