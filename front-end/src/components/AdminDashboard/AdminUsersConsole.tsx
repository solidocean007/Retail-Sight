import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { useSelector } from "react-redux";
import {
  selectCompanyUsers,
  selectUser,
  setCompanyUsers,
} from "../../Slices/userSlice";
import { UserType } from "../../utils/types";
import { db, functions } from "../../utils/firebase";
import { httpsCallable } from "firebase/functions";
import CustomConfirmation from "../CustomConfirmation";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import { normalizeFirestoreData } from "../../utils/normalize";
import AdminUserCard, { StatusPill } from "./AdminUserCard";
import { useDebouncedValue } from "../../hooks/useDebounce";
import { RecentlyAcceptedList } from "./RecentlyAcceptedList";
import { getAuth } from "firebase/auth";
import AuthClaimsDebug from "../dev/AuthClaimsDebug";

function toMillis(value?: string | Timestamp): number | null {
  if (!value) return null;
  if (typeof value === "string") {
    const t = new Date(value).getTime();
    return isNaN(t) ? null : t;
  }
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  return null;
}

function NoPendingInvitesOverlay() {
  return (
    <div
      style={{
        padding: "1.5rem",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: "0.9rem",
      }}
    >
      🎉 No pending invites
    </div>
  );
}

export interface InviteRow {
  id: string;
  __refPath?: string;
  email: string;
  role: string;
  salesRoute?: string | number;
  createdAt?: any;
  status?: string;
}

// ---- Types you'll likely already have ----
export type AdminUserRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  company: string;
  status: "active" | "inactive" | "pending";
  reportsTo: string;
  createdAt?: string; // normalized string date in your app
  lastActive?: string;
};

