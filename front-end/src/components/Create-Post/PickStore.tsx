import React, { useEffect, useState } from "react";
import { CompanyAccountType, FireStoreGalloGoalDocType, PostType } from "../../utils/types";
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
import {
  fetchGoalsByCompanyId,
} from "../../utils/helperFunctions/fetchGoalsByCompanyId";
import { getActiveGoalsForAccount } from "../../utils/helperFunctions/getActiveGoalsForAccount";
import {
  getGoalsFromIndexedDB,
  saveGoalsToIndexedDB,
} from "../../utils/database/indexedDBUtils";
import { fetchGoalsForAccount } from "../../utils/helperFunctions/fetchGoalsForAccount";
import { showMessage } from "../../Slices/snackbarSlice";
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
  onNext,
  onPrevious,
  handleFieldChange,
  post,
  setPost,
  onStoreNameChange,
  onStoreNumberChange,
  onStoreAddressChange,
  onStoreCityChange,
  onStoreStateChange,
}) => {
  const dispatch = useAppDispatch();
  const [isMapMode, setIsMapMode] = useState(false); // Toggle between dropdown and map
  const [goalForAccount, setGoalForAccount] = useState<FireStoreGalloGoalDocType | null>(
    null
  );

  const [isFetchingGoal, setIsFetchingGoal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allAccounts, setAllAccounts] = useState<CompanyAccountType[]>([]);
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const userRole = useSelector(
    (state: RootState) => state.user.currentUser?.role
  );
  const [closestMatches, setClosestMatches] = useState<CompanyAccountType[]>(
    []
  );
  const [isMatchSelectionOpen, setIsMatchSelectionOpen] = useState(false);
  const [goalMetric, setGoalMetric] = useState("cases");

  const handleFetchGoal = async () => {
    setIsFetchingGoal(true);
    try {
      if (!post.accountNumber) {
        console.warn("No accountNumber provided in the post.");
        return;
      }
  
      const savedGoals = await getGoalsFromIndexedDB();
      const matchingGoal = savedGoals.find((goal) =>
        goal.accounts.some(
          (acc) => acc.distributorAcctId === post.accountNumber
        )
      );
  
      if (matchingGoal) {
        const matchedAccount = matchingGoal.accounts.find(
          (account) => account.distributorAcctId === post.accountNumber
        );
  
        if (matchedAccount) {
          setGoalForAccount({
            goalDetails: matchingGoal.goalDetails,
            accounts: {
              ...matchedAccount,
              salesRouteNums: matchedAccount.salesRouteNums || [], // Object literal may only specify known properties, and 'salesRouteNums' does not exist in type '{ oppId: string; distributorAcctId: string; accountName: string; accountAddress: string; salesRouteNums?: string[] | undefined; marketId?: string | undefined; }[]'
            },
          });
        }
      } else {
        const fetchedGoals = await fetchGoalsForAccount(
          post.accountNumber!,
          companyId!
        );
  
        if (fetchedGoals.length > 0) {
          const refinedGoals = fetchedGoals.map((goal) => {
            const matchedAccount = goal.accounts.find(
              (account) => account.distributorAcctId === post.accountNumber
            );
  
            return matchedAccount
              ? {
                  goalDetails: goal.goalDetails,
                  matchedAccount: {
                    ...matchedAccount,
                    salesRouteNums: matchedAccount.salesRouteNums || [], // Default to an empty array
                  },
                }
              : null;
          }).filter(Boolean) as RefinedGoal[];
  
          setGoalForAccount(refinedGoals[0]);
          await saveGoalsToIndexedDB(
            refinedGoals.map((goal) => ({
              goalDetails: goal.goalDetails,
              accounts: [goal.matchedAccount],
            })),
            refinedGoals.flatMap((goal) =>
              goal.matchedAccount.distributorAcctId
            )
          );
        }
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
    } finally {
      setIsFetchingGoal(false);
    }
  };
  
  // const handleFetchGoalForAnyAccount = async () => {
  //   setIsFetchingGoal(true);
  //   console.log("isAdmin: ", isAdmin); // Log for debugging

  //   try {
  //     if (isAdmin) {
  //       if (!companyId) return;
  //       console.log("Admin is fetching goals for all accounts.");
  //       const accountsId = await getCompanyAccountId(companyId);
  //       // Fetch all accounts from Firestore
  //       const fetchedAllAccounts = await fetchAllAccountsFromFirestore(
  //         accountsId || ""
  //       );
  //       if (!fetchedAllAccounts.length) {
  //         console.warn("No accounts found for the company.");
  //         dispatch(showMessage("No accounts found for this company."));
  //         return;
  //       }

  //       console.log("Fetched all accounts for admin:", fetchedAllAccounts);
  //       setAllAccounts(fetchedAllAccounts); // Save in state for admin matching

  //       // Attempt to match against all accounts
  //       matchAccountWithSelectedStoreForAdmin(fetchedAllAccounts);
  //     } else {
  //       console.warn("User is not an admin or no account number provided.");
  //       dispatch(showMessage("Only admins can fetch goals for any account."));
  //     }
  //   } catch (error) {
  //     console.error("Error fetching goals for all accounts:", error);
  //     dispatch(showMessage("An error occurred while fetching goals."));
  //   } finally {
  //     console.log("post: ", post);
  //     setIsFetchingGoal(false);
  //   }
  // };

  const matchAccountWithSelectedStoreForAdmin = (
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
    if (post.accountNumber) {
      handleFetchGoal();
    }
  }, [post.accountNumber]);

  const fetchAllCompanyAccounts = async () => {
    if (!companyId) return;
    const accountsId = await getCompanyAccountId(companyId);
    if (!accountsId) {
      console.error("No accounts ID found for the company");
      return;
    }
    const accounts = await fetchAllAccountsFromFirestore(accountsId);
    setAllAccounts(accounts);
  };

  const handleFetchGoal = async () => {
    setIsFetchingGoal(true);
    try {
      if (!post.accountNumber) {
        console.warn("No accountNumber provided in the post.");
        return;
      }
  
      if (isAdmin) {
        const allGoals = await fetchGoalsByCompanyId(companyId || "");
        const refinedGoals = allGoals
          .map((goal) => {
            const matchedAccount = goal.accounts.find(
              (account) => // Parameter 'account' implicitly has an 'any' type.
                account.distributorAcctId.toString() ===
                post.accountNumber?.toString()
            );
  
            if (matchedAccount) {
              return {
                goalDetails: goal.goalDetails,
                matchedAccount,
              };
            }
            return null;
          })
          .filter((result) => result !== null) as RefinedGoal[];
  
        console.log("Filtered goals for admin:", refinedGoals);
  
        if (refinedGoals.length > 0) {
          setGoalForAccount(refinedGoals[0]);
  
          if (!isAdmin) {
            // Map RefinedGoal[] back to GalloGoalType[]
            const goalsToSave: GalloGoalType[] = refinedGoals.map((refinedGoal) => ({ // type mismatch
              goalDetails: refinedGoal.goalDetails,
              accounts: refinedGoal.matchedAccount
                ? [refinedGoal.matchedAccount]
                : [],
            }));
  
            await saveGoalsToIndexedDB(goalsToSave); // expects 2 arguments only got one.. neeeds account ids
          }
        } else {
          console.warn("No matching goals found for admin.");
          setGoalForAccount(null);
        }
      } else {
        const savedGoals = await getGoalsFromIndexedDB();
        const matchingGoal = savedGoals.find((goal) =>
          goal.accounts.some(
            (acc) =>
              acc.distributorAcctId.toString() === post.accountNumber?.toString()
          )
        );
  
        if (matchingGoal) {
          const matchedAccount = matchingGoal.accounts.find(
            (account) =>
              account.distributorAcctId.toString() ===
              post.accountNumber?.toString()
          );
  
          if (matchedAccount) {
            setGoalForAccount({
              goalDetails: matchingGoal.goalDetails, // type mismatch
              matchedAccount, // Types of property 'salesRouteNums' are incompatible.
              Type 'string[] | undefined' is not assignable to type 'string[]'.
                // Type 'undefined' is not assignable to type 'string[]'.ts
            });
          } else {
            console.warn(
              "No matched account found for the selected account number."
            );
            setGoalForAccount(null);
          }
        } else {
          const fetchedGoals = await fetchGoalsForAccount(post.accountNumber); // expects 2 arg only got one
          if (fetchedGoals.length > 0) {
            const refinedFetchedGoals = fetchedGoals.map((goal) => {
              const matchedAccount = goal.accounts.find( // type mismatch
                (account) => // implicit any type
                  account.distributorAcctId.toString() ===
                  post.accountNumber?.toString()
              );
          
              return matchedAccount
                ? {
                    goalDetails: goal.goalDetails, // type mismatch
                    matchedAccount,
                  }
                : null; // Return null if no matchedAccount
            }).filter((goal) => goal !== null) as RefinedGoal[]; // Filter out null results
          
            await saveGoalsToIndexedDB(refinedFetchedGoals.map((goal) => ({ // expects 2 args
              goalDetails: goal.goalDetails,
              accounts: [goal.matchedAccount], // Ensure proper structure for IndexedDB
            })));
          
            if (refinedFetchedGoals.length > 0) {
              setGoalForAccount(refinedFetchedGoals[0] || null);
            } else {
              console.warn("No valid goals to set.");
              setGoalForAccount(null);
            }
          } else {
            console.warn("No goals found for regular user.");
            setGoalForAccount(null);
          }
          
        }
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
    } finally {
      setIsFetchingGoal(false);
    }
  };

  const handleGoalSelection = (goalId: string) => {
    if (goalId === "no-goal") {
      handleFieldChange("oppId", "");
      handleFieldChange("closedUnits", 0);
      handleFieldChange("closedDate", "");
    } else if (goalForAccount) {
      const matchingAccount = goalForAccount.matchedAccount;
      if (matchingAccount) {
        handleFieldChange("oppId", matchingAccount.oppId);
        handleFieldChange("closedDate", new Date().toISOString().split("T")[0]);
      }
    }
    setSelectedGoalId(goalId);
  };

  const handleAccountSelect = (account: CompanyAccountType) => {
    setPost((prev) => ({
      ...prev,
      selectedStore: account.accountName,
      storeAddress: account.accountAddress,
      accountNumber: account.accountNumber,
    }));
  };

  const handleTotalCaseCountChange = (count: number) => {
    handleFieldChange("closedUnits", count); // Update the post state with the total case count
  };
  

  return (
    <div className="pick-store">
      {/* Navigation Buttons */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
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
          <AccountDropdown onAccountSelect={handleAccountSelect} />
        )}
      </Box>
  
      {/* Total Case Count */}
      <Typography variant="h6">{`Total ${goalMetric} count`}</Typography>
      <TotalCaseCount handleTotalCaseCountChange={handleTotalCaseCountChange} />
  
      {/* Gallo Goal Selector */}
      <Box mt={3}>
        <Typography variant="h6">Gallo Goal</Typography>
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
            {goalForAccount && (
              <MenuItem value={goalForAccount.goalDetails.goalId}>
                {goalForAccount.goalDetails.goal} -{" "}
                {goalForAccount.matchedAccount.accountName}
              </MenuItem>
            )}
          </Select>
        )}
        {!goalForAccount && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleFetchGoalForAnyAccount}
            sx={{ mt: 2 }}
          >
            Fetch Goal for store (Admin)
          </Button>
        )}
      </Box>
  
      {/* Closest Matches Dialog */}
      {isMatchSelectionOpen && (
        <Dialog
          open={isMatchSelectionOpen}
          onClose={() => setIsMatchSelectionOpen(false)}
        >
          <DialogTitle>Select a Closest Match</DialogTitle>
          <DialogContent>
            <List>
              {closestMatches.map((account, index) => (
                <ListItem key={index} disablePadding>
                  <ListItemButton
                    onClick={() => {
                      handleAccountSelect(account);
                      setIsMatchSelectionOpen(false);
                    }}
                  >
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        tabIndex={-1}
                        disableRipple
                        checked={
                          post.accountNumber ===
                          account.accountNumber.toString()
                        }
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${account.accountName} - ${account.accountAddress}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setIsMatchSelectionOpen(false)}
              color="secondary"
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
  
};
