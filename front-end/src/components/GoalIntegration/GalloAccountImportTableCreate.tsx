import React, { useEffect, useMemo, useState } from "react";
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
  Autocomplete,
} from "@mui/material";
import {
  EnrichedGalloAccountType,
  GalloAccountType,
  GalloProgramType,
} from "../../utils/types";
import { useSelector } from "react-redux";
import { RootState } from "../../utils/store";
import { selectCompanyUsers } from "../../Slices/userSlice";
import "./galloAccountImportTable.css";

/* -------------------------------- helpers -------------------------------- */

const usersFromRoutes = (routes: string[] | undefined, users: any[]) => {
  if (!Array.isArray(routes)) return [];
  const routeSet = new Set(routes.map(String));
  return users.filter(
    (u) => u.salesRouteNum && routeSet.has(String(u.salesRouteNum)),
  );
};

const routesFromUsers = (users: any[]) =>
  users.map((u) => String(u.salesRouteNum)).filter(Boolean);

const ensureActiveStatus = (
  a: EnrichedGalloAccountType,
): EnrichedGalloAccountType => ({
  ...a,
  status: a.status ?? "active",
});

const isResolved = (a: EnrichedGalloAccountType) =>
  Array.isArray(a.salesRouteNums) && a.salesRouteNums.length === 1;

/* -------------------------------- props -------------------------------- */

interface Props {
  accounts: EnrichedGalloAccountType[];
  selectedAccounts: EnrichedGalloAccountType[];
  setSelectedAccounts: React.Dispatch<
    React.SetStateAction<EnrichedGalloAccountType[]>
  >;
  unmatchedAccounts: GalloAccountType[];
  program: GalloProgramType;
  onContinue: (payload: {
    selectedAccounts: EnrichedGalloAccountType[];
  }) => void;
}

/* -------------------------------- component -------------------------------- */

