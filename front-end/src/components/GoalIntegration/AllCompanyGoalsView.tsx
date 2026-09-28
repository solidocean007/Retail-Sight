import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TrackChangesOutlinedIcon from "@mui/icons-material/TrackChangesOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { CircularProgress, useMediaQuery } from "@mui/material";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";

import {
  selectAllCompanyGoals,
  selectCompanyGoalsError,
  selectCompanyGoalsIsLoading,
} from "../../Slices/companyGoalsSlice";
import { showMessage } from "../../Slices/snackbarSlice";
import {
  deleteCompanyGoalInFirestore,
  updateCompanyGoalInFirestore,
} from "../../thunks/companyGoalsThunk";
import { CompanyGoalType, CompanyGoalWithIdType } from "../../utils/types";
import { RootState, useAppDispatch } from "../../utils/store";
import CustomConfirmation from "../CustomConfirmation";
import PostViewerModal from "../PostViewerModal";
import ArchivedGoalsLayout from "./ArchivedGoals/ArchivedGoalsLayout";
import CompanyGoalCard from "./CompanyGoalCard";

import "./allCompanyGoalsView.css";

type GoalStatusFilter = "all" | "current" | "upcoming" | "archived";
type GoalSortOrder = "endingSoon" | "newest" | "oldest" | "title";

const today = () => new Date().toISOString().slice(0, 10);

const getStatus = (goal: CompanyGoalWithIdType) => {
  const currentDate = today();
  if (goal.goalEndDate && goal.goalEndDate < currentDate) return "archived";
  if (goal.goalStartDate && goal.goalStartDate > currentDate) return "upcoming";
  return "current";
};

