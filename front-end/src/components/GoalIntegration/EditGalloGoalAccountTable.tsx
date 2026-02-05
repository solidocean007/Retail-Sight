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
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { EnrichedGalloAccountType, UserType } from "../../utils/types";
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

const getAssignedUsers = (
  account: EnrichedGalloAccountType,
  salesUsers: UserType[],
) => usersFromRoutes(account.salesRouteNums, salesUsers);

const isAccountResolved = (
  account: EnrichedGalloAccountType,
  salesUsers: UserType[],
) => usersFromRoutes(account.salesRouteNums, salesUsers).length === 1;

/* ------------------------------ component ------------------------------ */

const EditGalloGoalAccountTable: React.FC<Props> = ({ accounts, onChange }) => {
  const [rows, setRows] = useState(accounts);
  const [search, setSearch] = useState("");
  const isMobile = useMediaQuery("(max-width:700px)");

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

  const isResolved = (a: EnrichedGalloAccountType) =>
    isAccountResolved(a, salesUsers);

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
      {/* {anySelectedAccountNotResolved.length > 0 && (
        <div className="edit-goal-accounts-warning">
          <strong>{anySelectedAccountNotResolved.length}</strong> selected account or account(s) need one salesperson. 
        </div>
      )} */}

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
              <div
                key={account.distributorAcctId}
                className={
                  isResolved(account)
                    ? "edit-goal-accounts-row-resolved"
                    : "edit-goal-accounts-row-unresolved"
                }
              >
                <div className="edit-gallo-goal-card">
                  <div className="edit-gallo-goal-card-content">
                    <div className="edit-gallo-card-account-header">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={account.status === "active"}
                            onChange={(e) =>
                              onChange(
                                accounts.map((a) =>
                                  a.distributorAcctId ===
                                  account.distributorAcctId
                                    ? {
                                        ...a,
                                        status: e.target.checked
                                          ? "active"
                                          : "inactive",
                                      }
                                    : a,
                                ),
                              )
                            }
                          />
                        }
                        label=""
                      />
                      <div className="edit-gallo-card-account-name">
                        <TableCell>{account.accountName}</TableCell>
                      </div>
                    </div>

                    <div className="edit-gallo-card-account-user">
                      <div>{account.salesRouteNums?.join(", ") || "—"}</div>
                      <div>
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
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
                <TableCell>Status</TableCell>
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
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={account.status === "active"}
                          onChange={(e) =>
                            onChange(
                              accounts.map((a) =>
                                a.distributorAcctId ===
                                account.distributorAcctId
                                  ? {
                                      ...a,
                                      status: e.target.checked
                                        ? "active"
                                        : "inactive",
                                    }
                                  : a,
                              ),
                            )
                          }
                        />
                      }
                      label=""
                    />

                    <TableCell>{account.accountName}</TableCell>

                    <TableCell>
                      {account.salesRouteNums?.join(", ") || "—"}
                    </TableCell>

                    <TableCell>
                      {account.status === "active" &&
                        !isAccountResolved(account, salesUsers) && (
                          <Typography
                            variant="caption"
                            sx={{ color: "var(--warning-color)" }}
                          >
                            This account needs exactly one salesperson
                          </Typography>
                        )}

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
