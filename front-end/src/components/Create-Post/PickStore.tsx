// PickStore.tsx
import React, { useEffect, useState } from "react";
import {
  CompanyAccountType,
  CompanyGoalType,
  FireStoreGalloGoalDocType,
  PostType,
} from "../../utils/types";
import StoreLocator from "./StoreLocator";
import AccountDropdown from "./AccountDropDown";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../utils/store";
import {
  Box,
  CircularProgress,
  Switch,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  DialogActions,
  ListItemText,
  ListItemButton,
  // ListItemIcon,
  Checkbox,
} from "@mui/material";
import { fetchGalloGoalsByCompanyId } from "../../utils/helperFunctions/fetchGalloGoalsByCompanyId";
import { getActiveGalloGoalsForAccount } from "../../utils/helperFunctions/getActiveGalloGoalsForAccount"; // this function looks useful also
import { getUserAccountsFromIndexedDB } from "../../utils/database/indexedDBUtils";
import { selectUser } from "../../Slices/userSlice";
import {
  selectAllCompanyGoals,
  selectAllGalloGoals,
  setGalloGoals,
} from "../../Slices/goalsSlice";
import { fetchAllCompanyAccounts } from "../../utils/helperFunctions/fetchAllCompanyAccounts";
import { getActiveCompanyGoalsForAccount } from "../../utils/helperFunctions/getActiveCompanyGoalsForAccount";
import { matchAccountWithSelectedStoreForAdmin } from "../../utils/helperFunctions/accountHelpers";
import GalloGoalDropdown from "./GalloGoalDropdown";
import CompanyGoalDropdown from "./CompanyGoalDropdown";
import "./pickstore.css";
import { isMap } from "util/types";

interface PickStoreProps {
  onNext: () => void;
  onPrevious: () => void;
  handleFieldChange: (
    field: keyof PostType,
    value: PostType[keyof PostType]
  ) => void;
  post: PostType;
  setPost: React.Dispatch<React.SetStateAction<PostType>>;
  usersGalloGoals: FireStoreGalloGoalDocType[]; // Pass goals from Redux
  usersCompanyGoals: CompanyGoalType[]; // Pass goals from Redux
  onStoreNameChange: (storeName: string) => void;
  onStoreNumberChange: (newStoreNumber: string) => void;
  onStoreAddressChange: (address: string) => void;
  onStoreCityChange: (city: string) => void;
  onStoreStateChange: (newStoreState: string) => void;
}

