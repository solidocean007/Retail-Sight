// PickStore.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  CompanyAccountType,
  CompanyGoalWithIdType,
  FireStoreGalloGoalDocType,
  PostInputType,
  PostType,
  UserType,
} from "../../utils/types";
import { useSelector } from "react-redux";
import { RootState } from "../../utils/store";
import { Box, CircularProgress, Typography, Button } from "@mui/material";
// import { fetchGalloGoalsByCompanyId } from "../../utils/helperFunctions/fetchGalloGoalsByCompanyId";
import { getActiveGalloGoalsForAccount } from "../../utils/helperFunctions/getActiveGalloGoalsForAccount"; // this function looks useful also
import { getUserAccountsFromIndexedDB } from "../../utils/database/indexedDBUtils";
import { selectUser } from "../../Slices/userSlice";

import { fetchAllCompanyAccounts } from "../../utils/helperFunctions/fetchAllCompanyAccounts";
import { getActiveCompanyGoalsForAccount } from "../../utils/helperFunctions/getActiveCompanyGoalsForAccount";
// import { matchAccountWithSelectedStoreForAdmin } from "../../utils/helperFunctions/accountHelpers";
import GalloGoalDropdown from "./GalloGoalDropdown";
import CompanyGoalDropdown from "./CompanyGoalMultiSelector";
import "./pickstore.css";
import AccountModalSelector from "./AccountModalSelector";

import {
  selectAllGalloGoals,
  selectUsersGalloGoals,
} from "../../Slices/galloGoalsSlice";
import { selectAllCompanyGoals } from "../../Slices/companyGoalsSlice";
import CompanyGoalMultiSelector from "./CompanyGoalMultiSelector";

interface PickStoreProps {
  onNext: () => void;
  onPrevious: () => void;
  post: PostInputType;
  setPost: React.Dispatch<React.SetStateAction<PostInputType>>;
  handleFieldChange: (
    field: keyof PostInputType,
    value: PostType[keyof PostType]
  ) => void;
  setSelectedCompanyAccount: (account: CompanyAccountType | null) => void;
  setSelectedGalloGoal: (goal: FireStoreGalloGoalDocType | null) => void;
}

