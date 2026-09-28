import { useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Menu,
  MenuItem,
} from "@mui/material";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import SortOutlinedIcon from "@mui/icons-material/SortOutlined";
import { useSelector } from "react-redux";
import { useMediaQuery, useTheme } from "@mui/material";

import {
  makeSelectUsersCompanyGoals,
  selectCompanyGoalsIsLoading,
} from "../../Slices/companyGoalsSlice";
import { selectUser } from "../../Slices/userSlice";
import ArchivedGoalsLayout from "./ArchivedGoals/ArchivedGoalsLayout";
import PostViewerModal from "../PostViewerModal";
import UserCompanyGoalCard from "./UserCompanyGoalCard";

import "./myCompanyGoals.css";

type SortOrder = "newest" | "oldest" | "title";

const SORT_LABELS: Record<SortOrder, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  title: "Title A–Z",
};

const getLocalDateKey = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const MyCompanyGoals = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const user = useSelector(selectUser);
  const loading = useSelector(selectCompanyGoalsIsLoading);

  const userGoalsSelector = useMemo(
    () =>
      makeSelectUsersCompanyGoals(
        user?.salesRouteNum,
        user?.uid,
        user?.role,
      ),
    [user?.role, user?.salesRouteNum, user?.uid],
  );
  const userCompanyGoals = useSelector(userGoalsSelector);

  const [postIdToView, setPostIdToView] = useState<string | null>(null);
  const [postViewerOpen, setPostViewerOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  const sortedGoals = useMemo(() => {
    const sort = (goals: typeof userCompanyGoals) =>
      [...goals].sort((a, b) => {
        if (sortOrder === "newest") {
          return b.goalStartDate.localeCompare(a.goalStartDate);
        }
        if (sortOrder === "oldest") {
          return a.goalStartDate.localeCompare(b.goalStartDate);
        }
        return a.goalTitle.localeCompare(b.goalTitle);
      });

    const today = getLocalDateKey();

    return {
      current: sort(
        userCompanyGoals.filter(
          (goal) => goal.goalStartDate <= today && goal.goalEndDate >= today,
        ),
      ),
      upcoming: sort(
        userCompanyGoals.filter((goal) => goal.goalStartDate > today),
      ),
      archived: sort(
        userCompanyGoals.filter((goal) => goal.goalEndDate < today),
      ),
    };
  }, [sortOrder, userCompanyGoals]);

  const openPostViewer = (postId: string) => {
    setPostIdToView(postId);
    setPostViewerOpen(true);
  };

  const renderSection = (
    sectionId: string,
    title: string,
    description: string,
    goals: typeof userCompanyGoals,
  ) => (
    <section className="user-goals-section" aria-labelledby={`goal-section-${sectionId}`}>
      <div className="user-goals-section__heading">
        <div>
          <h2 id={`goal-section-${sectionId}`}>{title}</h2>
          <p>{description}</p>
        </div>
        <span>{goals.length}</span>
      </div>
      <div className="user-goals-list">
        {goals.map((goal) => (
          <UserCompanyGoalCard
            key={goal.id}
            goal={goal}
            salesRouteNum={user?.salesRouteNum}
            mobile={isMobile}
            expanded={expandedGoalId === goal.id}
            onToggleExpand={(goalId) =>
              setExpandedGoalId((current) =>
                current === goalId ? null : goalId,
              )
            }
            onViewPostModal={openPostViewer}
          />
        ))}
      </div>
    </section>
  );

  return (
    <div className="my-company-goals-container">
      {!loading && userCompanyGoals.length > 0 && (
        <div className="user-goals-toolbar">
          <div className="user-goals-toolbar__summary">
            <strong>{sortedGoals.current.length}</strong>
            <span>active</span>
            <i aria-hidden="true" />
            <strong>{sortedGoals.upcoming.length}</strong>
            <span>upcoming</span>
          </div>

          <Button
            className="user-goals-sort-button"
            onClick={(event) => setSortAnchor(event.currentTarget)}
            variant="outlined"
            size="small"
            startIcon={<SortOutlinedIcon />}
            aria-haspopup="menu"
            aria-expanded={Boolean(sortAnchor)}
          >
            {SORT_LABELS[sortOrder]}
          </Button>
          <Menu
            anchorEl={sortAnchor}
            open={Boolean(sortAnchor)}
            onClose={() => setSortAnchor(null)}
          >
            {(Object.keys(SORT_LABELS) as SortOrder[]).map((order) => (
              <MenuItem
                key={order}
                selected={sortOrder === order}
                onClick={() => {
                  setSortOrder(order);
                  setSortAnchor(null);
                }}
              >
                {SORT_LABELS[order]}
              </MenuItem>
            ))}
          </Menu>
        </div>
      )}

      {loading ? (
        <div className="user-goals-state" role="status">
          <CircularProgress size={30} />
          <strong>Loading your goals</strong>
          <span>Gathering your current assignments and progress.</span>
        </div>
      ) : userCompanyGoals.length === 0 ? (
        <div className="user-goals-state user-goals-state--empty">
          <span className="user-goals-state__icon" aria-hidden="true">
            <AssignmentOutlinedIcon />
          </span>
          <strong>No company goals assigned</strong>
          <span>New assignments will appear here when your company publishes them.</span>
        </div>
      ) : (
        <>
          {sortedGoals.current.length > 0 &&
            renderSection(
              "current",
              "Current goals",
              "Work that is active now.",
              sortedGoals.current,
            )}
          {sortedGoals.upcoming.length > 0 &&
            renderSection(
              "upcoming",
              "Upcoming goals",
              "Assignments you can prepare for next.",
              sortedGoals.upcoming,
            )}

          {sortedGoals.archived.length > 0 && (
            <Box className="user-goals-archive">
              <ArchivedGoalsLayout
                archivedGoals={sortedGoals.archived}
                isMobile={isMobile}
                salesRouteNum={user?.salesRouteNum}
                onViewPostModal={openPostViewer}
              />
            </Box>
          )}
        </>
      )}

      <PostViewerModal
        key={postIdToView}
        postId={postIdToView || ""}
        open={postViewerOpen}
        onClose={() => setPostViewerOpen(false)}
        currentUserUid={user?.uid}
      />
    </div>
  );
};

export default MyCompanyGoals;
