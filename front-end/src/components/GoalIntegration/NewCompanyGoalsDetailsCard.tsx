// CompanyGoalDetailsCard.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import "./companyGoalDetailsCard.css";
import {
  CompanyAccountType,
  CompanyGoalType,
  GoalSubmissionType,
} from "../../utils/types";
import {
  Typography,
  LinearProgress,
  Collapse,
  useMediaQuery,
  Box,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import GoalViewerFilters from "../GoalViewerFilters";
import { FixedSizeList as List } from "react-window";
import {
  selectAllCompanyAccounts,
  setAllAccounts,
} from "../../Slices/allAccountsSlice";
import { getAllCompanyAccountsFromIndexedDB } from "../../utils/database/indexedDBUtils";
import AccountTable from "../AccountTable";
import EditCompanyGoalModal from "./EditCompanyGoalModal";
import { selectCompanyUsers } from "../../Slices/userSlice";

interface NewCompanyGoalDetailsCardProps {
  goal: CompanyGoalType;
  mobile?: boolean;
  salesRouteNum?: string | "";
  onDelete?: (id: string) => void;
}

const NewCompanyGoalDetailsCard: React.FC<NewCompanyGoalDetailsCardProps> = ({
  goal,
  mobile = false,
  salesRouteNum,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [localAccounts, setLocalAccounts] = useState<CompanyAccountType[]>([]);
  const allCompanyAccounts = useSelector(selectAllCompanyAccounts);
  const companyUsers = useSelector(selectCompanyUsers);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isMobileScreen = useMediaQuery("(max-width: 600px)");

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!goal.appliesToAllAccounts) return;
      if (allCompanyAccounts.length > 0) {
        setLocalAccounts(allCompanyAccounts);
      } else {
        try {
          const fallbackAccounts = await getAllCompanyAccountsFromIndexedDB();
          setLocalAccounts(fallbackAccounts);
          dispatch(setAllAccounts(fallbackAccounts));
        } catch (error) {
          console.error("Failed to load fallback accounts:", error);
        }
      }
    };
    fetchAccounts();
  }, [goal.appliesToAllAccounts, allCompanyAccounts, dispatch]);

  const handleGoalUpdate = (updatedFields: Partial<CompanyGoalType>) => {
    // todo: call Firestore update logic or dispatch update to Redux
    console.log("Updated goal fields:", updatedFields);
  };

  const baseAccounts = (
    goal.appliesToAllAccounts ? localAccounts : goal.accounts || []
  ).filter((acc) =>
    salesRouteNum ? acc.salesRouteNums?.includes(salesRouteNum) : true
  );

  const rowsToRender = baseAccounts.map((account) => {
    const foundPost = goal.submittedPosts?.find(
      (post: GoalSubmissionType) => post.accountNumber === account.accountNumber
    );
    return {
      ...account,
      submittedBy: foundPost?.submittedBy || null,
      submittedAt: foundPost?.submittedAt || null,
      postId: foundPost?.postId || null,
    };
  });

  const totalAccounts = rowsToRender.length;
  const submittedCount = rowsToRender.filter((row) => row.postId).length;
  const percentSubmitted =
    totalAccounts > 0 ? Math.round((submittedCount / totalAccounts) * 100) : 0;

  return (
    <div className="info-box-company-goal">
      <div className="info-layout">
        <div className="info-layout-row">
          <div className="info-header">
            <div className="info-title-row">
              <div className="info-title">Title: {goal.goalTitle}</div>
              {onDelete && (
                <div className="goal-delete">
                  <button
                    className="delete-button"
                    onClick={() => onDelete(goal.id)}
                  >
                    <CloseIcon fontSize="small" />
                  </button>
                </div>
              )}
            </div>
            <div className="info-description">
              Description: {goal.goalDescription}
            </div>
          </div>
        </div>

        <div className="info-layout-row">
          <div className="info-item info-segment">
            <div className="info-metric">Metric: {goal.goalMetric}</div>
            <div className="info-metric">Min number: {goal.goalValueMin}</div>
          </div>
          <div className="info-item info-segment">
            <div className="info-metric">Start: {goal.goalStartDate}</div>
            <div className="info-metric">End: {goal.goalEndDate}</div>
          </div>
        </div>

        <Box px={2} pb={1}>
          <Typography variant="body2">{`${percentSubmitted}% Submitted`}</Typography>
          <LinearProgress variant="determinate" value={percentSubmitted} color="success" />
        </Box>
      </div>

      <div className="info-layout-row-bottom">
        <div className="info-accounts tab-wrapper">
          <button
            className="tab-submissions"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded
              ? `Hide Submissions (${rowsToRender.length})`
              : rowsToRender.length > 0
              ? `View Submissions (${rowsToRender.length})`
              : "No Submissions"}
          </button>

          <Button
            size="small"
            variant="outlined"
            onClick={() => setIsEditModalOpen(true)}
          >
            Edit Goal Targeting
          </Button>

          <div className="tab-filler" />
        </div>
      </div>

      <Collapse
        in={expanded}
        timeout="auto"
        unmountOnExit
        className="expanded-submissions"
      >
        <GoalViewerFilters
          searchTerm={""}
          setSearchTerm={() => {}}
          filterSubmitted={"all"}
          setFilterSubmitted={() => {}}
        />
        <AccountTable
          accounts={rowsToRender}
          navigate={navigate}
          height={500}
          rowHeight={60}
        />
      </Collapse>

      <EditCompanyGoalModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        goal={goal}
        allAccounts={allCompanyAccounts}
        companyUsers={companyUsers}
        onSave={handleGoalUpdate}
      />
    </div>
  );
};

export default NewCompanyGoalDetailsCard;
