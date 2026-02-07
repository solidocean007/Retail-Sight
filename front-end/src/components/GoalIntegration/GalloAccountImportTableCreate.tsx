import React, { useEffect, useMemo, useState } from "react";
import {
  Checkbox,
  Button,
  Box,
  TextField,
  Autocomplete,
  Typography,
} from "@mui/material";
import {
  EnrichedGalloAccountType,
  GalloAccountType,
  GalloProgramType,
  UserType,
} from "../../utils/types";
import { useSelector } from "react-redux";
import { selectCompanyUsers } from "../../Slices/userSlice";
import "./galloAccountImportTableCreate.css";

/* ---------------- helpers ---------------- */

const usersFromRoutes = (routes: string[] | undefined, users: any[]) => {
  if (!Array.isArray(routes)) return [];
  const routeSet = new Set(routes.map(String));
  return users.filter(
    (u) => u.salesRouteNum && routeSet.has(String(u.salesRouteNum))
  );
};

const unmappedRoutesForRow = (
  row: EnrichedGalloAccountType,
  users: UserType[]
): string[] => {
  if (!Array.isArray(row.salesRouteNums)) return [];

  const userRouteSet = new Set(users.map((u) => String(u.salesRouteNum)));

  return row.salesRouteNums.filter((r) => !userRouteSet.has(String(r)));
};

const ensureActiveStatus = (a: EnrichedGalloAccountType) => ({
  ...a,
  status: a.status ?? "active",
});

const isResolved = (
  row: EnrichedGalloAccountType,
  selectedAccounts: EnrichedGalloAccountType[],
  salesUsers: UserType[]
) => {
  const selected = selectedAccounts.find(
    (a) => a.distributorAcctId === row.distributorAcctId
  );

  if (!selected) return true; // not selected → irrelevant

  const assignedUsers = usersFromRoutes(selected.salesRouteNums, salesUsers);

  return assignedUsers.length === 1;
};

/* ---------------- props ---------------- */

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

/* ---------------- component ---------------- */

