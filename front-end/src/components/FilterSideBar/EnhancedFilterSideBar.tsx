// EnhancedFilterSidebar.tsx
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../utils/store";
import { PostQueryFilters } from "../../utils/types";
import "./styles/enhancedFilterSideBar.css";
import { fetchFilteredPostsBatch } from "../../thunks/postsThunks";
import FilterChips from "./FilterChips";
import {
  clearAllFilters,
  getFilterHash,
  getFilterSummaryText,
  locallyFilterPosts,
  removeFilterField,
} from "./utils/filterUtils";
import FilterSummaryBanner from "../FilterSummaryBanner";
import {
  mergeAndSetFilteredPosts,
  setFilteredPostFetchedAt,
  setFilteredPosts,
} from "../../Slices/postsSlice";
import {
  getFetchDate,
  getFilteredSet,
  shouldRefetch,
  storeFilteredPostsInIndexedDB,
  storeFilteredSet,
} from "../../utils/database/indexedDBUtils";
import { useDebouncedValue } from "../../hooks/useDebounce";
import { normalizePost } from "../../utils/normalizePost";
import { clear } from "console";

interface EnhancedFilterSideBarProps {
  activePostSet: string;
  setActivePostSet: React.Dispatch<React.SetStateAction<string>>;
  isSearchActive: boolean;
  setIsSearchActive: React.Dispatch<React.SetStateAction<boolean>>;
  onFiltersApplied?: (filters: PostQueryFilters) => void;
  toggleFilterMenu: () => void;
  currentHashtag?: string | null;
  setCurrentHashtag?: React.Dispatch<React.SetStateAction<string | null>>;
  currentStarTag?: string | null;
  setCurrentStarTag?: React.Dispatch<React.SetStateAction<string | null>>;
}