export default function AdminUsersConsole() {
  const dispatch = useAppDispatch();
  const isPhone = useMediaQuery("(max-width: 640px)"); // ~tailwind 'sm'
  const isTablet = useMediaQuery("(max-width: 1024px)"); // ~tailwind 'lg
  const me = useSelector(selectUser);
  const myRole = me?.role;
  const canHardDelete = myRole === "super-admin" || myRole === "developer";
  const isAdminOrUp = canHardDelete || myRole === "admin";

  const isMobile = useMediaQuery("(max-width: 768px)");
  const localUsers = (useSelector(selectCompanyUsers) ?? []) as UserType[];
  // console.log(localUsers)
  const activeUsers = localUsers.filter((u) => u.status === "active");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const companyId = useSelector(selectUser)?.companyId;
  const [companyLimits, setCompanyLimits] = useState<{
    used: number;
    limit: number;
  } | null>(null);

  useEffect(() => {
    if (!companyId) return;

    return onSnapshot(doc(db, "companies", companyId), (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();

      const baseLimit = data?.limits?.userLimit ?? 0;
      const addon = data?.billing?.addons?.extraUser ?? 0;
      const used = data?.usage?.users ?? 0;

      setCompanyLimits({
        used,
        limit: baseLimit + addon,
      });
    });
  }, [companyId]);

  const RECENT_DAYS = 70;
  const recentlyAcceptedInvites = useMemo(() => {
    const now = Date.now();

    return localUsers
      .filter((u) => {
        if (!u.email || !u.createdAt) return false;

        const wasInvited = invites.some(
          (i) => i.email.toLowerCase() === u.email!.toLowerCase()
        );
        if (!wasInvited) return false;

        const created = toMillis(u.createdAt as any);

        if (!created) return false;

        const ageDays = (now - created) / (1000 * 60 * 60 * 24);
        return ageDays <= RECENT_DAYS;
      })
      .sort((a, b) => {
        const aTime = new Date(a.createdAt as any).getTime();
        const bTime = new Date(b.createdAt as any).getTime();
        return bTime - aTime;
      });
  }, [localUsers, invites]);

  const pendingInvites = useMemo(() => {
    const userEmails = new Set(
      localUsers.map((u) => u.email?.toLowerCase()).filter(Boolean)
    );

    return invites.filter(
      (invite) => !userEmails.has(invite.email.toLowerCase())
    );
  }, [invites, localUsers]);

  const [loadingInvites, setLoadingInvites] = useState(true);
  const [tab, setTab] = useState(0);
  const [editRow, setEditRow] = useState<UserType | null>(null);

  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive" | "deleted"
  >("all");
  const canInviteUser = companyLimits
    ? companyLimits.used < companyLimits.limit
    : false;

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");
  const [_inviteRoute, setInviteRoute] = useState("");

  const [confirmation, setConfirmation] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleRefreshCustomClaims = async () => {
    await getAuth().currentUser?.getIdToken(true);
  };

  useEffect(() => {
    if (!db || !companyId) return;
    const unsub = onSnapshot(
      query(
        collection(db, `companies/${companyId}/invites`),
        orderBy("createdAt", "desc")
      ),
      (snap) => {
        setInvites(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              email: data.inviteeEmail, // ✅ Map inviteeEmail to email field
              __refPath: d.ref.path,
              ...data,
              createdAt: data.createdAt,
              role: data.role || "employee",
            };
          }) as InviteRow[]
        );
        setLoadingInvites(false);
      }
    );
    return () => unsub();
  }, [db, companyId]);

  const handleSendInvite = async () => {
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!normalizedEmail || !companyId) return;

    // Prevent duplicates in current company list
    const alreadyInList = localUsers?.some(
      (u) => (u.email || "").toLowerCase() === normalizedEmail
    );
    if (alreadyInList) {
      dispatch(
        showMessage({ text: "User already in your company.", severity: "info" })
      );
      return;
    }

    try {
      // 🧩 1️⃣ Enforce user limit before sending invite
      const enforce = httpsCallable(functions, "enforcePlanLimits");
      await enforce({ companyId, type: "user" });

      // 🧩 2️⃣ Check if user already exists or belongs elsewhere
      const checkUserExists = httpsCallable(functions, "checkUserExists");
      const response = await checkUserExists({
        email: normalizedEmail,
        companyId,
      });
      const { exists } = response.data as { exists: boolean };

      if (exists) {
        dispatch(
          showMessage({
            text: "User already registered or eligible. Sending invite...",
            severity: "info",
          })
        );
      }

      // 🧩 3️⃣ Create invite + send email
      const createInviteAndEmail = httpsCallable(
        functions,
        "createInviteAndEmail"
      );
      const BASE_URL =
        (import.meta as any).env?.VITE_APP_PUBLIC_URL || window.location.origin;

      await createInviteAndEmail({
        email: normalizedEmail,
        role: inviteRole,
        baseUrl: BASE_URL,
      });
      dispatch(showMessage({ text: "Invite sent!", severity: "success" }));
      setInviteEmail("");
      setInviteRole("employee");
      setInviteRoute("");
    } catch (err: any) {
      const code = err?.code || err?.message;
      const friendly =
        code === "resource-exhausted"
          ? "You’ve reached your user limit. Upgrade your plan to add more users."
          : code === "failed-precondition"
            ? "This user already belongs to another company."
            : code === "already-exists"
              ? "An invite is already pending for this email."
              : "Error sending invite.";
      dispatch(showMessage({ text: friendly, severity: "error" }));
    }
  };

  const handleRevokeInvite = (invite: InviteRow) => {
    setConfirmation({
      message: `Revoke invite to ${invite.email}?`,
      onConfirm: async () => {
        if (!invite.__refPath || !invite.email || !companyId) return;
        setConfirmLoading(true);

        try {
          // Delete the invite doc
          await deleteDoc(doc(db, invite.__refPath));

          // Delete the mutex doc (keyed by lowercase email + companyId)
          const emailKey = invite.email.trim().toLowerCase();
          const mutexPath = `invitesMutex/${emailKey}_${companyId}`;
          await deleteDoc(doc(db, mutexPath));

          dispatch(
            showMessage({ text: "Invite revoked.", severity: "success" })
          );
        } catch (e: any) {
          console.error("Revoke failed", e);
          dispatch(
            showMessage({
              text: e.message ?? "Failed to revoke invite.",
              severity: "error",
            })
          );
        } finally {
          setConfirmLoading(false);
          setConfirmation(null);
        }
      },
    });
  };

  // Save incl. status ✅
  const handleSaveUser = async () => {
    // should we define this as a usertype return?
    if (!editRow) return;
    try {
      // const enforceLimit = httpsCallable(functions, "enforceSuperAdminLimit");

      // ask backend if this is allowed
      // await enforceLimit({
      //   companyId,
      //   uid: editRow.uid,
      //   newRole: editRow.role,
      // });

      await updateDoc(doc(db, "users", editRow.uid), {
        firstName: editRow.firstName ?? null,
        lastName: editRow.lastName ?? null,
        email: editRow.email ?? null,
        phone: editRow.phone ?? null,
        salesRouteNum: editRow.salesRouteNum ?? null,
        role: editRow.role,
        reportsTo: editRow.reportsTo ?? "",
        status: editRow.status ?? "active", // 👈 include status
      });

      dispatch(showMessage({ text: "User updated.", severity: "success" }));
    } catch (e: any) {
      const msg = e.message?.includes("super-admins")
        ? e.message
        : (e.message ?? "Update failed.");
      dispatch(showMessage({ text: msg, severity: "error" }));
    } finally {
      const updatedUser = { ...editRow };
      const updatedUsers = localUsers.map((u) =>
        u.uid === updatedUser.uid ? updatedUser : u
      );
      dispatch(setCompanyUsers(normalizeFirestoreData(updatedUsers)));
      setEditRow(null);
    }
  };

  const ROLES: UserType["role"][] = [
    "admin",
    "employee",
    "super-admin",
    "developer",
    "supervisor",
    "status-pending",
  ];

  const filteredUsers = useMemo(() => {
    const base =
      statusFilter === "all"
        ? localUsers
        : localUsers.filter((u) => (u.status ?? "active") === statusFilter);

    const query = debouncedSearch.toLowerCase().trim();

    if (!query) return base;

    return base.filter((u) =>
      [u.firstName, u.lastName, u.email, u.phone]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query))
    );
  }, [localUsers, statusFilter, debouncedSearch]);

  const handleSetAllToActive = () => {
    setConfirmation({
      message: "Set ALL users in this company to Active?",
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const batch = writeBatch(db);

          const usersToUpdate = localUsers.filter(
            (u) => !u.status || u.status !== "active"
          );

          usersToUpdate.forEach((u) =>
            batch.update(doc(db, "users", u.uid), { status: "active" })
          );

          // Optimistically update Redux state
          dispatch({
            type: "user/setCompanyUsers", // you may need to adjust this if your slice uses a thunk or builder
            payload: localUsers.map((u) =>
              usersToUpdate.some((toUpdate) => toUpdate.uid === u.uid)
                ? { ...u, status: "active" }
                : u
            ),
          });

          await batch.commit();

          dispatch(
            showMessage({
              text: "All users set to Active.",
              severity: "success",
            })
          );
        } catch (e: any) {
          dispatch(
            showMessage({
              text: e.message ?? "Bulk update failed.",
              severity: "error",
            })
          );
        } finally {
          setConfirmLoading(false);
          setConfirmation(null);
        }
      },
    });
  };

  // Hard delete with optimistic removal ✅
  const handleDeleteUser = async (uid: string) => {
    setConfirmLoading(true);
    const prev = [...localUsers];
    try {
      // optimistic: remove from grid immediately
      const remaining = prev.filter((u) => u.uid !== uid); // what do i do with remaining?

      const deleteUser = httpsCallable(functions, "deleteAuthUser");
      const result = await deleteUser({ uid });
      const data = result.data as { message?: string };
      dispatch(
        showMessage({
          text: data?.message || "User deleted.",
          severity: "success",
        })
      );
    } catch (e: any) {
      dispatch(
        showMessage({ text: e.message ?? "Delete failed.", severity: "error" })
      );
      // revert optimistic change if you keep a local rows state
      // setLocalRows(prev)
    } finally {
      setConfirmLoading(false);
      setConfirmation(null);
    }
  };

  const userColumns = useMemo<GridColDef<UserType>[]>(
    () => [
      { field: "firstName", headerName: "First Name", flex: 1 },
      { field: "lastName", headerName: "Last Name", flex: 1 },
      // { field: "uid", headerName: "id", flex: 1 },
      { field: "email", headerName: "Email", flex: 1.2 },
      { field: "phone", headerName: "Phone", flex: 1 },
      { field: "salesRouteNum", headerName: "Sales Route #", flex: 1 },
      {
        field: "reportsTo",
        headerName: "Supervisor",
        flex: 1,
        renderCell: (params: any) => {
          const reportsToUid = String(params.row?.reportsTo ?? "").trim();
          const supervisor = localUsers.find((u) => u.uid === reportsToUid);

          return (
            <span style={{ color: supervisor ? "inherit" : "orange" }}>
              {supervisor
                ? `${supervisor.firstName} ${supervisor.lastName}`
                : reportsToUid || "Unassigned"}
            </span>
          );
        },
      },
      { field: "role", headerName: "Role", flex: 1 },
      {
        field: "status",
        headerName: "Status",
        flex: 0.6,
        minWidth: 120,
        renderCell: (params) => (
          <div className="cell-center">
            <StatusPill value={params.value as any} />
          </div>
        ),
      },
      {
        field: "actions",
        type: "actions",
        headerName: "Actions",
        getActions: (params) => {
          const row = params.row as UserType;
          const actions = [
            <GridActionsCellItem
              key="edit"
              icon={<EditOutlinedIcon />}
              label="Edit"
              onClick={() => setEditRow(row)}
            />,
          ];
          if (canHardDelete) {
            actions.push(
              <GridActionsCellItem
                key="delete"
                icon={<DeleteOutlineRoundedIcon />}
                label="Delete User"
                onClick={() => {
                  setConfirmation({
                    message:
                      "This will permanently delete this user. Are you sure?",
                    onConfirm: () => handleDeleteUser(row.uid),
                  });
                }}
              />
            );
          }
          return actions;
        },
      },
    ],
    [canHardDelete]
  );

  const inviteColumns = useMemo<GridColDef<InviteRow>[]>(
    () => [
      { field: "email", headerName: "Email", flex: 1.2 },
      { field: "role", headerName: "Role", flex: 1 },

      { field: "salesRoute", headerName: "Sales Route #", flex: 1 },
      {
        field: "createdAt",
        headerName: "Created At",
        flex: 1.2,
        renderCell: (params) => {
          const ts = (params.row as InviteRow).createdAt;
          const date =
            ts && typeof ts.toDate === "function" ? ts.toDate() : undefined;
          return date ? date.toLocaleString() : "";
        },
      },
      {
        field: "actions",
        type: "actions",
        headerName: "Actions",
        getActions: (params) => [
          <GridActionsCellItem
            icon={<DeleteOutlineRoundedIcon />}
            label="Revoke"
            onClick={() => handleRevokeInvite(params.row)}
          />,
        ],
      },
    ],
    [invites]
  );

  // Column visibility by breakpoint — keep just the essentials on tablets
  const columnVisibility = useMemo(() => {
    if (isTablet && !isPhone) {
      return { email: false, phone: false } as any;
    }
    return {} as any; // desktop: show all
  }, [isTablet, isPhone]);

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2 },
        display: "grid",
        gap: 2,
        background: "var(--bg)",
        color: "var(--text-color)",
      }}
    >
       {/* <AuthClaimsDebug companyId={companyId} show /> */}
      {(myRole === "developer" || myRole === "super-admin") && (
        <AuthClaimsDebug companyId={companyId} show />
      )}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1, sm: 2 },
          bgcolor: "var(--dashboard-card)",
          borderRadius: 3,
        }}
      >
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Users" />
          <Tab
            label={`Pending Invites${
              pendingInvites.length ? ` (${pendingInvites.length})` : ""
            }`}
          />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Paper
          elevation={0}
          sx={{ p: 1.5, bgcolor: "var(--dashboard-card)", borderRadius: 3 }}
        >
          {companyLimits && (
            <div
              style={{
                marginBottom: "0.75rem",
                fontSize: "0.9rem",
                fontWeight: 500,
                color:
                  companyLimits.used >= companyLimits.limit
                    ? "var(--error-color)"
                    : companyLimits.limit - companyLimits.used <= 2
                      ? "var(--warning-color)"
                      : "var(--text-secondary)",
                background:
                  companyLimits.used >= companyLimits.limit
                    ? "var(--error-bg)"
                    : companyLimits.limit - companyLimits.used <= 2
                      ? "var(--warning-bg)"
                      : "transparent",
                padding: "0.35rem 0.75rem",
                borderRadius: "6px",
                display: "inline-block",
              }}
            >
              {companyLimits.used}/{companyLimits.limit} users
              {companyLimits.used >= companyLimits.limit &&
                " — User limit reached"}
            </div>
          )}

          <Stack direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="status-filter">Filter status</InputLabel>
              <Select
                labelId="status-filter"
                value={statusFilter}
                label="Filter status"
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="deleted">Deleted</MenuItem>
              </Select>
            </FormControl>

            {isAdminOrUp &&
              filteredUsers.some(
                (u) => (u.status ?? "active") !== "active"
              ) && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleSetAllToActive}
                >
                  Set All Active
                </Button>
              )}
            <div className="user-search-wrapper">
              <input
                name="user-search"
                type="text"
                className="user-search-input"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="clear-search-button"
                  onClick={() => setSearchQuery("")}
                >
                  ×
                </button>
              )}
            </div>
          </Stack>

          {/* PHONE: switch to card list for true responsiveness */}
          {isPhone ? (
            <Box>
              {filteredUsers.map((r) => (
                <AdminUserCard
                  key={r.uid}
                  setEditRow={setEditRow}
                  row={{
                    ...r,
                    id: r.uid,
                    firstName: r.firstName ?? "",
                    lastName: r.lastName ?? "",
                    email: r.email ?? "",
                    phone: r.phone ?? "",
                    company: r.company ?? "—",
                    status: r.status ?? "active",
                    reportsTo: r.reportsTo ?? "",
                    createdAt: r.createdAt ?? undefined, // ✅ fixes the error
                    lastActive: r.updatedAt ?? undefined, // ✅ if you’re mapping that too
                  }}
                />
              ))}
            </Box>
          ) : (
            // TABLET & DESKTOP: DataGrid with horizontal scroll if needed
            <Box sx={{ width: "100%", height: 600, overflowX: "auto" }}>
              <DataGrid<UserType>
                rows={filteredUsers}
                getRowHeight={() => 60} // default is 52 — bump to 56 or 60
                columns={userColumns}
                getRowId={(r) => r.uid}
                columnVisibilityModel={columnVisibility}
                disableRowSelectionOnClick
                disableColumnMenu
                density="compact"
                // loading={!!loading}
                sx={{
                  border: 0,
                  bgcolor: "var(--dashboard-card, #fff)",
                  "& .MuiDataGrid-cell": { alignItems: "center" },
                }}
              />
            </Box>
          )}
        </Paper>
      )}

      {tab === 1 && (
        <Paper
          elevation={0}
          sx={{ p: 1.5, bgcolor: "var(--dashboard-card)", borderRadius: 3 }}
        >
          <Stack spacing={2}>
            <RecentlyAcceptedList users={recentlyAcceptedInvites} />
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={600}>
                  <PersonAddAlt1RoundedIcon
                    style={{ verticalAlign: "text-bottom", marginRight: 8 }}
                  />
                  Send a New Invite
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack direction={isMobile ? "column" : "row"} spacing={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Employee Email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel id="role">Role</InputLabel>
                    <Select
                      labelId="role"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(String(e.target.value))}
                    >
                      <MenuItem value="employee">Employee</MenuItem>
                      {/* <MenuItem value="manager">Manager</MenuItem> */}
                      <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    onClick={handleSendInvite}
                    startIcon={<SendRoundedIcon />}
                    disabled={!canInviteUser}
                  >
                    Send Invite
                  </Button>
                </Stack>
              </AccordionDetails>
            </Accordion>

            <DataGrid<InviteRow>
              autoHeight
              disableRowSelectionOnClick
              rows={pendingInvites}
              getRowId={(r) => r.id}
              columns={inviteColumns}
              loading={loadingInvites}
              slots={{
                noRowsOverlay: NoPendingInvitesOverlay,
              }}
            />
          </Stack>
        </Paper>
      )}

      <Dialog
        fullScreen={isMobile}
        open={!!editRow}
        onClose={() => setEditRow(null)}
      >
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="First Name"
              value={editRow?.firstName || ""}
              onChange={(e) =>
                setEditRow((r) => (r ? { ...r, firstName: e.target.value } : r))
              }
            />
            <TextField
              label="Last Name"
              value={editRow?.lastName || ""}
              onChange={(e) =>
                setEditRow((r) => (r ? { ...r, lastName: e.target.value } : r))
              }
            />
            <TextField
              label="Email"
              value={editRow?.email || ""}
              onChange={(e) =>
                setEditRow((r) => (r ? { ...r, email: e.target.value } : r))
              }
            />
            <TextField
              label="Phone"
              value={editRow?.phone || ""}
              onChange={(e) =>
                setEditRow((r) => (r ? { ...r, phone: e.target.value } : r))
              }
            />
            <TextField
              label="Sales Route #"
              value={editRow?.salesRouteNum || ""}
              onChange={(e) =>
                setEditRow((r) =>
                  r ? { ...r, salesRouteNum: e.target.value } : r
                )
              }
            />
            <FormControl fullWidth>
              <InputLabel id="edit-role">Role</InputLabel>
              <Select
                labelId="edit-role"
                value={editRow?.role || "employee"}
                onChange={(e) =>
                  setEditRow((r) =>
                    r ? { ...r, role: e.target.value as UserType["role"] } : r
                  )
                }
              >
                {ROLES.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="status">Status</InputLabel>
              <Select
                labelId="status"
                value={editRow?.status || "active"}
                onChange={(e) =>
                  setEditRow((r) =>
                    r
                      ? {
                          ...r,
                          status: e.target.value as "active" | "inactive",
                        }
                      : r
                  )
                }
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="edit-reports-to">Supervisor</InputLabel>
              <Select
                labelId="edit-reports-to"
                value={editRow?.reportsTo || ""}
                onChange={(e) =>
                  setEditRow((r) =>
                    r ? { ...r, reportsTo: e.target.value } : r
                  )
                }
              >
                <MenuItem value="">— None —</MenuItem>
                {activeUsers
                  .filter((u) => u.uid !== editRow?.uid) // exclude self
                  .map((user) => (
                    <MenuItem key={user.uid} value={user.uid}>
                      {user.firstName} {user.lastName} ({user.role})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRow(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveUser}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <CustomConfirmation
        isOpen={!!confirmation}
        message={confirmation?.message || ""}
        onClose={() => setConfirmation(null)}
        onConfirm={confirmation?.onConfirm || (() => {})}
        loading={confirmLoading}
      />
    </Box>
  );
}
