// PickStore.tsx
import React, { useEffect, useState } from "react";
import {
  CompanyAccountType,
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
  MenuItem,
  Select,
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
import { fetchAllAccountsFromFirestore } from "../../utils/helperFunctions/fetchAllAcccountsFromFirestore";
import getCompanyAccountId from "../../utils/helperFunctions/getCompanyAccountId";
import { fetchGalloGoalsByCompanyId } from "../../utils/helperFunctions/fetchGalloGoalsByCompanyId";
import { getActiveGalloGoalsForAccount } from "../../utils/helperFunctions/getActiveGalloGoalsForAccount"; // this function looks useful also
import {
  getAllCompanyGoalsFromIndexedDB,
  getGalloGoalsFromIndexedDB,
  getUserAccountsFromIndexedDB,
  saveGoalsToIndexedDB,
} from "../../utils/database/indexedDBUtils";
import { fetchGalloGoalsForAccount } from "../../utils/helperFunctions/fetchGalloGoalsForAccount";
import { showMessage } from "../../Slices/snackbarSlice";
import TotalCaseCount from "../TotalCaseCount";
import { selectUser } from "../../Slices/userSlice";
import { setGalloGoals } from "../../Slices/goalsSlice";

interface PickStoreProps {
  onNext: () => void;
  onPrevious: () => void;
  handleFieldChange: (
    field: keyof PostType,
    value: PostType[keyof PostType]
  ) => void;
  post: PostType;
  setPost: React.Dispatch<React.SetStateAction<PostType>>;
  goals: FireStoreGalloGoalDocType[]; // Pass goals from Redux
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
  goals,
}) => {
  const [allAccountsForCompany, setAllAccountsForCompany] = useState<
    CompanyAccountType[]
  >([]);
  const [myAccounts, setMyAccounts] = useState<CompanyAccountType[]>([]);
  const [isAllStoresShown, setIsAllStoresShown] = useState(false); // Toggle State
  const [loadingAccounts, setLoadingAccounts] = useState(true); // Tracks loading status

  const dispatch = useAppDispatch();
  const [isMapMode, setIsMapMode] = useState(false); // Toggle between dropdown and map
  // const [goalForAccount, setGoalForAccount] =
  //   useState<FireStoreGalloGoalDocType | null>(null);
  const [isFetchingGoal, setIsFetchingGoal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const userRole = useSelector(selectUser)?.role;
  const isAdmin = userRole === "admin" || userRole === "super-admin";
  // const isEmployee = userRole === "employee";
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const [allCompanyGoals, setAllCompanyGoals] = useState<
    FireStoreGalloGoalDocType[]
  >([]);
  const [selectedStoreByAddress, setSelectedStoreByAddress] = useState<{
    name: string;
    address: string;
    city: string;
    state: string;
  } | null>(null);

  // const [selectedCompanyAccount, setSelectedCompanyAccount] =
  //   useState<CompanyAccountType | null>(null);

  const [isMatchSelectionOpen, setIsMatchSelectionOpen] = useState(false);
  const [goalMetric, setGoalMetric] = useState<"cases" | "bottles">("cases");
  const activeGoals = getActiveGalloGoalsForAccount(post.accountNumber, goals);
  const [isFetchingGoals, setIsFetchingGoals] = useState(false);
  const [closestMatches, setClosestMatches] = useState<CompanyAccountType[]>(
    []
  );
  const [accountsToSelect, setAccountsToSelect] =
    useState<CompanyAccountType[]>();

  // Fetch "My Stores"
  // if this doesnt load any accounts from indexedDb it should fetch them
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

  // Fetch All Company Accounts if toggled
  useEffect(() => {
    if (isAllStoresShown) {
      const loadAllCompanyAccounts = async () => {
        setLoadingAccounts(true);
        try {
          const accounts = await fetchAllCompanyAccounts();
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

  // this gets the all of the accounts for the users company
  const fetchAllCompanyAccounts = async () => {
    // this gets all of the users companys accounts
    if (!companyId) {
      console.error("No company ID provided.");
      return [];
    }

    const accountsId = await getCompanyAccountId(companyId);
    if (!accountsId) {
      console.error("No accounts ID found for the company");
      return [];
    }

    const accounts = await fetchAllAccountsFromFirestore(accountsId);
    return accounts;
  };

  // this useEffect is for making sure the company goals are available for matching to a selected account
  useEffect(() => {
    if (isAdmin) {
      const loadAllCompanyGoals = async () => {
        try {
          const savedGoals = await getAllCompanyGoalsFromIndexedDB();
          if (savedGoals.length > 0) {
            setAllCompanyGoals(savedGoals); // why are we saving these in state?  they are in indexedDB at least they should be.  we should check if they are in indexedDb first if not then fetch
          } else if (companyId) {
            const fetchedGoals = await fetchGalloGoalsByCompanyId(companyId);
            setAllCompanyGoals(fetchedGoals);
          }
        } catch (error) {
          console.error("Error loading all company goals:", error);
        }
      };
      loadAllCompanyGoals();
    }
  }, [isAdmin, companyId, dispatch]);

  // i think this useEffect is responsible for making the relevant goals available for choosing to a selected account once accountId is
  useEffect(() => {
    const fetchAndSetGoals = async () => {
      if (post.accountNumber) {
        setIsFetchingGoals(true);
        try {
          const savedGoals = await getGalloGoalsFromIndexedDB();
          const matchingGoals = savedGoals.filter((goal) =>
            goal.accounts.some(
              (acc) =>
                acc.distributorAcctId.toString() ===
                post.accountNumber?.toString()
            )
          );

          if (matchingGoals.length > 0) {
            dispatch(setGalloGoals(matchingGoals));
          } else if (companyId) {
            const fetchedGoals = await fetchGalloGoalsForAccount(
              post.accountNumber,
              companyId
            );
            dispatch(setGalloGoals(fetchedGoals));
            await saveGoalsToIndexedDB(fetchedGoals);
          }
        } catch (error) {
          console.error("Error fetching goals for account:", error);
          dispatch(showMessage("Failed to load goals for this account."));
        } finally {
          setIsFetchingGoals(false);
        }
      }
    };
    fetchAndSetGoals();
  }, [post.accountNumber, companyId, dispatch]);

  // does this do the same thing as the useEffect above?
  const handleFetchGoal = async () => {
    setIsFetchingGoal(true);
    try {
      if (!post.accountNumber) {
        console.warn("No accountNumber provided in the post.");
        return;
      }

      const savedGoals = await getGalloGoalsFromIndexedDB();

      // Find matching goals from IndexedDB
      const matchingGoals = savedGoals.filter((goal) =>
        goal.accounts.some(
          (acc) =>
            acc.distributorAcctId.toString() === post.accountNumber?.toString()
        )
      );

      console.log(matchingGoals);

      if (matchingGoals.length > 0) {
        setGalloGoals(matchingGoals);
      } else if (companyId) {
        // Fetch goals from Firestore if no matches in IndexedDB
        const fetchedGoals = await fetchGalloGoalsForAccount(
          post.accountNumber,
          companyId
        );

        // Filter fetched goals for the current accountNumber
        const filteredFetchedGoals = fetchedGoals.filter((goal) =>
          goal.accounts.some(
            (acc) =>
              acc.distributorAcctId.toString() ===
              post.accountNumber?.toString()
          )
        );

        if (filteredFetchedGoals.length > 0) {
          setGalloGoals(filteredFetchedGoals);
          await saveGoalsToIndexedDB(fetchedGoals);
        } else {
          console.warn("No matching goals found for this account.");
        }
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
      dispatch(showMessage("An error occurred while fetching goals."));
    } finally {
      setIsFetchingGoal(false);
    }
  };

  useEffect(() => {
    // Trigger account matching when `selectedStoreByAddress` changes
    if (selectedStoreByAddress && isAdmin) {
      console.log("Triggering account match for:", selectedStoreByAddress);
      if (accountsToSelect && accountsToSelect.length > 0) {
        matchAccountWithSelectedStoreForAdmin(
          selectedStoreByAddress,
          accountsToSelect
        );
      } else {
        console.warn("No company accounts found for matching.");
      }
    }
  }, [selectedStoreByAddress, isAdmin, accountsToSelect]);

  // this function should convert a selectedStore by address into a companyAccount
  const normalizeString = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "") // Remove non-alphanumeric characters
      .replace(/\b(s|n|e|w)\b/g, (match) => {
        const directions: { [key: string]: string } = {
          s: "south",
          n: "north",
          e: "east",
          w: "west",
        };
        return directions[match];
      })
      .replace(/\b(se|ne|nw|sw)\b/g, (match) => {
        const expanded: { [key: string]: string } = {
          se: "southeast",
          ne: "northeast",
          nw: "northwest",
          sw: "southwest",
        };
        return expanded[match];
      })
      .replace(/\broad\b/g, "rd")
      .replace(/\bstreet\b/g, "st")
      .replace(/\bavenue\b/g, "ave")
      .replace(/\bboulevard\b/g, "blvd")
      .replace(/\bdrive\b/g, "dr")
      .replace(/\blane\b/g, "ln")
      .replace(/\bparkway\b/g, "pkwy")
      .replace(/\bplace\b/g, "pl")
      .replace(/\bcourt\b/g, "ct")
      .replace(/\s+/g, ""); // Remove spaces
  
      const matchAccountWithSelectedStoreForAdmin = (
        selectedStoreByAddress: {
          name: string;
          address: string;
          city: string;
          state: string;
        },
        accounts: CompanyAccountType[]
      ) => {
        console.log("Matching store to accounts:", selectedStoreByAddress);
      
        // Normalize and truncate the selected store details
        const normalizedAddress = normalizeString(selectedStoreByAddress.address).substring(0, 10);
        const normalizedName = normalizeString(selectedStoreByAddress.name).substring(0, 10);
      
        console.log("Normalized Address (10):", normalizedAddress);
        console.log("Normalized Name (10):", normalizedName);
      
        // Find a perfect match
        const perfectMatch = accounts.find((account) => {
          const normalizedAccountAddress = normalizeString(account.accountAddress).substring(0, 10);
          const normalizedAccountName = normalizeString(account.accountName).substring(0, 10);
      
          return (
            normalizedAccountAddress === normalizedAddress &&
            normalizedAccountName === normalizedName
          );
        });
      
        if (perfectMatch) {
          console.log("Perfect match found:", perfectMatch);
          setPost((prev) => ({
            ...prev,
            accountNumber: perfectMatch.accountNumber.toString(),
            selectedStore: perfectMatch.accountName,
            storeAddress: perfectMatch.accountAddress,
          }));
          return; // Exit early since we found a perfect match
        }
      
        console.warn("No perfect match found. Finding closest matches...");
      
        // Find the closest matches
        const topClosestMatches = accounts
          .map((account) => {
            const normalizedAccountAddress = normalizeString(account.accountAddress).substring(0, 10);
            const addressSimilarity =
              normalizedAccountAddress === normalizedAddress ? 1 : 0;
      
            return { account, addressSimilarity };
          })
          .filter(({ addressSimilarity }) => addressSimilarity > 0)
          .sort((a, b) => b.addressSimilarity - a.addressSimilarity)
          .map(({ account }) => account);
      
        if (topClosestMatches.length === 1) {
          // Auto-select the only closest match
          const closestMatch = topClosestMatches[0];
          console.log("Auto-selecting the only closest match:", closestMatch);
          setPost((prev) => ({
            ...prev,
            accountNumber: closestMatch.accountNumber.toString(),
            selectedStore: closestMatch.accountName,
            storeAddress: closestMatch.accountAddress,
          }));
        } else if (topClosestMatches.length > 0) {
          console.log("Multiple closest matches found:", topClosestMatches);
          setClosestMatches(topClosestMatches);
          setIsMatchSelectionOpen(true); // Open modal for user selection
        } else {
          console.warn("No close matches found.");
          dispatch(showMessage("No match found in your accounts. Try toggling 'All Stores' to search all company accounts."));
        }
      };
      

  useEffect(() => {
    if (goals.length > 0) {
      const activeGoals = getActiveGalloGoalsForAccount(post.accountNumber, goals);
      if (activeGoals.length > 0) {
        const metric = activeGoals[0].goalDetails.goalMetric;
        if (metric === "cases" || metric === "bottles") {
          setGoalMetric(metric); // Only set if it matches the allowed types
        } else {
          setGoalMetric("cases"); // Fallback to a default value
        }
      }
    }
  }, [goals, post.accountNumber]);

  // once a regular user selects an account this would load or fetch goals
  useEffect(() => {
    // Fetch goals once `post.accountNumber` is updated
    if (post.accountNumber) {
      console.log("Fetching goals for account:", post.accountNumber);
      handleFetchGoal();
    }
  }, [post.accountNumber]);

  const handleGoalSelection = (goalId: string) => {
    setSelectedGoalId(goalId);

    // Find the selected goal by goalId
    const selectedGoal = goals.find(
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
      } else {
        console.warn(
          "No matching account found in the selected goal's accounts."
        );
      }
    }
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

  // const handleTotalCaseCountChange = (count: number) => {
  //   // unused?
  //   // theres a warning here saying this function isnt used
  //   // declared but never read
  //   handleFieldChange("closedUnits", count); // Update the post state with the total case count
  // };

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
      searchGoalsForAccount(account.accountNumber);
    }
  };

  const searchGoalsForAccount = async (accountNumber: string) => {
    setIsFetchingGoals(true);

    try {
      // Ensure accountNumber is provided
      if (!accountNumber) {
        console.warn("Account number is required for searching goals.");
        return;
      }

      // Search for matching goals
      const matchingGoals = allCompanyGoals.filter((goal) =>
        goal.accounts.some(
          (acc) => acc.distributorAcctId.toString() === accountNumber.toString()
        )
      );

      if (matchingGoals.length > 0) {
        console.log("Matching goals found:", matchingGoals);
        dispatch(setGalloGoals(matchingGoals));
      } else {
        console.warn(
          "No matching goals found in allCompanyGoals. Attempting to fetch from Firestore..."
        );
        if (companyId) {
          const fetchedGoals = await fetchGalloGoalsByCompanyId(companyId);
          setAllCompanyGoals(fetchedGoals); // Update local state and IndexedDB
          const fallbackGoals = fetchedGoals.filter((goal) =>
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
      setIsFetchingGoals(false);
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
      >
        <Button variant="contained" color="primary" onClick={onPrevious}>
          Back
        </Button>
        <Box display="flex" alignItems="center">
          <Typography>Dropdown</Typography>
          <Switch
            checked={isMapMode}
            onChange={() => setIsMapMode(!isMapMode)}
            sx={{ mx: 1 }}
          />
          <Typography>Map</Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={onNext}
          disabled={!post.selectedStore}
        >
          Next
        </Button>
      </Box>

      <Box>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexDirection="column"
          mb={2}
        >
          <Box display="flex" alignItems="center">
            <Typography>My Stores</Typography>
            <Switch
              checked={isAllStoresShown}
              onChange={() => setIsAllStoresShown(!isAllStoresShown)}
              inputProps={{ "aria-label": "toggle all stores" }}
            />
            <Typography>All Stores</Typography>
          </Box>
        </Box>

        {loadingAccounts ? (
          <CircularProgress />
        ) : (
          <AccountDropdown
            onAccountSelect={handleAccountSelect}
            accounts={accountsToSelect} // Toggle Logic
          />
        )}
      </Box>
      <Typography variant="h5" fontWeight="bold">
        {post.selectedStore}
      </Typography>
      <Typography variant="h6" fontWeight="bold">
        {post.storeAddress}
      </Typography>

      {/* Account Dropdown */}
      <Box mt={2}>
        {isMapMode && (
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
        )}
      </Box>

      {/* Selected Store and Goals */}
      {post.selectedStore && (
        <>
          <Box mt={2}>
            {/* Render Selected Goal */}
            {selectedGoalId && (
              <Typography mt={1} variant="body1" color="textSecondary">
                Selected Goal:{" "}
                {activeGoals.find(
                  (goal) => goal.goalDetails.goalId === selectedGoalId
                )?.goalDetails.goal || "N/A"}
              </Typography>
            )}
          </Box>

          {/* Goals Dropdown */}
          <Box mt={2}>
            {isFetchingGoals && <CircularProgress />}
            {!isFetchingGoals && activeGoals.length > 0 && (
              <Typography>{`${activeGoals.length} goals available for this account.`}</Typography>
            )}
            {/* {!isFetchingGoals && activeGoals.length === 0 && (
              <Typography>No Gallo goals for this account.</Typography>
            )} */}
          </Box>

          <Box mt={2}>
            {isFetchingGoal ? (
              <CircularProgress />
            ) : (
              <Select
                fullWidth
                variant="outlined"
                value={selectedGoalId || "no-goal"}
                onChange={(e) => handleGoalSelection(e.target.value)}
              >
                <MenuItem value="no-goal">
                  No Gallo goals for this account
                </MenuItem>
                {activeGoals.map((goal) => (
                  <MenuItem
                    key={goal.goalDetails.goalId}
                    value={goal.goalDetails.goalId}
                  >
                    {goal.goalDetails.goal}
                  </MenuItem>
                ))}
              </Select>
            )}
          </Box>

          {/* Total Case Count */}
          <Typography
            variant="h6"
            mt={3}
          >{`Total ${goalMetric} count`}</Typography>
          <TotalCaseCount
            handleTotalCaseCountChange={(count) =>
              handleFieldChange("closedUnits", count)
            }
          />
        </>
      )}

      {/* Map */}
      {/* <Box mt={3}>
        {isMapMode && (
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
        )}
      </Box> */}

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