export const PickStore: React.FC<PickStoreProps> = ({
  onNext,
  onPrevious,
  post,
  setPost,
  handleFieldChange,
  setSelectedCompanyAccount,
  setSelectedGalloGoal,
}) => {
  const user = useSelector(selectUser);
  const salesRouteNum = user?.salesRouteNum;

  const [_allAccountsForCompany, setAllAccountsForCompany] = useState<
    CompanyAccountType[]
  >([]);
  const [myAccounts, setMyAccounts] = useState<CompanyAccountType[]>([]);
  const [isAllStoresShown, setIsAllStoresShown] = useState(false); // Toggle State
  const [loadingAccounts, setLoadingAccounts] = useState(true); // Tracks loading status
  const [accountsToSelect, setAccountsToSelect] =
    useState<CompanyAccountType[]>();

  const [isFetchingGoal, setIsFetchingGoal] = useState(false);
  const allCompanyGoals = useSelector(selectAllCompanyGoals);

  const usersGalloGoals = useSelector((state: RootState) =>
    selectUsersGalloGoals(state, salesRouteNum)
  );

  const [selectedGalloGoalId, setSelectedGalloGoalId] = useState<string | null>(
    null
  );

  const [selectedCompanyGoals, setSelectedCompanyGoals] =
    useState<CompanyGoalWithIdType[]>();
  const userRole = useSelector(selectUser)?.role;
  const userId = useSelector(selectUser)?.uid;
  const isAdmin = userRole === "admin" || userRole === "super-admin";
  // const isEmployee = userRole === "employee";
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );

  const allGalloGoals = useSelector(selectAllGalloGoals);
  const [openAccountModal, setOpenAccountModal] = useState(true);

  // filtering by account number function:  these return current goals for selection.  a mode might be helpful for switching to the desired set.
  const usersActiveGalloGoals = getActiveGalloGoalsForAccount(
    post.account?.accountNumber,
    usersGalloGoals // Type 'undefined' is not assignable to type 'FireStoreGalloGoalDocType[]'
  );

  const allActiveGalloGoals = getActiveGalloGoalsForAccount(
    post.account?.accountNumber,
    allGalloGoals
  );

  const onlyUsersStores = !isAllStoresShown;

  const galloGoals = onlyUsersStores
    ? usersActiveGalloGoals
    : allActiveGalloGoals;

  const companyGoals = useMemo(() => {
    if (!post.account?.accountNumber || !allCompanyGoals.length) return [];
    return getActiveCompanyGoalsForAccount(
      post.account.accountNumber,
      allCompanyGoals
    );
  }, [post.account?.accountNumber, allCompanyGoals]);

  useEffect(() => {
    if (!post.account?.accountNumber) {
      setOpenAccountModal(true);
    }
  }, [post.account?.accountNumber]);

  // load users accounts
  useEffect(() => {
    const loadMyAccounts = async () => {
      setLoadingAccounts(true); // Start loading
      try {
        // Fetch User-Specific Accounts (My Stores)
        const userAccounts = await getUserAccountsFromIndexedDB();
        if (userAccounts.length > 0) {
          setMyAccounts(userAccounts);
        } else {
          // fetch this users accounts
          // do i have an accountsSlice? to get accounts from?
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

  const handleCompanyGoalsSelection = (
    goals: CompanyGoalWithIdType[] | undefined
  ) => {
    if (!goals) {
      console.warn("No goal selected.");
      return;
    }

    setSelectedCompanyGoals(goals);
    handleFieldChange(
      "companyGoalIds",
      goals.map((goal) => goal.id)
    );
    handleFieldChange(
      "companyGoalDescriptions",
      goals.map((goal) => goal.goalDescription)
    ); // same
    handleFieldChange(
      "companyGoalTitles",
      goals.map((goal) => goal.goalTitle)
    ); // same
    console.log("new post data:", post);
  };

  const handleGalloGoalSelection = (
    // no change to the amount of gallo goals.. still just one per post.
    galloGoal: FireStoreGalloGoalDocType | undefined
  ) => {
    if (!galloGoal) return;

    setSelectedGalloGoalId(galloGoal.goalDetails.goalId);
    setSelectedGalloGoal(galloGoal);

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

    setSelectedCompanyAccount(account);
  };

  const handleClearAccount = () => {
    setPost((prevPost) => ({
      ...prevPost,
      account: null,
      accountNumber: "",
      city: "",
      state: "",
    }));
    setSelectedCompanyAccount(null);
    setSelectedGalloGoalId(null);
    setSelectedCompanyGoals(undefined);
  };

  // if (loadingAccounts || !post.account?.accountNumber || !companyGoals.length) {
  //   return <CircularProgress />;
  // }

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

        <Button
          variant="contained"
          color="primary"
          onClick={onNext}
          disabled={!post.account}
          sx={{ minWidth: "80px" }}
        >
          Next
        </Button>
      </Box>
      <Box className="store-selection">
        <Button
          onClick={() => setOpenAccountModal(true)}
          variant="contained"
          size="large"
          fullWidth
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
      </Box>

      {!post.account?.accountNumber && (
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
          {selectedCompanyGoals &&
            selectedCompanyGoals.map((goal) => (
              <Typography key={goal.id} variant="body2" color="primary" mt={1}>
                Goal: {goal.goalTitle}
              </Typography>
            ))}
        </Box>
      )}

      {/* Goals Dropdowns inside of PickStore.tsx*/}
      {/* {post.selectedStore && ( */}
      {post.account && (
        <Box mt={3}>
          <Box mt={2}>
            <CompanyGoalMultiSelector
              goals={companyGoals}
              label="Company Goals"
              loading={isFetchingGoal}
              selectedGoals={selectedCompanyGoals}
              onChange={handleCompanyGoalsSelection}
            />
          </Box>

          <Box mt={2}>
            <GalloGoalDropdown
              goals={galloGoals}
              label="Gallo Goals"
              loading={isFetchingGoal}
              onSelect={handleGalloGoalSelection}
              selectedGoal={selectedGalloGoalId}
            />
          </Box>
        </Box>
      )}

      <AccountModalSelector
        open={openAccountModal}
        onClose={() => setOpenAccountModal(false)}
        accounts={accountsToSelect}
        onAccountSelect={handleAccountSelect}
        isAllStoresShown={isAllStoresShown}
        setIsAllStoresShown={setIsAllStoresShown}
      />
    </div>
  );
};
