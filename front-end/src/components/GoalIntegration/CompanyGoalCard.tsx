import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  CompanyAccountType,
  CompanyGoalType,
  GoalSubmissionType,
} from "../../utils/types";
import {
  Typography,
  Collapse,
  Box,
  Button,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InfoIcon from "@mui/icons-material/Info";
import GoalViewerFilters from "../GoalViewerFilters";
import AccountTable from "../AccountTable";
import UserTableForGoals from "../UserTableForGoals";
import {
  selectAllCompanyAccounts,
  setAllAccounts,
} from "../../Slices/allAccountsSlice";
import { getAllCompanyAccountsFromIndexedDB } from "../../utils/database/indexedDBUtils";
import EditCompanyGoalModal from "./EditCompanyGoalModal";
import { selectCompanyUsers } from "../../Slices/userSlice";

import "./companyGoalCard.css";
import {
  calculateSubmissionStats,
  getEffectiveAccounts,
  mapAccountsWithStatus,
} from "./utils/goalModeUtils";

interface CompanyGoalCardProps {
  goal: CompanyGoalType;
  mobile?: boolean;
  salesRouteNum?: string | "";
  onDelete?: (id: string) => void;
  onEdit?: (goalId: string, updatedFields: Partial<CompanyGoalType>) => void;
}

const CompanyGoalCard: React.FC<CompanyGoalCardProps> = ({
  goal,
  mobile = false,
  onDelete,
  onEdit,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isMobileScreen = useMediaQuery("(max-width: 600px)");
  const allCompanyAccounts = useSelector(selectAllCompanyAccounts);
  const companyUsers = useSelector(selectCompanyUsers) || [];
  const shouldUseMobileLayout = mobile || isMobileScreen;
  const [expanded, setExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubmitted, setFilterSubmitted] = useState<
    "all" | "submitted" | "not-submitted"
  >("all");

  useEffect(() => {
    if (!allCompanyAccounts.length) {
      getAllCompanyAccountsFromIndexedDB().then((fallback) => {
        dispatch(setAllAccounts(fallback));
      });
    }
  }, [allCompanyAccounts, dispatch]);

  const effectiveAccounts = useMemo(
    () => getEffectiveAccounts(goal, allCompanyAccounts),
    [goal, allCompanyAccounts]
  );

  const { total, submitted, percentage } = useMemo(
    () => calculateSubmissionStats(goal, effectiveAccounts),
    [goal, effectiveAccounts]
  );

  const accountsWithStatus = useMemo(
    () => mapAccountsWithStatus(goal, effectiveAccounts),
    [goal, effectiveAccounts]
  );

  const userBasedRows = useMemo(() => {
    if (goal.targetMode !== "goalForSelectedUsers") return [];
    return companyUsers
      .filter((u) => goal.usersIdsOfGoal?.includes(u.uid))
      .map((user) => {
        const matchingPost = goal.submittedPosts?.find(
          (post) =>
            post.submittedBy.uid === user.uid ||
            (typeof post.submittedBy === "object" &&
              post.submittedBy?.uid === user.uid)
        ); // This comparison appears to be unintentional because the types 'UserType' and 'string' have no overlap.

        return {
          uid: user.uid,
          displayName: `${user.firstName} ${user.lastName}`,
          submittedAt: matchingPost?.submittedAt || null,
          postId: matchingPost?.postId || null,
        };
      });
  }, [goal, companyUsers]);

  const handleGoalUpdate = (updatedFields: Partial<CompanyGoalType>) => {
    //Parameter 'updatedFields' implicitly has an 'any' type.
    if (onEdit && goal.id) onEdit(goal.id, updatedFields);
  };

  const renderDetails = (
    <div className="info-layout">
      <div className="info-title-row">
        <div className="info-title">{goal.goalTitle}</div>
        {onDelete && (
          <Box display="flex" gap={1}>
            <div className="goal-delete">
              <CloseIcon
                fontSize="small"
                className="delete-button"
                onClick={() => onDelete(goal.id)}
              />
            </div>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setIsEditModalOpen(true)}
            >
              Edit
            </Button>
          </Box>
        )}
      </div>
      <div className="info-description">{goal.goalDescription}</div>
      {goal.perUserQuota && goal.perUserQuota > 0 && (
        <div className="info-quota">
          Requirement: Each assigned user must submit at least{" "}
          {goal.perUserQuota} submission{goal.perUserQuota > 1 ? "s" : ""}.
        </div>
      )}
    </div>
  );

  const renderMetrics = (
    <Box textAlign={isMobileScreen ? "left" : "right"} mt={1}>
      <Typography variant="caption">Goal Progress</Typography>
      <div>
        {submitted} / {total} Submitted
        <Tooltip title={`${submitted} of ${total} submitted`}>
          <InfoIcon fontSize="small" style={{ marginLeft: 4 }} />
        </Tooltip>
      </div>
      <div>{percentage}% Complete</div>
    </Box>
  );

  const renderFiltersAndTable = (
    <>
      <GoalViewerFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterSubmitted={filterSubmitted} // Type 'string' is not assignable to type '"all" | "submitted" | "not-submitted"
        setFilterSubmitted={setFilterSubmitted}
      />
      {goal.targetMode === "goalForSelectedUsers" ? (
        <UserTableForGoals users={userBasedRows} />
      ) : (
        <AccountTable
          accounts={accountsWithStatus}
          navigate={navigate}
          height={500}
          rowHeight={60}
        />
      )}
    </>
  );

  return (
    <div className="info-box-company-goal">
      <div className="info-layout-row">
        {renderDetails}
        {renderMetrics}
      </div>

      <div className="info-layout-row-bottom">
        <button
          className="tab-submissions"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        {renderFiltersAndTable}
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

export default CompanyGoalCard;