const GalloAccountImportTableCreate: React.FC<Props> = ({
  accounts,
  selectedAccounts,
  setSelectedAccounts,
  unmatchedAccounts,
  program,
  onContinue,
}) => {
  const [editableAccounts, setEditableAccounts] =
    useState<EnrichedGalloAccountType[]>(accounts);

  const [searchAccounts, setSearchAccounts] = useState("");
  const [searchRoute, setSearchRoute] = useState("");

  const companyUsers = useSelector(selectCompanyUsers) || [];

  const salesUsers = useMemo(
    () =>
      companyUsers.filter(
        (u) =>
          typeof u.salesRouteNum === "string" &&
          u.salesRouteNum.trim().length > 0,
      ),
    [companyUsers],
  );

  /* --------------------------- derived account lists -------------------------- */

  const unresolvedAccounts = useMemo(
    () => editableAccounts.filter((a) => !isResolved(a)),
    [editableAccounts],
  );

  const unresolvedSelectedCount = selectedAccounts.filter(
    (a) => !isResolved(a),
  ).length;

  const filteredAccounts = editableAccounts.filter((account) => {
    const matchesName =
      !searchAccounts ||
      (account.accountName ?? "")
        .toLowerCase()
        .includes(searchAccounts.toLowerCase());

    const matchesRoute =
      !searchRoute ||
      (Array.isArray(account.salesRouteNums) &&
        account.salesRouteNums.some((r) => String(r).includes(searchRoute)));

    return matchesName && matchesRoute;
  });

  /* ------------------------------ selection logic ----------------------------- */

  const toggleAccount = (account: EnrichedGalloAccountType) => {
    setSelectedAccounts((prev) =>
      prev.some((a) => a.distributorAcctId === account.distributorAcctId)
        ? prev.filter((a) => a.distributorAcctId !== account.distributorAcctId)
        : [...prev, ensureActiveStatus(account)],
    );
  };

  const assignUsers = (account: EnrichedGalloAccountType, users: any[]) => {
    const nextRoutes = routesFromUsers(users);

    setEditableAccounts((prev) =>
      prev.map((a) =>
        a.distributorAcctId === account.distributorAcctId
          ? { ...a, salesRouteNums: nextRoutes }
          : a,
      ),
    );

    setSelectedAccounts((prev) =>
      prev.map((a) =>
        a.distributorAcctId === account.distributorAcctId
          ? ensureActiveStatus({ ...a, salesRouteNums: nextRoutes })
          : a,
      ),
    );
  };

  const hasInvalidSelectedAccounts = selectedAccounts.some(
    (a) => !Array.isArray(a.salesRouteNums) || a.salesRouteNums.length !== 1,
  );

  /* ---------------------------------- render ---------------------------------- */

  return (
    <TableContainer component={Paper} className="account-table">
      {/* 🚨 Creation warning */}
      {unresolvedSelectedCount > 0 && (
        <Box sx={{ p: 2, mb: 2, border: "1px solid #ffe08a", borderRadius: 1 }}>
          <Typography variant="subtitle2">
            {unresolvedSelectedCount} selected account(s) need exactly one
            salesperson
          </Typography>
          <Typography variant="caption">
            Remove extra users or assign one to continue.
          </Typography>
        </Box>
      )}

      {unmatchedAccounts.length > 0 && (
        <Box
          sx={{
            border: "1px solid #f5c2c7",
            backgroundColor: "#fff5f5",
            borderRadius: 1,
            p: 2,
            mb: 2,
          }}
        >
          <Typography variant="subtitle2" color="error">
            {unmatchedAccounts.length} Gallo account(s) could not be matched
          </Typography>

          <Typography variant="caption" display="block" sx={{ mb: 1 }}>
            These accounts exist in Gallo Axis but do not exist in Displaygram.
            They will not be included in this goal.
          </Typography>

          <ul className="unmatched-account-list">
            {unmatchedAccounts.slice(0, 5).map((a) => (
              <li key={a.distributorAcctId}>{a.distributorAcctId}</li>
            ))}
            {unmatchedAccounts.length > 5 && (
              <li>…and {unmatchedAccounts.length - 5} more</li>
            )}
          </ul>
        </Box>
      )}

      {/* Search */}
      <Box display="flex" gap={1} mb={2}>
        <TextField
          size="small"
          placeholder="Account name"
          value={searchAccounts}
          onChange={(e) => setSearchAccounts(e.target.value)}
        />
        <TextField
          size="small"
          placeholder="Sales route #"
          value={searchRoute}
          onChange={(e) => setSearchRoute(e.target.value)}
        />
      </Box>

      {/* Table */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>Account</TableCell>
            <TableCell>Route(s)</TableCell>
            <TableCell>Assign salesperson</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {filteredAccounts.map((account) => {
            const checked = selectedAccounts.some(
              (a) => a.distributorAcctId === account.distributorAcctId,
            );

            const assignedUsers = usersFromRoutes(
              account.salesRouteNums,
              salesUsers,
            );

            return (
              <TableRow
                key={account.distributorAcctId}
                sx={{
                  backgroundColor: isResolved(account) ? "inherit" : "#fff8e1",
                }}
              >
                <TableCell>
                  <Checkbox
                    checked={checked}
                    onChange={() => toggleAccount(account)}
                  />
                </TableCell>

                <TableCell>{account.accountName}</TableCell>

                <TableCell>
                  {account.salesRouteNums?.join(", ") || "—"}
                </TableCell>

                <TableCell>
                  <Autocomplete
                    multiple
                    size="small"
                    options={salesUsers}
                    value={assignedUsers}
                    getOptionLabel={(u) => `${u.firstName} ${u.lastName}`}
                    isOptionEqualToValue={(option, value) =>
                      option.uid === value.uid
                    }
                    onChange={(_, users) => assignUsers(account, users)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder={
                          assignedUsers.length === 0
                            ? "Select salesperson"
                            : assignedUsers.length > 1
                              ? "Remove extra users"
                              : ""
                        }
                      />
                    )}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Continue */}
      <Box display="flex" justifyContent="flex-end" mt={2}>
        <Button
          variant="contained"
          disabled={selectedAccounts.length === 0 || hasInvalidSelectedAccounts}
          onClick={() => onContinue({ selectedAccounts })}
        >
          Review & Confirm
        </Button>
      </Box>
    </TableContainer>
  );
};

export default GalloAccountImportTableCreate;
