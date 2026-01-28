import { useDispatch, useSelector } from "react-redux";
import { Box, Typography, CircularProgress, Container } from "@mui/material";
import {
  selectGoalsByTiming,
  selectGalloGoalsLoading,
  selectGalloGoalsError,
  addOrUpdateGalloGoal,
} from "../../Slices/galloGoalsSlice";
import { useMediaQuery, useTheme } from "@mui/material";

import { selectCompanyUsers } from "../../Slices/userSlice";
import { useMemo, useState } from "react";
import "./gallo-goals.css";
import PostViewerModal from "../PostViewerModal";
import { RootState } from "../../utils/store";
import { useNavigate } from "react-router-dom";
import GalloGoalCard from "./GalloGoalCard";
import { FireStoreGalloGoalDocType, LifecycleFilter } from "../../utils/types";
import { useCompanyIntegrations } from "../../hooks/useCompanyIntegrations";
import AdminGalloGoalsSection from "./AdminGalloGoalsSection";
import GalloGoalsTable from "./GalloGoalsTable";
import { updateGalloGoalLifecycle } from "../../utils/helperFunctions/updateGalloGoalLifecycle";
import EditGalloGoalModal from "./EditGalloGoalModal";
import CustomConfirmation from "../CustomConfirmation";

const AllGalloGoalsView = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId,
  );
  const { isEnabled, loading } = useCompanyIntegrations(companyId);
  const galloEnabled = isEnabled("galloAxis");
  const [activeActionsGoalId, setActiveActionsGoalId] = useState<string | null>(
    null,
  );

  const [actionsAnchorEl, setActionsAnchorEl] = useState<HTMLElement | null>(
    null,
  );

  const openActions = (goalId: string, anchor: HTMLElement) => {
    setActiveActionsGoalId(goalId);
    setActionsAnchorEl(anchor);
  };

  const closeActions = () => {
    setActiveActionsGoalId(null);
    setActionsAnchorEl(null);
  };

  const [lifecycleFilter, setLifecycleFilter] =
    useState<LifecycleFilter>("active");
  const [search, setSearch] = useState("");
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const isLoading = useSelector(selectGalloGoalsLoading);
  const error = useSelector(selectGalloGoalsError);
  const companyUsers = useSelector(selectCompanyUsers) || [];

  const [postIdToView, setPostIdToView] = useState<string | null>(null);
  const [postViewerOpen, setPostViewerOpen] = useState(false);

  const [editGoal, setEditGoal] = useState<FireStoreGalloGoalDocType | null>(
    null,
  );

  const [pendingAction, setPendingAction] = useState<{
    goal: FireStoreGalloGoalDocType;
    status: "archived" | "disabled";
  } | null>(null);

  const [confirmLoading, setConfirmLoading] = useState(false);

  const requestLifecycleChange = (
    goal: FireStoreGalloGoalDocType,
    status: "archived" | "disabled",
  ) => {
    setPendingAction({ goal, status });
  };

  const confirmLifecycleChange = async () => {
    if (!pendingAction) return;

    const { goal, status } = pendingAction;
    setConfirmLoading(true);

    try {
      dispatch(
        addOrUpdateGalloGoal({
          ...goal,
          lifeCycleStatus: status,
          id: goal.goalDetails.goalId,
        }),
      );

      await updateGalloGoalLifecycle(goal.goalDetails.goalId, status);
    } finally {
      setConfirmLoading(false);
      setPendingAction(null);
    }
  };

  const canManage =
    currentUser?.role === "admin" ||
    currentUser?.role === "super-admin" ||
    currentUser?.role === "developer";

  const openPostViewer = (postId: string) => {
    setPostIdToView(postId);
    setPostViewerOpen(true);
  };

  const { scheduled, upcoming, current, archived } =
    useSelector(selectGoalsByTiming);

  const matchesSearch = (goal: any) =>
    !search ||
    goal.programDetails.programTitle
      .toLowerCase()
      .includes(search.toLowerCase()) ||
    goal.goalDetails.goal.toLowerCase().includes(search.toLowerCase());

  const scheduledGoals = scheduled.filter(matchesSearch);
  const upcomingGoals = upcoming.filter(matchesSearch);
  const currentGoals = current.filter(matchesSearch);
  const archivedGoals = archived.filter(matchesSearch);

  const employeeMap = useMemo(() => {
    const map: Record<string, string> = {};
    companyUsers.forEach((user) => {
      if (user.salesRouteNum) {
        map[user.salesRouteNum] = `${user.firstName} ${user.lastName}`;
      }
    });
    return map;
  }, [companyUsers]);

  /* ======================= Guards ======================= */

  if (isLoading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
        <Typography>Loading Gallo goals…</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" mt={4}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  if (!galloEnabled) {
    return (
      <Box textAlign="center" mt={4}>
        <Typography color="error">Gallo Integrations not enabled</Typography>
        <button onClick={() => navigate("/user-home-page")}>Home</button>
      </Box>
    );
  }

  /* ======================= Render ======================= */

  return (
    <Container>
      {/* Filters */}
      <Box display="flex" gap={2} mb={2} pt={2} flexWrap="wrap">
        <select
          value={lifecycleFilter}
          onChange={(e) =>
            setLifecycleFilter(e.target.value as LifecycleFilter)
          }
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="disabled">Disabled</option>
          <option value="all">All</option>
        </select>

        <input
          placeholder="Search gallo goals…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Box>
      {/* Scheduled */}
      {scheduledGoals.length > 0 && (
        <AdminGalloGoalsSection
          title="Scheduled Goals"
          subtitle="These goals are approved but are not yet visible to users."
        >
          {isDesktop ? (
            <GalloGoalsTable
              goals={scheduledGoals}
              employeeMap={employeeMap}
              onViewPostModal={openPostViewer}
              canManage={canManage}
              activeActionsGoalId={activeActionsGoalId}
              actionsAnchorEl={actionsAnchorEl}
              openActions={openActions}
              closeActions={closeActions}
              onEdit={setEditGoal}
              onArchive={(goal) => requestLifecycleChange(goal, "archived")}
              onDisable={(goal) => requestLifecycleChange(goal, "disabled")}
            />
          ) : (
            scheduledGoals.map((goal) => (
              <GalloGoalCard
                goal={goal}
                employeeMap={employeeMap}
                onViewPostModal={openPostViewer}
                canManage={canManage}
                activeActionsGoalId={activeActionsGoalId}
                actionsAnchorEl={actionsAnchorEl}
                openActions={openActions}
                closeActions={closeActions}
                onEdit={setEditGoal}
                onArchive={(goal) => requestLifecycleChange(goal, "archived")}
                onDisable={(goal) => requestLifecycleChange(goal, "disabled")}
              />
            ))
          )}
        </AdminGalloGoalsSection>
      )}

      {/* Upcoming */}
      {upcomingGoals.length > 0 && (
        <AdminGalloGoalsSection
          title="Upcoming Goals"
          subtitle="These goals are approved and will become active soon."
        >
          {isDesktop ? (
            <GalloGoalsTable
              goals={upcomingGoals}
              employeeMap={employeeMap}
              onViewPostModal={openPostViewer}
              canManage={canManage}
              activeActionsGoalId={activeActionsGoalId}
              actionsAnchorEl={actionsAnchorEl}
              openActions={openActions}
              closeActions={closeActions}
              onEdit={setEditGoal}
              onArchive={(goal) => requestLifecycleChange(goal, "archived")}
              onDisable={(goal) => requestLifecycleChange(goal, "disabled")}
            />
          ) : (
            upcomingGoals.map((goal) => (
              <GalloGoalCard
                goal={goal}
                employeeMap={employeeMap}
                onViewPostModal={openPostViewer}
                canManage={canManage}
                activeActionsGoalId={activeActionsGoalId}
                actionsAnchorEl={actionsAnchorEl}
                openActions={openActions}
                closeActions={closeActions}
                onEdit={setEditGoal}
                onArchive={(goal) => requestLifecycleChange(goal, "archived")}
                onDisable={(goal) => requestLifecycleChange(goal, "disabled")}
              />
            ))
          )}
        </AdminGalloGoalsSection>
      )}

      {/* Current */}
      <AdminGalloGoalsSection
        title="Current Goals"
        subtitle="These goals are live and can be worked on now."
      >
        {isDesktop ? (
          <GalloGoalsTable
            goals={currentGoals}
            employeeMap={employeeMap}
            onViewPostModal={openPostViewer}
            canManage={canManage}
            activeActionsGoalId={activeActionsGoalId}
            actionsAnchorEl={actionsAnchorEl}
            openActions={openActions}
            closeActions={closeActions}
            onEdit={setEditGoal}
            onArchive={(goal) => requestLifecycleChange(goal, "archived")}
            onDisable={(goal) => requestLifecycleChange(goal, "disabled")}
          />
        ) : (
          currentGoals.map((goal) => (
            <GalloGoalCard
              goal={goal}
              employeeMap={employeeMap}
              onViewPostModal={openPostViewer}
              canManage={canManage}
              activeActionsGoalId={activeActionsGoalId}
              actionsAnchorEl={actionsAnchorEl}
              openActions={openActions}
              closeActions={closeActions}
              onEdit={setEditGoal}
              onArchive={(goal) => requestLifecycleChange(goal, "archived")}
              onDisable={(goal) => requestLifecycleChange(goal, "disabled")}
            />
          ))
        )}
      </AdminGalloGoalsSection>

      {/* Archived */}
      {archivedGoals.length > 0 && (
        <AdminGalloGoalsSection
          title="Archived Goals"
          subtitle="Past programs kept for reference."
        >
          {isDesktop ? (
            <GalloGoalsTable
              goals={archivedGoals}
              employeeMap={employeeMap}
              onViewPostModal={openPostViewer}
              canManage={canManage}
              activeActionsGoalId={activeActionsGoalId}
              actionsAnchorEl={actionsAnchorEl}
              openActions={openActions}
              closeActions={closeActions}
              onEdit={setEditGoal}
              onArchive={(goal) => requestLifecycleChange(goal, "archived")}
              onDisable={(goal) => requestLifecycleChange(goal, "disabled")}
            />
          ) : (
            archivedGoals.map((goal) => (
              <GalloGoalCard
                goal={goal}
                employeeMap={employeeMap}
                onViewPostModal={openPostViewer}
                canManage={canManage}
                activeActionsGoalId={activeActionsGoalId}
                actionsAnchorEl={actionsAnchorEl}
                openActions={openActions}
                closeActions={closeActions}
                onEdit={setEditGoal}
                onArchive={(goal) => requestLifecycleChange(goal, "archived")}
                onDisable={(goal) => requestLifecycleChange(goal, "disabled")}
              />
            ))
          )}
        </AdminGalloGoalsSection>
      )}
      {editGoal && (
        <EditGalloGoalModal goal={editGoal} onClose={() => setEditGoal(null)} />
      )}

      {pendingAction && (
        <CustomConfirmation
          isOpen
          title={
            pendingAction.status === "archived"
              ? "Archive Goal"
              : "Disable Goal"
          }
          message={
            pendingAction.status === "archived"
              ? "This goal will be archived and removed from active workflows. This cannot be undone."
              : "This goal will be temporarily disabled. Sales reps will not be able to submit new posts."
          }
          loading={confirmLoading}
          onClose={() => setPendingAction(null)}
          onConfirm={confirmLifecycleChange}
        />
      )}

      <PostViewerModal
        key={postIdToView}
        postId={postIdToView || ""}
        open={postViewerOpen}
        onClose={() => setPostViewerOpen(false)}
        currentUserUid={currentUser?.uid}
      />
    </Container>
  );
};

export default AllGalloGoalsView;
