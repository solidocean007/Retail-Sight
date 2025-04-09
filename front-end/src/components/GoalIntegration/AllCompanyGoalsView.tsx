import { useState } from "react";
import { Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { selectAllCompanyGoals } from "../../Slices/goalsSlice";
import { useSelector } from "react-redux";
import { deleteCompanyGoalFromFirestore } from "../../utils/helperFunctions/deleteCompanyGoalFromFirestore";
import { useAppDispatch } from "../../utils/store";
import { showMessage } from "../../Slices/snackbarSlice";
import CustomConfirmation from "../CustomConfirmation";
import { useNavigate } from "react-router-dom";
import "./allCompanyGoalsView.css";
import InfoRowCompanyGoal from "./CompanyGoalDetailsCard";

const AllCompanyGoalsView = ({
  companyId,
}: {
  companyId: string | undefined;
}) => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [expandedGoals, setExpandedGoals] = useState<string[]>([]);
  const companyGoals = useSelector(selectAllCompanyGoals);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");

  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoals((prevExpanded) =>
      prevExpanded.includes(goalId)
        ? prevExpanded.filter((id) => id !== goalId)
        : [...prevExpanded, goalId]
    );
  };

  const openConfirmationDialog = (programId: string) => {
    setSelectedGoalId(programId);
    setIsConfirmationOpen(true);
  };

  const handleDeleteCompanyGoal = async (goalId: string) => {
    try {
      await deleteCompanyGoalFromFirestore(goalId);
      dispatch(showMessage("Goal deleted successfully."));
      setIsConfirmationOpen(false);
    } catch (error) {
      console.error("Error deleting goal:", error);
      dispatch(showMessage("Failed to delete goal. Please try again."));
    }
  };

  return (
    <div className="all-company-goals-container">
      <Typography
        variant={isMobile ? "h6" : "h4"}
        gutterBottom
        className="company-goals-header"
      >
        Company Goals
      </Typography>

      {/* List of Goals */}
      <div className="goals-list">
        {companyGoals.map((goal, index: number) => {
          // Normalize accounts for rendering

          return (
            <InfoRowCompanyGoal
              key={index}
              goal={goal}
              mobile={isMobile}
              onDelete={openConfirmationDialog}
            />
          );
        })}
      </div>
      <CustomConfirmation
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        onConfirm={() => handleDeleteCompanyGoal(selectedGoalId)}
        message="Are you sure you want to delete this goal?"
      />
    </div>
  );
};

export default AllCompanyGoalsView;

// return (

//   <div className="all-company-goals-container">
//     <Typography
//       variant={isMobile ? "h6" : "h4"}
//       gutterBottom
//       className="company-goals-header"
//     >
//       Company Goals
//     </Typography>

//      <div className="all-goals-container">
//     {/* Fixed Header Row (Only on Desktop) */}
//     {!isMobile && (
//       <div className="fixed-header">
//         {desktopFields.map((field) => (
//           <div key={field} className="header-item">
//             {field}
//           </div>
//         ))}
//         <div className="header-item">Actions</div> {/* Add actions column if needed */}
//       </div>
//     )}

//     {/* List of Goals */}
//     <div className="goals-list">
//       {companyGoals.map((goal, index) => (
//         <CustomInfoRow
//           key={index}
//           data={goal} //  Type 'CompanyAccountType' is not assignable to type 'string'.  Type 'string | CompanyAccountType[]' is not assignable to type 'string | number | string[]'.
//           layoutConfig={{
//             desktopFields,
//             desktopExpandable: "accounts",
//             mobileTabs: [
//               { label: "General", keys: ["Goal Title", "Description"] },
//               { label: "Dates", keys: ["Start Date", "End Date"] },
//               { label: "Info", keys: ["Metric"] },
//               { label: "Accounts", keys: ["accounts"] }
//             ],
//             expandableKeys: ["accounts"]
//           }}
//           mobile={isMobile}
//         />
//       ))}
//     </div>
//   </div>
//       {/* old logic below */}
//     <Box className="goals-container">
//       {companyGoals.map((goal, index) => (
//         <Box
//           key={index}
//           className={`goal-box ${isMobile ? "goal-box-mobile" : ""}`}
//         >
//           <Box className="goal-row">
//             <Typography className="goal-label">Goal Title:</Typography>
//             <Typography className="goal-value">{goal.goalTitle}</Typography>
//           </Box>
//           <Box className="goal-row">
//             <Typography className="goal-label">Description:</Typography>
//             <Typography className="goal-value">
//               {goal.goalDescription}
//             </Typography>
//           </Box>
//           <Box className="goal-row">
//             <Typography className="goal-label">Metric:</Typography>
//             <Typography className="goal-value">
//               {goal.goalMetric || "N/A"}
//             </Typography>
//           </Box>
//           <Box className="goal-row">
//             <Typography className="goal-label">Start:</Typography>
//             <Typography className="goal-value">
//               {goal.goalStartDate}
//             </Typography>
//           </Box>
//           <Box className="goal-row">
//             <Typography className="goal-label">End:</Typography>
//             <Typography className="goal-value">{goal.goalEndDate}</Typography>
//           </Box>
//           <Box className="goal-row">
//             <Typography className="goal-label">Accounts:</Typography>
//             <Typography className="goal-value">
//               {Array.isArray(goal.accounts) && goal.accounts.length > 0 ? (
//                 <Button
//                   variant="outlined"
//                   size="small"
//                   onClick={() => toggleGoalExpansion(goal.id)}
//                 >
//                   {expandedGoals.includes(goal.id) ? "Collapse" : "Show"}
//                 </Button>
//               ) : (
//                 "All Accounts"
//               )}
//             </Typography>
//           </Box>
//           <Box className="goal-row">
//             <Typography className="goal-label">Actions:</Typography>
//             <Button
//               variant="contained"
//               color="secondary"
//               onClick={() => openConfirmationDialog(goal.id)}
//               size={isMobile ? "small" : "medium"}
//             >
//               Delete
//             </Button>
//           </Box>

//           {expandedGoals.includes(goal.id) && (
//             <Collapse
//               in={expandedGoals.includes(goal.id)}
//               timeout="auto"
//               unmountOnExit
//             >
//               <Box margin={1} className="expanded-details">
//                 {Array.isArray(goal.accounts) &&
//                   goal.accounts.map((account: CompanyAccountType) => (
//                     <Box key={account.accountNumber} className="expanded-row">
//                       <Typography>{account.accountName || "N/A"}</Typography>
//                       <Typography>
//                         {account.accountAddress || "N/A"}
//                       </Typography>
//                     </Box>
//                   ))}
//               </Box>
//             </Collapse>
//           )}
//         </Box>
//       ))}
//     </Box>
//     <CustomConfirmation
//       isOpen={isConfirmationOpen}
//       onClose={() => setIsConfirmationOpen(false)}
//       onConfirm={() => handleDeleteCompanyGoal(selectedGoalId)}
//       message="Are you sure you want to delete this goal?"
//     />
//   </div>
// );
