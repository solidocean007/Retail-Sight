import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { selectCompanyUsers, selectUser } from "../Slices/userSlice";
import { UserType } from "../utils/types";
import "./teamsViewer.css";
import { useAppDispatch } from "../utils/store";
import { setCompanyUsers } from "../Slices/userSlice";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { updateSupervisor } from "../utils/updateSupervisor";
import { showMessage } from "../Slices/snackbarSlice";

type ColumnKind = "supervisor" | "unassigned";

function getInitials(u: UserType) {
  const a = (u.firstName ?? "").trim().slice(0, 1).toUpperCase();
  const b = (u.lastName ?? "").trim().slice(0, 1).toUpperCase();
  return (a + b).trim() || "•";
}

function RoleBadge({ role }: { role: UserType["role"] }) {
  if (role === "employee") return null;

  return (
    <span className={`tv-role-badge tv-role-${role}`}>
      {role.replace("-", " ")}
    </span>
  );
}

function DraggableEmployee({
  user,
  compact = false,
  disabled = false,
}: {
  user: UserType;
  compact?: boolean;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: user.uid,
      disabled,
      data: {
        reportsTo: String(user.reportsTo ?? ""),
        user,
      },
    });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    visibility: isDragging ? "hidden" : "visible",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`tv-emp ${compact ? "tv-emp-compact" : ""} ${
        isDragging ? "tv-emp-dragging" : ""
      }`}
      {...attributes}
      {...listeners}
      role="button"
      aria-label={`Move ${user.firstName ?? ""} ${user.lastName ?? ""}`}
    >
      <div className="tv-emp-avatar">{getInitials(user)}</div>
      <div className="tv-emp-meta">
        <div className="tv-emp-name">
          {user.firstName} {user.lastName}
          <RoleBadge role={user.role} />
        </div>

        <div className="tv-emp-sub">
          <span className="tv-emp-email">{user.email}</span>
          <span className="tv-dot">•</span>
          <span className="tv-emp-route">
            Route #{user.salesRouteNum || "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({
  id,
  kind,
  title,
  subtitle,
  children,
  count,
}: {
  id: string;
  kind: ColumnKind;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  count: number;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { kind },
  });

  return (
    <section
      ref={setNodeRef}
      className={`tv-col ${kind === "unassigned" ? "tv-col-unassigned" : ""} ${
        isOver ? "tv-col-over" : ""
      }`}
    >
      <header className="tv-col-header">
        <div className="tv-col-title-row">
          <h3 className="tv-col-title">{title}</h3>
          <span className="tv-pill">{count}</span>
        </div>
        {subtitle && <p className="tv-col-subtitle">{subtitle}</p>}
        {isOver && <div className="tv-drop-hint">Drop to assign</div>}
      </header>

      <div className="tv-col-body">{children}</div>
    </section>
  );
}

