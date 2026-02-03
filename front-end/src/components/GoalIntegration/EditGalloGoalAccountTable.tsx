import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Paper,
  TextField,
  Autocomplete,
  useMediaQuery,
} from "@mui/material";
import { EnrichedGalloAccountType } from "../../utils/types";
import { useSelector } from "react-redux";
import { selectCompanyUsers } from "../../Slices/userSlice";
import "./editGalloGoalAccountTable.css";

const usersFromRoutes = (routes: string[] | undefined, users: any[]) => {
  if (!Array.isArray(routes)) return [];
  const routeSet = new Set(routes.map(String));
  return users.filter(
    (u) => u.salesRouteNum && routeSet.has(String(u.salesRouteNum)),
  );
};

const routesFromUsers = (users: any[]) =>
  users.map((u) => String(u.salesRouteNum)).filter(Boolean);

/* -------------------------------- props -------------------------------- */

interface Props {
  accounts: EnrichedGalloAccountType[];
  onChange: (accounts: EnrichedGalloAccountType[]) => void;
}

/* ------------------------------ helpers ------------------------------ */

const isResolved = (a: EnrichedGalloAccountType) =>
  Array.isArray(a.salesRouteNums) && a.salesRouteNums.length === 1;

/* ------------------------------ component ------------------------------ */

const EditGalloGoalAccountTable: React.FC<Props> = ({ accounts, onChange }) => {
  const [rows, setRows] = useState(accounts);
  const [search, setSearch] = useState("");
  const isMobile = useMediaQuery("(max-width:900px)");

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

  useEffect(() => {
    setRows(accounts);
  }, [accounts]);

  const assignUsers = (account: EnrichedGalloAccountType, users: any[]) => {
    const nextRoutes = routesFromUsers(users);

    const updated = rows.map((a) =>
      a.distributorAcctId === account.distributorAcctId
        ? { ...a, salesRouteNums: nextRoutes }
        : a,
    );

    setRows(updated);
    onChange(updated);
  };

  const filtered = rows.filter((a) =>
    a.accountName?.toLowerCase().includes(search.toLowerCase()),
  );

  const unresolvedCount = rows.filter((a) => !isResolved(a)).length;

  return (
    <div className="edit-goal-accounts-root">
      {unresolvedCount > 0 && (
        <div className="edit-goal-accounts-warning">
          <strong>{unresolvedCount}</strong> account(s) need a salesperson. Each
          active account must have exactly one assigned user.
        </div>
      )}

      <div className="edit-goal-accounts-search">
        <TextField
          size="small"
          fullWidth
          placeholder="Search accounts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ---------------------------- MOBILE ---------------------------- */}
      {isMobile && (
        <div className="edit-goal-accounts-cards">
          {filtered.map((account) => {
            const assignedUsers = usersFromRoutes(
              account.salesRouteNums,
              salesUsers,
            );

            return (
              <TableRow
                key={account.distributorAcctId}
                className={
                  isResolved(account) ? "" : "edit-goal-accounts-row-unresolved"
                }
              >
                <TableCell>{account.accountName}</TableCell>

                <TableCell>
                  {account.salesRouteNums?.join(", ") || "—"}
                </TableCell>

                <TableCell>
                  <Autocomplete
                    multiple
                    size="small"
                    getOptionDisabled={(option) =>
                      assignedUsers.length >= 1 &&
                      !assignedUsers.some((u) => u.uid === option.uid)
                    }
                    options={salesUsers}
                    getOptionLabel={(u) => `${u.firstName} ${u.lastName}`}
                    value={assignedUsers}
                    onChange={(_, users) => assignUsers(account, users)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder={
                          assignedUsers.length === 0
                            ? "Select user"
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
        </div>
      )}

      {/* ---------------------------- DESKTOP ---------------------------- */}
      {!isMobile && (
        <Paper>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Account</TableCell>
                <TableCell>Sales Route</TableCell>
                <TableCell>Assigned Salesperson</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filtered.map((account) => {
                const assignedUsers = usersFromRoutes(
                  account.salesRouteNums,
                  salesUsers,
                );

                return (
                  <TableRow
                    key={account.distributorAcctId}
                    className={
                      isResolved(account)
                        ? ""
                        : "edit-goal-accounts-row-unresolved"
                    }
                  >
                    <TableCell>{account.accountName}</TableCell>

                    <TableCell>
                      {account.salesRouteNums?.join(", ") || "—"}
                    </TableCell>

                    <TableCell>
                      <Autocomplete
                        multiple
                        size="small"
                        getOptionDisabled={(option) =>
                          assignedUsers.length >= 1 &&
                          !assignedUsers.some((u) => u.uid === option.uid)
                        }
                        options={salesUsers}
                        getOptionLabel={(u) => `${u.firstName} ${u.lastName}`}
                        value={assignedUsers}
                        onChange={(_, users) => assignUsers(account, users)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder={
                              assignedUsers.length === 0
                                ? "Select user"
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
        </Paper>
      )}
    </div>
  );
};

export default EditGalloGoalAccountTable;
