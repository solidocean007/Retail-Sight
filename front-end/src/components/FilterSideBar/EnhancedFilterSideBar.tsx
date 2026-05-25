// EnhancedFilterSidebar.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../utils/store";
import {
  CompanyAccountType,
  // CompanyAccountType,
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
import { normalizePost } from "../../utils/normalize";
// import { clear } from "console";
// import { Autocomplete, TextField } from "@mui/material";
// import ProductTypeAutocomplete from "./ProductTypeAutoComplete";
import BrandAutoComplete from "./BrandAutoComplete";
import UserFilterAutocomplete from "./UserFilterAutocomplete";
import { selectCompanyUsers } from "../../Slices/userSlice";
import AccountNameAutocomplete from "./AccountNameAutocomplete";
import AccountTypeSelect from "./AccountTypeSelect";
import ChainNameAutocomplete from "./ChainNameAutocomplete";
import ChainTypeSelect from "./ChainTypeSelect";
import GoalFilterGroup from "./GoalFilterGroup";
import GalloGoalFilterGroup from "./GalloGoalFilterGroup";
import { useCompanyIntegrations } from "../../hooks/useCompanyIntegrations";
import { selectIsSupplier } from "../../Slices/currentCompanySlice";
import DistributorAutoComplete from "./DistributorAutoComplete";
import { useAvailableGoals } from "../../hooks/useAvailableGoals";
import { useAvailableBrands } from "../../hooks/useAvailableBrands";
import {
  setFilteredSharedPostFetchedAt,
  setFilteredSharedPosts,
} from "../../Slices/sharedPostsSlice";
import { useAvailableFilterUsers } from "../../hooks/useAvailableFilterUsers";
import { useNetworkAccountFacets } from "../../hooks/useNetworkAccountFacets";
// import { useNetworkUsers } from "../../hooks/useNetworkUsers";

interface DistributorOption {
  id: string;
  name: string;
}

interface EnhancedFilterSideBarProps {
  activePostSet: string;
  setActiveCompanyPostSet: React.Dispatch<
    React.SetStateAction<"posts" | "filteredPosts">
  >;
  setActiveSharedPostSet: React.Dispatch<
    React.SetStateAction<"posts" | "filteredPosts">
  >;
  activeSharedPostSet: string;
  isSearchActive: boolean;
  setIsSearchActive: React.Dispatch<React.SetStateAction<boolean>>;
  onFiltersApplied?: (filters: PostQueryFilters) => void;
  toggleFilterMenu: () => void;
  currentHashtag?: string | null;
  setCurrentHashtag?: React.Dispatch<React.SetStateAction<string | null>>;
  currentStarTag?: string | null;
  setCurrentStarTag?: React.Dispatch<React.SetStateAction<string | null>>;
  initialFilters: PostQueryFilters | undefined;
  isSharedFeed: boolean;
}

const EnhancedFilterSidebar: React.FC<EnhancedFilterSideBarProps> = ({
  activePostSet,
  setActiveCompanyPostSet,
  setActiveSharedPostSet,
  activeSharedPostSet,
  onFiltersApplied,
  currentHashtag,
  // setCurrentHashtag,
  currentStarTag,
  // setCurrentStarTag,
  toggleFilterMenu,
  initialFilters,
  isSharedFeed,
}) => {
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId,
  );
  const isSupplier = useSelector(selectIsSupplier);
  const [isApplying, setIsApplying] = useState(false);
  const { isEnabled, loading } = useCompanyIntegrations(companyId);
  const galloEnabled = isEnabled("galloAxis");
  const galloGoals = useSelector(
    (state: RootState) => state.galloGoals.galloGoals,
  );
  const companyUsers = useSelector(selectCompanyUsers) || [];
  const useNetworkFilters = isSupplier && isSharedFeed;

  const { users: availableUsers, loading: usersLoading } =
    useAvailableFilterUsers(isSharedFeed);
  const allPosts = useSelector((s: RootState) => s.posts.posts);
  const sharedPosts = useSelector((s: RootState) => s.sharedPosts.sharedPosts);
  const sourcePosts = isSharedFeed ? sharedPosts : allPosts;
  const [brandOpen, setBrandOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [lastAppliedFilters, setLastAppliedFilters] =
    useState<PostQueryFilters | null>(null);
  const newestRaw = useSelector(
    (state: RootState) => state.posts.posts[0]?.displayDate ?? null,
  ); // optional: lift to param
  const areFiltersEqual = (
    a: PostQueryFilters,
    b: PostQueryFilters,
  ): boolean => {
    return JSON.stringify(a) === JSON.stringify(b);
  };
  const [tagInput, setTagInput] = useState("");
  const [brandInput, setBrandInput] = useState("");
  const [productTypeInput, setProductTypeInput] = useState("");
  const [selectedUserInput, setSelectedUserInput] = useState("");
  const [selectedProductType, setSelectedProductType] = useState<string | null>(
    null,
  );
  const [distributorInput, setDistributorInput] = useState("");
  const [selectedDistributor, setSelectedDistributor] =
    useState<DistributorOption | null>(null);
  const [accountNameInput, setAccountNameInput] = useState("");
  const [accountTypeInput, setAccountTypeInput] = useState("");
  const [accountChainInput, setAccountChainInput] = useState("");

  const [selectedFilterUser, setSelectedFilterUser] = useState<UserType | null>(
    null,
  );
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  const filteredPosts = useSelector(
    (state: RootState) => state.posts.filteredPosts,
  );

  const filteredPostCount = useSelector(
    (state: RootState) => state.posts.filteredPostCount,
  );
  const dispatch = useAppDispatch();

  const companyGoals = useSelector(
    (state: RootState) => state.companyGoals.goals,
  );
  const useNetworkAccountFilters =
    isSupplier && isSharedFeed && openSection === "account";
  const accounts = useSelector(
    (state: RootState) => state.allAccounts.accounts,
  ) as CompanyAccountType[];

  const {
    accountTypes: networkAccountTypes,
    chains: networkChains,
    chainTypes: networkChainTypes,
    getAccountNameOptions,
    loading: networkAccountsLoading,
  } = useNetworkAccountFacets(useNetworkAccountFilters);

  const availableAccountNameFacets = useMemo(() => {
    if (!useNetworkAccountFilters) return [];
    return getAccountNameOptions(accountNameInput);
  }, [useNetworkAccountFilters, getAccountNameOptions, accountNameInput]);

  const availableAccountTypes = useMemo(() => {
    if (useNetworkFilters) return networkAccountTypes;

    const set = new Set<string>();
    accounts.forEach((a) => {
      if (a.typeOfAccount) set.add(a.typeOfAccount);
    });

    return Array.from(set).sort();
  }, [useNetworkFilters, networkAccountTypes, accounts]);

  const availableChains = useMemo(() => {
    if (useNetworkFilters) return networkChains;

    const set = new Set<string>();
    accounts.forEach((a) => {
      if (a.chain) set.add(a.chain);
    });

    return Array.from(set).sort();
  }, [useNetworkFilters, networkChains, accounts]);

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
    brandId: null,
    productType: null,
    companyGoalId: null,
    companyGoalTitle: null,
    galloGoalId: null,
    galloGoalTitle: null,
    distributorCompanyId: null,
    distributorCompanyName: null,
    states: [],
    cities: [],
    dateRange: { startDate: null, endDate: null },
    minCaseCount: null,
    feedType: isSharedFeed ? "shared" : "company",
  });

  const shouldRequireDistributorForAccount = isSupplier && isSharedFeed;

  const accountFilterDisabled =
    shouldRequireDistributorForAccount && !filters.distributorCompanyId;
  // console.log("filters: ", filters);

  const filtersSet: boolean = Object.entries(filters).some(([key, val]) => {
    if (key === "feedType") return false;
    if (key === "distributorCompanyName") return false;
    if (key === "accountNumber") return false;

    if (Array.isArray(val)) return val.length > 0;

    if (typeof val === "object" && val !== null && "startDate" in val) {
      return Boolean(val.startDate || val.endDate);
    }

    return Boolean(val);
  });

  const availableBrands = useAvailableBrands();

  const availableDistributors = useMemo(() => {
    const map = new Map<string, string>();

    sourcePosts.forEach((p) => {
      if (!p.companyId || !p.postUserCompanyName) return;

      // ✅ only include posts that have brands (shared relevance)
      if (!p.brands || p.brands.length === 0) return;

      map.set(p.companyId, p.postUserCompanyName);
    });

    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [sourcePosts]);

  const availableAccounts = useMemo(() => {
    if (useNetworkAccountFilters) {
      return availableAccountNameFacets.filter((facet) => {
        if (!filters.distributorCompanyId) return false;
        return facet.originCompanyId === filters.distributorCompanyId;
      });
    }

    return accounts
      .filter((a) => a.accountName)
      .map((a) => ({
        accountName: a.accountName,
        accountNumber: String(a.accountNumber ?? ""),
        originCompanyId: companyId ?? "",
        originCompanyName: "Your Company",
      }));
  }, [
    useNetworkAccountFilters,
    availableAccountNameFacets,
    accounts,
    companyId,
    filters.distributorCompanyId,
  ]);

  const { goals: availableGoals, loading: goalsLoading } = useAvailableGoals(
    isSupplier,
    companyId,
  );

  useEffect(() => {
    if (activePostSet === "posts") {
      const cleared = clearAllFilters(isSharedFeed ? "shared" : "company");
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
    const empty = clearAllFilters(isSharedFeed ? "shared" : "company");
    setFilters(empty);
    setLastAppliedFilters(empty);
    resetInputs();

    if (isSharedFeed) {
      setActiveSharedPostSet("posts");
      dispatch(setFilteredSharedPosts([]));
      dispatch(setFilteredSharedPostFetchedAt(null));
    } else {
      setActiveCompanyPostSet("posts");
      dispatch(setFilteredPosts(allPosts));
      dispatch(setFilteredPostFetchedAt(null));
    }
  };

  const filtersChanged =
    !lastAppliedFilters || !areFiltersEqual(filters, lastAppliedFilters);

  const fetchedAt = useSelector(
    (s: RootState) => s.posts.filteredPostFetchedAt,
  );

  const debouncedFilters = useDebouncedValue(filters, 150);

  useEffect(() => {
    if (!areFiltersEqual(debouncedFilters, filters)) return;

    const debouncedFiltersSet = Object.entries(debouncedFilters).some(
      ([key, val]) => {
        if (key === "feedType") return false;
        if (key === "distributorCompanyName") return false;
        if (key === "accountNumber") return false;

        if (Array.isArray(val)) return val.length > 0;

        if (typeof val === "object" && val !== null && "startDate" in val) {
          return Boolean(val.startDate || val.endDate);
        }

        return Boolean(val);
      },
    );

    const debouncedFiltersChanged =
      !lastAppliedFilters ||
      !areFiltersEqual(debouncedFilters, lastAppliedFilters);

    if (!debouncedFiltersSet) return;
    if (!debouncedFiltersChanged) return;
    if (isApplying) return;

    handleApply(debouncedFilters);
  }, [debouncedFilters, filters, lastAppliedFilters, isApplying]);

  // in EnhancedFilterSidebar.. what is this for?  why is specifically watching filters.brand?
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
    value?: string,
  ) => {
    const updatedFilters = removeFilterField(filters, field, value);

    if (field === "hashtag" || field === "starTag") setTagInput("");
    if (field === "brand") setBrandInput("");
    if (field === "productType") setProductTypeInput("");
    if (field === "accountName" || field === "accountNumber") {
      setAccountNameInput("");
    }

    const isNowEmpty = Object.entries(updatedFilters).every(([key, v]) => {
      if (key === "feedType") return true;

      if (Array.isArray(v)) return v.length === 0;

      if (typeof v === "object" && v !== null && "startDate" in v) {
        return !v.startDate && !v.endDate;
      }

      return !v;
    });

    if (isNowEmpty) {
      const empty = clearAllFilters(isSharedFeed ? "shared" : "company");

      setFilters(empty);
      setLastAppliedFilters(empty);
      resetInputs();

      if (isSharedFeed) {
        setActiveSharedPostSet("posts");
        dispatch(setFilteredSharedPosts([]));
        dispatch(setFilteredSharedPostFetchedAt(null));
      } else {
        setActiveCompanyPostSet("posts");
        dispatch(setFilteredPosts(allPosts));
        dispatch(setFilteredPostFetchedAt(null));
      }

      return;
    }

    setFilters(updatedFilters);

    if (isSharedFeed) {
      const locallyFiltered = locallyFilterPosts(sourcePosts, updatedFilters);
      dispatch(setFilteredSharedPosts(locallyFiltered));
      dispatch(setFilteredSharedPostFetchedAt(new Date().toISOString()));
      setActiveSharedPostSet("filteredPosts");
    } else {
      handleApply(updatedFilters);
    }

    setLastAppliedFilters(updatedFilters);
    onFiltersApplied?.(updatedFilters);
  };

  const handleApply = async (filtersToApply: PostQueryFilters = filters) => {
    console.log("[SHARED FILTER DEBUG]", {
      sourcePosts: sourcePosts.length,
      distributorCompanyId: filtersToApply.distributorCompanyId,
      accountName: filtersToApply.accountName,
      accountNumber: filtersToApply.accountNumber,
      matchingDistributorPosts: sourcePosts.filter(
        (p) => p.companyId === filtersToApply.distributorCompanyId,
      ).length,
      matchingAccountPosts: sourcePosts.filter(
        (p) =>
          p.companyId === filtersToApply.distributorCompanyId &&
          String(p.accountNumber ?? "") ===
            String(filtersToApply.accountNumber ?? ""),
      ).length,
    });
    setIsApplying(true);

    try {
      if (isSharedFeed) {
        const locallyFiltered = locallyFilterPosts(sourcePosts, filtersToApply);

        dispatch(setFilteredSharedPosts(locallyFiltered));
        dispatch(setFilteredSharedPostFetchedAt(new Date().toISOString()));

        setActiveSharedPostSet("filteredPosts");
        setLastAppliedFilters(filtersToApply);
        onFiltersApplied?.(filtersToApply);
        return;
      }

      if (!companyId) return;

      dispatch(setFilteredPostFetchedAt(null));

      const cached = await getFilteredSet(filtersToApply);
      const needFetch =
        !cached || (await shouldRefetch(filtersToApply, newestRaw));

      if (!needFetch) {
        dispatch(setFilteredPosts(cached));
        const fetchedAt = await getFetchDate(filtersToApply);
        dispatch(setFilteredPostFetchedAt(fetchedAt?.toISOString() ?? null));

        setActiveCompanyPostSet("filteredPosts");
        setLastAppliedFilters(filtersToApply);
        onFiltersApplied?.(filtersToApply);
        return;
      }

      dispatch(setFilteredPosts([]));

      const result = await dispatch(
        fetchFilteredPostsBatch({ filters: filtersToApply, companyId }),
      );

      if (fetchFilteredPostsBatch.fulfilled.match(result)) {
        const fresh = result.payload.posts.map(normalizePost);

        dispatch(setFilteredPosts(fresh));
        dispatch(setFilteredPostFetchedAt(new Date().toISOString()));
        await storeFilteredSet(filtersToApply, fresh);

        setActiveCompanyPostSet("filteredPosts");
        setLastAppliedFilters(filtersToApply);
        onFiltersApplied?.(filtersToApply);
      }
    } finally {
      setIsApplying(false);
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

  const filteredSharedPostCount = useSelector(
    (s: RootState) => s.sharedPosts.filteredSharedPostCount,
  );

  const filteredSharedFetchedAt = useSelector(
    (s: RootState) => s.sharedPosts.filteredSharedPostFetchedAt,
  );

  const displayFilteredCount = isSharedFeed
    ? filteredSharedPostCount
    : filteredPostCount;

  const displayFetchedAt = isSharedFeed ? filteredSharedFetchedAt : fetchedAt;

  const isFilteredMode = isSharedFeed
    ? activeSharedPostSet === "filteredPosts"
    : activePostSet === "filteredPosts";

  useEffect(() => {
    if (!accountFilterDisabled) return;

    setAccountNameInput("");
    handleChange("accountName", null);
    handleChange("accountNumber", null);
  }, [accountFilterDisabled]);

  return (
    <div className="enhanced-sidebar side-bar-box">
      {isFilteredMode && lastAppliedFilters && (
        <FilterSummaryBanner
          filteredCount={displayFilteredCount}
          filterText={
            getFilterSummaryText(lastAppliedFilters, companyUsers) +
            (lastAppliedFilters?.distributorCompanyId &&
            selectedDistributor?.name
              ? ` • Distributor: ${selectedDistributor.name}`
              : "")
          }
          onClear={handleClearFilters}
          fetchedAt={displayFetchedAt}
        />
      )}

      <h3 className="filter-title">🔎 Filters</h3>
      <div className="active-filters-chip-row">
        <FilterChips
          filters={filters}
          selectedDistributorName={selectedDistributor?.name ?? null}
          onRemove={handleRemoveFilter}
        />
      </div>
      <div className="mobile-filter-close-button">
        {/* {activePostSet === "filteredPosts" && filteredPostCount > 0 ? ( */}
        {isFilteredMode ? (
          <button className="btn-outline" onClick={toggleFilterMenu}>
            Show {displayFilteredCount} Posts
          </button>
        ) : (
          <button className="btn-outline" onClick={toggleFilterMenu}>
            Close Filters
          </button>
        )}
      </div>
      {/* <div className="filter-actions">
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
      </div> */}

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
      {isSupplier && (
        <div
          className={`filter-section ${openSection === "distributor" ? "open" : ""}`}
        >
          <button
            className="section-toggle"
            onClick={() => toggleSection("distributor")}
          >
            🍻 Distributor
          </button>
          <div className="filter-group">
            <DistributorAutoComplete
              options={availableDistributors}
              inputValue={distributorInput}
              selectedDistributor={selectedDistributor}
              onInputChange={setDistributorInput}
              onDistributorChange={(val) => {
                setSelectedDistributor(val);

                handleChange("distributorCompanyId", val?.id ?? null);
                handleChange("distributorCompanyName", val?.name ?? null);

                handleChange("accountName", null);
                handleChange("accountNumber", null);
                setAccountNameInput("");
              }}
            />
          </div>
        </div>
      )}

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
            options={availableBrands}
            inputValue={brandInput}
            selectedBrand={selectedBrand}
            onInputChange={setBrandInput}
            onBrandChange={(val) => {
              setSelectedBrand(val);
              handleChange("brand", val);
            }}
          />
          {/* <ProductTypeAutocomplete
            inputValue={productTypeInput}
            selectedType={selectedProductType}
            onInputChange={setProductTypeInput}
            onTypeChange={(val) => {
              setSelectedProductType(val);
              handleChange("productType", val);
            }}
          /> */}
          <input
            type="number"
            placeholder="Min Display Qty"
            value={filters.minCaseCount || ""}
            onChange={(e) =>
              handleChange(
                "minCaseCount",
                e.target.value ? Number(e.target.value) : null,
              )
            }
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
            options={availableUsers}
            loading={usersLoading}
            inputValue={selectedUserInput}
            selectedUserId={filters.postUserUid ?? null}
            onInputChange={setSelectedUserInput}
            onTypeChange={(uid) => {
              const user = availableUsers.find((u) => u.uid === uid) || null;

              setSelectedFilterUser(user);

              setSelectedUserInput(
                user
                  ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                  : "",
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
          <AccountNameAutocomplete
            disabled={accountFilterDisabled}
            options={availableAccounts}
            inputValue={accountNameInput}
            selectedValue={filters.accountName}
            onInputChange={setAccountNameInput}
            onSelect={(val) => {
              handleChange("accountName", val?.accountName ?? null);
              handleChange("accountNumber", val?.accountNumber ?? null);

              // important for supplier/shared edge case
              // if (val?.originCompanyId) {
              //   handleChange("distributorCompanyId", val.originCompanyId);
              // }
            }}
          />

          <AccountTypeSelect
            options={availableAccountTypes}
            selectedValue={filters.accountType}
            onSelect={(val) => {
              setAccountTypeInput(val || "");
              handleChange("accountType", val);
            }}
          />

          <ChainNameAutocomplete
            options={availableChains}
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
          <GoalFilterGroup
            goals={availableGoals}
            loading={goalsLoading}
            selectedGoalId={filters.companyGoalId}
            onChange={(id, title) => {
              handleChange("companyGoalId", id);
              handleChange("companyGoalTitle", title);
            }}
          />
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
      {galloEnabled && (
        <div
          className={`filter-section ${
            openSection === "galloGoal" ? "open" : ""
          }`}
        >
          <button
            className="section-toggle"
            onClick={() => toggleSection("galloGoal")}
          >
            🍷 Gallo Goal
          </button>

          <div className="filter-group">
            <GalloGoalFilterGroup
              goals={galloGoals}
              selectedGoalId={filters.galloGoalId}
              onChange={(id, title) => {
                handleChange("galloGoalId", id);
                handleChange("galloGoalTitle", title);
              }}
            />
          </div>
        </div>
      )}

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
                filters.dateRange?.endDate || null,
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
                e.target.value || null,
              )
            }
          />
        </div>
      </div>
    </div>
  );
};

export default EnhancedFilterSidebar;
