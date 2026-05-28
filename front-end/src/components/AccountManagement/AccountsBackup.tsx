import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, GridColDef, GridToolbar } from "@mui/x-data-grid";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { CompanyAccountType } from "../../utils/types";
import { db } from "../../utils/firebase";
import CustomConfirmation from "../CustomConfirmation";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import { normalizeFirestoreData } from "../../utils/normalize";

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<BackupMeta | null>(null);
  const [search, setSearch] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingRestore, setLoadingRestore] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);

  const fetchBackups = async () => {
    if (!companyId) return;

    const q = query(
      collection(db, "accounts_backup"),
      where("companyId", "==", companyId),
      where("deleted", "==", false),
    );

    const snapshot = await getDocs(q);

    const results: BackupMeta[] = snapshot.docs.map((docSnap) => {
      const raw = docSnap.data();
      const data = normalizeFirestoreData(raw);
      const accounts = (data.accounts || []) as CompanyAccountType[];

      return {
        id: docSnap.id,
        createdAt: data.createdAt || docSnap.id.replace("backup_", ""),
        accountCount: data.accountCount || accounts.length,
        data: accounts,
      };
    });

    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setBackups(results);
  };

  useEffect(() => {
    fetchBackups();
  }, [companyId, refreshTrigger]);

  const handleCreateBackup = async () => {
    setCreatingBackup(true);

    try {
      await backupAccounts(companyId);
      await fetchBackups();
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;

    setLoadingDelete(true);

    try {
      await updateDoc(doc(db, "accounts_backup", confirmDeleteId), {
        deleted: true,
      });

      setBackups((prev) => prev.filter((b) => b.id !== confirmDeleteId));
      dispatch(showMessage("Backup deleted."));
    } catch (err) {
      console.error("Failed to delete backup:", err);
      dispatch(showMessage("Failed to delete backup."));
    } finally {
      setLoadingDelete(false);
      setConfirmDeleteId(null);
    }
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

      dispatch(showMessage("Accounts restored from backup."));
      setConfirmRestore(null);
      setSelectedBackup(null);
      await fetchBackups();
    } catch (err) {
      console.error("Failed to restore backup:", err);
      dispatch(showMessage("Failed to restore backup."));
    } finally {
      setLoadingRestore(false);
    }
  };

  const filteredAccounts = useMemo(() => {
    if (!selectedBackup) return [];

    const term = search.toLowerCase().trim();

    if (!term) return selectedBackup.data;

    return selectedBackup.data.filter((acc) => {
      const combined = `${acc.accountNumber} ${acc.accountName} ${acc.city} ${acc.state} ${acc.chain}`.toLowerCase();
      return combined.includes(term);
    });
  }, [selectedBackup, search]);

  const backupRows = backups.map((b) => ({
    id: b.id,
    createdAt: b.createdAt,
    accountCount: b.accountCount,
  }));

  const backupColumns: GridColDef[] = [
    { field: "createdAt", headerName: "Backup Date", flex: 1 },
    { field: "accountCount", headerName: "Accounts", flex: 0.6 },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      flex: 1,
      renderCell: (params) => {
        const backup = backups.find((b) => b.id === params.row.id);
        if (!backup) return null;

        return (
          <Box display="flex" gap={1}>
            <Button size="small" onClick={() => setSelectedBackup(backup)}>
              View
            </Button>

            <Button
              size="small"
              variant="outlined"
              onClick={() => setConfirmRestore(backup)}
            >
              Restore
            </Button>

            <Button
              size="small"
              color="error"
              onClick={() => setConfirmDeleteId(backup.id)}
            >
              Delete
            </Button>
          </Box>
        );
      },
    },
  ];

  const accountColumns: GridColDef[] = [
    { field: "accountNumber", headerName: "Account #", flex: 0.8 },
    { field: "accountName", headerName: "Name", flex: 1.2 },
    { field: "streetAddress", headerName: "Street", flex: 1.2 },
    { field: "city", headerName: "City", flex: 0.8 },
    { field: "state", headerName: "State", flex: 0.5 },
    {
      field: "salesRouteNums",
      headerName: "Routes",
      flex: 0.8,
      renderCell: (params) => (params.value || []).join(", "),
    },
    { field: "typeOfAccount", headerName: "Type", flex: 0.8 },
    { field: "chain", headerName: "Chain", flex: 0.8 },
  ];

  return (
    <section className="accounts-backup-panel">
      <div className="accounts-backup-summary">
        <div>
          <strong>Account Backups</strong>
          <p>
            Create a restore point before large uploads, imports, or route
            reassignment changes.
          </p>
        </div>

        <div className="accounts-backup-actions">
          <Button
            size="small"
            variant="outlined"
            onClick={handleCreateBackup}
            disabled={creatingBackup}
          >
            {creatingBackup ? "Creating…" : "Create Backup"}
          </Button>

          <Button
            size="small"
            variant="outlined"
            onClick={() => setShowHistory((prev) => !prev)}
          >
            {showHistory ? "Hide History" : `View History (${backups.length})`}
          </Button>
        </div>
      </div>

      {showHistory && (
        <Box sx={{ height: 280, width: "100%", mt: 2 }}>
          <DataGrid
            rows={backupRows}
            columns={backupColumns}
            slots={{ toolbar: GridToolbar }}
            initialState={{
              pagination: { paginationModel: { pageSize: 5, page: 0 } },
            }}
            pageSizeOptions={[5, 10, 25]}
            disableRowSelectionOnClick
          />
        </Box>
      )}

      <Dialog
        open={!!selectedBackup}
        onClose={() => setSelectedBackup(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Backup Preview — {selectedBackup?.createdAt}
        </DialogTitle>

        <DialogContent>
          <TextField
            fullWidth
            label="Search backup accounts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            margin="normal"
          />

          <Box sx={{ height: 500, width: "100%" }}>
            <DataGrid
              rows={filteredAccounts.map((acc, index) => ({
                id: acc.accountNumber || index,
                ...acc,
              }))}
              columns={accountColumns}
              slots={{ toolbar: GridToolbar }}
              pageSizeOptions={[25, 50, 100]}
              disableRowSelectionOnClick
            />
          </Box>
        </DialogContent>
      </Dialog>

      <CustomConfirmation
        open={!!confirmDeleteId}
        title="Delete Backup?"
        message="This will hide the backup from your backup history. This action should only be used for old or unnecessary backups."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
        loading={loadingDelete}
      />

      <CustomConfirmation
        open={!!confirmRestore}
        title="Restore Account Backup?"
        message={`This will replace the current account list with ${confirmRestore?.accountCount || 0} accounts from this backup.`}
        onConfirm={confirmRestoreBackup}
        onCancel={() => setConfirmRestore(null)}
        loading={loadingRestore}
      />
    </section>
  );
};

export default AccountsBackup;