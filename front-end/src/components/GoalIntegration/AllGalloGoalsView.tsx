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
import GalloProgramCard from "./GalloProgramCard";
import PostViewerModal from "../PostViewerModal";
import { RootState } from "../../utils/store";
import { useIntegrations } from "../../hooks/useIntegrations";
import { useNavigate } from "react-router-dom";

const AllGalloGoalsView = () => {
  const navigate = useNavigate();
  const { isEnabled } = useIntegrations();
  const galloEnabled = isEnabled("gallo");
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const galloGoals = useSelector(selectAllGalloGoals);
  const isLoading = useSelector(selectGalloGoalsLoading);
  const error = useSelector(selectGalloGoalsError);
  const companyUsers = useSelector(selectCompanyUsers) || [];
  const [postIdToView, setPostIdToView] = useState<string | null>(null);
  const [postViewerOpen, setPostViewerOpen] = useState(false);

  const openPostViewer = (postId: string) => {
    setPostIdToView(postId);
    setPostViewerOpen(true);
  };

  const closePostViewer = () => {
    setPostViewerOpen(false);
  };

  const employeeMap = useMemo(() => {
    const map: Record<string, string> = {};
    companyUsers.forEach((user) => {
      if (user.salesRouteNum) {
        map[user.salesRouteNum] = `${user.firstName} ${user.lastName}`;
      }
    });
    return map;
  }, [companyUsers]);

  const programsMap = useMemo(() => {
    const map: Record<string, any> = {};
    galloGoals.forEach((goal) => {
      const programId = goal.programDetails.programId;
      if (!map[programId]) {
        map[programId] = {
          ...goal.programDetails,
          goals: [],
        };
      }
      map[programId].goals.push(goal);
    });
    return Object.values(map);
  }, [galloGoals]);

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
    <Container>
      <Typography variant="h4" className="gallo-goals-header">
        Gallo Programs
      </Typography>

      <Box className="programs-wrapper">
        {programsMap.map((program) => (
          <GalloProgramCard
            key={program.programId}
            program={program}
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
