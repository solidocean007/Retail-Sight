// SupplierGoalsLayout.tsx
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { selectIsSupplier } from "../../Slices/currentCompanySlice";
import {
  PartnerGoalOption,
  useAvailableGoals,
} from "../../hooks/useAvailableGoals";
import { RootState } from "../../utils/store";
import "./supplier-goals-layout.css";
import SupplierGoalCard from "./SupplierGoalCard";
import PostViewerModal from "../PostViewerModal";

interface SupplierGoalsLayoutProps {
  companyId?: string;
}

type GoalStatusFilter = "current" | "past" | "future" | "all";

type GoalSortMode =
  "endingSoon" | "newest" | "oldest" | "distributor" | "title";

const todayString = new Date().toISOString().split("T")[0];

const normalizeGoalDate = (value?: string | null) => {
  if (!value) return "";

  // Handles "2026-05-03" safely.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  // Fallback for ISO strings, timestamps converted to strings, etc.
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().split("T")[0];
};

const getGoalStatus = (
  goal: PartnerGoalOption,
): Exclude<GoalStatusFilter, "all"> => {
  const start = normalizeGoalDate(goal.goalStartDate);
  const end = normalizeGoalDate(goal.goalEndDate);

  if (start && start > todayString) return "future";
  if (end && end < todayString) return "past";

  return "current";
};

const SupplierGoalsLayout: React.FC<SupplierGoalsLayoutProps> = ({
  companyId,
}) => {
  const isSupplier = useSelector(selectIsSupplier);

  const fallbackCompanyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId,
  );

  const resolvedCompanyId = companyId || fallbackCompanyId;

  const { goals, loading, error, reload } = useAvailableGoals(
    isSupplier,
    resolvedCompanyId,
  );

  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [postIdToView, setPostIdToView] = useState<string | null>(null);
  const [postViewerOpen, setPostViewerOpen] = useState(false);

  const [selectedDistributor, setSelectedDistributor] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<GoalStatusFilter>("all");
  const [sortMode, setSortMode] = useState<GoalSortMode>("endingSoon");
  const [searchText, setSearchText] = useState("");

  const distributorOptions = useMemo(() => {
    const map = new Map<string, string>();

    goals.forEach((goal) => {
      const distributorId = goal.distributorCompanyId || goal.companyId;
      if (!distributorId) return;

      map.set(distributorId, goal.originCompanyName || "Connected Distributor");
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [goals]);

  const filteredGoals = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return [...goals]
      .filter((goal) => {
        const distributorId = goal.distributorCompanyId || goal.companyId;
        if (
          selectedDistributor !== "all" &&
          distributorId !== selectedDistributor
        ) {
          return false;
        }

        if (statusFilter !== "all") {
          return getGoalStatus(goal) === statusFilter;
        }

        return true;
      })
      .filter((goal) => {
        if (!normalizedSearch) return true;

        return [goal.goalTitle, goal.goalDescription, goal.originCompanyName]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedSearch),
          );
      })
      .sort((a, b) => {
        const aStart = normalizeGoalDate(a.goalStartDate);
        const bStart = normalizeGoalDate(b.goalStartDate);
        const aEnd = normalizeGoalDate(a.goalEndDate) || "9999-12-31";
        const bEnd = normalizeGoalDate(b.goalEndDate) || "9999-12-31";

        if (sortMode === "endingSoon") return aEnd.localeCompare(bEnd);
        if (sortMode === "newest") return bStart.localeCompare(aStart);
        if (sortMode === "oldest") return aStart.localeCompare(bStart);

        if (sortMode === "distributor") {
          return (a.originCompanyName || "").localeCompare(
            b.originCompanyName || "",
          );
        }

        return (a.goalTitle || "").localeCompare(b.goalTitle || "");
      });
  }, [goals, selectedDistributor, statusFilter, sortMode, searchText]);

  const currentGoalCount = useMemo(() => {
    return goals.filter((goal) => getGoalStatus(goal) === "current").length;
  }, [goals]);

  const totalSubmissionCount = useMemo(() => {
    return goals.reduce((sum, goal) => {
      return sum + (goal.submissionCount ?? goal.submittedPosts?.length ?? 0);
    }, 0);
  }, [goals]);

  const handleToggleExpand = (goalId: string) => {
    setExpandedGoalId((prev) => (prev === goalId ? null : goalId));
  };

  const openPostViewer = (postId: string) => {
    setPostIdToView(postId);
    setPostViewerOpen(true);
  };

  const closePostViewer = () => {
    setPostViewerOpen(false);
  };

  const clearFilters = () => {
    setSelectedDistributor("all");
    setStatusFilter("all");
    setSortMode("endingSoon");
    setSearchText("");
  };

  if (loading) {
    return <div className="goal-section-empty">Loading partner goals…</div>;
  }

  if (error) {
    return (
      <div className="goal-section-empty goal-section-empty--error">
        <h3>Partner goals are unavailable</h3>
        <p>{error}</p>
        <button type="button" className="btn-outline" onClick={reload}>
          Try again
        </button>
      </div>
    );
  }

  if (!goals.length) {
    return (
      <div className="goal-section-empty">
        <h3>No partner goals yet</h3>
        <p>
          Distributor goals intentionally shared with your company will appear
          here with their progress and submitted displays.
        </p>
      </div>
    );
  }

  return (
    <section className="supplier-goals-layout">
      <header className="supplier-goals-header">
        <div>
          <h2>Distributor programs</h2>
          <p>
            Read-only visibility into goals that connected distributors have
            associated with your company.
          </p>
        </div>

        <div className="supplier-goals-stats">
          <span>{goals.length} total</span>
          <span>{currentGoalCount} current</span>
          <span>{totalSubmissionCount} submissions</span>
          <span>{distributorOptions.length} partners</span>
        </div>
      </header>

      <div className="supplier-goals-toolbar">
        <input
          className="supplier-goals-search"
          placeholder="Search goals, descriptions, or distributors..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <select
          value={selectedDistributor}
          onChange={(e) => setSelectedDistributor(e.target.value)}
        >
          <option value="all">All distributors</option>
          {distributorOptions.map((dist) => (
            <option key={dist.id} value={dist.id}>
              {dist.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as GoalStatusFilter)}
        >
          <option value="all">All goals</option>
          <option value="current">Current goals</option>
          <option value="future">Upcoming goals</option>
          <option value="past">Past goals</option>
        </select>

        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as GoalSortMode)}
        >
          <option value="endingSoon">Ending soon</option>
          <option value="newest">Newest start date</option>
          <option value="oldest">Oldest start date</option>
          <option value="distributor">Distributor</option>
          <option value="title">Title</option>
        </select>

        <button className="btn-outline" onClick={clearFilters}>
          Reset
        </button>
      </div>

      <div className="supplier-goals-result-row">
        Showing {filteredGoals.length} of {goals.length} goals
      </div>

      {!filteredGoals.length ? (
        <div className="goal-section-empty">
          No partner goals match these filters.
        </div>
      ) : (
        <div className="supplier-goals-list">
          {filteredGoals.map((goal) => (
            <SupplierGoalCard
              key={goal.id}
              goal={goal}
              expanded={expandedGoalId === goal.id}
              onToggleExpand={handleToggleExpand}
              onViewPostModal={openPostViewer}
            />
          ))}
        </div>
      )}

      <PostViewerModal
        key={postIdToView}
        postId={postIdToView || ""}
        open={postViewerOpen}
        onClose={closePostViewer}
        currentUserUid={undefined}
      />
    </section>
  );
};

export default SupplierGoalsLayout;
