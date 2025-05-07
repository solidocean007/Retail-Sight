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
  TextField,
  Tooltip,
} from "@mui/material";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  updateDoc,
} from "@firebase/firestore";
import { CompanyAccountType } from "../../utils/types";
import { db } from "../../utils/firebase";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import getCompanyAccountId from "../../utils/helperFunctions/getCompanyAccountId";
import { useAppDispatch } from "../../utils/store";
import { setAllAccounts } from "../../Slices/allAccountsSlice";
import {
  deleteAccountFromIndexedDB,
  saveAllCompanyAccountsToIndexedDB,
} from "../../utils/database/indexedDBUtils";
import { showMessage } from "../../Slices/snackbarSlice";
import {
  getAccountsForAdd,
  getAccountsForUpdate,
} from "./utils/splitAccountUpload";
import CustomConfirmation from "../CustomConfirmation";
import AccountForm from "./AccountForm";
import UploadTemplateModal from "./UploadTemplateModal";
import "./styles/uploadTemplateModal.css";

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
  const [accounts, setAccounts] = useState<CompanyAccountType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [confirmMessage, setConfirmMessage] = useState("");
  const [pendingUpdates, setPendingUpdates] = useState<
    CompanyAccountType[] | null
  >(null);
  const [fileData, setFileData] = useState<CompanyAccountType[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openAddAccountModal, setOpenAddAccountModal] = useState(false);
  const [newAccount, setNewAccount] = useState<CompanyAccountType | null>(null);
  const [selectedAccount, setSelectedAccount] =
    useState<CompanyAccountType | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const itemsPerPage = 15;

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    if (!user?.companyId) return;

    try {
      const accountsId = await getCompanyAccountId(user.companyId);
      if (!accountsId) return;

      const snapshot = await getDoc(doc(db, "accounts", accountsId));
      if (!snapshot.exists()) return;

      const raw = snapshot.data().accounts as CompanyAccountType[];
      const cleaned = raw.map((acc) => ({
        ...acc,
        salesRouteNums: Array.isArray(acc.salesRouteNums)
          ? acc.salesRouteNums.map(String)
          : [],
      }));

      setAccounts(cleaned);
      dispatch(setAllAccounts(cleaned));
      await saveAllCompanyAccountsToIndexedDB(cleaned);
    } catch (err) {
      console.error("Error loading accounts:", err);
    }
  };

  const saveAccountsToFirestore = async (
    mergedAccounts: CompanyAccountType[]
  ) => {
    if (!user?.companyId) return;

    try {
      const companyDocRef = doc(db, "companies", user.companyId);
      const companySnap = await getDoc(companyDocRef);

      if (companySnap.exists()) {
        const { accountsId } = companySnap.data();

        if (accountsId) {
          const accountsDocRef = doc(db, "accounts", accountsId);
          await updateDoc(accountsDocRef, {
            accounts: mergedAccounts.map((a) =>
              Object.fromEntries(
                Object.entries(a).filter(([, v]) => v !== undefined)
              )
            ),
          });
        } else {
          const newDocRef = await addDoc(collection(db, "accounts"), {
            accounts: mergedAccounts,
          });
          await updateDoc(companyDocRef, { accountsId: newDocRef.id });
        }

        setAccounts(mergedAccounts);
        dispatch(setAllAccounts(mergedAccounts));
        await saveAllCompanyAccountsToIndexedDB(mergedAccounts);
      }
    } catch (err) {
      console.error("Firestore update failed:", err);
      dispatch(showMessage("Failed to save accounts to Firestore."));
    }
  };

  const confirmUpdates = async () => {
    setIsSubmitting(true);
    const minDelay = new Promise((res) => setTimeout(res, 500)); // force delay

    try {
      if (
        pendingUpdates &&
        pendingUpdates.length === 1 &&
        confirmMessage.toLowerCase().includes("delete")
      ) {
        const accountNumberToDelete = pendingUpdates[0].accountNumber;
        await Promise.all([
          handleDeleteAccount(accountNumberToDelete),
          minDelay,
        ]);
        dispatch(showMessage("Account deleted successfully"));
      } else if (fileData.length > 0 && user?.companyId) {
        await Promise.all([saveAccountsToFirestore(fileData), minDelay]);

        const message =
          getUploadMode() === "initial"
            ? `${pendingUpdates?.length || 0} account(s) added.`
            : `${pendingUpdates?.length || 0} account(s) updated.`;

        dispatch(showMessage(message));
      }
    } catch (err) {
      console.error("Error confirming updates:", err);
      dispatch(showMessage("Failed to update accounts."));
    } finally {
      setIsSubmitting(false);
      setPendingUpdates(null);
      setShowConfirm(false);
      setFileData([]);
    }
  };

  const handleDeleteAccount = async (accNum: string) => {
    const updated = accounts.filter((a) => a.accountNumber !== accNum);
    await saveAccountsToFirestore(updated);
    await deleteAccountFromIndexedDB(accNum);
  };

  const handleAddAccounts = async (file: File) => {
    const newAccounts = await getAccountsForAdd(file);
    setPendingUpdates(newAccounts);
    setFileData([...accounts, ...newAccounts]);
    setConfirmMessage(`Add ${newAccounts.length} new account(s)?`);
    setShowConfirm(true);
  };

  const handleUpdateAccounts = async (file: File) => {
    const updatedAccounts = await getAccountsForUpdate(file, accounts);
    const map = new Map(accounts.map((a) => [a.accountNumber, a]));
    updatedAccounts.forEach((acc) => map.set(acc.accountNumber, acc));
    setPendingUpdates(updatedAccounts);
    setFileData(Array.from(map.values()));
    setConfirmMessage(`Update ${updatedAccounts.length} existing account(s)?`);
    setShowConfirm(true);
  };

  const getUploadMode = (): UploadMode =>
    accounts.length === 0 ? "initial" : "update";

  const handleManualSubmit = (data: CompanyAccountType) => {
    const map = new Map(accounts.map((a) => [a.accountNumber, a]));
    map.set(data.accountNumber, data);
    setPendingUpdates([data]);
    setFileData(Array.from(map.values()));
    setConfirmMessage(`Save new account "${data.accountName}"?`);
    setShowConfirm(true);
  };

  const filteredAccounts = accounts.filter(
    (a) =>
      a.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.accountNumber.toString().includes(searchTerm)
  );

  return (
    <Box className="account-manager-container account-manager">
      <Typography variant="h5" gutterBottom>
        Manage Your Company’s Retail Accounts
      </Typography>
      <Box sx={{ marginBottom: 2 }}>
        <Typography variant="body1">
          <strong>To add accounts</strong>: Upload a CSV or Excel file with new
          accounts. You can also use the "Quickly Add Single Account" button to
          manually input one.
        </Typography>
        <Typography variant="body1">
          <strong>To update existing accounts</strong>: Upload a file that
          includes the same account numbers you'd like to update.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Account number, name, and at least one route number are required. Use
          commas to separate multiple route numbers.
        </Typography>
      </Box>

      {(isAdmin || isSuperAdmin) && (
        <>
          <Typography>
            You can upload a <strong>CSV or Excel</strong> file to add or update
            accounts.
          </Typography>

          <Button
            variant="outlined"
            onClick={() => setShowTemplateModal(true)}
            sx={{ marginBottom: 2 }}
          >
            View Upload File Template
          </Button>

          <Tooltip title="Upload CSV or Excel to create accounts">
            <Button
              variant="contained"
              component="label"
              sx={{ marginBottom: 2 }}
            >
              {accounts.length
                ? "Add more Accounts"
                : "Upload Initial Accounts"}
              <input
                hidden
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAddAccounts(file);
                }}
              />
            </Button>
          </Tooltip>

          <Tooltip title="Upload CSV or Excel to update existing accounts">
            <Button
              variant="contained"
              component="label"
              sx={{ marginBottom: 2 }}
              disabled={accounts.length === 0}
            >
              Update Accounts
              <input
                hidden
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpdateAccounts(file);
                }}
              />
            </Button>
          </Tooltip>

          <Button
            variant="outlined"
            onClick={() => {
              setNewAccount({
                accountNumber: "",
                accountName: "",
                accountAddress: "",
                salesRouteNums: [],
                typeOfAccount: undefined,
                chain: "",
                chainType: "independent",
              });
              setOpenAddAccountModal(true);
            }}
            sx={{ marginBottom: 2 }}
          >
            Quickly Add Single Account
          </Button>
        </>
      )}

      <TextField
        label="Search Account"
        variant="outlined"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ marginBottom: 2 }}
      />

      <Pagination
        count={Math.ceil(filteredAccounts.length / itemsPerPage)}
        page={currentPage}
        onChange={(_, p) => setCurrentPage(p)}
        sx={{ marginY: 2 }}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Account Number</TableCell>
              <TableCell>Account Name</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Chain</TableCell>
              <TableCell>Chain Type</TableCell>
              <TableCell>Routes</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAccounts
              .slice(
                (currentPage - 1) * itemsPerPage,
                currentPage * itemsPerPage
              )
              .map((a, i) => (
                <TableRow key={i}>
                  <TableCell>{a.accountNumber}</TableCell>
                  <TableCell>{a.accountName}</TableCell>
                  <TableCell>{a.accountAddress}</TableCell>
                  <TableCell>{a.typeOfAccount || "-"}</TableCell>
                  <TableCell>{a.chain || "-"}</TableCell>
                  <TableCell>{a.chainType || "-"}</TableCell>
                  <TableCell>{(a.salesRouteNums || []).join(", ")}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => setSelectedAccount(a)}>
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => {
                        setPendingUpdates([a]);
                        setConfirmMessage(
                          `Are you sure you want to delete "${a.accountName}"?`
                        );
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

      {selectedAccount && (
        <AccountForm
          isOpen
          initialData={selectedAccount}
          editMode
          onSubmit={(data) => {
            setSelectedAccount(null);
            handleManualSubmit(data);
          }}
          onCancel={() => setSelectedAccount(null)}
        />
      )}

      {openAddAccountModal && newAccount && (
        <AccountForm
          isOpen
          initialData={newAccount}
          onSubmit={(data) => {
            setOpenAddAccountModal(false);
            handleManualSubmit(data);
          }}
          onCancel={() => setOpenAddAccountModal(false)}
        />
      )}

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
