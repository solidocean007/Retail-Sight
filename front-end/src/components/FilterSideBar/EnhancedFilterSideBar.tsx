// EnhancedFilterSidebar.tsx
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../utils/store";
import {
  CompanyAccountType,
  PostQueryFilters,
  UserType,
} from "../../utils/types";
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
  // mergeAndSetFilteredPosts,
  setFilteredPostFetchedAt,
  setFilteredPosts,
} from "../../Slices/postsSlice";
import {
  getFetchDate,
  getFilteredSet,
  shouldRefetch,
  // storeFilteredPostsInIndexedDB,
  storeFilteredSet,
} from "../../utils/database/indexedDBUtils";
import { useDebouncedValue } from "../../hooks/useDebounce";
import { normalizePost } from "../../utils/normalizePost";
// import { clear } from "console";
// import { Autocomplete, TextField } from "@mui/material";
import ProductTypeAutocomplete from "./ProductTypeAutoComplete";
import BrandAutoComplete from "./BrandAutoComplete";
import UserFilterAutocomplete from "./UserFilterAutocomplete";
import { selectCompanyUsers } from "../../Slices/userSlice";
import AccountNameAutocomplete from "./AccountNameAutocomplete";
import AccountTypeSelect from "./AccountTypeSelect";
import ChainNameAutocomplete from "./ChainNameAutocomplete";
import ChainTypeSelect from "./ChainTypeSelect";

interface EnhancedFilterSideBarProps {
  activePostSet: string;
  setActiveCompanyPostSet: React.Dispatch<React.SetStateAction<"posts" | "filteredPosts">>;
  isSearchActive: boolean;
  setIsSearchActive: React.Dispatch<React.SetStateAction<boolean>>;
  onFiltersApplied?: (filters: PostQueryFilters) => void;
  toggleFilterMenu: () => void;
  currentHashtag?: string | null;
  setCurrentHashtag?: React.Dispatch<React.SetStateAction<string | null>>;
  currentStarTag?: string | null;
  setCurrentStarTag?: React.Dispatch<React.SetStateAction<string | null>>;
  initialFilters: PostQueryFilters | undefined;
}

