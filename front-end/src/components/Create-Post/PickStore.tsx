// PickStore.tsx
import React, { useEffect, useMemo, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

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
// import { fetchGalloGoalsByCompanyId } from "../../utils/helperFunctions/fetchGalloGoalsByCompanyId";
import { getActiveGalloGoalsForAccount } from "../../utils/helperFunctions/getActiveGalloGoalsForAccount"; // this function looks useful also
import {
  getAllCompanyAccountsFromIndexedDB,
  getUserAccountsFromIndexedDB,
  saveAllCompanyAccountsToIndexedDB,
} from "../../utils/database/indexedDBUtils";
import { selectCompanyUsers, selectUser } from "../../Slices/userSlice";

import { fetchAllCompanyAccounts } from "../../utils/helperFunctions/fetchAllCompanyAccounts";
import { getActiveCompanyGoalsForAccount } from "../../utils/helperFunctions/getActiveCompanyGoalsForAccount";
// import { matchAccountWithSelectedStoreForAdmin } from "../../utils/helperFunctions/accountHelpers";
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
import { fetchCityAndState } from "../../utils/location/googlePlacesHelpers";

interface PickStoreProps {
  post: PostInputType;
  setPost: React.Dispatch<React.SetStateAction<PostInputType>>;
  handleFieldChange: (
    field: keyof PostInputType,
    value: PostType[keyof PostType]
  ) => void;
  setSelectedCompanyAccount: (account: CompanyAccountType | null) => void;
  setSelectedGalloGoal: (goal: FireStoreGalloGoalDocType | null) => void;
  userLocation: {
    lat: number;
    lng: number;
  } | null;
}

export const PickStore: React.FC<PickStoreProps> = ({
  post,
  setPost,
  handleFieldChange,
  setSelectedCompanyAccount,
  setSelectedGalloGoal,
  userLocation,
}) => {
  const VITE_GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY!;
  console.log(VITE_GOOGLE_MAPS_API_KEY);
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const companyUsers = useSelector(selectCompanyUsers) || [];
  const isAdminOrAbove = user?.role === "admin" || user?.role === "super-admin";
  const [openManualAccountForm, setOpenManualAccountForm] = useState(false);
  const salesRouteNum = user?.salesRouteNum;
  const { isEnabled } = useIntegrations();
  const galloEnabled = isEnabled("gallo");
  const [manualAccountAdded, setManualAccountAdded] = useState(false);
  const [nearbyStores, setNearbyStores] = useState<
    { name: string; address: string; placeId?: string }[]
  >([]);

  const allCompanyAccounts = useSelector(
    (state: RootState) => state.allAccounts.accounts
  );
  const userAccounts = useSelector(
    (state: RootState) => state.userAccounts.accounts
  );
  console.log(allCompanyAccounts);
  const [isAllStoresShown, setIsAllStoresShown] = useState(() => {
    if (
      user?.role === "supervisor" ||
      user?.role === "admin" ||
      user?.role === "super-admin"
    ) {
      return true; // default supervisors/admins to All Stores
    }
    return false; // sales reps start in My Stores
  });

  const combinedAccounts = useMemo(() => {
    return isAllStoresShown ? allCompanyAccounts : userAccounts;
  }, [isAllStoresShown, allCompanyAccounts, userAccounts]);
  const [loadingAccounts, setLoadingAccounts] = useState(true); // Tracks loading status

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
  const [openAccountModal, setOpenAccountModal] = useState(false);

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

  const companyGoals = useMemo(() => {
    if (!post.account?.accountNumber || !allCompanyGoals.length) return [];
    return getActiveCompanyGoalsForAccount(
      post.account.accountNumber,
      allCompanyGoals
    );
  }, [post.account?.accountNumber, allCompanyGoals]);

  const goalsForAccount = useMemo(() => {
    if (!post.account) return []; // guard early

    const { accountNumber, salesRouteNums = [] } = post.account;

    return companyGoals.filter((goal) => {
      // 🟢 Sales employees only see sales goals
      if (user?.role === "employee" && goal.targetRole === "sales") {
        return goal.accountNumbersForThisGoal?.includes(
          accountNumber.toString()
        );
      }

      // 🟢 Supervisors only see supervisor goals tied to their reps' accounts
      if (user?.role === "supervisor" && goal.targetRole === "supervisor") {
        // find all reps reporting to this supervisor
        const repsReportingToMe = companyUsers.filter(
          (u) => u.reportsTo === user?.uid && u.salesRouteNum
        );

        const myRepsRouteNums = repsReportingToMe.map((r) => r.salesRouteNum);

        // check overlap between account route nums and my reps' route nums
        const overlap = salesRouteNums.some((rn) =>
          myRepsRouteNums.includes(rn)
        );

        return (
          overlap &&
          goal.accountNumbersForThisGoal?.includes(accountNumber.toString())
        );
      }

      // 🟢 Admins/super-admins see all goals
      if (isAdminOrAbove) {
        return goal.accountNumbersForThisGoal?.includes(
          accountNumber.toString()
        );
      }

      return false;
    });
  }, [
    companyGoals,
    post.account,
    user?.role,
    companyUsers,
    user?.uid,
    isAdminOrAbove,
  ]);

  let isConfigured = false;

  const getNearbyStores = async (lat: number, lng: number) => {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchNearby",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": VITE_GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask":
            "places.displayName,places.formattedAddress,places.id",
        },
        body: JSON.stringify({
          includedTypes: ["store"],
          maxResultCount: 5,
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: 300.0,
            },
          },
        }),
      }
    );
    const data = await res.json();
    console.log("Nearby (new Places API):", data);
  };

  useEffect(() => {
    const loadAndFindNearby = async () => {
      try {
        if (!isConfigured) {
          // ✅ only set your key once
          // @ts-expect-error Google's types lag behind the runtime API
          setOptions({ apiKey: VITE_GOOGLE_MAPS_API_KEY });

          isConfigured = true;
        }

        // ✅ load the places library
        await importLibrary("places");
        console.log("✅ Google Maps Places loaded");

        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            const { latitude, longitude } = coords;
            const service = new google.maps.places.PlacesService(
              document.createElement("div")
            );
            getNearbyStores(latitude, longitude);

            // service.nearbySearch(
            //   {
            //     location: { lat: latitude, lng: longitude },
            //     radius: 300,
            //     type: "store",
            //   },
            //   (results, status) => {
            //     if (
            //       status !== google.maps.places.PlacesServiceStatus.OK ||
            //       !results
            //     ) {
            //       console.warn("Places search failed:", status);
            //       return;
            //     }

            //     const places = results
            //       .filter((r) => r.name && r.vicinity)
            //       .slice(0, 5)
            //       .map((r) => ({
            //         name: r.name!,
            //         address: r.vicinity!,
            //         placeId: r.place_id,
            //       }));

            //     console.log("Nearby stores:", places);
            //     if (combinedAccounts.length === 0) setNearbyStores(places);
            //   }
            // );
          },
          (err) => console.warn("Location lookup failed:", err),
          { enableHighAccuracy: true, timeout: 15000 }
        );
      } catch (err) {
        console.error("❌ Failed to load Google Maps libraries:", err);
      }
    };

    loadAndFindNearby();
  }, [combinedAccounts.length]);

  useEffect(() => {
    if (!loadingAccounts) {
      if (combinedAccounts.length === 0) {
        // 🛑 No accounts → open manual form, keep modal closed
        setOpenManualAccountForm(true);
        setOpenAccountModal(false);
      } else if (!post.account?.accountNumber) {
        // ✅ Accounts exist but none selected → open modal
        setOpenAccountModal(true);
      }
    }
  }, [loadingAccounts, combinedAccounts.length, post.account?.accountNumber]);

  // open manual account form if no accounts exist
  useEffect(() => {
    if (!loadingAccounts && combinedAccounts.length === 0) {
      setOpenManualAccountForm(true);
    }
  }, [loadingAccounts, combinedAccounts.length]);

  useEffect(() => {
    const shouldFetchAllAccounts = isAllStoresShown;

    if (!shouldFetchAllAccounts) {
      // 🟢 Supervisor or users without route accounts
      setLoadingAccounts(false);
      return;
    }

    const fetchAccounts = async () => {
      setLoadingAccounts(true); // ✅ start spinner

      const cached = await getAllCompanyAccountsFromIndexedDB();
      if (cached.length > 0) {
        dispatch(setAllAccounts(cached));
        setLoadingAccounts(false); // ✅ stop spinner after cache
        return;
      }

      const fresh = await fetchAllCompanyAccounts(user?.companyId);
      dispatch(setAllAccounts(fresh));
      await saveAllCompanyAccountsToIndexedDB(fresh);
      setLoadingAccounts(false); // ✅ stop spinner after fetch
    };

    fetchAccounts();
  }, [isAllStoresShown, user?.role, user?.companyId, dispatch]);

  const handleCompanyGoalSelection = (
    goal: CompanyGoalWithIdType | undefined
  ) => {
    if (!goal) {
      console.warn("No goal selected.");
      return;
    }

    setSelectedCompanyGoal(goal); // Update state with the selected goal object
    handleFieldChange("companyGoalId", goal.id); // Set the goal ID
    handleFieldChange("companyGoalDescription", goal.goalDescription); // Set the goal description
    handleFieldChange("companyGoalTitle", goal.goalTitle); // i just added this
    console.log("new post data:", post);
  };

  const handleGalloGoalSelection = (
    // no change to the amount of gallo goals.. still just one per post.
    galloGoal: FireStoreGalloGoalDocType | undefined
  ) => {
    if (!galloGoal) return;

    setSelectedGalloGoalId(galloGoal.goalDetails.goalId);
    setSelectedGalloGoal(galloGoal); // 🆕 Save the full object directly

    const matchingAccount = galloGoal.accounts.find(
      (acc) => acc.distributorAcctId === post.account?.accountNumber
    );

    if (matchingAccount?.oppId) {
      handleFieldChange("oppId", matchingAccount.oppId);
      handleFieldChange("galloGoalTitle", galloGoal.goalDetails.goal);
      handleFieldChange("galloGoalId", galloGoal.goalDetails.goalId);
    } else {
      console.warn("No matching account found for selected Gallo goal.");
    }
  };

  // Handler for Account Selection
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

    setPost((prevPost) => ({
      ...prevPost,
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
    setPost((prevPost) => ({
      ...prevPost,
      account: null,
      accountNumber: "",
      city: "",
      state: "",
    }));
    setSelectedCompanyAccount(null);
    setSelectedGalloGoalId(null);
    setSelectedCompanyGoal(undefined);
  };

  if (loadingAccounts) {
    return <CircularProgress />;
  }

  return (
    <div className="pick-store">
      {/* Header Controls */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mt={2}
        px={3}
        className="pick-store-navigation-buttons"
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
            disabled={!combinedAccounts?.length}
            sx={{
              maxWidth: 400,
              mx: "auto",
              my: 1,
              fontWeight: 600,
              fontSize: "1rem",
              backgroundColor: "#1976d2", // brighter blue
              color: "#fff",
              "&:hover": {
                backgroundColor: "#1565c0",
              },
            }}
          >
            Select Account
          </Button>
        )}
      </Box>
      {!post.account?.accountNumber && combinedAccounts.length > 0 && (
        <Box className="toggle-section" mt={3}>
          <Box className="toggle-wrapper" mt={2}>
            <Typography
              className={`toggle-label ${!isAllStoresShown ? "selected" : ""}`}
              onClick={() => setIsAllStoresShown(!isAllStoresShown)}
            >
              My Stores
            </Typography>

            <Typography
              className={`toggle-label ${isAllStoresShown ? "selected" : ""}`}
              onClick={() => setIsAllStoresShown(!isAllStoresShown)}
            >
              All Stores
            </Typography>
          </Box>
        </Box>
      )}

      {/* My Stores / All Stores Toggle */}

      {/* Account Selection */}
      <Box mt={2}>{loadingAccounts ? <CircularProgress /> : <Box></Box>}</Box>

      {/* Display Selected Store */}
      {post.account && (
        <Box mt={3} p={2} sx={{ border: "1px solid #ccc", borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            {/* {post.selectedStore} */}
            {post.account?.accountName}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {post.account.accountAddress}
          </Typography>
          {selectedCompanyGoal && (
            <Typography variant="body2" color="primary" mt={1}>
              Goal:{" "}
              {
                companyGoals.find((goal) => goal.id === selectedCompanyGoal.id)
                  ?.goalTitle
              }
            </Typography>
          )}
        </Box>
      )}

      {/* Goals Dropdowns inside of PickStore.tsx*/}
      {/* {post.selectedStore && ( */}
      {post.account && (
        <Box mt={3}>
          <Box mt={2}>
            <CompanyGoalDropdown
              goals={goalsForAccount}
              label="Company Goals"
              loading={isFetchingGoal}
              onSelect={handleCompanyGoalSelection}
              selectedGoal={selectedCompanyGoal}
            />
          </Box>

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

      {!combinedAccounts.length && nearbyStores.length > 0 && (
        <Box mt={3} p={2}>
          <Typography variant="h6">Nearby Stores (from Google Maps)</Typography>
          {nearbyStores.map((store) => (
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
                if (!store.placeId) return;
                fetchCityAndState(store.placeId, (city, state) => {
                  setPost((prev) => ({
                    ...prev,
                    account: {
                      accountName: store.name,
                      accountAddress: store.address,
                      city,
                      state,
                      accountNumber: "", // placeholder for Firestore later
                      typeOfAccount: "Unknown",
                    } as any,
                  }));
                  setSelectedCompanyAccount(null);
                  console.log("✅ Selected Google Store:", {
                    ...store,
                    city,
                    state,
                  });
                });
              }}
            >
              <Typography fontWeight="bold">{store.name}</Typography>
              <Typography variant="body2" color="textSecondary">
                {store.address}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {!combinedAccounts?.length && !manualAccountAdded && (
        <ManualAccountForm
          open={openManualAccountForm}
          onSave={handleAccountSelect}
        />
      )}

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
    </div>
  );
};
