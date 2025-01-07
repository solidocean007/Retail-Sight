import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { CompanyGoalType } from "../../utils/types";

const CompanyGoalsView = ({goals} : {goals: CompanyGoalType[]} ) => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Company Goals
      </Typography>
      <Table className="table">
      
      <TableHead>
        <TableRow>
          <TableCell>Goal Title</TableCell>
          <TableCell>Description</TableCell>
          <TableCell>Assigned Accounts</TableCell>
          <TableCell>Actions</TableCell>
        </TableRow>
      </TableHead>
      {/* <TableBody>
        {goals.map((goal) => (
          <TableRow key={goal.goalDetails.goalId}>
            <TableCell>{goal.goalDetails.goal}</TableCell>
            <TableCell>{goal.goalDetails.description || "N/A"}</TableCell>
            <TableCell>
              {goal.accounts.length > 0
                ? goal.accounts.map((acc) => acc.accountName).join(", ")
                : "Global"}
            </TableCell>
            <TableCell>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => handleDeleteGoal(goal.goalDetails.goalId)}
              >
                Delete Goal
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody> */}
    </Table>
    </Box>
    
  );
};

export default CompanyGoalsView;