const EnhancedFilterSidebar: React.FC<EnhancedFilterSideBarProps> = ({
  activePostSet,
  setActiveCompanyPostSet,
  // isSearchActive,
  // setIsSearchActive,
  onFiltersApplied,
  currentHashtag,
  // setCurrentHashtag,
  currentStarTag,
  // setCurrentStarTag,
  toggleFilterMenu,
  initialFilters,
}) => {
  // at top of EnhancedFilterSidebar.tsx
  const companyUsers = useSelector(selectCompanyUsers) || [];
  const allPosts = useSelector((s: RootState) => s.posts.posts);
  const [brandOpen, setBrandOpen] = useState(false);
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
  const [tagInput, setTagInput] = useState("");
  const [brandInput, setBrandInput] = useState("");
  const [productTypeInput, setProductTypeInput] = useState("");
  const [selectedUserInput, setSelectedUserInput] = useState("");
  const [selectedProductType, setSelectedProductType] = useState<string | null>(
    null
  );
  const [accountNameInput, setAccountNameInput] = useState("");
  const [accountTypeInput, setAccountTypeInput] = useState("");
  const [accountChainInput, setAccountChainInput] = useState("");

  const [selectedFilterUser, setSelectedFilterUser] = useState<UserType | null>(
    null
  );
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

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
    brand: null,
    productType: null,
    companyGoalId: undefined,
    companyGoalTitle: undefined,
    states: [],
    cities: [],
    dateRange: { startDate: null, endDate: null },
  });

  const filtersSet: boolean = Object.entries(filters).some(([_key, val]) => {
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "object" && val !== null && "startDate" in val) {
      return val.startDate || val.endDate;
    }
    return !!val;
  });

  useEffect(() => {
    if (activePostSet === "posts") {
      const cleared = clearAllFilters();
      setFilters(cleared);
      setLastAppliedFilters(cleared);
      resetInputs(); // also clears local UI inputs
    }
  }, [activePostSet]);

  const resetInputs = () => {
    setBrandInput("");
    setSelectedBrand(null);
    setSelectedProductType(null);
    setProductTypeInput("");
    setAccountNameInput("");
    setSelectedFilterUser(null);
    setSelectedUserInput("");
    setTagInput("");
  };

  const handleClearFilters = () => {
    const empty = clearAllFilters();
    setFilters(empty);
    setLastAppliedFilters(empty);
    resetInputs();
    setActiveCompanyPostSet("posts");

    dispatch(setFilteredPosts(allPosts));
    dispatch(setFilteredPostFetchedAt(null));
  };

  const filtersChanged =
    !lastAppliedFilters || !areFiltersEqual(filters, lastAppliedFilters);

  const fetchedAt = useSelector(
    (s: RootState) => s.posts.filteredPostFetchedAt
  );

  const debouncedFilters = useDebouncedValue(filters, 150);

  // in EnhancedFilterSidebar
  useEffect(() => {
    if (!filters.brand) {
      setBrandInput("");
      setSelectedBrand(null);
    }
  }, [filters.brand]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const active = document.activeElement;
        const isInput =
          active?.tagName === "INPUT" || active?.tagName === "TEXTAREA";

        if (isInput && filtersSet && filtersChanged) {
          e.preventDefault();
          handleApply();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filters, filtersSet, filtersChanged]);

  // what does this do?  should i include all other filters inside of this?
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

    if (field === "brand") {
      setBrandInput("");
    }

    if (field === "productType") {
      setProductTypeInput("");
    }

    if (activePostSet === "filteredPosts") {
      // apply local client-side filtering
      const locallyFiltered = locallyFilterPosts(filteredPosts, updatedFilters); // Cannot find name 'filteredPosts'
      dispatch(setFilteredPosts(locallyFiltered));
      setLastAppliedFilters(updatedFilters);
    }
  };

  const handleApply = async () => {
    console.log("filters: ", filters);
    const hash = getFilterHash(filters);
    console.log(`[FilterHash] Generated hash: ${hash}`);
    const cached = await getFilteredSet(filters);

    const needFetch = !cached || (await shouldRefetch(filters, newestRaw));

    if (!needFetch) {
      console.log(`[FilterHash] Using cached results for hash: ${hash}`);
      dispatch(setFilteredPosts(cached));
      const fetchedAt = await getFetchDate(filters);
      dispatch(setFilteredPostFetchedAt(fetchedAt?.toISOString() ?? null));
      setActiveCompanyPostSet("filteredPosts");
      setLastAppliedFilters(filters);
      onFiltersApplied?.(filters);
      return;
    }
    console.log(`[FilterHash] Fetching fresh results for hash: ${hash}`);
    // EnhancedFilterSidebar.tsx → handleApply()
    console.log("[handleApply] Filters being applied:", filters);

    const result = await dispatch(fetchFilteredPostsBatch({ filters }));

    if (fetchFilteredPostsBatch.fulfilled.match(result)) {
      const fresh = result.payload.posts.map(normalizePost);
      dispatch(setFilteredPosts(fresh));
      dispatch(setFilteredPostFetchedAt(new Date().toISOString()));
      await storeFilteredSet(filters, fresh);
      setActiveCompanyPostSet("filteredPosts");
      setLastAppliedFilters(filters);
      onFiltersApplied?.(filters);
    }
  };

  useEffect(() => {
    // clear the brand input if brand filter was cleared
    if (!filters.brand) {
      setBrandInput("");
      setSelectedBrand(null);
      setBrandOpen(false);
    }

    // if (!filters.postUserUid) {

    // }

    // clear the product-type input if productType filter was cleared
    if (!filters.productType) {
      setProductTypeInput("");
    }

    // clear the tag input if both hashtag & starTag were cleared
    if (!filters.hashtag && !filters.starTag) {
      setTagInput("");
    }
  }, [filters.brand, filters.productType, filters.hashtag, filters.starTag]);

  return (
    <div className="enhanced-sidebar side-bar-box">
      {/* {activePostSet === "filteredPosts" && filteredPosts.length > 0 && ( */}
      {activePostSet === "filteredPosts" && (
        <div className="filter-summary-banner-container">
          <FilterSummaryBanner
            filteredCount={filteredPostCount}
            filterText={getFilterSummaryText(lastAppliedFilters, companyUsers)}
            onClear={handleClearFilters}
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
      <div className="filter-actions">
        {filtersSet && filtersChanged && (
          <button className="btn-secondary" onClick={handleApply}>
            Apply Filters
          </button>
        )}
        {filtersSet && (
          <button
            className={!filtersSet ? "btn-disabled" : "btn-secondary"}
            onClick={handleClearFilters}
            disabled={!filtersSet}
          >
            Clear All Filters
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
              let value = e.target.value.trim();

              // Auto prepend "#" unless user typed "#" or "*"
              if (
                !value.startsWith("#") &&
                !value.startsWith("*") &&
                value !== ""
              ) {
                value = `#${value}`;
              }

              // Normalize hashtags: lowercase + trim
              const normalized = value.startsWith("#")
                ? `#${value.slice(1).toLowerCase().trim()}`
                : value.startsWith("*")
                ? `*${value.slice(1).toLowerCase().trim()}`
                : value;

              setTagInput(value);

              if (normalized.startsWith("#")) {
                handleChange("hashtag", normalized);
                handleChange("starTag", null);
              } else if (normalized.startsWith("*")) {
                handleChange("starTag", normalized);
                handleChange("hashtag", null);
              } else {
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
          <BrandAutoComplete
            inputValue={brandInput}
            selectedBrand={selectedBrand}
            onInputChange={setBrandInput}
            onBrandChange={(val) => {
              setSelectedBrand(val);
              handleChange("brand", val);
            }}
          />
          <ProductTypeAutocomplete
            inputValue={productTypeInput}
            selectedType={selectedProductType}
            onInputChange={setProductTypeInput}
            onTypeChange={(val) => {
              setSelectedProductType(val);
              handleChange("productType", val);
            }}
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
          <UserFilterAutocomplete
            inputValue={selectedUserInput}
            selectedUserId={filters.postUserUid ?? null} // coalesce undefined → null
            onInputChange={setSelectedUserInput}
            onTypeChange={(uid) => {
              // look up the full user so we can show their name
              const user = companyUsers.find((u) => u.uid === uid) || null;
              setSelectedFilterUser(user);
              setSelectedUserInput(
                user ? `${user.firstName} ${user.lastName}` : ""
              );
              handleChange("postUserUid", uid);
            }}
          />
        </div>
      </div>
      <div
        className={`filter-section ${openSection === "account" ? "open" : ""}`}
      >
        <button
          className="section-toggle"
          onClick={() => toggleSection("account")}
        >
          🏪 Account Info search
        </button>
        <div className="filter-group">
          {/* <input // instead of account number we should probably search by account name
            placeholder="Store Account name"
            value={filters.accountName || ""}
            onChange={(e) => handleChange("accountName", e.target.value)}
          /> */}
          <AccountNameAutocomplete
            inputValue={accountNameInput}
            selectedValue={filters.accountName}
            onInputChange={setAccountNameInput}
            onSelect={(val) => handleChange("accountName", val)}
          />
          {/* <input
            placeholder="Type of Account search coming soon"
            value={filters.accountType || ""}
            onChange={(e) => handleChange("accountType", e.target.value)}
            disabled
          /> */}
          <AccountTypeSelect
            selectedValue={filters.accountType}
            onSelect={(val) => {
              setAccountTypeInput(val || "");
              handleChange("accountType", val);
            }}
          />
          {/* <input
            placeholder="Chain Name search coming soon"
            value={filters.accountChain || ""}
            onChange={(e) => handleChange("accountChain", e.target.value)}
            disabled
          /> */}
          <ChainNameAutocomplete
            selectedValue={filters.accountChain}
            onSelect={(val) => {
              setAccountChainInput(val || "");
              handleChange("accountChain", val);
            }}
          />
          <ChainTypeSelect
            selectedValue={filters.chainType}
            onSelect={(val) => handleChange("chainType", val)}
          />

          {/* <input
            placeholder="Chain Type (chain/independent) search coming soon"
            value={filters.chainType || ""}
            onChange={(e) => handleChange("chainType", e.target.value)}
            disabled
          /> */}
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

      {/* <div
        className={`filter-section ${openSection === "quantity" ? "open" : ""}`}
      >
        <button
          className="section-toggle"
          onClick={() => toggleSection("quantity")}
        >
          Quantity
        </button>
        <div className="filter-group">
          <input
            placeholder="Minimum Case Count"
            type="number"
            value={filters.minCaseCount || ""}
            onChange={(e) =>
              handleChange("minCaseCount", parseInt(e.target.value, 10) || null)
            }
          />
        </div>
      </div> */}

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
    </div>
  );
};

export default EnhancedFilterSidebar;