const EnhancedFilterSidebar: React.FC<EnhancedFilterSideBarProps> = ({
  activePostSet,
  setActivePostSet,
  isSearchActive,
  setIsSearchActive,
  onFiltersApplied,
  currentHashtag,
  setCurrentHashtag,
  currentStarTag,
  setCurrentStarTag,
  toggleFilterMenu,
}) => {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [lastAppliedFilters, setLastAppliedFilters] =
    useState<PostQueryFilters | null>(null);
  const newestRaw = useSelector(
    (state: RootState) => state.posts.posts[0]?.displayDate ?? null
  ); // optional: lift to param
  const areFiltersEqual = (
    a: PostQueryFilters,
    b: PostQueryFilters
  ): boolean => {
    return JSON.stringify(a) === JSON.stringify(b);
  };

  const toggleSection = (section: string) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  const filteredPosts = useSelector(
    (state: RootState) => state.posts.filteredPosts
  );
  const filteredPostCount = useSelector(
    (state: RootState) => state.posts.filteredPostCount
  );
  const dispatch = useAppDispatch();
  // const companyId = useSelector(
  //   (state: RootState) => state.user.currentUser?.companyId
  // );

  const companyGoals = useSelector(
    (state: RootState) => state.companyGoals.goals
  );

  const [filters, setFilters] = useState<PostQueryFilters>({
    companyId: null,
    postUserUid: null,
    accountNumber: null,
    accountName: null,
    accountType: null,
    accountChain: null,
    chainType: null,
    hashtag: null,
    starTag: null,
    channel: null,
    category: null,
    brand: undefined,
    productType: null,
    companyGoalId: undefined,
    companyGoalTitle: undefined,
    states: [],
    cities: [],
    dateRange: { startDate: null, endDate: null },
  });

  const filtersChanged =
    !lastAppliedFilters || !areFiltersEqual(filters, lastAppliedFilters);
  const fetchedAt = useSelector(
    (s: RootState) => s.posts.filteredPostFetchedAt
  );

  const debouncedFilters = useDebouncedValue(filters, 150);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (currentHashtag) {
      setFilters((prev) => ({
        ...prev,
        hashtag: currentHashtag,
        starTag: null,
      }));
    } else if (currentStarTag) {
      setFilters((prev) => ({
        ...prev,
        starTag: currentStarTag,
        hashtag: null,
      }));
    }
  }, [currentHashtag, currentStarTag]);

  useEffect(() => {
    const activeFiltersCount = Object.entries(debouncedFilters).filter(
      ([_, val]) => {
        if (Array.isArray(val)) return val.length > 0;
        if (typeof val === "object" && val !== null && "startDate" in val) {
          return val.startDate || val.endDate;
        }
        return !!val;
      }
    ).length;

    if (activeFiltersCount === 0) {
      setActivePostSet("posts");
    }
  }, [debouncedFilters, setActivePostSet]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const activeFiltersCount = Object.entries(filters).filter(
        ([key, val]) => {
          if (Array.isArray(val)) return val.length > 0;
          if (typeof val === "object" && val !== null && "startDate" in val) {
            return val.startDate || val.endDate;
          }
          return !!val;
        }
      ).length;

      if (activeFiltersCount === 0) {
        setActivePostSet("posts");
      }
    }, 150);

    return () => clearTimeout(timeout);
  }, [filters, setActivePostSet]);

  useEffect(() => {
    const activeFiltersCount = Object.entries(filters).filter(([key, val]) => {
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === "object" && val !== null && "startDate" in val) {
        return val.startDate || val.endDate;
      }
      return !!val;
    }).length;

    if (activeFiltersCount === 0) {
      setActivePostSet("posts");
    }
  }, [filters, dispatch]);

  // useEffect(() => {
  //   if (companyId) {
  //     setFilters((prev) => ({ ...prev, companyId }));
  //   }
  // }, [companyId]);



  const handleChange = (field: keyof PostQueryFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (start: string | null, end: string | null) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: { startDate: start, endDate: end },
    }));
  };

  const handleRemoveFilter = (
    field: keyof PostQueryFilters,
    value?: string
  ) => {
    const updatedFilters = removeFilterField(filters, field, value);
    setFilters(updatedFilters);

    if (field === "hashtag" || field === "starTag") {
      setTagInput("");
    }

    if (activePostSet === "filteredPosts") {
      // apply local client-side filtering
      const locallyFiltered = locallyFilterPosts(filteredPosts, updatedFilters); // Cannot find name 'filteredPosts'
      dispatch(setFilteredPosts(locallyFiltered));
    }
  };

  const handleApply = async () => {
    const hash = getFilterHash(filters);
    console.log(`[FilterHash] Generated hash: ${hash}`);
    const cached = await getFilteredSet(filters);

    const needFetch = !cached || (await shouldRefetch(filters, newestRaw));

    if (!needFetch) {
      console.log(`[FilterHash] Using cached results for hash: ${hash}`);
      dispatch(setFilteredPosts(cached));
      const fetchedAt = await getFetchDate(filters);
      dispatch(setFilteredPostFetchedAt(fetchedAt?.toISOString() ?? null));
      setActivePostSet("filteredPosts");
      setLastAppliedFilters(filters);
      onFiltersApplied?.(filters);
      return;
    }
    console.log(`[FilterHash] Fetching fresh results for hash: ${hash}`);
    const result = await dispatch(fetchFilteredPostsBatch({ filters }));

    if (fetchFilteredPostsBatch.fulfilled.match(result)) {
      const fresh = result.payload.posts.map(normalizePost);
      dispatch(setFilteredPosts(fresh));
      dispatch(setFilteredPostFetchedAt(new Date().toISOString()));
      await storeFilteredSet(filters, fresh);
      setActivePostSet("filteredPosts");
      setLastAppliedFilters(filters);
      onFiltersApplied?.(filters);
    }
  };

  const filtersSet: boolean = Object.entries(filters).some(([key, val]) => {
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "object" && val !== null && "startDate" in val) {
      return val.startDate || val.endDate;
    }
    return !!val;
  });

  const handleClearFilters = () => {
    setFilters(clearAllFilters());
    setLastAppliedFilters(null);
    setTagInput("");
    setActivePostSet("posts");
  };

  return (
    <div className="enhanced-sidebar side-bar-box">
      {activePostSet === "filteredPosts" && filteredPosts.length > 0 && (
        <div className="filter-summary-banner-container">
          <FilterSummaryBanner
            filteredCount={filteredPostCount}
            filterText={getFilterSummaryText(filters)}
            onClear={() => setFilters(clearAllFilters())}
            fetchedAt={fetchedAt}
          />
        </div>
      )}

      <h3 className="filter-title">🔎 Filters</h3>
      <div className="active-filters-chip-row">
        <FilterChips filters={filters} onRemove={handleRemoveFilter} />
      </div>
      <div className="mobile-filter-close-button">
        {activePostSet === "filteredPosts" && filteredPostCount > 0 ? (
          <button className="btn-outline" onClick={toggleFilterMenu}>
            Show {filteredPostCount} Posts
          </button>
        ) : (
          <button className="btn-outline" onClick={toggleFilterMenu}>
            Close Filters
          </button>
        )}
      </div>

      <div className={`filter-section ${openSection === "tags" ? "open" : ""}`}>
        <button
          className="section-toggle"
          onClick={() => toggleSection("tags")}
        >
          # Tags
        </button>
        <div className="filter-group">
          <input
            placeholder="Search by #hashtag or *starTag"
            value={tagInput}
            onChange={(e) => {
              const value = e.target.value;
              setTagInput(value);

              if (value.startsWith("#")) {
                handleChange("hashtag", value);
                handleChange("starTag", null);
              } else if (value.startsWith("*")) {
                handleChange("starTag", value);
                handleChange("hashtag", null);
              } else {
                // Just store user input locally — no filter change yet
                handleChange("hashtag", null);
                handleChange("starTag", null);
              }
            }}
          />
        </div>
      </div>

      <div
        className={`filter-section ${openSection === "product" ? "open" : ""}`}
      >
        <button
          className="section-toggle"
          onClick={() => toggleSection("product")}
        >
          🍻 Product
        </button>
        <div className="filter-group">
          <input // we would need a to debounce this and fetch brands from the server or from indexedDb or redux
            placeholder="Brand filter coming soon"
            value={filters.brand || ""}
            onChange={(e) => handleChange("brand", e.target.value)}
            disabled
          />
          <input // same as above, we would need to debounce this and fetch product types from the server or from indexedDb or redux
            placeholder="Product Type"
            value={filters.productType || ""}
            onChange={(e) => handleChange("productType", e.target.value)}
          />
        </div>
      </div>

      <div className={`filter-section ${openSection === "user" ? "open" : ""}`}>
        <button
          className="section-toggle"
          onClick={() => toggleSection("user")}
        >
          👤 User
        </button>
        <div className="filter-group">
          <input // this needs to be a user search input that fetches users from the server or from indexedDb or redux for the users company... but what do i do for a supplier?  i can probably figure that out later
            placeholder="Search by user coming soon"
            value={filters.postUserUid || ""}
            onChange={(e) => handleChange("postUserUid", e.target.value)}
            disabled
          />
        </div>
      </div>
      <div
        className={`filter-section ${openSection === "account" ? "open" : ""}`}
      >
        <button
          className="section-toggle"
          onClick={() => toggleSection("account")}
          disabled
        >
          🏪 Account Info search coming soon
        </button>
        <div className="filter-group">
          <input // instead of account number we should probably search by account name
            placeholder="Store Account name"
            value={filters.accountName || ""}
            onChange={(e) => handleChange("accountName", e.target.value)}
          />
          <input
            placeholder="Type of Account"
            value={filters.accountType || ""}
            onChange={(e) => handleChange("accountType", e.target.value)}
          />
          <input
            placeholder="Chain Name"
            value={filters.accountChain || ""}
            onChange={(e) => handleChange("accountChain", e.target.value)}
          />
          <input
            placeholder="Chain Type (chain/independent)"
            value={filters.chainType || ""}
            onChange={(e) => handleChange("chainType", e.target.value)}
          />
        </div>
      </div>

      <div className={`filter-section ${openSection === "goal" ? "open" : ""}`}>
        <button
          className="section-toggle"
          onClick={() => toggleSection("goal")}
        >
          🎯 Goal
        </button>
        <div className="filter-group">
          <select
            title="goal-selection"
            className="dropdown"
            value={filters.companyGoalId || ""}
            onChange={(e) => {
              const selectedId = e.target.value;
              const selectedGoal = companyGoals.find(
                (goal) => goal.id === selectedId
              );
              handleChange("companyGoalId", selectedId);
              handleChange("companyGoalTitle", selectedGoal?.goalTitle || "");
            }}
          >
            <option value="">Select a goal...</option>
            {companyGoals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.goalTitle}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={`filter-section ${openSection === "date" ? "open" : ""}`}>
        <button
          className="section-toggle"
          onClick={() => toggleSection("date")}
        >
          📅 Date Range
        </button>
        <div className="filter-group">
          <label className="date-label">From</label>
          <input
            title="end-date-input"
            type="date"
            value={filters.dateRange?.startDate || ""}
            onChange={(e) =>
              handleDateChange(
                e.target.value || null,
                filters.dateRange?.endDate || null
              )
            }
          />
          <label className="date-label">To</label>
          <input
            title="start-date-input"
            type="date"
            value={filters.dateRange?.endDate || ""}
            onChange={(e) =>
              handleDateChange(
                filters.dateRange?.startDate || null,
                e.target.value || null
              )
            }
          />
        </div>
      </div>

      <div className="filter-actions">
        {filtersSet && filtersChanged && (
          <button className="apply-button" onClick={handleApply}>
            Apply Filters
          </button>
        )}
        {filtersSet && (
          <button
            className="apply-button clear-all-button"
            // onClick={() => setFilters(clearAllFilters())}
            onClick={handleClearFilters}
            disabled={!filtersSet}
          >
            Clear All Filters
          </button>
        )}
      </div>
    </div>
  );
};

export default EnhancedFilterSidebar;