const GalloAccountImportTableCreate: React.FC<Props> = ({
  accounts,
  selectedAccounts,
  setSelectedAccounts,
  unmatchedAccounts,
  onContinue,
}) => {
  const [rows, setRows] = useState(accounts);
  const [searchName, setSearchName] = useState("");
  const [searchRoute, setSearchRoute] = useState("");
  const companyUsers = useSelector(selectCompanyUsers) || [];

  const salesUsers = useMemo(
    () =>
      companyUsers.filter(
        (u) =>
          typeof u.salesRouteNum === "string" &&
          u.salesRouteNum.trim().length > 0
      ),
    [companyUsers]
  );

  useEffect(() => {
    setSelectedAccounts((prev) =>
      prev.map((a) => {
        const assigned = usersFromRoutes(a.salesRouteNums, salesUsers);
        return assigned.length === 1
          ? { ...a, salesRouteNums: [String(assigned[0].salesRouteNum)] }
          : a;
      })
    );
  }, [salesUsers]);

  const selectedUsersForRow = (row: EnrichedGalloAccountType) => {
    const selected = selectedAccounts.find(
      (a) => a.distributorAcctId === row.distributorAcctId
    );

    return selected?.salesRouteNums
      ? usersFromRoutes(selected.salesRouteNums, salesUsers)
      : [];
  };

  /* ---------- selection ---------- */

  const toggleAccount = (row: EnrichedGalloAccountType) => {
    setSelectedAccounts((prev) =>
      prev.some((a) => a.distributorAcctId === row.distributorAcctId)
        ? prev.filter((a) => a.distributorAcctId !== row.distributorAcctId)
        : [...prev, ensureActiveStatus(row)]
    );
  };

  const assignUsers = (row: EnrichedGalloAccountType, users: UserType[]) => {
    const nextRoutes =
      users.length === 1 ? [String(users[0].salesRouteNum)] : [];

    const updated = rows.map((a) =>
      a.distributorAcctId === row.distributorAcctId
        ? { ...a, salesRouteNums: nextRoutes }
        : a
    );

    setRows(updated);

    setSelectedAccounts((prev) =>
      prev.map((a) =>
        a.distributorAcctId === row.distributorAcctId
          ? ensureActiveStatus({ ...a, salesRouteNums: nextRoutes })
          : a
      )
    );
  };

  /* ---------- validation ---------- */

  const invalidSelectedCount = selectedAccounts.filter((a) => {
    const assignedUsers = usersFromRoutes(a.salesRouteNums, salesUsers);
    return assignedUsers.length !== 1;
  }).length;

  /* ---------- filtering ---------- */

  const filtered = rows.filter((a) => {
    const nameMatch =
      !searchName ||
      a.accountName?.toLowerCase().includes(searchName.toLowerCase());

    const routeMatch =
      !searchRoute ||
      a.salesRouteNums?.some((r) => String(r).includes(searchRoute));

    return nameMatch && routeMatch;
  });

  /* ---------- render ---------- */

  return (
    <div className="gallo-create-root">
      {/* footer */}
      {/* <div className="gallo-create-footer">
        <Button
          variant="contained"
          disabled={selectedAccounts.length === 0 || invalidSelectedCount > 0}
          onClick={() => onContinue({ selectedAccounts })}
        >
          Review & Confirm
        </Button>
      </div> */}
      {/* warning */}
      {invalidSelectedCount > 0 && (
        <div className="gallo-create-warning">
          <strong>{invalidSelectedCount}</strong> selected account(s) need
          exactly one salesperson.
        </div>
      )}

      {/* unmatched */}
      {unmatchedAccounts.length > 0 && (
        <div className="gallo-create-unmatched">
          <strong>{unmatchedAccounts.length}</strong> Gallo account(s) could not
          be matched.
          <ul>
            {unmatchedAccounts.slice(0, 5).map((a) => (
              <li key={a.distributorAcctId}>{a.distributorAcctId}</li>
            ))}
          </ul>
        </div>
      )}

      {/* filters */}
      <div className="gallo-create-filters">
        <TextField
          size="small"
          placeholder="Account name"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />
        <TextField
          size="small"
          placeholder="Sales route #"
          value={searchRoute}
          onChange={(e) => setSearchRoute(e.target.value)}
        />
      </div>

      {/* rows */}
      <div className="gallo-create-list">
        {filtered.map((row) => {
          const checked = selectedAccounts.some(
            (a) => a.distributorAcctId === row.distributorAcctId
          );

          const assignedUsers = selectedUsersForRow(row);
          const unmappedRoutes = unmappedRoutesForRow(row, salesUsers);

          return (
            <div
              key={row.distributorAcctId}
              className={`gallo-create-row ${
                isResolved(row, selectedAccounts, salesUsers)
                  ? ""
                  : "unresolved"
              }`}
            >
              <div className="gallo-create-row-header">
                <Checkbox
                  checked={checked}
                  onChange={() => toggleAccount(row)}
                />
                <span className="account-name">{row.accountName}</span>
              </div>

              <div className="gallo-create-meta">
                <span className="label">Route</span>
                <span>{row.salesRouteNums?.join(", ") || "—"}</span>
              </div>
              {checked && assignedUsers.length !== 1 && (
                <Typography
                  variant="caption"
                  sx={{ color: "var(--warning-color)" }}
                >
                  Please select exactly one salesperson
                </Typography>
              )}
              {checked && unmappedRoutes.length > 0 && (
                <Typography
                  variant="caption"
                  sx={{ color: "var(--warning-color)" }}
                >
                  Route{unmappedRoutes.length > 1 ? "s" : ""}{" "}
                  <strong>{unmappedRoutes.join(", ")}</strong>{" "}
                  {unmappedRoutes.length > 1 ? "do" : "does"} not match any
                  salesperson
                </Typography>
              )}

              <div
                className={`gallo-create-assign ${
                  assignedUsers.length === 1
                    ? "single-user"
                    : assignedUsers.length > 1
                      ? "multi-user"
                      : ""
                }`}
              >
                <Autocomplete
                  multiple
                  size="small"
                  disablePortal
                  openOnFocus
                  options={salesUsers}
                  value={assignedUsers}
                  getOptionLabel={(u) =>
                    `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                  }
                  isOptionEqualToValue={(o, v) => o.uid === v.uid}
                  onChange={(_, users) => assignUsers(row, users)}
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GalloAccountImportTableCreate;
