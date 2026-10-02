import { Box, CircularProgress, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import {
  addOrUpdateGalloGoal,
  FireStoreGalloGoalWithId,
  selectAllGalloGoals,
  selectGalloGoalsError,
  selectGalloGoalsLoading,
  selectGoalsByTiming,
} from "../../Slices/galloGoalsSlice";
import { selectCompanyUsers } from "../../Slices/userSlice";
import { useCompanyIntegrations } from "../../hooks/useCompanyIntegrations";
import { RootState } from "../../utils/store";
import { FireStoreGalloGoalDocType } from "../../utils/types";
import { updateGalloGoalLifecycle } from "../../utils/helperFunctions/updateGalloGoalLifecycle";
import CustomConfirmation from "../CustomConfirmation";
import PostViewerModal from "../PostViewerModal";
import AdminGalloGoalsSection from "./AdminGalloGoalsSection";
import EditGalloGoalModal from "./EditGalloGoalModal";
import GalloGoalProgressOverlay from "./GalloGoalProgressOverlay";
import GalloGoalsCollection from "./GalloGoalsCollection";
import GalloGoalsHeatMap from "./GalloGoalsHeatMap";
import { type GalloGoalView } from "./AllGoalsLayout";

import "./gallo-goals.css";

type Props = {
  view: GalloGoalView;
  onViewChange: (view: GalloGoalView) => void;
};

const toDateValue = (value?: string) => {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sortByStartDate = (
  goals: FireStoreGalloGoalWithId[],
): FireStoreGalloGoalWithId[] =>
  [...goals].sort(
    (a, b) =>
      toDateValue(a.programDetails.programStartDate) -
      toDateValue(b.programDetails.programStartDate),
  );

const sortByEndDate = (
  goals: FireStoreGalloGoalWithId[],
  direction: "ascending" | "descending",
): FireStoreGalloGoalWithId[] =>
  [...goals].sort((a, b) => {
    const difference =
      toDateValue(a.programDetails.programEndDate) -
      toDateValue(b.programDetails.programEndDate);
    return direction === "ascending" ? difference : -difference;
  });

const AllGalloGoalsView = ({ view, onViewChange }: Props) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId,
  );
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const companyUsers = useSelector(selectCompanyUsers);
  const allGoals = useSelector(selectAllGalloGoals);
  const goalsByTiming = useSelector(selectGoalsByTiming);
  const isLoading = useSelector(selectGalloGoalsLoading);
  const error = useSelector(selectGalloGoalsError);

  const { isEnabled } = useCompanyIntegrations(companyId);
  const galloEnabled = isEnabled("galloAxis");

  const [selectedGoal, setSelectedGoal] =
    useState<FireStoreGalloGoalWithId | null>(null);
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
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  const canManage =
    currentUser?.role === "admin" ||
    currentUser?.role === "super-admin" ||
    currentUser?.role === "developer";

  const employeeMap = useMemo(() => {
    const map: Record<string, string> = {};
    (companyUsers ?? []).forEach((user) => {
      if (user.salesRouteNum) {
        map[user.salesRouteNum] = `${user.firstName} ${user.lastName}`;
      }
    });
    return map;
  }, [companyUsers]);

  const filteredGoals = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const matchesSearch = (goal: FireStoreGalloGoalWithId) => {
      if (!query) return true;
      return [
        goal.programDetails?.programTitle,
        goal.goalDetails?.goal,
        goal.goalDetails?.goalId,
      ].some((value) => value?.toLocaleLowerCase().includes(query));
    };

    return {
      scheduled: sortByStartDate(goalsByTiming.scheduled.filter(matchesSearch)),
      upcoming: sortByStartDate(goalsByTiming.upcoming.filter(matchesSearch)),
      current: sortByEndDate(
        goalsByTiming.current.filter(matchesSearch),
        "ascending",
      ),
      archived: sortByEndDate(
        goalsByTiming.archived.filter(
          (goal) => goal.lifeCycleStatus !== "disabled" && matchesSearch(goal),
        ),
        "descending",
      ),
      disabled: sortByEndDate(
        allGoals.filter(
          (goal) => goal.lifeCycleStatus === "disabled" && matchesSearch(goal),
        ),
        "descending",
      ),
    };
  }, [allGoals, goalsByTiming, search]);

  const disabledCount = useMemo(
    () => allGoals.filter((goal) => goal.lifeCycleStatus === "disabled").length,
    [allGoals],
  );

  const requestLifecycleChange = (
    goal: FireStoreGalloGoalDocType,
    status: "archived" | "disabled",
  ) => {
    setLifecycleError(null);
    setPendingAction({ goal, status });
  };

  const closeLifecycleConfirmation = () => {
    if (confirmLoading) return;
    setPendingAction(null);
    setLifecycleError(null);
  };

  const confirmLifecycleChange = async () => {
    if (!pendingAction) return;

    const { goal, status } = pendingAction;
    setConfirmLoading(true);
    setLifecycleError(null);

    try {
      await updateGalloGoalLifecycle(goal.goalDetails.goalId, status);
      dispatch(
        addOrUpdateGalloGoal({
          ...goal,
          lifeCycleStatus: status,
          id: goal.goalDetails.goalId,
        }),
      );
      setEditGoal(null);
      setPendingAction(null);
    } catch (actionError) {
      console.error(`Failed to mark Gallo goal as ${status}:`, actionError);
      setLifecycleError(
        `The goal could not be ${
          status === "archived" ? "archived" : "disabled"
        }. Nothing was changed. Please try again.`,
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  const openPostViewer = (postId: string) => {
    setPostIdToView(postId);
    setPostViewerOpen(true);
  };

  const collectionProps = {
    employeeMap,
    onViewPostModal: openPostViewer,
    canManage,
    onEdit: setEditGoal,
    onArchive: (goal: FireStoreGalloGoalDocType) =>
      requestLifecycleChange(goal, "archived"),
    onDisable: (goal: FireStoreGalloGoalDocType) =>
      requestLifecycleChange(goal, "disabled"),
  };

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

  return (
    <div
      id="gallo-goal-view-panel"
      className="gallo-goals-view"
      role="tabpanel"
      aria-labelledby={
        view === "disabled" ? undefined : `gallo-view-tab-${view}`
      }
      aria-label={view === "disabled" ? "Disabled Gallo goals" : undefined}
    >
      <div className="gallo-goals-toolbar">
        <label className="gallo-goals-search">
          <span>Search this view</span>
          <input
            type="search"
            placeholder="Program, goal, or ID…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        {canManage && disabledCount > 0 && (
          <button
            type="button"
            className={`gallo-goals-admin-view ${
              view === "disabled" ? "is-active" : ""
            }`}
            aria-pressed={view === "disabled"}
            onClick={() =>
              onViewChange(view === "disabled" ? "current" : "disabled")
            }
          >
            Disabled
            <span>{disabledCount}</span>
          </button>
        )}
      </div>

      {view === "current" && (
        <>
          {filteredGoals.current.length > 0 && (
            <GalloGoalsHeatMap
              goals={filteredGoals.current}
              onClickGoal={(goalId) => {
                const found = filteredGoals.current.find(
                  (goal) => goal.id === goalId,
                );
                if (found) setSelectedGoal(found);
              }}
            />
          )}

          <AdminGalloGoalsSection
            title="Current goals"
            subtitle="Live programs, ordered by the goals ending soonest."
            count={filteredGoals.current.length}
          >
            <GalloGoalsCollection
              goals={filteredGoals.current}
              emptyTitle="No current goals"
              emptyMessage={
                search
                  ? "No live programs match this search."
                  : "There are no Gallo programs in progress right now."
              }
              {...collectionProps}
            />
          </AdminGalloGoalsSection>
        </>
      )}

      {view === "upcoming" && (
        <>
          <AdminGalloGoalsSection
            title="Scheduled goals"
            subtitle="Approved programs that are not visible to users yet."
            count={filteredGoals.scheduled.length}
          >
            <GalloGoalsCollection
              goals={filteredGoals.scheduled}
              emptyTitle="No scheduled goals"
              emptyMessage="There are no approved programs waiting for their display date."
              timingContext="scheduled"
              {...collectionProps}
            />
          </AdminGalloGoalsSection>

          <AdminGalloGoalsSection
            title="Upcoming goals"
            subtitle="Visible programs that will become active soon."
            count={filteredGoals.upcoming.length}
          >
            <GalloGoalsCollection
              goals={filteredGoals.upcoming}
              emptyTitle="No upcoming goals"
              emptyMessage={
                search
                  ? "No upcoming programs match this search."
                  : "There are no visible programs waiting to begin."
              }
              timingContext="upcoming"
              {...collectionProps}
            />
          </AdminGalloGoalsSection>
        </>
      )}

      {view === "archived" && (
        <AdminGalloGoalsSection
          title="Archived goals"
          subtitle="Past programs, ordered by the most recently completed."
          count={filteredGoals.archived.length}
          tone="archived"
        >
          <GalloGoalsCollection
            goals={filteredGoals.archived}
            emptyTitle="No archived goals"
            emptyMessage={
              search
                ? "No archived programs match this search."
                : "Completed Gallo programs will be kept here for reference."
            }
            compact
            {...collectionProps}
          />
        </AdminGalloGoalsSection>
      )}

      {view === "disabled" && (
        <AdminGalloGoalsSection
          title="Disabled goals"
          subtitle="Programs removed from active workflows by an administrator."
          count={filteredGoals.disabled.length}
          tone="disabled"
        >
          <GalloGoalsCollection
            goals={filteredGoals.disabled}
            emptyTitle="No disabled goals"
            emptyMessage={
              search
                ? "No disabled programs match this search."
                : "There are no disabled Gallo programs."
            }
            compact
            {...collectionProps}
          />
        </AdminGalloGoalsSection>
      )}

      {editGoal && (
        <EditGalloGoalModal
          goal={editGoal}
          onClose={() => setEditGoal(null)}
          onArchive={() => requestLifecycleChange(editGoal, "archived")}
          onDisable={() => requestLifecycleChange(editGoal, "disabled")}
        />
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
              ? `Archive “${pendingAction.goal.goalDetails.goal}”? It will leave active workflows, while its history remains available in Archived goals.`
              : `Disable “${pendingAction.goal.goalDetails.goal}”? Sales reps will no longer be able to submit new displays while this goal is disabled.`
          }
          confirmLabel={
            pendingAction.status === "archived"
              ? "Archive goal"
              : "Disable goal"
          }
          tone={pendingAction.status === "archived" ? "warning" : "danger"}
          error={lifecycleError}
          loading={confirmLoading}
          onClose={closeLifecycleConfirmation}
          onConfirm={confirmLifecycleChange}
        />
      )}

      {selectedGoal && (
        <GalloGoalProgressOverlay
          goal={selectedGoal}
          employeeMap={employeeMap}
          onClose={() => setSelectedGoal(null)}
          onEdit={() => {
            setEditGoal(selectedGoal);
            setSelectedGoal(null);
          }}
          onViewPost={openPostViewer}
        />
      )}

      <PostViewerModal
        key={postIdToView}
        postId={postIdToView || ""}
        open={postViewerOpen}
        onClose={() => setPostViewerOpen(false)}
        currentUserUid={currentUser?.uid}
      />
    </div>
  );
};

export default AllGalloGoalsView;
