import React, { useEffect, useState } from "react";
import {
  CompanyAccountType,
  FireStoreGalloGoalDocType,
  GalloAccountType,
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
  // Type '({ onNext, onPrevious, handleFieldChange, post, setPost, goals, onStoreNameChange, onStoreNumberChange, onStoreAddressChange, onStoreCityChange, onStoreStateChange, }: PickStoreProps) => void' is not assignable to type 'FC<PickStoreProps>'.
  // Type 'void' is not assignable to type 'ReactNode'.
  onNext,
  onPrevious,
  handleFieldChange,
  post,
  setPost,
  goals,
  onStoreNameChange,
  onStoreNumberChange,
  onStoreAddressChange,
  onStoreCityChange,
  onStoreStateChange,
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
  const [allAccounts, setAllAccounts] = useState<CompanyAccountType[]>([]); // i use setAllAccounts but why dont i use allAccounts??
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );

  const [closestMatches, setClosestMatches] = useState<CompanyAccountType[]>(
    []
  );
  const [isMatchSelectionOpen, setIsMatchSelectionOpen] = useState(false);
  const [goalMetric, setGoalMetric] = useState<"cases" | "bottles">("cases"); // setGoalMetric should be used to define goalMetric as goals fetched might be cases or bottles
  const activeGoals = getActiveGoalsForAccount(post.accountNumber, goals);
  console.log(activeGoals); // this logs empty. it has to get set
  console.log(goals);

  // Fetch goals if not already loaded
  useEffect(() => {
    if (!goals.length && post.accountNumber) {
      const fetchAndSetGoals = async () => {
        try {
          const savedGoals = await getGoalsFromIndexedDB();

          // Check for saved goals in IndexedDB
          const matchingGoals = savedGoals.filter((goal) =>
            goal.accounts.some(
              (acc) => acc.distributorAcctId === post.accountNumber
            )
          );

          if (matchingGoals.length > 0) {
            dispatch(setGoals(matchingGoals)); // Load from IndexedDB
          } else if (companyId) {
            // Fetch from Firestore
            const fetchedGoals = await fetchGoalsForAccount(
              post.accountNumber,
              companyId
            );
            if (fetchedGoals.length > 0) {
              dispatch(setGoals(fetchedGoals));
              await saveGoalsToIndexedDB(fetchedGoals);
            }
          }
        } catch (error) {
          console.error("Error fetching and setting goals:", error);
          dispatch(showMessage("Error loading goals for account."));
        }
      };

      fetchAndSetGoals();
    }
  }, [goals, post.accountNumber, companyId, dispatch]);

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

      console.log(matchingGoals); // Log all matching goals

      if (matchingGoals.length > 0) {
        // Set active goals from IndexedDB
        setGoals(matchingGoals); // Cannot find name 'setActiveGoals'
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
          setGoals(filteredFetchedGoals); // Update active goals
          await saveGoalsToIndexedDB(fetchedGoals); // Cannot find name 'setActiveGoals'
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

  const handleFetchGoalForAnyAccount = async () => {
    setIsFetchingGoal(true);
    try {
      if (isAdmin && companyId) {
        const accounts = await fetchAllCompanyAccounts();
        if (accounts && accounts.length > 0) {
          matchAccountWithSelectedStoreForAdmin(accounts);
        } else {
          console.warn("No accounts found for the company.");
          dispatch(showMessage("No accounts found for this company."));
        }
      }
    } catch (error) {
      console.error("Error fetching accounts or goals:", error);
      dispatch(showMessage("Failed to fetch goals for the account."));
    } finally {
      setIsFetchingGoal(false);
    }
  };

  const matchAccountWithSelectedStoreForAdmin = (
    // why isnt this used?  this looks like the logic for finding closest matches for an admin
    allAccountsList: CompanyAccountType[]
  ) => {
    // Sort accounts alphabetically by accountName
    const sortedAccountsList = allAccountsList.sort((a, b) =>
      a.accountName.localeCompare(b.accountName)
    );

    const normalizedAddress = post.storeAddress
      .toLowerCase()
      .replace(/\s/g, "")
      .substring(0, 10);
    const normalizedName = post
      .selectedStore!.toLowerCase()
      .replace(/\s/g, "")
      .substring(0, 5);

    console.log("Normalized admin matching address:", normalizedAddress);
    console.log("Normalized admin matching name:", normalizedName);

    // Attempt to find an exact match
    const foundAccount = sortedAccountsList.find((account) => {
      const normalizedAccountAddress = account.accountAddress
        .toLowerCase()
        .replace(/\s/g, "")
        .substring(0, 10);
      const normalizedAccountName = account.accountName
        .toLowerCase()
        .replace(/\s/g, "")
        .substring(0, 5);

      console.log(
        `Admin Matching: Address "${normalizedAddress}" with "${normalizedAccountAddress}", Name "${normalizedName}" with "${normalizedAccountName}"`
      );

      return (
        normalizedAccountAddress === normalizedAddress &&
        normalizedAccountName === normalizedName
      );
    });

    if (foundAccount) {
      console.log("Admin match found:", foundAccount);
      setPost((prev) => ({
        ...prev,
        accountNumber: foundAccount.accountNumber.toString(),
      }));
      onStoreNameChange(foundAccount.accountName);
    } else {
      console.log("No exact admin match found. Finding closest matches...");

      // Find closest matches by address
      const closestMatches = sortedAccountsList.filter((account) => {
        const normalizedAccountAddress = account.accountAddress
          .toLowerCase()
          .replace(/\s/g, "")
          .substring(0, 10);

        return normalizedAccountAddress === normalizedAddress;
      });

      console.log("Closest matches by address:", closestMatches);

      if (closestMatches.length > 0) {
        // Render a list of closest matches
        renderClosestMatches(closestMatches);
      } else {
        console.log("No close matches found. Ask user to enter manually.");
        // Logic to handle no matches
      }
    }
  };

  // Helper function to render closest matches
  const renderClosestMatches = (matches: CompanyAccountType[]) => {
    setClosestMatches(matches); // Update state to display matches in the UI
    setIsMatchSelectionOpen(true); // Open a dialog/modal for selection
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
    if (isAdmin && companyId) {
      fetchAllCompanyAccounts();
    }
  }, [isAdmin, companyId]);

  useEffect(() => {
    // this might not be necessary because of what is on the CreatePost useEffect
    if (post.accountNumber) {
      handleFetchGoal(); // this will trigger at the same time as the CreatePost useEffect.  is there any redundancies?
    }
  }, [post.accountNumber]);

  const fetchAllCompanyAccounts = async () => {
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
    if (goalId === "no-goal") {
      handleFieldChange("oppId", "");
      handleFieldChange("closedUnits", 0);
      handleFieldChange("closedDate", "");
    } else {
      const selectedGoal = goals.find(
        (goal) => goal.goalDetails.goalId === goalId
      );
      console.log(selectedGoal, ": selectedGoal");
      if (selectedGoal) {
        const matchedAccount = selectedGoal.accounts.find(
          (account) =>
            account.distributorAcctId.toString() ===
            post.accountNumber?.toString()
        );
        console.log(matchedAccount, ": matchedAccount");
        if (matchedAccount) {
          handleFieldChange("oppId", matchedAccount.oppId);
          handleFieldChange(
            "closedDate",
            new Date().toISOString().split("T")[0]
          );
        } else {
          console.warn("No matching account found for the selected goal.");
        }
      }
    }

    setSelectedGoalId(goalId);
    console.log(post);
  };

  const handleAccountSelect = (account: CompanyAccountType) => {
    //declared but never read
    setPost((prev) => ({
      ...prev,
      selectedStore: account.accountName,
      storeAddress: account.accountAddress,
      accountNumber: account.accountNumber,
    }));
  };

  const handleTotalCaseCountChange = (count: number) => {
    // declared but never read
    handleFieldChange("closedUnits", count); // Update the post state with the total case count
  };

  return (
    <div className="pick-store">
      {/* Navigation Buttons */}
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

      {/* Display Store Name in Bold */}
      {post.selectedStore && (
        <Box mt={2}>
          <Typography variant="h5" fontWeight="bold">
            {post.selectedStore}
          </Typography>
        </Box>
      )}

      {/* Store Selector */}
      <Box mt={3}>
        {isMapMode ? (
          <StoreLocator
            post={post}
            setPost={setPost}
            onStoreNameChange={onStoreNameChange}
            onStoreNumberChange={onStoreNumberChange}
            onStoreAddressChange={onStoreAddressChange}
            onStoreCityChange={onStoreCityChange}
            onStoreStateChange={onStoreStateChange}
          />
        ) : (
          <AccountDropdown
            onAccountSelect={(account) =>
              setPost({
                ...post,
                selectedStore: account.accountName,
                storeAddress: account.accountAddress,
                accountNumber: account.accountNumber,
              })
            }
          />
        )}
      </Box>

      {/* Total Case Count */}
      <Typography variant="h6">{`Total ${goalMetric} count`}</Typography>
      <TotalCaseCount
        handleTotalCaseCountChange={(count) =>
          handleFieldChange("closedUnits", count)
        }
      />

      {/* Goal Selection */}
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
                {/* {goal.goalDetails.goal} - {goal.programDetails.programTitle} */}
                {goal.goalDetails.goal}
              </MenuItem>
            ))}
          </Select>
        )}
        {!isEmployee && (
          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
            onClick={handleFetchGoalForAnyAccount}
          >
            {/* this should render the goal.goal for the description */} 
            {selectedGoalId
              ? `Selected Goal: ${selectedGoalId}`  
              : activeGoals.length > 0
              ? `${activeGoals.length} Goals Available`
              : "No Goals Available"}
          </Button>
        )}
      </Box>
    </div>
  );
};
