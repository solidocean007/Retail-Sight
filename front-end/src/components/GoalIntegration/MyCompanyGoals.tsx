import { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  Typography,
  CircularProgress,
  useMediaQuery,
  Box,
  Button,
  Menu,
  MenuItem,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { selectUser } from "../../Slices/userSlice";
import {
  makeSelectUsersCompanyGoals,
  selectCompanyGoalsIsLoading,
} from "../../Slices/companyGoalsSlice";
import CompanyGoalCard from "./CompanyGoalCard";
import "./myCompanyGoals.css";
import ArchivedGoalsLayout from "./ArchivedGoals/ArchivedGoalsLayout";
import PostViewerModal from "../PostViewerModal";

const MyCompanyGoals: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const user = useSelector(selectUser);
  const loading = useSelector(selectCompanyGoalsIsLoading);

  const userCompanyGoals = useSelector(
    makeSelectUsersCompanyGoals(user?.salesRouteNum, user?.uid)
  );

  const [showArchived, setShowArchived] = useState(false);

  const [postIdToView, setPostIdToView] = useState<string | null>(null);
  const [postViewerOpen, setPostViewerOpen] = useState(false);

  const openPostViewer = (postId: string) => {
    setPostIdToView(postId);
    setPostViewerOpen(true);
  };

  const closePostViewer = () => {
    setPostViewerOpen(false);
  };

  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "title">(
    "newest"
  );
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // 🆕 Manage expanded card
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  const handleToggleExpand = (goalId: string) => {
    setExpandedGoalId((prev) => (prev === goalId ? null : goalId));
  };

  const today = new Date();

  const sortedGoals = useMemo(() => {
    const sortGoals = (goals: typeof userCompanyGoals) => {
      return [...goals].sort((a, b) => {
        if (sortOrder === "newest") {
          return b.goalStartDate.localeCompare(a.goalStartDate);
        } else if (sortOrder === "oldest") {
          return a.goalStartDate.localeCompare(b.goalStartDate);
        } else if (sortOrder === "title") {
          return a.goalTitle.localeCompare(b.goalTitle);
        }
        return 0;
      });
    };

    const current = userCompanyGoals.filter((goal) => {
      const start = new Date(goal.goalStartDate);
      const end = new Date(goal.goalEndDate);
      return start <= today && end >= today;
    });
    const upcoming = userCompanyGoals.filter(
      (goal) => new Date(goal.goalStartDate) > today
    );
    const past = userCompanyGoals.filter(
      (goal) => new Date(goal.goalEndDate) < today
    );

    return {
      currentGoals: sortGoals(current),
      upcomingGoals: sortGoals(upcoming),
      pastGoals: sortGoals(past),
    };
  }, [userCompanyGoals, sortOrder, today]);

  const archivedGoals = sortedGoals.pastGoals;

  const handleSortClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSortSelect = (order: "newest" | "oldest" | "title") => {
    setSortOrder(order);
    setAnchorEl(null);
  };

  const renderSection = (title: string, goals: typeof userCompanyGoals) => (
    <Box mb={3}>
      <Typography variant="h5" className="goals-section-header">
        {title}
      </Typography>
      {goals.map((goal) => (
        <CompanyGoalCard
          key={goal.id}
          goal={goal}
          salesRouteNum={user?.salesRouteNum}
          mobile={isMobile}
          expanded={expandedGoalId === goal.id}
          onToggleExpand={handleToggleExpand}
          onViewPostModal={openPostViewer} // ✅ Use the actual function
        />
      ))}
    </Box>
  );

  return (
    <div className="my-company-goals-container">
      <Typography
        variant="h3"
        className="my-goals-title"
        sx={{ fontSize: "large" }}
      >
        My Company Goals
      </Typography>

      {/* Sort Button */}
      <Button
        onClick={handleSortClick}
        variant="outlined"
        size="small"
        sx={{ mt: 2, mb: 2 }}
      >
        Sort:{" "}
        {sortOrder === "newest"
          ? "Newest First"
          : sortOrder === "oldest"
          ? "Oldest First"
          : "Title A-Z"}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleSortSelect("newest")}>
          Newest First
        </MenuItem>
        <MenuItem onClick={() => handleSortSelect("oldest")}>
          Oldest First
        </MenuItem>
        <MenuItem onClick={() => handleSortSelect("title")}>Title A-Z</MenuItem>
      </Menu>

      {loading ? (
        <CircularProgress />
      ) : userCompanyGoals.length === 0 ? (
        <Typography variant="body1" sx={{ mt: 2 }}>
          No company goals found for your route.
        </Typography>
      ) : (
        <>
          {sortedGoals.currentGoals.length > 0 &&
            renderSection("Current Goals", sortedGoals.currentGoals)}
          {sortedGoals.upcomingGoals.length > 0 &&
            renderSection("Upcoming Goals", sortedGoals.upcomingGoals)}

          {archivedGoals.length > 0 && (
            <ArchivedGoalsLayout
              archivedGoals={archivedGoals}
              isMobile={isMobile}
              salesRouteNum={user?.salesRouteNum}
            />
          )}
        </>
      )}
      <PostViewerModal
        key={postIdToView}
        postId={postIdToView || ""}
        open={postViewerOpen}
        onClose={closePostViewer}
        currentUserUid={user?.uid}
      />
    </div>
  );
};

export default MyCompanyGoals;
