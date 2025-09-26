import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
} from "@mui/material";
import { DataGrid, GridColDef, GridToolbar } from "@mui/x-data-grid";
import { CompanyAccountType } from "../../utils/types";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../utils/firebase";
import CustomConfirmation from "../CustomConfirmation";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";

interface BackupMeta {
  id: string;
  createdAt: string;
  accountCount: number;
  data: CompanyAccountType[];
  deleted?: boolean;
}
interface AccountsBackupProps {
  companyId: string | undefined;
  backupAccounts: (companyId: string | undefined) => Promise<void>;
  refreshTrigger: number;
}

const AccountsBackup: React.FC<AccountsBackupProps> = ({
  companyId,
  backupAccounts,
  refreshTrigger,
}) => {
  const dispatch = useAppDispatch();
  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<BackupMeta | null>(null);
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [showBackUps, setShowBackUps] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<BackupMeta | null>(null);
  const [loadingRestore, setLoadingRestore] = useState(false);

  const handleRestoreBackup = (backup: BackupMeta) => {
    setConfirmRestore(backup); // triggers confirmation modal
  };

  const confirmRestoreBackup = async () => {
    if (!confirmRestore || !companyId) return;
    setLoadingRestore(true);

    try {
      const companyRef = doc(db, "companies", companyId);
      const companySnap = await getDoc(companyRef);
      if (!companySnap.exists()) throw new Error("Company not found");

      const { accountsId } = companySnap.data();
      if (!accountsId) throw new Error("No accountsId for company");

      const accountsRef = doc(db, "accounts", accountsId);

      await updateDoc(accountsRef, {
        accounts: confirmRestore.data,
      });

      console.log(`✅ Restored accounts from ${confirmRestore.createdAt}`);
      setConfirmRestore(null);
      setSelectedBackup(null);
      await fetchBackups(); // optional, in case anything changed
    } catch (err) {
      console.error("Failed to restore backup:", err);
    } finally {
      setLoadingRestore(false);
    }
  };

  const fetchBackups = async () => {
    const snapshot = await getDocs(collection(db, "accounts_backup"));
    const results: BackupMeta[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (data.deleted) continue; // Soft delete filter
      const accounts = data.accounts as CompanyAccountType[];
      results.push({
        id: docSnap.id,
        createdAt: docSnap.id.replace("backup_", ""),
        accountCount: accounts.length,
        data: accounts,
      });
    }

    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setBackups(results);
  };
  useEffect(() => {
    if (companyId) fetchBackups();
  }, [companyId, refreshTrigger]); // 👈 re-run when flag changes

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    setLoadingDelete(true);
    try {
      await updateDoc(doc(db, "accounts_backup", confirmDeleteId), {
        deleted: true,
      });
      setBackups((prev) => prev.filter((b) => b.id !== confirmDeleteId));
      dispatch(showMessage("Accounts successfully restored."));
    } catch (err) {
      console.error("Failed to soft delete backup:", err);
    } finally {
      setLoadingDelete(false);
      setConfirmDeleteId(null);
    }
  };

  const columns: GridColDef[] = [
    { field: "createdAt", headerName: "Backup Date", flex: 1 },
    { field: "accountCount", headerName: "# of Accounts", flex: 1 },
    {
      field: "view",
      headerName: "View",
      sortable: false,
      flex: 1,
      renderCell: (params) => (
        <Button
          size="small"
          onClick={() => {
            const match = backups.find((b) => b.id === params.row.id);
            if (match) setSelectedBackup(match);
          }}
        >
          View
        </Button>
      ),
    },
    {
      field: "delete",
      headerName: "Delete",
      sortable: false,
      flex: 1,
      renderCell: (params) => (
        <Button
          size="small"
          color="error"
          onClick={() => setConfirmDeleteId(params.row.id)}
        >
          Delete
        </Button>
      ),
    },
    {
      field: "restore",
      headerName: "Restore",
      sortable: false,
      flex: 1,
      renderCell: (params) => {
        const backup = backups.find((b) => b.id === params.row.id);
        if (!backup) return null;

        return (
          <button
            className="btn-outline"
            onClick={() => handleRestoreBackup(backup)}
          >
            Restore
          </button>
        );
      },
    },
  ];

  const rows = backups.map((b) => ({
    id: b.id,
    createdAt: b.createdAt,
    accountCount: b.accountCount,
  }));

  const accountColumns: GridColDef[] = [
    { field: "accountNumber", headerName: "Account #", flex: 1 },
    { field: "accountName", headerName: "Name", flex: 1 },
    { field: "streetAddress", headerName: "Street Address", flex: 1 },
    { field: "city", headerName: "City", flex: 1 },
    { field: "state", headerName: "State", flex: 1 },
    {
      field: "salesRouteNums",
      headerName: "Routes",
      flex: 1,
      renderCell: (params) => (params.value || []).join(", "),
    },
    { field: "typeOfAccount", headerName: "Type", flex: 1 },
    { field: "chain", headerName: "Chain", flex: 1 },
    { field: "chainType", headerName: "Chain Type", flex: 1 },
  ];

  const filteredAccounts =
    selectedBackup?.data.filter((acc) => {
      const combined =
        `${acc.accountNumber} ${acc.accountName} ${acc.city} ${acc.state} ${acc.chain}`.toLowerCase();
      return combined.includes(search.toLowerCase());
    }) || [];

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        <button onClick={() => setShowBackUps(!showBackUps)}>
          {showBackUps === false ? "Show backup accounts" : "Close"}
        </button>
      </Typography>
      {showBackUps && (
        <Box sx={{ height: 200, width: "100%" }}>
          <button onClick={() => backupAccounts(companyId)}>
            Backup Accounts
          </button>

          <DataGrid
            rows={rows}
            columns={columns}
            slots={{ toolbar: GridToolbar }}
            initialState={{
              pagination: { paginationModel: { pageSize: 5, page: 0 } },
            }}
            pageSizeOptions={[5, 10, 25]}
          />
        </Box>
      )}

      <Dialog
        open={!!selectedBackup}
        onClose={() => setSelectedBackup(null)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>Backup Details: {selectedBackup?.createdAt}</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, width: "300px" }}>
            <TextField
              label="Search accounts"
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Box>
          <Box sx={{ height: 600, width: "100%" }}>
            <DataGrid
              rows={filteredAccounts.map((acc, i) => ({ id: i, ...acc }))}
              columns={accountColumns}
              slots={{ toolbar: GridToolbar }}
              initialState={{
                pagination: { paginationModel: { pageSize: 10, page: 0 } },
              }}
              pageSizeOptions={[10, 25, 50]}
            />
          </Box>
        </DialogContent>
      </Dialog>

      <CustomConfirmation
        isOpen={!!confirmDeleteId}
        message={`Delete backup ${confirmDeleteId?.replace("backup_", "")}?
This will mark it as deleted.`}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleConfirmDelete}
        loading={loadingDelete}
      />
      <CustomConfirmation
        isOpen={!!confirmRestore}
        message={`Restore to backup from ${confirmRestore?.createdAt}? 
This will replace your current accounts.`}
        onClose={() => setConfirmRestore(null)}
        onConfirm={confirmRestoreBackup}
        loading={loadingRestore}
      />
    </Box>
  );
};

export default AccountsBackup;
