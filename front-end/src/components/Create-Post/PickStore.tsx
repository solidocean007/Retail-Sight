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
import { RootState } from "../../utils/store";
import { Box, CircularProgress, Typography, Button } from "@mui/material";
// import { fetchGalloGoalsByCompanyId } from "../../utils/helperFunctions/fetchGalloGoalsByCompanyId";
// import { getActiveGalloGoalsForAccount } from "../../utils/helperFunctions/getActiveGalloGoalsForAccount"; // this function looks useful also
import { getUserAccountsFromIndexedDB } from "../../utils/database/indexedDBUtils";
import { selectUser } from "../../Slices/userSlice";
// import {
//   selectAllCompanyGoals,
//   selectAllGalloGoals,
//   setGalloGoals,
// } from "../../Slices/goalsSlice";
import { fetchAllCompanyAccounts } from "../../utils/helperFunctions/fetchAllCompanyAccounts";
import { getActiveCompanyGoalsForAccount } from "../../utils/helperFunctions/getActiveCompanyGoalsForAccount";
// import { matchAccountWithSelectedStoreForAdmin } from "../../utils/helperFunctions/accountHelpers";
// import GalloGoalDropdown from "./GalloGoalDropdown";
import CompanyGoalDropdown from "./CompanyGoalDropdown";
import "./pickstore.css";
import AccountModalSelector from "./AccountModalSelector";
import { selectAllCompanyGoals } from "../../Slices/companyGoalsSlice";

interface PickStoreProps {
  onNext: () => void;
  onPrevious: () => void;
  post: PostInputType;
  setPost: React.Dispatch<React.SetStateAction<PostInputType>>;
  usersGalloGoals?: FireStoreGalloGoalDocType[]; // Pass goals from Redux
  allCompanyGoals: CompanyGoalWithIdType[]; // Pass goals from Redux
  handleFieldChange: (
    field: keyof PostInputType,
    value: PostType[keyof PostType]
  ) => void;
  setSelectedCompanyAccount: (account: CompanyAccountType | null) => void;
}

export const PickStore: React.FC<PickStoreProps> = ({
  onNext,
  onPrevious,
  post,
  setPost,
  // usersGalloGoals,
  allCompanyGoals,
  handleFieldChange,
  setSelectedCompanyAccount,
}) => {
  const [_allAccountsForCompany, setAllAccountsForCompany] = useState<
    CompanyAccountType[]
  >([]);
  const [myAccounts, setMyAccounts] = useState<CompanyAccountType[]>([]);
  const [isAllStoresShown, setIsAllStoresShown] = useState(false); // Toggle State
  const [loadingAccounts, setLoadingAccounts] = useState(true); // Tracks loading status
  const [accountsToSelect, setAccountsToSelect] =
    useState<CompanyAccountType[]>();

  const [isFetchingGoal, setIsFetchingGoal] = useState(false);
  const [selectedGalloGoalId, setSelectedGalloGoalId] = useState<string | null>(
    null
  );
  const [selectedCompanyGoal, setSelectedCompanyGoal] =
    useState<CompanyGoalWithIdType | null>();
  const userRole = useSelector(selectUser)?.role;
  const userId = useSelector(selectUser)?.uid;
  const isAdmin = userRole === "admin" || userRole === "super-admin";
  // const isEmployee = userRole === "employee";
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );

  // these next two only need to be selected if a user is selecting all accounts and needs access to the entire company goal list or gallo goal list
  // const allGalloGoals = useSelector(selectAllGalloGoals); // delete this or from the parent
  const [openAccountModal, setOpenAccountModal] = useState(true);

  const [isMatchSelectionOpen, setIsMatchSelectionOpen] = useState(false);

  // filtering by account number function:  these return current goals for selection.  a mode might be helpful for switching to the desired set.
  // const usersActiveGalloGoals = getActiveGalloGoalsForAccount(
  //   post.account?.accountNumber,
  //   usersGalloGoals,
  // );

  // const allActiveGalloGoals = getActiveGalloGoalsForAccount(
  //   post.account?.accountNumber,
  //   allGalloGoals,
  // );

  // const usersActiveCompanyGoals = useMemo(() => {
  //   if (!post.account?.accountNumber || !allCompanyGoals.length) return [];
  //   return getActiveCompanyGoalsForAccount(
  //     post.account.accountNumber,
  //     allCompanyGoals
  //   );
  // }, [post.account?.accountNumber, allCompanyGoals]);

  // const allActiveCompanyGoals = useMemo(() => {
  //   if (!post.account?.accountNumber || !allCompanyGoals.length) return [];
  //   return getActiveCompanyGoalsForAccount(
  //     post.account?.accountNumber,
  //     allCompanyGoals
  //   );
  // }, [post.account?.accountNumber, allCompanyGoals]);

  // const onlyUsersStores = !isAllStoresShown;

  // const galloGoals = onlyUsersStores
  //   ? usersActiveGalloGoals
  //   : allActiveGalloGoals;

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

  // Handler for Account Selection
  const handleAccountSelect = (account: CompanyAccountType) => {
    setPost((prevPost) => ({
      ...prevPost,
      account,
      accountNumber: account.accountNumber,
      address: account.accountAddress,
      accountType: account.typeOfAccount,
    }));
    setSelectedCompanyAccount(account); // ✅ still good
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
    setSelectedCompanyGoal(undefined);
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
              goals={companyGoals}
              label="Company Goal"
              loading={isFetchingGoal}
              onSelect={handleCompanyGoalSelection} // 'id' is declared here.
              selectedGoal={selectedCompanyGoal} // Type 'CompanyGoalWithIdType | null | undefined' is not assignable to type 'CompanyGoalWithIdType | undefined'.
              // Type 'null' is not assignable to type 'CompanyGoalWithIdType | undefined'. why is the selected goal here potentially null or undefined?
            />
          </Box>

          <Box mt={2}>
            {/* <GalloGoalDropdown
              goals={galloGoals}
              label="Gallo Goals"
              loading={isFetchingGoal}
              onSelect={handleGalloGoalSelection}
              selectedGoal={selectedGalloGoalId}
            /> */}
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