const AllCompanyGoalsView = ({ companyId }: { companyId?: string }) => {
  const dispatch = useAppDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const companyGoals = useSelector(selectAllCompanyGoals);
  const loading = useSelector(selectCompanyGoalsIsLoading);
  const error = useSelector(selectCompanyGoalsError);
  const isMobile = useMediaQuery("(max-width: 600px)");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<GoalStatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<GoalSortOrder>("endingSoon");
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [postIdToView, setPostIdToView] = useState<string | null>(null);

  const visibleGoals = useMemo(() => {
    const term = search.trim().toLowerCase();

    return companyGoals
      .filter((goal) => {
        if (statusFilter !== "all" && getStatus(goal) !== statusFilter) {
          return false;
        }

        if (!term) return true;
        return [goal.goalTitle, goal.goalDescription, goal.goalMetric]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .sort((a, b) => {
        if (sortOrder === "title")
          return a.goalTitle.localeCompare(b.goalTitle);
        if (sortOrder === "newest")
          return b.goalStartDate.localeCompare(a.goalStartDate);
        if (sortOrder === "oldest")
          return a.goalStartDate.localeCompare(b.goalStartDate);
        return (a.goalEndDate || "9999-12-31").localeCompare(
          b.goalEndDate || "9999-12-31",
        );
      });
  }, [companyGoals, search, sortOrder, statusFilter]);

  const activeResults = visibleGoals.filter(
    (goal) => getStatus(goal) !== "archived",
  );
  const archivedResults = visibleGoals.filter(
    (goal) => getStatus(goal) === "archived",
  );

  const handleDelete = async () => {
    if (!selectedGoalId || deleting) return;
    setDeleting(true);

    try {
      await dispatch(
        deleteCompanyGoalInFirestore({ goalId: selectedGoalId }),
      ).unwrap();
      dispatch(showMessage("Goal archived successfully."));
      setConfirmationOpen(false);
      setSelectedGoalId("");
    } catch (deleteError) {
      console.error("Error archiving goal:", deleteError);
      dispatch(
        showMessage({
          text: "The goal could not be archived. Please try again.",
          severity: "error",
        }),
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = async (
    goalId: string,
    updatedFields: Partial<CompanyGoalType>,
  ) => {
    try {
      await dispatch(
        updateCompanyGoalInFirestore({ goalId, updatedFields }),
      ).unwrap();
      dispatch(showMessage("Goal updated successfully."));
    } catch (updateError) {
      console.error("Error updating goal:", updateError);
      dispatch(
        showMessage({
          text: "The goal could not be updated. Please try again.",
          severity: "error",
        }),
      );
    }
  };

  const requestArchive = (goalId: string) => {
    setSelectedGoalId(goalId);
    setConfirmationOpen(true);
  };

  return (
    <section className="goal-directory" aria-labelledby="goal-directory-title">
      <div className="goal-directory__heading">
        <div>
          <span className="goal-directory__icon" aria-hidden="true">
            <TrackChangesOutlinedIcon />
          </span>
          <div>
            <h2 id="goal-directory-title">Goal directory</h2>
            <p>
              {companyGoals.length.toLocaleString()} company goal
              {companyGoals.length === 1 ? "" : "s"} available
            </p>
          </div>
        </div>
      </div>

      <div className="goal-directory__toolbar">
        <label className="goal-directory__search">
          <SearchRoundedIcon aria-hidden="true" />
          <span className="sr-only">Search goals</span>
          <input
            value={search}
            placeholder="Search title, description, or metric…"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label className="goal-directory__sort">
          <span>Sort</span>
          <select
            value={sortOrder}
            onChange={(event) =>
              setSortOrder(event.target.value as GoalSortOrder)
            }
          >
            <option value="endingSoon">Ending soon</option>
            <option value="newest">Newest start</option>
            <option value="oldest">Oldest start</option>
            <option value="title">Title A–Z</option>
          </select>
        </label>
      </div>

      <div
        className="goal-directory__filters"
        aria-label="Filter company goals"
      >
        {(
          [
            ["all", "All"],
            ["current", "Current"],
            ["upcoming", "Upcoming"],
            ["archived", "Archived"],
          ] as [GoalStatusFilter, string][]
        ).map(([value, label]) => (
          <button
            type="button"
            key={value}
            aria-pressed={statusFilter === value}
            className={statusFilter === value ? "is-active" : ""}
            onClick={() => setStatusFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && companyGoals.length === 0 ? (
        <DirectoryState
          icon={<CircularProgress size={29} />}
          title="Loading company goals"
          message="Syncing the latest assignments and progress."
        />
      ) : error ? (
        <DirectoryState
          tone="error"
          icon={<WarningAmberRoundedIcon />}
          title="Goals could not be loaded"
          message={error}
        />
      ) : visibleGoals.length === 0 ? (
        <DirectoryState
          icon={
            statusFilter === "archived" ? (
              <ArchiveOutlinedIcon />
            ) : (
              <TrackChangesOutlinedIcon />
            )
          }
          title={
            companyGoals.length === 0 ? "No goals yet" : "No matching goals"
          }
          message={
            companyGoals.length === 0
              ? "Create your first goal to assign display work across the company."
              : "Try a different search or status filter."
          }
        />
      ) : (
        <>
          {activeResults.length > 0 && (
            <div className="goal-directory__list">
              {activeResults.map((goal) => (
                <CompanyGoalCard
                  key={goal.id}
                  goal={goal}
                  mobile={isMobile}
                  expanded={expandedGoalId === goal.id}
                  onToggleExpand={(goalId) =>
                    setExpandedGoalId((current) =>
                      current === goalId ? null : goalId,
                    )
                  }
                  onDelete={() => requestArchive(goal.id)}
                  onEdit={handleEdit}
                  onViewPostModal={(postId) => setPostIdToView(postId)}
                />
              ))}
            </div>
          )}

          {archivedResults.length > 0 && (
            <ArchivedGoalsLayout
              archivedGoals={archivedResults}
              isMobile={isMobile}
              onDelete={requestArchive}
              onEdit={handleEdit}
              onViewPostModal={(postId) => setPostIdToView(postId)}
            />
          )}
        </>
      )}

      <CustomConfirmation
        isOpen={confirmationOpen}
        loading={deleting}
        title="Archive this goal?"
        message="The goal will leave active views but its history and submissions will be preserved."
        onClose={() => {
          if (!deleting) setConfirmationOpen(false);
        }}
        onConfirm={() => void handleDelete()}
      />

      <PostViewerModal
        key={postIdToView}
        postId={postIdToView ?? ""}
        open={Boolean(postIdToView)}
        onClose={() => setPostIdToView(null)}
        currentUserUid={currentUser?.uid}
      />
    </section>
  );
};

type DirectoryStateProps = {
  icon: React.ReactNode;
  title: string;
  message: string;
  tone?: "default" | "error";
};

const DirectoryState = ({
  icon,
  title,
  message,
  tone = "default",
}: DirectoryStateProps) => (
  <div className={`goal-directory__state goal-directory__state--${tone}`}>
    <span aria-hidden="true">{icon}</span>
    <strong>{title}</strong>
    <p>{message}</p>
  </div>
);

export default AllCompanyGoalsView;
