import { useSelector } from "react-redux";
import {
  Typography,
  CircularProgress,
  useMediaQuery,
  Box,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { selectUser } from "../Slices/userSlice";
import {
  makeSelectUsersCompanyGoals,
  selectAllCompanyGoals,
  selectCompanyGoalsIsLoading,
  selectUsersCompanyGoals,
} from "../Slices/companyGoalsSlice";
import { RootState } from "../utils/store";
import CompanyGoalCard from "./GoalIntegration/CompanyGoalCard";
import "./myCompanyGoals.css";

const MyCompanyGoals = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const user = useSelector(selectUser);
  const loading = useSelector(selectCompanyGoalsIsLoading);

  const userCompanyGoals = useSelector(
  makeSelectUsersCompanyGoals(user?.salesRouteNum)
);

  console.log("userCompanyGoals", userCompanyGoals);

  const today = new Date();

  const currentGoals = userCompanyGoals.filter((goal) => {
    const start = new Date(goal.goalStartDate);
    const end = new Date(goal.goalEndDate);
    return start <= today && end >= today;
  });

  const upcomingGoals = userCompanyGoals
    .filter((goal) => new Date(goal.goalStartDate) > today)
    .sort((a, b) => new Date(a.goalStartDate).getTime() - new Date(b.goalStartDate).getTime());

  const pastGoals = userCompanyGoals
    .filter((goal) => new Date(goal.goalEndDate) < today)
    .sort((a, b) => new Date(b.goalEndDate).getTime() - new Date(a.goalEndDate).getTime());

  const renderSection = (title: string, goals: typeof userCompanyGoals) => (
    <Box mb={3}>
      <Typography variant="h5" className="goals-section-header">
        {title}
      </Typography>
      {goals.map((goal) => (
        <CompanyGoalCard key={goal.id} goal={goal} salesRouteNum={user?.salesRouteNum} mobile={isMobile} />
      ))}
    </Box>
  );

  return (
    <div className="my-company-goals-container">
      <Typography variant="h3" className="my-goals-title" sx={{ fontSize: "large" }}>
        My Company Goals
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : userCompanyGoals.length === 0 ? (
        <Typography variant="body1" sx={{ mt: 2 }}>
          No company goals found for your route.
        </Typography>
      ) : (
        <>
          {currentGoals.length > 0 && renderSection("Current Goals", currentGoals)}
          {upcomingGoals.length > 0 && renderSection("Upcoming Goals", upcomingGoals)}
          {pastGoals.length > 0 && renderSection("Past Goals", pastGoals)}
        </>
      )}
    </div>
  );
};

export default MyCompanyGoals;

