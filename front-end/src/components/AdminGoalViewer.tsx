import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { CompanyGoalType, GoalSubmissionType, CompanyAccountType } from "../utils/types";
import { selectAllCompanyAccounts, setAllAccounts } from "../Slices/allAccountsSlice";
import { getAllCompanyAccountsFromIndexedDB } from "../utils/database/indexedDBUtils";
import GoalViewerFilters from "./GoalViewerFilters";
import AccountTable from "./AccountTable";

interface AdminGoalViewerProps {
  goal: CompanyGoalType;
}

const AdminGoalViewer: React.FC<AdminGoalViewerProps> = ({ goal }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const allCompanyAccounts = useSelector(selectAllCompanyAccounts);
  const [localAccounts, setLocalAccounts] = useState<CompanyAccountType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubmitted, setFilterSubmitted] = useState<"all" | "submitted" | "not-submitted">("all");

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

  const baseAccounts = goal.appliesToAllAccounts ? localAccounts : goal.accounts || [];

  const accountsWithStatus = baseAccounts.map((account) => {
    const found = goal.submittedPosts?.find(
      (post: GoalSubmissionType) => post.accountNumber === account.accountNumber
    );
    return {
      ...account,
      submittedBy: found?.submittedBy || null,
      submittedAt: found?.submittedAt || null,
      postId: found?.postId || null,
    };
  });

  const filteredAccounts = accountsWithStatus.filter((acc) => {
    const matchesSearch = acc.accountName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubmission =
      filterSubmitted === "all" ||
      (filterSubmitted === "submitted" && acc.postId) ||
      (filterSubmitted === "not-submitted" && !acc.postId);
    return matchesSearch && matchesSubmission;
  });

  return (
    <div className="admin-goal-viewer">
      <h2>Goal: {goal.goalTitle}</h2>
      <p>{goal.goalDescription}</p>

      <GoalViewerFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterSubmitted={filterSubmitted}
        setFilterSubmitted={setFilterSubmitted}
      />

      <AccountTable accounts={filteredAccounts} navigate={navigate} />
    </div>
  );
};

export default AdminGoalViewer;