export const PickStore: React.FC<PickStoreProps> = ({
  onNext,
  onPrevious,
  handleFieldChange,
  post,
  setPost,
  usersGalloGoals,
  usersCompanyGoals,
}) => {
  const [allAccountsForCompany, setAllAccountsForCompany] = useState<
    CompanyAccountType[]
  >([]);
  const [myAccounts, setMyAccounts] = useState<CompanyAccountType[]>([]);
  const [isAllStoresShown, setIsAllStoresShown] = useState(false); // Toggle State
  const [loadingAccounts, setLoadingAccounts] = useState(true); // Tracks loading status
  const [accountsToSelect, setAccountsToSelect] =
    useState<CompanyAccountType[]>();
  const dispatch = useAppDispatch();
  const [isMapMode, setIsMapMode] = useState(false); // Toggle between dropdown and map
  // const [goalForAccount, setGoalForAccount] =
  //   useState<FireStoreGalloGoalDocType | null>(null);
  const [isFetchingGoal, setIsFetchingGoal] = useState(false);
  const [selectedGalloGoalId, setSelectedGalloGoalId] = useState<string | null>(
    null
  );
  const [selectedCompanyGoal, setSelectedCompanyGoal] =
    useState<CompanyGoalType>();
  const userRole = useSelector(selectUser)?.role;
  const isAdmin = userRole === "admin" || userRole === "super-admin";
  // const isEmployee = userRole === "employee";
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );

  // these next two only need to be selected if a user is selecting all accounts and needs access to the entire company goal list or gallo goal list
  const allGalloGoals = useSelector(selectAllGalloGoals);
  const allCompanyGoals = useSelector(selectAllCompanyGoals);
  console.log("all company goals: ", allCompanyGoals);

  // this is used if a user is trying to select an account by address using the map
  const [selectedStoreByAddress, setSelectedStoreByAddress] = useState<{
    name: string;
    address: string;
    city: string;
    state: string;
  } | null>(null);

  // const [selectedCompanyAccount, setSelectedCompanyAccount] =
  //   useState<CompanyAccountType | null>(null);

  const [isMatchSelectionOpen, setIsMatchSelectionOpen] = useState(false);

  // filtering by account number function:  these return current goals for selection.  a mode might be helpful for switching to the desired set.
  const usersActiveGalloGoals = getActiveGalloGoalsForAccount(
    post.accountNumber,
    usersGalloGoals
  );
  const usersActiveCompanyGoals = getActiveCompanyGoalsForAccount(
    post.accountNumber,
    usersCompanyGoals
  );
  const allActiveGalloGoals = getActiveGalloGoalsForAccount(
    post.accountNumber,
    allGalloGoals
  );
  const allActiveCompanyGoals = getActiveCompanyGoalsForAccount(
    post.accountNumber,
    allCompanyGoals
  );

  const [closestMatches, setClosestMatches] = useState<CompanyAccountType[]>(
    []
  );

  const onlyUsersStores = !isAllStoresShown;

  const galloGoals = onlyUsersStores
    ? usersActiveGalloGoals
    : allActiveGalloGoals;
  const companyGoals = onlyUsersStores
    ? usersActiveCompanyGoals
    : allActiveCompanyGoals;

  // load users accounts
  useEffect(() => {
    const loadMyAccounts = async () => {
      setLoadingAccounts(true); // Start loading
      try {
        // Fetch User-Specific Accounts (My Stores)
        const userAccounts = await getUserAccountsFromIndexedDB();
        if (userAccounts.length > 0) {
          setMyAccounts(userAccounts);
          console.log("My Stores fetched:", userAccounts);
        } else {
          // fetch this users accounts
        }
      } catch (error) {
        console.error("Error loading users accounts:", error);
      } finally {
        setLoadingAccounts(false); // End loading
      }
    };

    loadMyAccounts();
  }, [companyId]);

  // load all company accounts
  useEffect(() => {
    if (isAllStoresShown) {
      const loadAllCompanyAccounts = async () => {
        setLoadingAccounts(true);
        try {
          const accounts = await fetchAllCompanyAccounts(companyId);
          setAllAccountsForCompany(accounts);
          setAccountsToSelect(accounts); // Set accounts to select
        } catch (error) {
          console.error("Error fetching all company accounts:", error);
        } finally {
          setLoadingAccounts(false);
        }
      };

      loadAllCompanyAccounts();
    } else {
      // If toggled back to "My Stores", reset accounts
      setAccountsToSelect(myAccounts);
    }
  }, [isAllStoresShown, companyId, myAccounts]);

  // this matches a selectedAddress from the map to an actual account from firestore i think
  useEffect(() => {
    // Trigger account matching when `selectedStoreByAddress` changes
    if (selectedStoreByAddress) {
      console.log("Triggering account match for:", selectedStoreByAddress);
      if (accountsToSelect && accountsToSelect.length > 0) {
        matchAccountWithSelectedStoreForAdmin(
          selectedStoreByAddress,
          accountsToSelect,
          setPost,
          setClosestMatches,
          setIsMatchSelectionOpen,
          dispatch
        );
      } else {
        console.warn("No company accounts found for matching.");
      }
    }
  }, [selectedStoreByAddress, accountsToSelect]);

  // once a regular user selects an account this would load or fetch goals
  // gallo goals and company goals are already available though.  they just need to be filtered to the account number which i believe is covered in the filtering by account number functions
  useEffect(() => {
    // how will the application after getting an accountNumber find the correct goals for this account?  gallo goals and company goals?  is it already doing so?
  }, [post.accountNumber]);

  const handleGalloGoalSelection = (goalId: string) => {
    setSelectedGalloGoalId(goalId);

    // Find the selected goal by goalId
    const selectedGoal = galloGoals.find(
      (goal) => goal.goalDetails.goalId === goalId
    );

    if (selectedGoal) {
      console.log("selectedGoal: ", selectedGoal);

      // Find the matched account within the selected goal's accounts
      const matchedAccount = selectedGoal.accounts.find(
        (account) =>
          account.distributorAcctId.toString() ===
          post.accountNumber?.toString()
      );

      if (matchedAccount) {
        // Use the oppId from the matched account
        handleFieldChange("oppId", matchedAccount.oppId);
        handleFieldChange(
          "galloGoalDescription",
          selectedGoal.goalDetails.goal
        );
      } else {
        console.warn(
          "No matching account found in the selected goal's accounts."
        );
      }
    }
  };

  const handleCompanyGoalSelection = (goal: CompanyGoalType | undefined) => {
    if (!goal) {
      console.warn("No goal selected.");
      return;
    }

    setSelectedCompanyGoal(goal); // Update state with the selected goal object
    handleFieldChange("companyGoalId", goal.id); // Set the goal ID
    handleFieldChange("companyGoalDescription", goal.goalDescription); // Set the goal description
  };

  // Handler for Account Selection
  const handleAccountSelect = (account: CompanyAccountType) => {
    setPost({
      ...post,
      selectedStore: account.accountName,
      storeAddress: account.accountAddress,
      accountNumber: account.accountNumber,
    });
  };

  const handleSelectClosestMatch = (account: CompanyAccountType) => {
    setPost((prev) => ({
      ...prev,
      accountNumber: account.accountNumber,
      storeAddress: account.accountAddress,
      selectedStore: account.accountName,
    }));
    setIsMatchSelectionOpen(false); // Close the modal

    // Trigger goal search after updating the post state
    if (isAdmin) {
      searchGalloGoalsForAccount(account.accountNumber);
    }
  };

  const handleClearAccount = () => {
    setPost({
      ...post,
      selectedStore: "",
      storeAddress: "",
      accountNumber: "",
    });
    setSelectedGalloGoalId(null);
    setSelectedCompanyGoal(undefined);
  };

  // this function is called when we find an account and its account number via the map process i believe
  // we have an account number and need to find it on the array of goals in the all gallo goals array
  const searchGalloGoalsForAccount = async (accountNumber: string) => {
    setIsFetchingGoal(true);

    try {
      // Ensure accountNumber is provided
      if (!accountNumber) {
        console.warn("Account number is required for searching goals.");
        return;
      }

      // Search for matching goals
      const matchingGalloGoals = allGalloGoals.filter((goal) =>
        goal.accounts.some(
          (acc) => acc.distributorAcctId.toString() === accountNumber.toString()
        )
      );

      if (matchingGalloGoals.length > 0) {
        console.log("Matching goals found:", matchingGalloGoals);
        dispatch(setGalloGoals(matchingGalloGoals));
      } else {
        console.warn(
          "No matching goals found in allGalloGoals. Attempting to fetch from Firestore..."
        );
        if (companyId) {
          const fetchedGalloGoals = await fetchGalloGoalsByCompanyId(companyId);
          setGalloGoals(fetchedGalloGoals); // Update local state and IndexedDB
          const fallbackGoals = fetchedGalloGoals.filter((goal) =>
            goal.accounts.some(
              (acc) =>
                acc.distributorAcctId.toString() === accountNumber.toString()
            )
          );

          if (fallbackGoals.length > 0) {
            console.log("Fallback matching goals found:", fallbackGoals);
            dispatch(setGalloGoals(fallbackGoals));
          } else {
            console.warn("No goals found for the account in Firestore either.");
          }
        } else {
          console.error(
            "Company ID is missing. Cannot fetch goals from Firestore."
          );
        }
      }
    } catch (error) {
      console.error("Error searching for goals for account:", error);
    } finally {
      setIsFetchingGoal(false);
    }
  };

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
        <Button
          variant="contained"
          color="primary"
          onClick={onPrevious}
          sx={{ minWidth: "80px" }}
        >
          Back
        </Button>

        {post.selectedStore && (
          <Button
            variant="contained"
            color="secondary"
            onClick={handleClearAccount}
            sx={{ minWidth: "80px" }}
          >
            Clear
          </Button>
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={onNext}
          disabled={!post.selectedStore}
          sx={{ minWidth: "80px" }}
        >
          Next
        </Button>
      </Box>

      {/* Toggle Section */}
      {/* Dropdown / Map Toggle */}
      {!post.accountNumber && (
        <Box className="toggle-section" mt={3}>
          <Box className="toggle-wrapper">
            <Typography
              className={`toggle-label ${!isMapMode ? "selected" : ""}`}
              onClick={() => setIsMapMode(!isMapMode)}
            >
              Dropdown
            </Typography>
            {/* <Switch
           checked={isMapMode}
           onChange={() => setIsMapMode(!isMapMode)}
           className="toggle-switch"
         /> */}
            <Typography
              className={`toggle-label ${isMapMode ? "selected" : ""}`}
              onClick={() => setIsMapMode(!isMapMode)}
            >
              Map
            </Typography>
          </Box>
          <Box className="toggle-wrapper" mt={2}>
            <Typography
              className={`toggle-label ${!isAllStoresShown ? "selected" : ""}`}
              onClick={() => setIsAllStoresShown(!isMapMode)}
            >
              My Stores
            </Typography>
            {/* <Switch
          checked={isAllStoresShown}
          onChange={() => setIsAllStoresShown(!isAllStoresShown)}
          className="toggle-switch"
        /> */}
            <Typography
              className={`toggle-label ${isAllStoresShown ? "selected" : ""}`}
              onClick={() => setIsAllStoresShown(!isMapMode)}
            >
              All Stores
            </Typography>
          </Box>
        </Box>
      )}

      {/* My Stores / All Stores Toggle */}

      {/* Account Selection */}
      <Box mt={2}>
        {loadingAccounts ? (
          <CircularProgress />
        ) : (
          <Box>
            <AccountDropdown
              onAccountSelect={handleAccountSelect}
              accounts={accountsToSelect}
            />
          </Box>
        )}
      </Box>

      {/* Display Selected Store */}
      {post.selectedStore && (
        <Box mt={3} p={2} sx={{ border: "1px solid #ccc", borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            {post.selectedStore}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {post.storeAddress}
          </Typography>
          {selectedCompanyGoal && (
            <Typography variant="body2" color="primary" mt={1}>
              Selected Goal:{" "}
              {
                companyGoals.find((goal) => goal.id === selectedCompanyGoal.id)
                  ?.goalDescription
              }
            </Typography>
          )}
        </Box>
      )}

      {/* Map Mode */}
      {isMapMode && (
        <Box mt={2}>
          <StoreLocator
            onStoreSelect={(store) => {
              setSelectedStoreByAddress({
                name: store.name,
                address: store.address,
                city: store.city || "",
                state: store.state || "",
              });
            }}
          />
        </Box>
      )}

      {/* Goals Dropdowns */}
      {post.selectedStore && (
        <Box mt={3}>
          <GalloGoalDropdown
            goals={galloGoals}
            label="Gallo Goals"
            loading={isFetchingGoal}
            onSelect={handleGalloGoalSelection}
            selectedGoal={selectedGalloGoalId}
          />
          <Box mt={2}>
            <CompanyGoalDropdown
              goals={companyGoals}
              label="Company Goal"
              loading={isFetchingGoal}
              onSelect={handleCompanyGoalSelection}
              selectedGoal={selectedCompanyGoal}
            />
          </Box>
        </Box>
      )}

      {/* Match Selection Dialog */}
      <Dialog
        open={isMatchSelectionOpen}
        onClose={() => setIsMatchSelectionOpen(false)}
      >
        <DialogTitle>
          Select a company account that matches the address
        </DialogTitle>
        <DialogContent>
          <List>
            {closestMatches.map((account) => (
              <ListItem key={account.accountNumber} disablePadding>
                <ListItemButton
                  onClick={() => handleSelectClosestMatch(account)}
                >
                  <Checkbox />
                  <ListItemText
                    primary={account.accountName}
                    secondary={account.accountAddress}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsMatchSelectionOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
