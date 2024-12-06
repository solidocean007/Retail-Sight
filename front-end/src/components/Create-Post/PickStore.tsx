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
  ListItemIcon,
  Checkbox,
} from "@mui/material";
import { fetchAllAccountsFromFirestore } from "../../utils/helperFunctions/fetchAllAcccountsFromFirestore";
import getCompanyAccountId from "../../utils/helperFunctions/getCompanyAccountId";
import { fetchGoalsByCompanyId } from "../../utils/helperFunctions/fetchGoalsByCompanyId";
import { getActiveGoalsForAccount } from "../../utils/helperFunctions/getActiveGoalsForAccount"; // this function looks useful also
import {
  getAllCompanyGoalsFromIndexedDB,
  getGoalsFromIndexedDB,
  saveGoalsToIndexedDB,
} from "../../utils/database/indexedDBUtils";
import { fetchGoalsForAccount } from "../../utils/helperFunctions/fetchGoalsForAccount";
import { showMessage } from "../../Slices/snackbarSlice";
import TotalCaseCount from "../TotalCaseCount";
import { selectUser } from "../../Slices/userSlice";
import { setGoals } from "../../Slices/goalsSlice";

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
  onStoreNameChange, // not used now?
  onStoreNumberChange, // not used now?
  onStoreAddressChange, // not used now?
  onStoreCityChange, // not used now?
  onStoreStateChange, // not used now?
}) => {
  const dispatch = useAppDispatch();
  const [isMapMode, setIsMapMode] = useState(false); // Toggle between dropdown and map
  const [goalForAccount, setGoalForAccount] =
    useState<FireStoreGalloGoalDocType | null>(null);
  const [isFetchingGoal, setIsFetchingGoal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const userRole = useSelector(selectUser)?.role;
  const isAdmin = userRole === "admin" || userRole === "super-admin";
  const isEmployee = userRole === "employee";
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

  const [selectedCompanyAccount, setSelectedCompanyAccount] = useState<CompanyAccountType | null>(null);

  const [isMatchSelectionOpen, setIsMatchSelectionOpen] = useState(false);
  const [goalMetric, setGoalMetric] = useState<"cases" | "bottles">("cases");
  const activeGoals = getActiveGoalsForAccount(post.accountNumber, goals);
  const [isFetchingGoals, setIsFetchingGoals] = useState(false);
  const [closestMatches, setClosestMatches] = useState<CompanyAccountType[]>(
    []
  );
  const [allAccounts, setAllAccounts] = useState<CompanyAccountType[]>();

  // console.log(activeGoals); // this logs empty. it has to get set
  // console.log(post);

  // useEffect(() => {
  //   if (selectedStore) {
  //     setPost((prev) => ({
  //       ...prev,
  //       selectedStore: selectedStore.name,
  //       storeAddress: selectedStore.address,
  //       // storeCity: selectedStore.city,
  //       // storeState: selectedStore.state,
  //     }));
  //   }
  // }, [selectedStore, setPost]);

  // this useEffect is for making sure the company goals are available for matching to a selected account
  useEffect(() => {
    if (isAdmin) {
      const loadAllCompanyGoals = async () => {
        try {
          const savedGoals = await getAllCompanyGoalsFromIndexedDB();
          if (savedGoals.length > 0) {
            setAllCompanyGoals(savedGoals); // why are we saving these in state?  they are in indexedDB at least they should be.  we should check if they are in indexedDb first if not then fetch
          } else if (companyId) {
            const fetchedGoals = await fetchGoalsByCompanyId(companyId);
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
          const savedGoals = await getGoalsFromIndexedDB();
          const matchingGoals = savedGoals.filter((goal) =>
            goal.accounts.some(
              (acc) =>
                acc.distributorAcctId.toString() ===
                post.accountNumber?.toString()
            )
          );

          if (matchingGoals.length > 0) {
            dispatch(setGoals(matchingGoals));
          } else if (companyId) {
            const fetchedGoals = await fetchGoalsForAccount(
              post.accountNumber,
              companyId
            );
            dispatch(setGoals(fetchedGoals));
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

      const savedGoals = await getGoalsFromIndexedDB();

      // Find matching goals from IndexedDB
      const matchingGoals = savedGoals.filter((goal) =>
        goal.accounts.some(
          (acc) =>
            acc.distributorAcctId.toString() === post.accountNumber?.toString()
        )
      );

      console.log(matchingGoals);

      if (matchingGoals.length > 0) {
        setGoals(matchingGoals);
      } else if (companyId) {
        // Fetch goals from Firestore if no matches in IndexedDB
        const fetchedGoals = await fetchGoalsForAccount(
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
          setGoals(filteredFetchedGoals);
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
      if (allAccounts && allAccounts.length > 0) {
        matchAccountWithSelectedStoreForAdmin(selectedStoreByAddress, allAccounts);
      } else {
        console.warn("No company accounts found for matching.");
      }
    }
  }, [selectedStoreByAddress, isAdmin, allAccounts]);


  // this function should convert a selectedStore by address into a companyAccount
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
    
    // Normalize the selected store details
    const normalizedAddress = selectedStoreByAddress.address
      .toLowerCase()
      .replace(/\s/g, "")
      .substring(0, 10);
    const normalizedName = selectedStoreByAddress.name
      .toLowerCase()
      .replace(/\s/g, "")
      .substring(0, 5);
  
    console.log("Normalized Address:", normalizedAddress);
    console.log("Normalized Name:", normalizedName);
  
    // Find a perfect match
    const perfectMatch = accounts.find((account) => {
      const normalizedAccountAddress = account.accountAddress
        .toLowerCase()
        .replace(/\s/g, "")
        .substring(0, 10);
      const normalizedAccountName = account.accountName
        .toLowerCase()
        .replace(/\s/g, "")
        .substring(0, 5);
  
      console.log(
        `Comparing Account: ${account.accountName} | Address: ${account.accountAddress}`
      );
      console.log(
        `Normalized Account Address: ${normalizedAccountAddress} | Normalized Account Name: ${normalizedAccountName}`
      );
  
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
    } else {
      console.warn("No perfect match found. Finding closest matches...");
      
      // Find the closest matches
      const topClosestMatches = accounts
        .map((account) => {
          const normalizedAccountAddress = account.accountAddress
            .toLowerCase()
            .replace(/\s/g, "")
            .substring(0, 10);
          const addressSimilarity =
            normalizedAccountAddress === normalizedAddress ? 1 : 0;
  
          console.log(
            `Address Similarity for Account: ${account.accountName} | Address: ${account.accountAddress} = ${addressSimilarity}`
          );
  
          return { account, addressSimilarity };
        })
        .filter(({ addressSimilarity }) => addressSimilarity > 0)
        .sort((a, b) => b.addressSimilarity - a.addressSimilarity)
        .slice(0, 3)
        .map(({ account }) => account);
  
      if (topClosestMatches.length > 0) {
        console.log("Closest matches found:", topClosestMatches);
        setClosestMatches(topClosestMatches);
        setIsMatchSelectionOpen(true);
      } else {
        console.warn("No close matches found.");
      }
    }
  };
  


  useEffect(() => {
    if (goals.length > 0) {
      const activeGoals = getActiveGoalsForAccount(post.accountNumber, goals);
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

  useEffect(() => {
    const loadAllCompanyAccounts = async () => {
      if (isAdmin && companyId) {
        try {
          const accounts = await fetchAllCompanyAccounts();
          setAllAccounts(accounts);
        } catch (error) {
          console.error("Error loading company accounts:", error);
        }
      }
    };
  
    loadAllCompanyAccounts();
  }, [isAdmin, companyId]);
  

  // once a regular user selects an account this would load or fetch goals
  useEffect(() => {
    // Fetch goals once `post.accountNumber` is updated
    if (post.accountNumber) {
      console.log("Fetching goals for account:", post.accountNumber);
      handleFetchGoal();
    }
  }, [post.accountNumber]);

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

  const handleAccountSelect = (account: CompanyAccountType) => { // this isnt used
    //declared but never read
    setPost((prev) => ({
      ...prev,
      selectedStore: account.accountName,
      storeAddress: account.accountAddress,
      accountNumber: account.accountNumber,
    }));
  };

  const handleTotalCaseCountChange = (count: number) => {
    // unused?
    // theres a warning here saying this function isnt used
    // declared but never read
    handleFieldChange("closedUnits", count); // Update the post state with the total case count
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
        dispatch(setGoals(matchingGoals));
      } else {
        console.warn(
          "No matching goals found in allCompanyGoals. Attempting to fetch from Firestore..."
        );
        if (companyId) {
          const fetchedGoals = await fetchGoalsByCompanyId(companyId);
          setAllCompanyGoals(fetchedGoals); // Update local state and IndexedDB
          const fallbackGoals = fetchedGoals.filter((goal) =>
            goal.accounts.some(
              (acc) =>
                acc.distributorAcctId.toString() === accountNumber.toString()
            )
          );

          if (fallbackGoals.length > 0) {
            console.log("Fallback matching goals found:", fallbackGoals);
            dispatch(setGoals(fallbackGoals));
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

  console.log(selectedStoreByAddress, ': selectedStore by address');

  return (
    <div className="pick-store">
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

      {post.selectedStore && (
        <Box mt={2}>
          <Typography variant="h5" fontWeight="bold">
            {post.selectedStore}
          </Typography>
        </Box>
      )}

      <Box mt={3}>
        {isFetchingGoals ? (
          <CircularProgress />
        ) : (
          <Typography>
            Goals for account will be dynamically displayed here.
          </Typography>
        )}
      </Box>

      <Box mt={3}>
        {isMapMode ? (
          <StoreLocator
          onStoreSelect={(store) => {
            setSelectedStoreByAddress({
              name: store.name,
              address: store.address,
              city: store.city || "", // Default to empty strings if city or state are missing
              state: store.state || "",
            });
          }}
        />
        
        ) : (
          <AccountDropdown
            onAccountSelect={(account) => {
              setPost({
                ...post,
                selectedStore: account.accountName,
                storeAddress: account.accountAddress,
                accountNumber: account.accountNumber,
              });
            }}
          />
        )}
      </Box>

      <Typography variant="h6">{`Total ${goalMetric} count`}</Typography>
      <TotalCaseCount
        handleTotalCaseCountChange={(count) =>
          handleFieldChange("closedUnits", count)
        }
      />

      <Box mt={3}>
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
              No goal selected for this display
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
        {/* {!isEmployee && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              if (selectedStore) {
                handleFetchGoalForAnyAccount(selectedStore);
              } else {
                console.warn("No store selected.");
              }
            }}
            disabled={!selectedStore} // Button is disabled if no store is selected
          >
            Fetch Goals
          </Button>
        )} */}
      </Box>
      <Dialog
  open={isMatchSelectionOpen}
  onClose={() => setIsMatchSelectionOpen(false)}
>
  <DialogTitle>Select a company account that matches the address</DialogTitle>
  <DialogContent>
    <List>
      {closestMatches.map((account) => (
        <ListItem key={account.accountNumber} disablePadding>
          <ListItemButton onClick={() => handleSelectClosestMatch(account)}>
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
