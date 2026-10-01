import {
  Autocomplete,
  Checkbox,
  FormControlLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import React, { useMemo, useState } from "react";

import { FireStoreGalloGoalDocType, UserType } from "../../utils/types";

import "./editGalloGoalAccountTable.css";

type AccountFilter = "all" | "active" | "inactive";

interface Props {
  accounts: FireStoreGalloGoalDocType["accounts"];
  statusFilter: AccountFilter;
  companyUsers: UserType[];
  onChange: (accounts: FireStoreGalloGoalDocType["accounts"]) => void;
}

const usersFromRoutes = (routes: string[] | undefined, users: UserType[]) => {
  if (!Array.isArray(routes)) return [];
  const routeSet = new Set(routes.map(String));
  return users.filter(
    (user) => user.salesRouteNum && routeSet.has(String(user.salesRouteNum)),
  );
};

const routesFromUsers = (users: UserType[]) =>
  users.map((user) => String(user.salesRouteNum ?? "")).filter(Boolean);

const EditGalloGoalAccountTable: React.FC<Props> = ({
  accounts,
  statusFilter,
  companyUsers,
  onChange,
}) => {
  const [search, setSearch] = useState("");
  const isMobile = useMediaQuery("(max-width:700px)");

  const salesUsers = useMemo(
    () =>
      companyUsers.filter(
        (user) =>
          typeof user.salesRouteNum === "string" &&
          user.salesRouteNum.trim().length > 0,
      ),
    [companyUsers],
  );

  const isResolved = (account: FireStoreGalloGoalDocType["accounts"][number]) =>
    account.status !== "active" ||
    usersFromRoutes(account.salesRouteNums, salesUsers).length === 1;

  const updateAccount = (
    target: FireStoreGalloGoalDocType["accounts"][number],
    changes: Partial<FireStoreGalloGoalDocType["accounts"][number]>,
  ) => {
    onChange(
      accounts.map((account) =>
        account.distributorAcctId === target.distributorAcctId
          ? { ...account, ...changes }
          : account,
      ),
    );
  };

  const visibleAccounts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return accounts.filter((account) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && account.status === "active") ||
        (statusFilter === "inactive" && account.status !== "active");
      const matchesSearch =
        !query ||
        [
          account.accountName,
          account.distributorAcctId,
          account.accountAddress,
        ].some((value) => value?.toLocaleLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [accounts, search, statusFilter]);

  const unresolvedCount = accounts.filter(
    (account) => !isResolved(account),
  ).length;

  const renderAssignment = (
    account: FireStoreGalloGoalDocType["accounts"][number],
  ) => {
    const assignedUsers = usersFromRoutes(account.salesRouteNums, salesUsers);

    return (
      <Autocomplete
        multiple
        size="small"
        disabled={account.status !== "active"}
        getOptionDisabled={(option) =>
          assignedUsers.length >= 1 &&
          !assignedUsers.some((user) => user.uid === option.uid)
        }
        options={salesUsers}
        getOptionLabel={(user) => `${user.firstName} ${user.lastName}`.trim()}
        isOptionEqualToValue={(option, value) => option.uid === value.uid}
        value={assignedUsers}
        onChange={(_, users) =>
          updateAccount(account, { salesRouteNums: routesFromUsers(users) })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={
              assignedUsers.length === 0
                ? "Select salesperson"
                : assignedUsers.length > 1
                  ? "Remove extra salespeople"
                  : ""
            }
          />
        )}
      />
    );
  };

  const renderStatusToggle = (
    account: FireStoreGalloGoalDocType["accounts"][number],
  ) => (
    <FormControlLabel
      control={
        <Checkbox
          checked={account.status === "active"}
          onChange={(event) =>
            updateAccount(account, {
              status: event.target.checked ? "active" : "inactive",
            })
          }
        />
      }
      label={account.status === "active" ? "Active" : "Excluded"}
    />
  );

  return (
    <div className="edit-goal-accounts-root">
      <div className="edit-goal-accounts-tools">
        <TextField
          size="small"
          fullWidth
          label="Search accounts"
          placeholder="Name, account number, or address…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <span className="edit-goal-accounts-tools__result">
          {visibleAccounts.length} shown
        </span>
      </div>

      {unresolvedCount > 0 && (
        <div className="edit-goal-accounts-warning" role="alert">
          <strong>{unresolvedCount}</strong> active{" "}
          {unresolvedCount === 1 ? "account needs" : "accounts need"} exactly
          one salesperson before changes can be saved.
        </div>
      )}

      {visibleAccounts.length === 0 ? (
        <div className="edit-goal-accounts-empty">
          No accounts match this filter.
        </div>
      ) : isMobile ? (
        <div className="edit-goal-accounts-cards">
          {visibleAccounts.map((account) => (
            <article
              key={account.distributorAcctId}
              className={`edit-gallo-goal-card ${
                isResolved(account)
                  ? "edit-goal-accounts-row-resolved"
                  : "edit-goal-accounts-row-unresolved"
              }`}
            >
              <div className="edit-gallo-card-account-header">
                <div>
                  <strong>{account.accountName}</strong>
                  <small>{account.distributorAcctId}</small>
                </div>
                {renderStatusToggle(account)}
              </div>
              <div className="edit-gallo-card-account-user">
                {account.status === "active" && !isResolved(account) && (
                  <Typography variant="caption" color="warning.main">
                    Select exactly one salesperson
                  </Typography>
                )}
                {renderAssignment(account)}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Paper className="edit-goal-accounts-table-wrap">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Sales route</TableCell>
                <TableCell>Assigned salesperson</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleAccounts.map((account) => (
                <TableRow
                  key={account.distributorAcctId}
                  className={
                    isResolved(account)
                      ? ""
                      : "edit-goal-accounts-row-unresolved"
                  }
                >
                  <TableCell>{renderStatusToggle(account)}</TableCell>
                  <TableCell>
                    <strong>{account.accountName}</strong>
                    <small className="edit-goal-account-number">
                      {account.distributorAcctId}
                    </small>
                  </TableCell>
                  <TableCell>
                    {account.salesRouteNums?.join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    {account.status === "active" && !isResolved(account) && (
                      <Typography variant="caption" color="warning.main">
                        Select exactly one salesperson
                      </Typography>
                    )}
                    {renderAssignment(account)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </div>
  );
};

export default EditGalloGoalAccountTable;
