import { useSelector } from "react-redux";
import { Box, Typography, CircularProgress, Container } from "@mui/material";
import {
  selectAllGalloGoals,
  selectGalloGoalsLoading,
  selectGalloGoalsError,
} from "../../Slices/galloGoalsSlice";
import { selectCompanyUsers } from "../../Slices/userSlice";
import { useMemo, useState } from "react";
import "./gallo-goals.css";
import PostViewerModal from "../PostViewerModal";
import { RootState } from "../../utils/store";
import { useIntegrations } from "../../hooks/useIntegrations";
import { useNavigate } from "react-router-dom";
import GalloGoalCard from "./GalloGoalCard";
import { LifecycleFilter } from "../../utils/types";

const AllGalloGoalsView = () => {
  const navigate = useNavigate();
  const { isEnabled } = useIntegrations();
  const galloEnabled = isEnabled("galloAxis");

  const [lifecycleFilter, setLifecycleFilter] =
    useState<LifecycleFilter>("active");
  const [search, setSearch] = useState("");

  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const galloGoals = useSelector(selectAllGalloGoals);
  console.log(galloGoals);
  const isLoading = useSelector(selectGalloGoalsLoading);
  const error = useSelector(selectGalloGoalsError);
  const companyUsers = useSelector(selectCompanyUsers) || [];

  const [postIdToView, setPostIdToView] = useState<string | null>(null);
  const [postViewerOpen, setPostViewerOpen] = useState(false);

  const lifecycleOrder: Record<string, number> = {
    active: 0,
    disabled: 1,
    archived: 2,
  };

  const openPostViewer = (postId: string) => {
    setPostIdToView(postId);
    setPostViewerOpen(true);
  };

  /** 🔎 Filter + search + sort */
  const visibleGoals = useMemo(() => {
    return galloGoals
      .filter((goal) =>
        lifecycleFilter === "all"
          ? true
          : goal.lifeCycleStatus === lifecycleFilter
      )
      .filter((goal) =>
        search
          ? goal.programDetails.programTitle
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            goal.goalDetails.goal.toLowerCase().includes(search.toLowerCase())
          : true
      )
      .sort(
        (a, b) =>
          lifecycleOrder[a.lifeCycleStatus] - lifecycleOrder[b.lifeCycleStatus]
      );
  }, [galloGoals, lifecycleFilter, search]);

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

      {/* Empty state */}
      {visibleGoals.length === 0 && (
        <Box textAlign="center" mt={4}>
          <Typography color="text.secondary">
            No goals match your current filters.
          </Typography>
        </Box>
      )}

      {/* Goals */}
      <Box className="programs-wrapper">
        {visibleGoals.map((goal) => (
          <GalloGoalCard
            key={goal.id} // use Firestore doc id
            goal={goal}
            employeeMap={employeeMap}
            onViewPostModal={openPostViewer}
          />
        ))}
      </Box>

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
