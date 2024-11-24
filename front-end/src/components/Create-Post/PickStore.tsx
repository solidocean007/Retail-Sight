import React, { useEffect, useState } from "react";
import { CompanyAccountType, GalloGoalType, PostType } from "../../utils/types";
import StoreLocator from "./StoreLocator";
import "./pickstore.css";
import AccountDropdown from "./AccountDropDown";
import { useSelector } from "react-redux";
import { RootState } from "../../utils/store";
import {
  getGoalsFromIndexedDB,
  saveGoalsToIndexedDB,
} from "../../utils/database/indexedDBUtils";
import { fetchGoalsForAccount } from "../../utils/helperFunctions/fetchGoalsForAccount";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import TotalCaseCount from "../TotalCaseCount";

interface PickStoreProps {
  onNext: () => void;
  onPrevious: () => void;
  handleFieldChange: (
    field: keyof PostType,
    value: PostType[keyof PostType]
  ) => void;
  post: PostType;
  setPost: React.Dispatch<React.SetStateAction<PostType>>;
  onStoreNameChange: (storeName: string) => void;
  onStoreNumberChange: (newStoreNumber: string) => void;
  onStoreAddressChange: (address: string) => void;
  onStoreCityChange: (city: string) => void;
  onStoreStateChange: (newStoreState: string) => void;
}

export const PickStore: React.FC<PickStoreProps> = ({
  post,
  setPost,
  handleFieldChange,
  onNext,
  onPrevious,
  onStoreNameChange,
  onStoreNumberChange,
  onStoreAddressChange,
  onStoreCityChange,
  onStoreStateChange,
}) => {
  const [manualStoreMode, setManualStoreMode] = useState(false);
  const [goalForAccount, setGoalForAccount] = useState<GalloGoalType | null>(
    null
  );
  const [isFetchingGoal, setIsFetchingGoal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const userAccounts = useSelector(
    (state: RootState) => state.userAccounts.accounts
  );
  const [goalMetric, setGoalMetric] = useState("cases");
  console.log(goalForAccount);
  // Handle account selection
  const handleAccountSelect = (account: CompanyAccountType) => {
    setPost((prev) => ({
      ...prev,
      selectedStore: account.accountName,
      storeAddress: account.accountAddress,
      accountNumber: account.accountNumber,
    }));
  };

  useEffect(() => {
    console.log("Updated goalForAccount:", goalForAccount);
  }, [goalForAccount]);

  useEffect(() => {
    if (post.accountNumber) {
      handleFetchGoal();
    }
  }, [post.accountNumber]);

  const debugIndexedDB = async () => {
    const savedGoals = await getGoalsFromIndexedDB();
    console.log("IndexedDB Goals:", savedGoals);
  };
  useEffect(() => {
    debugIndexedDB();
  }, []);
  

  // Fetch goal for the current account
  const handleFetchGoal = async () => {
    setIsFetchingGoal(true);
    try {
      if (post.accountNumber) {
        const savedGoals = await getGoalsFromIndexedDB();
        console.log("Saved Goals:", savedGoals);
        console.log(post.accountNumber) // this logs as a string

        // Match the goal with the accountNumber
        const matchingGoal = savedGoals.find((goal) =>
          goal.accounts.some(
            (acc) => acc.distributorAcctId.toString() === post.accountNumber?.toString()
          )
        );

        if (matchingGoal) {
          console.log("Found matching goal in cache:", matchingGoal);
          setGoalForAccount(matchingGoal);
        } else {
          console.log("No matching goal in cache. Fetching from Firestore...");
          const fetchedGoals = await fetchGoalsForAccount(post.accountNumber);
          console.log("Fetched Goals:", fetchedGoals);

          if (fetchedGoals.length > 0) {
            await saveGoalsToIndexedDB(fetchedGoals);
            const fetchedMatchingGoal = fetchedGoals.find((goal) =>
              goal.accounts.some(
                (acc) => acc.distributorAcctId === post.accountNumber
              )
            );
            console.log("Fetched Matching Goal:", fetchedMatchingGoal);
            setGoalForAccount(fetchedMatchingGoal || null);
          } else {
            console.warn("No goals fetched for this account.");
            setGoalForAccount(null);
          }
        }
      } else {
        console.warn("No account number provided for goal fetch.");
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
    } finally {
      setIsFetchingGoal(false);
    }
  };

  // Handle goal selection
  const handleGoalSelection = (goalId: string) => {
    if (goalId === "no-goal") {
      handleFieldChange("oppId", "");
      handleFieldChange("closedUnits", 0);
      handleFieldChange("closedDate", "");
    } else if (goalForAccount) {
      const matchingAccount = goalForAccount.accounts.find(
        (account) => account.distributorAcctId === post.accountNumber
      );
      if (matchingAccount) {
        handleFieldChange("oppId", matchingAccount.oppId);
        handleFieldChange("closedDate", new Date().toISOString().split("T")[0]);
      }
    }
    setSelectedGoalId(goalId);
  };

  return (
    <div className="pick-store">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button className="create-post-btn" onClick={onPrevious}>
          <h4>Back</h4>
        </button>
        {post.selectedStore && (
          <button className="create-post-btn" onClick={onNext}>
            <h4>Next</h4>
          </button>
        )}
      </div>

      <h4>Select a Store</h4>
      <button
        onClick={() => setManualStoreMode(!manualStoreMode)}
        className="create-post-btn"
      >
        {manualStoreMode ? "Use Account Search" : "Use Map/Manual Input"}
      </button>

      <div style={{ width: "100%", marginTop: "1rem" }}>
        {manualStoreMode ? (
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
          <AccountDropdown onAccountSelect={handleAccountSelect} />
        )}
      </div>

      {post.selectedStore && (
        <div className="store-details">
          <h4>Store: {post.selectedStore}</h4>
          <h5>Address: {post.storeAddress}</h5>
        </div>
      )}

      {post.accountNumber && (
        <Box mt={2}>
          <Typography variant="h6">Gallo Goal</Typography>
          {isFetchingGoal ? (
            <CircularProgress />
          ) : (
            <>
              <Select
                fullWidth
                variant="outlined"
                value={selectedGoalId || "no-goal"}
                onChange={(e) => handleGoalSelection(e.target.value)}
              >
                <MenuItem value="no-goal">
                  No goal selected for this display
                </MenuItem>
                {goalForAccount && goalForAccount.goalDetails ? (
                  <MenuItem value={goalForAccount.goalDetails.goalId}>
                    {goalForAccount.goalDetails.goal} -{" "}
                    {goalForAccount.accounts[0].accountName}
                  </MenuItem>
                ) : (
                  <MenuItem disabled>
                    No goals available for this account
                  </MenuItem>
                )}
              </Select>
              {!goalForAccount && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleFetchGoal}
                  disabled={isFetchingGoal}
                  sx={{ mt: 2 }}
                >
                  Fetch Goal for This Account
                </Button>
              )}
            </>
          )}
        </Box>
      )}

      <Box mt={2}>
        <Typography variant="h6">{`Total ${goalMetric} Count`}</Typography>
        <TotalCaseCount
          handleTotalCaseCountChange={(value) =>
            handleFieldChange("totalCaseCount", value)
          }
        />
      </Box>
    </div>
  );
};
