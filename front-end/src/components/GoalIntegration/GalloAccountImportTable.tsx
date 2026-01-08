import React, { useEffect, useState } from "react";
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Checkbox,
  Button,
  Paper,
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
} from "@mui/material";
import { EnrichedGalloAccountType, GalloAccountType } from "../../utils/types";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../utils/store";
import "./galloAccountImportTable.css";
import { selectCompanyUsers } from "../../Slices/userSlice";

interface AccountTableProps {
  accounts: EnrichedGalloAccountType[];
  unmatchedAccounts: GalloAccountType[];
  program: GalloProgramType;
  goal: GalloGoalType;
  onConfirm: (args: {
    selectedAccounts: EnrichedGalloAccountType[];
    notifyUserIds: string[]; // 👈 NEW
  }) => Promise<void>;
}

const GalloAccountImportTable: React.FC<AccountTableProps> = ({
  accounts,
  unmatchedAccounts,
  program,
  goal,
  onConfirm,
}) => {
  const [editableAccounts, setEditableAccounts] =
    useState<EnrichedGalloAccountType[]>(accounts);
  const dispatch = useAppDispatch();
  const [isSaving, setIsSaving] = useState(false); // isSaving isnt used.  should we have a loading elemetn?
  const [selectedAccounts, setSelectedAccounts] =
    useState<EnrichedGalloAccountType[]>(accounts);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const [searchAccounts, setSearchAccounts] = useState("");
  const [searchRoute, setSearchRoute] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [searchSalesperson, setSearchSalesperson] = useState("");
  const companyUsers = useSelector(selectCompanyUsers) || [];
  const [notifyUserIds, setNotifyUserIds] = useState<string[]>([]);

  const handleSearchSalesperson = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSearchSalesperson(event.target.value);
  };

  const handleSearchAccounts = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchAccounts(event.target.value);
  };

  // Handle sales route search
  const handleSearchRoute = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchRoute(event.target.value);
  };

  const salesUsers = (companyUsers ?? []).filter(
    (u) =>
      typeof u.salesRouteNum === "string" && u.salesRouteNum.trim().length > 0
  );

  const getAssignedUserIdsFromRoutes = (routes: string[]) => {
    const routeSet = new Set(routes.map(String));
    return salesUsers
      .filter((u) => u.salesRouteNum && routeSet.has(String(u.salesRouteNum)))
      .map((u) => u.uid);
  };

  const routesFromSelectedUserIds = (userIds: string[]) => {
    const routes = userIds
      .map((id) => salesUsers.find((u) => u.uid === id)?.salesRouteNum)
      .filter((v): v is string => Boolean(v))
      .map((v) => String(v));

    // unique + stable
    return Array.from(new Set(routes));
  };

  const nameFromRoutes = (routes: string[]) => {
    const routeSet = new Set(routes.map(String));
    const names = salesUsers
      .filter((u) => u.salesRouteNum && routeSet.has(String(u.salesRouteNum)))
      .map((u) => `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim())
      .filter(Boolean);

    return names.length ? names.join(", ") : "N/A";
  };

  const filteredAccounts = editableAccounts.filter((account) => {
    if (!account.accountName) return false;

    const matchesAccountName = account.accountName
      .toLowerCase()
      .includes(searchAccounts.toLowerCase());

    const matchesRoute =
      searchRoute === "" ||
      (Array.isArray(account.salesRouteNums)
        ? account.salesRouteNums.some((num) =>
            (num as unknown as string)?.toString().includes(searchRoute)
          )
        : ((account.salesRouteNums as unknown as string) ?? "").includes(
            searchRoute
          ));

    const matchesSalesperson =
      searchSalesperson === "" ||
      account.salesPersonsName
        ?.toLowerCase()
        .includes(searchSalesperson.toLowerCase());

    return matchesAccountName && matchesRoute && matchesSalesperson;
  });

  useEffect(() => {
    setEditableAccounts(accounts);
    setSelectedAccounts(accounts);
  }, [accounts]);

  useEffect(() => {
    setIsAllSelected(
      editableAccounts.length > 0 &&
        editableAccounts.length === selectedAccounts.length
    );
  }, [selectedAccounts, editableAccounts]);

  const handleCheckboxChange = (account: EnrichedGalloAccountType) => {
    setSelectedAccounts((prev) => {
      const exists = prev.some(
        (a) => a.distributorAcctId === account.distributorAcctId
      );

      return exists
        ? prev.filter((a) => a.distributorAcctId !== account.distributorAcctId)
        : [...prev, account];
    });
  };

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;

  const paginatedAccounts = filteredAccounts.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const totalPages = Math.ceil(filteredAccounts.length / rowsPerPage); // unused? is it helpful for showing anything?

  const [selectedPage, setSelectedPage] = useState(1);
  const selectedPerPage = 10;

  const paginatedSelectedAccounts = selectedAccounts.slice(
    (selectedPage - 1) * selectedPerPage,
    selectedPage * selectedPerPage
  );

  const totalSelectedPages = Math.ceil(
    selectedAccounts.length / selectedPerPage
  );

  const selectAll = () => {
    setSelectedAccounts(editableAccounts);
  };

  const deselectAll = () => {
    setSelectedAccounts([]);
  };

  const availableNotifyUsers = companyUsers.filter((u) =>
    selectedAccounts.some((acc) =>
      acc.salesRouteNums?.includes(String(u.salesRouteNum))
    )
  );

  useEffect(() => {
    // default: notify all eligible users
    const allEligibleIds = availableNotifyUsers.map((u) => u.uid);
    setNotifyUserIds(allEligibleIds);
  }, [availableNotifyUsers]);

  return (
    <TableContainer component={Paper} className="account-table">
      {/* Buttons */}
      <div className="accounts-toolbar">
        <Autocomplete
          multiple
          size="small"
          options={availableNotifyUsers}
          getOptionLabel={(u) =>
            `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
          }
          value={availableNotifyUsers.filter((u) =>
            notifyUserIds.includes(u.uid)
          )}
          onChange={(_, users) => setNotifyUserIds(users.map((u) => u.uid))}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Email notifications (optional)"
              placeholder="Select users to notify…"
              helperText="Only selected users will receive an email"
            />
          )}
        />

        <div className="toolbar-actions">
          <button onClick={selectAll}>Select All</button>
          <button onClick={deselectAll}>Deselect All</button>
          <button
            className="button-primary"
            disabled={!selectedAccounts.length}
            onClick={() => setShowConfirmDialog(true)}
          >
            Confirm
          </button>
        </div>
      </div>

      {/* Selected Accounts Summary */}
      <Box
        sx={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "8px",
          marginBottom: 2,
          // backgroundColor: "var(--background)",
        }}
      >
        <Typography variant="subtitle1" gutterBottom>
          {isAllSelected
            ? "All accounts selected"
            : `${selectedAccounts.length} account(s) selected:`}
        </Typography>

        {!isAllSelected && selectedAccounts.length > 0 && (
          <Box sx={{ maxHeight: 200, overflowY: "auto" }}>
            {paginatedSelectedAccounts.map((acc) => (
              <Box
                key={acc.distributorAcctId}
                display="flex"
                alignItems="center"
                gap={1}
                sx={{
                  borderBottom: "1px solid #444",
                  paddingY: 0.5,
                }}
              >
                <Checkbox
                  size="small"
                  checked
                  onChange={() => handleCheckboxChange(acc)}
                />
                <Typography variant="body2" noWrap>
                  {acc.accountName} - {acc.salesPersonsName}
                </Typography>
              </Box>
            ))}

            {/* Pagination Controls */}
            {totalSelectedPages > 1 && (
              <Box display="flex" justifyContent="center" gap={2} mt={1}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={selectedPage === 1}
                  onClick={() => setSelectedPage((prev) => prev - 1)}
                >
                  Previous
                </Button>
                <Typography variant="caption">
                  Page {selectedPage} of {totalSelectedPages}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={selectedPage === totalSelectedPages}
                  onClick={() => setSelectedPage((prev) => prev + 1)}
                >
                  Next
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Search Filters */}
      <Box display="flex" gap={2} sx={{ marginY: 2 }}>
        <TextField
          label="Search Account Name"
          variant="outlined"
          fullWidth
          value={searchAccounts}
          onChange={handleSearchAccounts}
        />
        <TextField
          label="Search Sales Route #"
          variant="outlined"
          fullWidth
          value={searchRoute}
          onChange={handleSearchRoute}
        />
        <TextField
          label="Search Salesperson Name"
          variant="outlined"
          fullWidth
          value={searchSalesperson}
          onChange={handleSearchSalesperson}
        />
      </Box>
      {unmatchedAccounts.length > 0 && (
        <Box
          sx={{
            border: "1px solid #f5c2c7",
            // backgroundColor: "#fff5f5",
            borderRadius: "8px",
            padding: 1.5,
            marginBottom: 2,
          }}
        >
          <Typography variant="subtitle2" color="error">
            ⚠️ {unmatchedAccounts.length} Gallo account(s) could not be matched
          </Typography>

          <Typography variant="body2">
            These accounts exist in Gallo Axis but do not exist in Displaygram.
            They will <strong>not</strong> be included in this goal.
          </Typography>

          <Box mt={1}>
            {unmatchedAccounts.slice(0, 5).map((acc) => (
              <Typography
                key={acc.distributorAcctId}
                variant="caption"
                sx={{ display: "block" }}
              >
                • Gallo Account ID: {acc.distributorAcctId}
              </Typography>
            ))}

            {unmatchedAccounts.length > 5 && (
              <Typography variant="caption">
                …and {unmatchedAccounts.length - 5} more
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Table */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Select</TableCell>
            <TableCell>Account Name</TableCell>
            <TableCell>Account Address</TableCell>
            <TableCell>Sales Route #</TableCell>
            <TableCell>Salesperson</TableCell>
            <TableCell>Assign To</TableCell> {/* ✅ NEW */}
            {/* <TableCell>Opp ID</TableCell> */}
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedAccounts.map((account) => (
            <TableRow key={account.oppId}>
              <TableCell>
                <Checkbox
                  checked={selectedAccounts.some(
                    (selected) =>
                      selected.distributorAcctId === account.distributorAcctId
                  )}
                  onChange={() => handleCheckboxChange(account)}
                />
              </TableCell>
              <TableCell>{account.accountName || "N/A"}</TableCell>
              <TableCell>{account.accountAddress || "N/A"}</TableCell>
              <TableCell>
                {Array.isArray(account.salesRouteNums) &&
                account.salesRouteNums.length > 0
                  ? account.salesRouteNums.join(", ")
                  : "N/A"}
              </TableCell>
              <TableCell>{account.salesPersonsName}</TableCell>
              <TableCell>
                <Autocomplete
                  multiple
                  size="small"
                  options={salesUsers}
                  getOptionLabel={(u) =>
                    `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                  }
                  value={salesUsers.filter((u) =>
                    getAssignedUserIdsFromRoutes(
                      account.salesRouteNums ?? []
                    ).includes(u.uid)
                  )}
                  onChange={(_, users) => {
                    const userIds = users.map((u) => u.uid);
                    const nextRoutes = routesFromSelectedUserIds(userIds);
                    const nextName =
                      nextRoutes.length > 0
                        ? nameFromRoutes(nextRoutes)
                        : "Unassigned";

                    setEditableAccounts((prev) =>
                      prev.map((a) =>
                        a.distributorAcctId === account.distributorAcctId
                          ? {
                              ...a,
                              salesRouteNums: nextRoutes,
                              salesPersonsName: nextName,
                            }
                          : a
                      )
                    );

                    setSelectedAccounts((prev) =>
                      prev.map((a) =>
                        a.distributorAcctId === account.distributorAcctId
                          ? {
                              ...a,
                              salesRouteNums: nextRoutes,
                              salesPersonsName: nextName,
                            }
                          : a
                      )
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Assign salespeople…"
                      variant="outlined"
                    />
                  )}
                />

                <small className="helper-text">
                  Selecting users overrides Sales Route # for this account.
                </small>
              </TableCell>
              {/* <TableCell>{account.oppId}</TableCell> */}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <Box display="flex" justifyContent="center" gap={2} mt={2}>
        <Button
          variant="outlined"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => prev - 1)}
        >
          Previous
        </Button>
        <Typography variant="body2">
          Page {currentPage} of{" "}
          {Math.ceil(filteredAccounts.length / rowsPerPage)}
        </Typography>
        <Button
          variant="outlined"
          disabled={
            currentPage === Math.ceil(filteredAccounts.length / rowsPerPage)
          }
          onClick={() => setCurrentPage((prev) => prev + 1)}
        >
          Next
        </Button>
      </Box>

      {/* Confirm Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        aria-labelledby="confirm-dialog-title"
      >
        <DialogTitle id="confirm-dialog-title">
          Confirm Goal Creation
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            You are about to create a <strong>Gallo goal</strong>:
          </Typography>

          <Typography sx={{ mt: 1 }}>
            <strong>Program:</strong> {program.programTitle}
          </Typography>

          <Typography>
            <strong>Goal:</strong> {goal.goal}
          </Typography>

          <Typography sx={{ mt: 1 }}>
            <strong>Accounts:</strong> {selectedAccounts.length}
          </Typography>

          <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
            {notifyUserIds.length === 0
              ? "No email notifications will be sent."
              : `${notifyUserIds.length} user(s) will be notified by email.`}
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setShowConfirmDialog(false)}
            color="secondary"
            variant="contained"
          >
            Cancel
          </Button>
          <Button
            disabled={isSaving || selectedAccounts.length === 0}
            onClick={async () => {
              setIsSaving(true);
              try {
                await onConfirm({
                  selectedAccounts,
                  notifyUserIds,
                });
              } finally {
                setIsSaving(false);
                setShowConfirmDialog(false);
              }
            }}
          >
            {isSaving ? "Saving…" : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </TableContainer>
  );
};

export default GalloAccountImportTable;
