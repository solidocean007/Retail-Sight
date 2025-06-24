// EnhancedFilterSidebar.tsx
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../utils/store";
import { PostQueryFilters, UserType } from "../../utils/types";
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
import { useBrandOptions } from "../../hooks/useBrandOptions";
import ProductTypeAutocomplete from "./ProductTypeAutoComplete";
import BrandAutoComplete from "./BrandAutoComplete";
import UserFilterAutocomplete from "./UserFilterAutoComplete";
import { selectCompanyUsers } from "../../Slices/userSlice";

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
  // isSearchActive,
  // setIsSearchActive,
  onFiltersApplied,
  currentHashtag,
  // setCurrentHashtag,
  currentStarTag,
  // setCurrentStarTag,
  toggleFilterMenu,
}) => {
  // at top of EnhancedFilterSidebar.tsx
  const fullUserState = useSelector((s: RootState) => s.user);
  console.log("🔍 full user slice:", fullUserState);

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
  const [selectedFilterUser, setSelectedFilterUser] = useState<UserType | null>(
    null
  );
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const [isBrandValid, setIsBrandValid] = useState(true);

  const normalizeBrand = (brand: string): string =>
    brand.toLowerCase().replace(/[\s\-]+/g, "");

  const brandOptions = useBrandOptions();

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
    // brand: undefined, //
    brand: null, //
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

  const handleClearFilters = () => {
    const empty = clearAllFilters();
    setFilters(empty); // ✨ clears your filter object
    setLastAppliedFilters(empty); // ✨ clears the chips/banner
    setBrandInput(""); // clears the text
    setSelectedBrand(null);
    setSelectedProductType(null);
    setProductTypeInput("");
    setActivePostSet("posts"); // ✨ resets the view

    setSelectedFilterUser(null);
    setSelectedUserInput("");
    handleChange("postUserUid", null);

    // ✨ RESET THE REDUX SLICE:
    dispatch(setFilteredPosts(allPosts)); // reset filteredPosts & count
    dispatch(setFilteredPostFetchedAt(null));
  };

  const filtersChanged =
    !lastAppliedFilters || !areFiltersEqual(filters, lastAppliedFilters);

  const fetchedAt = useSelector(
    (s: RootState) => s.posts.filteredPostFetchedAt
  );

  const debouncedFilters = useDebouncedValue(filters, 150);

  console.log("[EnhancedFilterSidebar] mount/update", {
    selectedUserInput,
    selectedFilterUser,
    filtersPostUserUid: filters.postUserUid,
    companyUsersCount: companyUsers.length,
  });

  useEffect(() => {
    console.log("[EnhancedFilterSidebar] user state changed", {
      selectedUserInput,
      selectedFilterUserUid: selectedFilterUser?.uid,
      filtersPostUserUid: filters.postUserUid,
    });
  }, [selectedUserInput, selectedFilterUser, filters.postUserUid]);

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
        ([_key, val]) => {
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
    const activeFiltersCount = Object.entries(filters).filter(([_key, val]) => {
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

  // useEffect(() => { what is this for?
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

  useEffect(() => {
    // clear the brand input if brand filter was cleared
    if (!filters.brand) {
      setBrandInput("");
      setSelectedBrand(null);
      setBrandOpen(false);
    }

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
            filterText={getFilterSummaryText(lastAppliedFilters, companyUsers)} //  Type 'null' is not assignable to type 'PostQueryFilters'
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
        {/* {filtersSet && filtersChanged && ( */}
        {filtersSet && (
          <button className="btn" onClick={handleApply}>
            Apply Filters
          </button>
        )}
        {filtersSet && (
          <button
            className="btn-secondary"
            // onClick={() => setFilters(clearAllFilters())}
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
          {/* <Autocomplete
            options={brandOptions}
            value={filters.brand || ""}
            inputValue={brandInput}
            open={brandOpen}
            onOpen={() => setBrandOpen(true)}
            onClose={() => setBrandOpen(false)}
            onInputChange={(_, value, reason) => {
              setBrandInput(value);

              // only open when typing
              if (reason === "input") setBrandOpen(value.length > 0);

              const normalized = normalizeBrand(value);

              const matchingOptions = brandOptions.filter((option) =>
                normalizeBrand(option).includes(normalized)
              );

              const exactMatch = brandOptions.find(
                (b) => normalizeBrand(b) === normalized
              );

              setIsBrandValid(value === "" || matchingOptions.length > 0);

              if (exactMatch) {
                handleChange("brand", exactMatch);
                setSelectedBrand(exactMatch);
              } else if (matchingOptions.length > 0) {
                // Keep existing brand selected while typing something that *could* be valid
                handleChange("brand", selectedBrand);
              } else {
                handleChange("brand", null);
                setSelectedBrand(null);
              }
            }}
            onChange={(_, value) => {
              handleChange("brand", value || null);
              setBrandInput(value || "");
              setSelectedBrand(value || null);
              setBrandOpen;
            }}
            // open={brandInput.length > 0}
            filterOptions={(options, state) =>
              options.filter((option) =>
                normalizeBrand(option).includes(
                  normalizeBrand(state.inputValue)
                )
              )
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Brand"
                placeholder="Type to search brands"
                error={!isBrandValid}
                helperText={!isBrandValid ? "No matching brand found" : ""}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === "Enter") {
                    e.preventDefault(); // stop form submission / menu re-open
                    handleApply(); // trigger your Apply Filters logic
                  }
                }}
              />
            )}
            fullWidth
            disablePortal
          /> */}
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
          {/* <input // this needs to be a user search input that fetches users from the server or from indexedDb or redux for the users company... but what do i do for a supplier?  i can probably figure that out later
            placeholder="Search by user coming soon"
            value={filters.postUserUid || ""}
            onChange={(e) => handleChange("postUserUid", e.target.value)}
            disabled
          /> */}
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
