import React, { useEffect, useRef, useState } from "react";
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
  setDoc,
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
  AccountDiff,
  getAccountsForAdd,
  getAccountsForAddOrUpdate,
  parseAccountsFromFile,
  // parseAccountsFromFile,
} from "./utils/splitAccountUpload";
import CustomConfirmation from "../CustomConfirmation";
import AccountForm from "./AccountForm";
import UploadTemplateModal from "./UploadTemplateModal";
import "./styles/accountsManager.css";
import { writeCustomerTypesToCompany } from "./utils/accountsHelper";
import UploadReviewModal, { UnifiedDiff } from "./UploadReviewModal";
import { getAccountDiffs } from "./utils/getAccountDiffs";
import AccountsBackup from "./AccountsBackup";

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
  const companyId = user?.companyId;
  const [accounts, setAccounts] = useState<CompanyAccountType[]>([]);
  const [isUploading, setIsUploading] = useState(false); // setIsUploading isnt used

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [accountDiffs, setAccountDiffs] = useState<UnifiedDiff[]>([]);

  const [confirmMessage, setConfirmMessage] = useState("");
  const [pendingUpdates, setPendingUpdates] = useState<
    CompanyAccountType[] | null
  >(null);
  const [fileData, setFileData] = useState<CompanyAccountType[]>([]);
  const [pendingUploadMode, setPendingUploadMode] = useState<
    "add" | "update" | null
  >(null);

  const [showDiffModal, setShowDiffModal] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [refreshBackupsFlag, setRefreshBackupsFlag] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openAddAccountModal, setOpenAddAccountModal] = useState(false);
  const [newAccount, setNewAccount] = useState<CompanyAccountType | null>(null);
  const [selectedAccount, setSelectedAccount] =
    useState<CompanyAccountType | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [routeFilter, setRouteFilter] = useState<string>(""); // new filter state

  const addInputRef = useRef<HTMLInputElement>(null);
  const updateInputRef = useRef<HTMLInputElement>(null);

  const handleAccountsUpload = async (file: File) => {
    try {
      const parsed = await parseAccountsFromFile(file);
      console.log("✅ Parsed rows:", Object.keys(parsed).length);

      const diffs = getAccountDiffs(parsed, accounts); // now returns UnifiedDiff[]
      console.log("🔍 Diffs:", diffs);

      if (diffs.length === 0) {
        dispatch(showMessage("No changes found."));
        return;
      }

      setAccountDiffs(diffs);
      setShowDiffModal(true);
    } catch (err) {
      console.error("❌ Failed to process file", err);
      dispatch(showMessage("Error processing file."));
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleAccountsUpload(file);
    e.target.value = ""; // reset so same file can retrigger
  };

  const handleConfirmDiffUpload = async (selectedDiffs: UnifiedDiff[]) => {
    setShowDiffModal(false);

    try {
      const updates = selectedDiffs.map((d) => d.updated);
      const map = new Map(accounts.map((a) => [a.accountNumber, a]));

      updates.forEach((acc) => map.set(acc.accountNumber, acc));

      const merged = Array.from(map.values());
      await saveAccountsToFirestore(merged);

      dispatch(showMessage(`${updates.length} account(s) processed.`));
    } catch (err) {
      console.error("Error saving updates:", err);
      dispatch(showMessage("Failed to update accounts."));
    }
  };

  const promptAddUpload = () => {
    setPendingUploadMode("add");
    setShowBackupPrompt(true);
  };

  const promptUpdateUpload = () => {
    setPendingUploadMode("update");
    setShowBackupPrompt(true);
  };

  const handleBackupConfirm = async () => {
    await backupAccounts(companyId);
    setShowBackupPrompt(false);

    if (pendingUploadMode === "add") {
      addInputRef.current?.click();
    } else if (pendingUploadMode === "update") {
      updateInputRef.current?.click();
    }
  };

  const handleBackupDecline = () => {
    setShowBackupPrompt(false);

    if (pendingUploadMode === "add") {
      addInputRef.current?.click();
    } else if (pendingUploadMode === "update") {
      updateInputRef.current?.click();
    }
  };

  const itemsPerPage = 15;

  const handleTemplateModal = () => {
    console.log("Toggling template modal");
    setShowTemplateModal(!showTemplateModal);
  };

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

    try {
      if (
        pendingUpdates &&
        pendingUpdates.length === 1 &&
        confirmMessage.toLowerCase().includes("delete")
      ) {
        await handleDeleteAccount(pendingUpdates[0].accountNumber);
        dispatch(showMessage("Account deleted successfully"));
      } else if (fileData.length && user?.companyId) {
        const map = new Map(accounts.map((a) => [a.accountNumber, a]));
        fileData.forEach((acc) => map.set(acc.accountNumber, acc));
        const merged = Array.from(map.values());

        await saveAccountsToFirestore(merged); // ✅ Primary write

        try {
          await writeCustomerTypesToCompany(user.companyId, merged); // ✅ Secondary write
        } catch (configErr) {
          console.warn(
            "Accounts saved, but failed to update customer types:",
            configErr
          );
          dispatch(
            showMessage("Accounts saved, but failed to update customer types.")
          );
        }

        const mode = getUploadMode();
        dispatch(
          showMessage(
            `${pendingUpdates?.length || 0} account(s) ${
              mode === "initial" ? "added" : "updated"
            }.`
          )
        );
      }
    } catch (err) {
      console.error("Error confirming updates:", err);
      dispatch(showMessage("Failed to update accounts."));
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
      setPendingUpdates(null);
      setFileData([]);
    }
  };

  const handleDeleteAccount = async (accNum: string) => {
    const updated = accounts.filter((a) => a.accountNumber !== accNum);

    await saveAccountsToFirestore(updated);
    await deleteAccountFromIndexedDB(accNum);

    // 🧠 Check if any accounts still use the deleted type
    const deletedAccount = accounts.find((a) => a.accountNumber === accNum);
    const deletedType = deletedAccount?.typeOfAccount;

    if (user?.companyId && deletedType) {
      const stillUsed = updated.some((a) => a.typeOfAccount === deletedType);

      if (!stillUsed) {
        try {
          const configRef = doc(
            db,
            "companies",
            user.companyId,
            "config",
            "general"
          );
          const configSnap = await getDoc(configRef);

          if (configSnap.exists()) {
            const configData = configSnap.data();
            const customerTypes: string[] = configData.customerTypes || [];

            const updatedTypes = customerTypes.filter((t) => t !== deletedType);
            await setDoc(
              configRef,
              { customerTypes: updatedTypes },
              { merge: true }
            );

            console.log(`Removed unused customer type: ${deletedType}`);
          }
        } catch (err) {
          console.warn("Failed to update customerTypes after deletion:", err);
        }
      }
    }
  };

  const actuallyAddAccounts = async (file: File) => {
    if (!user) return;
    const newAccounts = await getAccountsForAdd(file);

    // Filter to only accounts that don't already exist
    const existingAccountNumbers = new Set(
      accounts.map((a) => a.accountNumber)
    );
    const trulyNewAccounts = newAccounts.filter(
      (a) => !existingAccountNumbers.has(a.accountNumber)
    );

    if (trulyNewAccounts.length === 0) {
      dispatch(showMessage("No new accounts found in uploaded file."));
      return;
    }

    setPendingUpdates(trulyNewAccounts);
    setFileData([...accounts, ...trulyNewAccounts]);
    setConfirmMessage(
      `Add ${trulyNewAccounts.length} completely new account(s)?`
    );
    setShowConfirm(true);
  };

  const actuallyUpdateAccounts = async (file: File) => {
    console.log("📁 File selected:", file.name);

    try {
      const changes = await getAccountsForAddOrUpdate(file, accounts);

      console.log("✅ Parsed changes:", changes.length, changes.slice(0, 3));

      if (changes.length === 0) {
        dispatch(showMessage("No changes found."));
        setAccountDiffs([]);
        setShowDiffModal(true);
        return;
      }

      // 🚩 Now you pass `changes` to the diff modal
      setAccountDiffs(changes); // Type 'UnifiedAccountChange[]' is not assignable to type 'AccountDiff[]'
      setShowDiffModal(true);
    } catch (err) {
      console.error("❌ Failed to process file", err);
      dispatch(showMessage("Error processing file."));
    }
  };

  async function backupAccounts(companyId: string | undefined) {
    try {
      if (!companyId) throw new Error("No companyId provided");

      const companyRef = doc(db, "companies", companyId);
      const companySnap = await getDoc(companyRef);
      if (!companySnap.exists()) throw new Error("Company not found");

      const { accountsId } = companySnap.data();
      if (!accountsId) throw new Error("No accountsId for company");

      const accountsRef = doc(db, "accounts", accountsId);
      const accountsSnap = await getDoc(accountsRef);
      if (!accountsSnap.exists())
        throw new Error("Accounts document not found");

      const accountsData = accountsSnap.data();

      const dateStr = new Date().toISOString().split("T")[0];
      const backupRef = doc(db, "accounts_backup", `backup_${dateStr}`);

      await setDoc(backupRef, accountsData);
      setRefreshBackupsFlag((f) => f + 1); // 🔄 bump flag
      dispatch(showMessage("Accounts backup completed successfully."));
    } catch (err) {
      console.warn("Backup skipped:", err);
    }
  }

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

  // Utility: normalize strings (lowercase, collapse spaces)
  // Normalize helper
  // Utility: normalize strings (lowercase, collapse spaces)
  // Utility: normalize strings (lowercase, strip punctuation, strip spaces)
  const normalize = (val: any) =>
    String(val ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const filteredAccounts = accounts.filter((a) => {
    const query = normalize(searchTerm);

    const searchable = normalize(
      [
        a.accountNumber,
        a.accountName,
        a.accountAddress,
        a.streetAddress,
        a.city,
        a.state,
        a.typeOfAccount,
        a.chain,
        a.chainType,
        (a.salesRouteNums || []).join(" "),
      ].join(" ")
    );

    // search: AND over tokens; if query empty, pass
    const matchesSearch =
      !query || query.split(" ").every((token) => searchable.includes(token));

    // route: substring match on any route; if filter empty, pass
    const routeQ = routeFilter.trim().toLowerCase();
    const matchesRoute =
      !routeQ ||
      (a.salesRouteNums || []).some((r) =>
        String(r).toLowerCase().includes(routeQ)
      );

    return matchesSearch && matchesRoute;
  });

  const handleCloseDiffModal = () => {
    setShowDiffModal(false);
    setAccountDiffs([]);
    setFileData([]);
  };

  return (
    <Box className="account-manager-container account-manager">
      <Typography variant="h2" gutterBottom>
        Accounts Manager
      </Typography>

      {(isAdmin || isSuperAdmin) && (
        <>
          <AccountsBackup
            companyId={companyId}
            backupAccounts={backupAccounts}
            refreshTrigger={refreshBackupsFlag}
          />

          <Box
            className="account-instructions"
            sx={{ textAlign: "left", mb: 2 }}
          >
            <Typography variant="body1" gutterBottom>
              <strong>Instructions:</strong>
            </Typography>
            <Typography variant="body2">
              <strong>1.</strong> Upload a <code>.csv</code> or{" "}
              <code>.xlsx</code> file to add accounts in bulk.
            </Typography>
            <Typography variant="body2">
              <strong>2.</strong> Click <strong>"Add more Accounts"</strong> to
              append new accounts without overwriting.
            </Typography>
            <Typography variant="body2">
              <strong>3.</strong> Use <strong>"Update Accounts"</strong> to
              update existing accounts by account number.
            </Typography>
            <Typography variant="body2">
              <strong>4.</strong> Use{" "}
              <strong>"Quickly Add Single Account"</strong> to manually add one
              account.
            </Typography>
          </Box>
          <div
            className="account-management-buttons"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <button className="btn-outline" onClick={handleTemplateModal}>
              View Upload File Template
            </button>

            <button
              className="button-primary"
              onClick={() => updateInputRef.current?.click()}
            >
              Upload Accounts
            </button>

            <input
              ref={updateInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: "none" }}
              onChange={handleFileSelected}
            />

            <button
              className="button-primary"
              onClick={() => {
                setNewAccount({
                  accountNumber: "",
                  accountName: "",
                  accountAddress: "",
                  streetAddress: "",
                  city: "",
                  state: "",
                  salesRouteNums: [],
                  typeOfAccount: undefined,
                  chain: "",
                  chainType: "independent",
                });
                setOpenAddAccountModal(true);
              }}
            >
              Quickly Add Single Account
            </button>
          </div>
        </>
      )}

      <TextField
        label="Search Account"
        variant="outlined"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ marginBottom: 2 }}
      />

      <TextField
        label="Filter by Sales Route"
        variant="outlined"
        value={routeFilter}
        onChange={(e) => setRouteFilter(e.target.value)}
        sx={{ marginBottom: 2, marginLeft: 2 }}
        placeholder="e.g., 45"
      />

      <Typography variant="body2" sx={{ marginTop: 1 }}>
        {filteredAccounts.length} account
        {filteredAccounts.length !== 1 ? "s" : ""} found.
      </Typography>

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
              <TableCell>accountAddress</TableCell>
              <TableCell>streetAddress</TableCell>
              <TableCell>city</TableCell>
              <TableCell>state</TableCell>
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
                  <TableCell>{a.streetAddress}</TableCell>
                  <TableCell>{a.city}</TableCell>
                  <TableCell>{a.state}</TableCell>
                  <TableCell>{a.typeOfAccount || "-"}</TableCell>
                  <TableCell>{a.chain || "-"}</TableCell>
                  <TableCell>{a.chainType || "-"}</TableCell>
                  <TableCell>{(a.salesRouteNums || []).join(", ")}</TableCell>
                  <TableCell>
                    <Tooltip title="Edit this account">
                      <Button
                        size="small"
                        onClick={() => setSelectedAccount(a)}
                      >
                        Edit
                      </Button>
                    </Tooltip>
                    <Tooltip title="Delete this account">
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
                    </Tooltip>
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
      <CustomConfirmation
        isOpen={showBackupPrompt}
        message="Would you like to back up current accounts before uploading?"
        onClose={handleBackupDecline}
        onConfirm={handleBackupConfirm}
      />

      <UploadTemplateModal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
      />
      {isUploading && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <Typography color="white" variant="h6">
            Uploading accounts... Please wait
          </Typography>
        </Box>
      )}
      {showDiffModal && (
        <UploadReviewModal
          diffs={accountDiffs}
          onClose={handleCloseDiffModal}
          onConfirm={handleConfirmDiffUpload}
        />
      )}
    </Box>
  );
};

export default AccountManager;