const TeamsViewer = () => {
  const dispatch = useAppDispatch();
  const me = useSelector(selectUser) as UserType | null;
  const canReassignTeams =
    me?.role === "super-admin" || me?.role === "developer";

  const companyId = me?.companyId;

  const users = (useSelector(selectCompanyUsers) || []) as UserType[];
  const activeUsers = useMemo(
    () => users.filter((u) => u.status === "active"),
    [users]
  );

  const supervisors = useMemo(
    () =>
      activeUsers.filter((u) =>
        ["supervisor", "admin", "super-admin"].includes(u.role)
      ),
    [activeUsers]
  );

  const supervisorsByUid = useMemo(() => {
    const map: Record<
      string,
      { uid: string; firstName?: string; lastName?: string; email?: string }
    > = {};
    supervisors.forEach((s) => {
      map[s.uid] = {
        uid: s.uid,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
      };
    });
    return map;
  }, [supervisors]);

  const supervisorUids = useMemo(
    () => new Set(supervisors.map((s) => s.uid)),
    [supervisors]
  );

  const employees = useMemo(
    () => activeUsers.filter((u) => u.role === "employee"),
    [activeUsers]
  );

  const unassignedUsers = useMemo(
    () =>
      employees.filter(
        (u) => !u.reportsTo || !supervisorUids.has(String(u.reportsTo))
      ),
    [employees, supervisorUids]
  );

  const grouped = useMemo(() => {
    const g: Record<string, UserType[]> = {};
    employees.forEach((u) => {
      const r = String(u.reportsTo ?? "").trim();
      if (!r) return;
      if (!g[r]) g[r] = [];
      g[r].push(u);
    });
    // stable order for UX
    Object.keys(g).forEach((k) =>
      g[k].sort((a, b) =>
        `${a.lastName ?? ""}${a.firstName ?? ""}`.localeCompare(
          `${b.lastName ?? ""}${b.firstName ?? ""}`
        )
      )
    );
    return g;
  }, [employees]);

  // DnD sensors (pointer works well on both desktop + mobile)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // prevents accidental drags on scroll
    })
  );

  const [activeUser, setActiveUser] = useState<UserType | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const assignableEmployees = useMemo(
    () => activeUsers.filter((u) => u.role === "employee"),
    [activeUsers]
  );

  const elevatedAssignedUsers = useMemo(
    () =>
      activeUsers.filter(
        (u) =>
          u.reportsTo && ["admin", "super-admin", "developer"].includes(u.role)
      ),
    [activeUsers]
  );

  const handleDragStart = (event: any) => {
    const u = event.active?.data?.current?.user as UserType | undefined;
    if (u) setActiveUser(u);
  };

  const handleDragCancel = () => setActiveUser(null);

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!canReassignTeams) {
      dispatch(
        showMessage({
          text: "Only super-admins or developers can reassign teams.",
          severity: "info",
        })
      );
      return;
    }

    const { active, over } = event;
    setActiveUser(null);
    if (!over) return;

    if (!companyId || !me?.uid) {
      dispatch(
        showMessage({
          text: "Missing company context; cannot reassign.",
          severity: "error",
        })
      );
      return;
    }

    const userId = String(active.id);
    const dropId = String(over.id);

    const user = users.find((u) => u.uid === userId);
    if (!user) return;

    const prevReportsTo = String(user.reportsTo ?? "");
    const newSupervisorUid = dropId === "unassigned" ? "" : dropId;

    if (prevReportsTo === newSupervisorUid) return;

    // Optimistic UI
    const nextUsers = users.map((u) =>
      u.uid === user.uid ? { ...u, reportsTo: newSupervisorUid } : u
    );
    dispatch(setCompanyUsers(nextUsers));

    setBusyUid(user.uid);

    try {
      await updateSupervisor({
        companyId,
        actor: { uid: me.uid, email: me.email ?? null },
        user,
        newSupervisorUid,
        supervisorsByUid,
      });

      const label =
        newSupervisorUid === ""
          ? "Unassigned"
          : `${supervisorsByUid[newSupervisorUid]?.firstName ?? ""} ${
              supervisorsByUid[newSupervisorUid]?.lastName ?? ""
            }`.trim() || "Supervisor";

      dispatch(
        showMessage({
          text: `Moved ${user.firstName ?? ""} ${
            user.lastName ?? ""
          } → ${label}`,
          severity: "success",
        })
      );
    } catch (e) {
      console.error("DnD supervisor update failed", e);

      // revert optimistic change
      dispatch(setCompanyUsers(users));

      dispatch(
        showMessage({
          text: "Failed to update supervisor. Please try again.",
          severity: "error",
        })
      );
    } finally {
      setBusyUid(null);
    }
  };

  const hasSupervisors = supervisors.length > 0;

  return (
    <div className="tv-wrap">
      <header className="tv-header">
        <h2 className="tv-title">Company Teams</h2>
        <p className="tv-subtitle">
          Drag employees onto a supervisor (or Unassigned) to update teams.
        </p>
      </header>

      {!hasSupervisors ? (
        <div className="tv-empty">
          <p className="tv-empty-title">No supervisors found yet.</p>
          <p className="tv-empty-sub">
            Assign a user the <strong>supervisor</strong> role to start building
            teams.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
        >
          <div className="tv-grid">
            {/* Supervisors */}
            {supervisors.map((s) => {
              const members = grouped[s.uid] || [];
              const title =
                `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim() ||
                "Supervisor";
              const subtitle = `${s.role}${s.email ? ` • ${s.email}` : ""}`;

              return (
                <DroppableColumn
                  key={s.uid}
                  id={s.uid}
                  kind="supervisor"
                  title={title}
                  subtitle={subtitle}
                  count={members.length}
                >
                  {members.length ? (
                    members.map((emp) => (
                      <div key={emp.uid} className="tv-row">
                        <DraggableEmployee
                          user={emp}
                          compact
                          disabled={
                            busyUid === emp.uid ||
                            !canReassignTeams ||
                            ["admin", "super-admin", "developer"].includes(
                              emp.role
                            )
                          }
                        />

                        {busyUid === emp.uid && (
                          <span className="tv-saving">Saving…</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="tv-col-empty">No direct reports</div>
                  )}
                </DroppableColumn>
              );
            })}

            {/* Unassigned droppable */}
            <DroppableColumn
              id="unassigned"
              kind="unassigned"
              title="Unassigned"
              subtitle="Drop here to remove supervisor"
              count={unassignedUsers.length}
            >
              {unassignedUsers.length ? (
                unassignedUsers.map((emp) => (
                  <div key={emp.uid} className="tv-row">
                    <DraggableEmployee
                      user={emp}
                      compact
                      disabled={
                        busyUid === emp.uid ||
                        !canReassignTeams ||
                        ["admin", "super-admin", "developer"].includes(emp.role)
                      }
                    />

                    {busyUid === emp.uid && (
                      <span className="tv-saving">Saving…</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="tv-col-empty">Everyone is assigned</div>
              )}
            </DroppableColumn>
          </div>

          {/* Drag overlay (nice snap + clarity on mobile) */}
          <DragOverlay>
            {activeUser ? (
              <div className="tv-overlay">
                <DraggableEmployee user={activeUser} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
};

export default TeamsViewer;
