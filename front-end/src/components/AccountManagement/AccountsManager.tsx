import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  // CircularProgress,
  TextField,
  Tooltip,
} from "@mui/material";
import {
  // addDoc,
  // collection,
  doc,
  getDoc,
  updateDoc,
} from "@firebase/firestore";
import { CompanyAccountType } from "../../utils/types";
import { db } from "../../utils/firebase";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import getCompanyAccountId from "../../utils/helperFunctions/getCompanyAccountId";
import "./styles/uploadTemplateModal.css";
import { mergeAccountsFromFileUpload } from "./utils/mergeAccountsFromFileUpload";
import CustomConfirmation from "../CustomConfirmation";
import AccountForm from "./AccountForm";
import UploadTemplateModal from "./UploadTemplateModal";
import { useAppDispatch } from "../../utils/store";
import { setAllAccounts } from "../../Slices/allAccountsSlice";
import {
  deleteAccountFromIndexedDB,
  saveAllCompanyAccountsToIndexedDB,
} from "../../utils/database/indexedDBUtils";
import { showMessage } from "../../Slices/snackbarSlice";
import { useDebouncedValue } from "../../hooks/useDebounce";

interface AccountManagerProps {
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export type UploadMode = "initial" | "update";

const AccountManager: React.FC<AccountManagerProps> = ({
  isAdmin,
  isSuperAdmin,
}) => {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [accounts, setAccounts] = useState<CompanyAccountType[]>([]);
  const [fileData, setFileData] = useState<CompanyAccountType[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] =
    useState<CompanyAccountType | null>(null);
  const [newAccount, setNewAccount] = useState<CompanyAccountType | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<
    CompanyAccountType[] | null
  >(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [openAddAccountModal, setOpenAddAccountModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    if (!user?.companyId) return;
    try {
      const accountsId = await getCompanyAccountId(user.companyId);
      if (!accountsId) return;

      const accountsDocRef = doc(db, "accounts", accountsId);
      const accountsSnapshot = await getDoc(accountsDocRef);

      if (accountsSnapshot.exists()) {
        const accountsData = accountsSnapshot.data();
        const formattedAccounts = (
          accountsData.accounts as CompanyAccountType[]
        ).map((account) => ({
          ...account,
          salesRouteNums: Array.isArray(account.salesRouteNums)
            ? account.salesRouteNums.map((num) => String(num))
            : [],
        }));
        setAccounts(formattedAccounts);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const handleAccountsUpload = async (
    uploadedAccounts: CompanyAccountType[],
    existingAccounts: CompanyAccountType[],
    mode: UploadMode
  ) => {
    if (!user?.companyId) return;
    if (mode === "initial" && existingAccounts.length > 0) {
      throw new Error(
        "Cannot perform initial upload when accounts already exist."
      );
    }

    try {
      const companyDocRef = doc(db, "companies", user.companyId);
      const companySnap = await getDoc(companyDocRef);
      if (!companySnap.exists()) throw new Error("Company doc not found.");

      const { accountsId } = companySnap.data();
      if (!accountsId) throw new Error("No accountsId on company doc.");

      const accountsDocRef = doc(db, "accounts", accountsId);

      // Use existingAccounts passed in
      const map = new Map<number, CompanyAccountType>();
      existingAccounts.forEach((acc) =>
        map.set(acc.accountNumber, {
          ...acc,
          salesRouteNums: (acc.salesRouteNums || []).map(String),
        })
      );

      for (const updated of uploadedAccounts) {
        const existing = map.get(updated.accountNumber);

        if (!existing || mode === "initial") {
          map.set(updated.accountNumber, {
            ...updated,
            salesRouteNums: (updated.salesRouteNums || []).map(String),
          });
        } else {
          map.set(updated.accountNumber, {
            ...existing,
            ...updated,
            salesRouteNums: Array.from(
              new Set([
                ...(existing.salesRouteNums || []),
                ...(updated.salesRouteNums || []),
              ])
            ).map(String),
          });
        }
      }

      const mergedAccounts = Array.from(map.values());
      await updateDoc(accountsDocRef, { accounts: mergedAccounts });

      setAccounts(mergedAccounts);
      dispatch(setAllAccounts(mergedAccounts));
      await saveAllCompanyAccountsToIndexedDB(mergedAccounts);
    } catch (err: any) {
      console.error("Error in handleAccountsUpload:", err.message || err);
      dispatch(showMessage(err.message || "Account update failed."));
    }
  };

  const handleFileUpload = (file: File) => {
    mergeAccountsFromFileUpload(
      file,
      accounts,
      ({ mergedAccounts, changedAccounts }) => {
        if (changedAccounts.length === 0) {
          dispatch(showMessage("No changes found in uploaded file."));
          return;
        }

        const mode = getUploadMode();
        setFileData(mergedAccounts); // Full merged dataset
        setPendingUpdates(changedAccounts); // Just the changes
        setConfirmMessage(
          mode === "initial"
            ? `Upload ${changedAccounts.length} new account(s)?`
            : `Merge ${changedAccounts.length} account(s)?`
        );
        setShowConfirm(true);
      },
      (errMessage) => dispatch(showMessage(errMessage))
    );
  };

  const confirmUpdates = async () => {
    const mode = getUploadMode();

    if (!user?.companyId || !pendingUpdates) return;

    const accountsId = await getCompanyAccountId(user.companyId);
    if (!accountsId) return;

    const accountsDocRef = doc(db, "accounts", accountsId);

    // 🟢 Handle manual deletion
    if (
      pendingUpdates.length === 1 &&
      confirmMessage.toLowerCase().includes("delete")
    ) {
      const accountNumberToDelete = pendingUpdates[0].accountNumber;
      const updatedAccounts = accounts.filter(
        (acc) => acc.accountNumber !== accountNumberToDelete
      );

      await updateDoc(accountsDocRef, { accounts: updatedAccounts });
      dispatch(setAllAccounts(updatedAccounts));
      await deleteAccountFromIndexedDB(accountNumberToDelete);
      setAccounts(updatedAccounts);
      dispatch(showMessage("Account deleted successfully."));
    }

    // 🟢 Handle single manual edit (Edit button — not from file)
    else if (pendingUpdates.length === 1 && fileData.length === 0) {
      const updatedAccount = pendingUpdates[0];
      const updatedAccounts = accounts.map((acc) =>
        acc.accountNumber === updatedAccount.accountNumber
          ? updatedAccount
          : acc
      );

      await updateDoc(accountsDocRef, { accounts: updatedAccounts });
      dispatch(setAllAccounts(updatedAccounts));
      await saveAllCompanyAccountsToIndexedDB(updatedAccounts);
      setAccounts(updatedAccounts);
      dispatch(showMessage("Account updated successfully."));
    }

    // 🟢 Handle file upload merge (multiple or full dataset)
    else if (fileData.length > 0) {
      setIsSubmitting(true);
      await handleAccountsUpload(fileData, accounts, mode);
      setIsSubmitting(false);

      const message =
        mode === "initial"
          ? `${pendingUpdates.length} account(s) added.`
          : `${pendingUpdates.length} account(s) updated.`;
      dispatch(showMessage(message));
    }

    // 🧹 Clean up
    setPendingUpdates(null);
    setShowConfirm(false);
    setFileData([]);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleEditAccount = (account: CompanyAccountType) => {
    setSelectedAccount(account);
  };

  const handleDeleteAccount = async (accountNumberToDelete: number) => {
    // why isnt this being used now?
    if (!user?.companyId) return;

    const accountsId = await getCompanyAccountId(user.companyId);
    if (!accountsId) return;

    const accountsDocRef = doc(db, "accounts", accountsId);
    const accountsSnapshot = await getDoc(accountsDocRef);
    if (!accountsSnapshot.exists()) return;

    const allAccounts = accountsSnapshot.data()
      .accounts as CompanyAccountType[];
    const updatedAccounts = allAccounts.filter(
      (acc) => acc.accountNumber !== accountNumberToDelete
    );

    await updateDoc(accountsDocRef, { accounts: updatedAccounts });

    // Update Redux
    dispatch(setAllAccounts(updatedAccounts));

    // Update IndexedDB
    await deleteAccountFromIndexedDB(accountNumberToDelete);

    // Update local component state
    setAccounts(updatedAccounts);
    setShowConfirm(false);
  };

  const handleAddAccount = () => {
    setNewAccount({
      accountNumber: 0,
      accountName: "",
      accountAddress: "",
      salesRouteNums: [],
      typeOfAccount: undefined,
      chain: "",
      chainType: "independent",
    });
    setOpenAddAccountModal(true);
  };

  const filteredAccounts = accounts.filter(
    (account) =>
      account.accountName
        .toLowerCase()
        .includes(debouncedSearchTerm.toLowerCase()) || // ← use this instead of searchTerm
      account.accountNumber.toString().includes(debouncedSearchTerm)
  );

  const getUploadMode = (): UploadMode =>
    accounts.length === 0 ? "initial" : "update";

  return (
    <Box className="account-manager-container account-manager">
      <Typography variant="h2" gutterBottom>
        Accounts Manager
      </Typography>

      {(isAdmin || isSuperAdmin) && (
        <>
          <Typography>
            You can upload a <strong>CSV or Excel</strong> file to add or update
            accounts.
          </Typography>

          <Box component="ul" sx={{ pl: 3, mt: 1 }}>
            <Box component="li">
              If the file contains accounts that match existing account numbers,
              only new fields will be added.
            </Box>
            <Box component="li">
              To replace existing fields, delete the account first or edit it
              below.
            </Box>
          </Box>

          <Button
            variant="outlined"
            onClick={() => setShowTemplateModal(true)}
            sx={{ marginBottom: 2 }}
          >
            View Upload File Template
          </Button>

          <Tooltip title="Upload CSV or Excel to update accounts">
            <Button
              className="account-submit-button"
              variant="contained"
              component="label"
              sx={{ marginBottom: 2 }}
            >
              {accounts.length > 0 ? "Update Accounts" : "Upload Accounts"}
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  handleFileUpload(file); // trust CustomConfirmation will pop after merging
                }}
              />
            </Button>
          </Tooltip>

          <Typography>
            Want to add one account manually? Click below to fill out a form —
            it will be added and saved automatically.
          </Typography>
          <Button
            className="account-submit-button"
            variant="outlined"
            onClick={handleAddAccount}
            sx={{ marginBottom: 2 }}
          >
            Add Single Account
          </Button>
        </>
      )}

      <Typography variant="body1" gutterBottom>
        Search by account name or number to edit:
      </Typography>
      <TextField
        className="account-search-field"
        label="Search Account"
        variant="outlined"
        value={searchTerm}
        onChange={handleSearch}
        sx={{ marginBottom: 2 }}
      />

      {selectedAccount && (
        <AccountForm
          isOpen={true}
          initialData={selectedAccount}
          editMode
          onSubmit={(data) => {
            setConfirmMessage(
              `Save changes to account #${data.accountNumber} (${data.accountName})?`
            );

            setPendingUpdates([data]);
            setShowConfirm(true);
            setSelectedAccount(null); // Optional: could delay until confirm
          }}
          onCancel={() => setSelectedAccount(null)}
        />
      )}

      <Pagination
        count={Math.ceil(filteredAccounts.length / itemsPerPage)}
        page={currentPage}
        onChange={(_e, page) => setCurrentPage(page)}
        sx={{ marginY: 2 }}
      />

      <TableContainer component={Paper}>
        <Table className="account-table" aria-label="accounts table">
          <TableHead>
            <TableRow>
              <TableCell>Account Number</TableCell>
              <TableCell>Account Name</TableCell>
              <TableCell>Address</TableCell>
              {/* <TableCell>City</TableCell> */}
              {/* <TableCell>Zip Code</TableCell> */}
              <TableCell>Type of Account</TableCell>
              <TableCell>Chain Name</TableCell>
              <TableCell>Chain Type</TableCell>
              <TableCell>Sales Route Number(s)</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAccounts
              .slice(
                (currentPage - 1) * itemsPerPage,
                currentPage * itemsPerPage
              )
              .map((account) => (
                <TableRow key={account.accountNumber}>
                  <TableCell>{account.accountNumber}</TableCell>
                  <TableCell>{account.accountName}</TableCell>
                  <TableCell>{account.accountAddress}</TableCell>
                  {/* <TableCell>{account.city || "-"}</TableCell> */}
                  {/* <TableCell>{account.zipCode || "-"}</TableCell> */}
                  <TableCell>{account.typeOfAccount || "-"}</TableCell>
                  <TableCell>{account.chain || "-"}</TableCell>
                  <TableCell>{account.chainType || "-"}</TableCell>
                  <TableCell>
                    {Array.isArray(account.salesRouteNums)
                      ? account.salesRouteNums.join(" and ")
                      : account.salesRouteNums || "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="text"
                      size="small"
                      color="primary"
                      onClick={() => handleEditAccount(account)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      color="error"
                      onClick={() => {
                        setConfirmMessage(
                          `Are you sure you want to delete ${account.accountName}?`
                        );
                        setPendingUpdates([account]);
                        setShowConfirm(true);
                      }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <AccountForm
        isOpen={openAddAccountModal}
        initialData={newAccount || undefined}
        onSubmit={(data) => {
          const mode = getUploadMode();
          handleAccountsUpload([data], accounts, mode);
          setOpenAddAccountModal(false);
        }}
        onCancel={() => setOpenAddAccountModal(false)}
      />

      <CustomConfirmation
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmUpdates}
        message={confirmMessage}
        loading={isSubmitting}
      />

      <UploadTemplateModal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
      />
    </Box>
  );
};

export default AccountManager;
