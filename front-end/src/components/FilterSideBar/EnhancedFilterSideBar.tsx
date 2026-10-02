import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SellOutlinedIcon from "@mui/icons-material/SellOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import TrackChangesOutlinedIcon from "@mui/icons-material/TrackChangesOutlined";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import WineBarOutlinedIcon from "@mui/icons-material/WineBarOutlined";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { selectIsSupplier } from "../../Slices/currentCompanySlice";
import { selectCompanyUsers } from "../../Slices/userSlice";
import { useAvailableBrands } from "../../hooks/useAvailableBrands";
import { useAvailableFilterUsers } from "../../hooks/useAvailableFilterUsers";
import { useAvailableGoals } from "../../hooks/useAvailableGoals";
import { useCompanyIntegrations } from "../../hooks/useCompanyIntegrations";
import { useNetworkAccountFacets } from "../../hooks/useNetworkAccountFacets";
import { formatDateInputForDisplay } from "../../utils/dateRange";
import { RootState } from "../../utils/store";
import { CompanyAccountType, PostQueryFilters } from "../../utils/types";
import AccountNameAutocomplete from "./AccountNameAutocomplete";
import AccountTypeSelect from "./AccountTypeSelect";
import BrandAutoComplete from "./BrandAutoComplete";
import ChainNameAutocomplete from "./ChainNameAutocomplete";
import ChainTypeSelect from "./ChainTypeSelect";
import DistributorAutoComplete from "./DistributorAutoComplete";
import FilterAccordionSection from "./FilterAccordionSection";
import FilterChips from "./FilterChips";
import GalloGoalFilterGroup from "./GalloGoalFilterGroup";
import GoalFilterGroup from "./GoalFilterGroup";
import UserFilterAutocomplete from "./UserFilterAutocomplete";
import { useFeedFilterResults } from "./hooks/useFeedFilterResults";
import "./styles/enhancedFilterSideBar.css";
import {
  clearAllFilters,
  getActiveFilterCount,
  hasActiveFilters,
  removeFilterField,
} from "./utils/filterUtils";

interface DistributorOption {
  id: string;
  name: string;
}

type FeedType = "company" | "shared";

interface EnhancedFilterSideBarProps {
  appliedFilters: PostQueryFilters | null;
  onFiltersApplied: (filters: PostQueryFilters) => void;
  onClearFilters: (feedType: FeedType) => void;
  onApplyingChange?: (feedType: FeedType, applying: boolean) => void;
  toggleFilterMenu: () => void;
  isSharedFeed: boolean;
}

const summarize = (values: Array<string | null | undefined>): string =>
  values.filter(Boolean).join(" · ");

const formatResultUpdatedAt = (value: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const EnhancedFilterSidebar = ({
  appliedFilters,
  onFiltersApplied,
  onClearFilters,
  onApplyingChange,
  toggleFilterMenu,
  isSharedFeed,
}: EnhancedFilterSideBarProps) => {
  const feedType: FeedType = isSharedFeed ? "shared" : "company";
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId,
  );
  const isSupplier = useSelector(selectIsSupplier);
  const selectedCompanyUsers = useSelector(selectCompanyUsers);
  const companyUsers = useMemo(
    () => selectedCompanyUsers ?? [],
    [selectedCompanyUsers],
  );
  const companyPosts = useSelector((state: RootState) => state.posts.posts);
  const sharedPosts = useSelector(
    (state: RootState) => state.sharedPosts.sharedPosts,
  );
  const accounts = useSelector(
    (state: RootState) => state.allAccounts.accounts,
  ) as CompanyAccountType[];
  const galloGoals = useSelector(
    (state: RootState) => state.galloGoals.galloGoals,
  );
  const companyResultCount = useSelector(
    (state: RootState) => state.posts.filteredPostCount,
  );
  const sharedResultCount = useSelector(
    (state: RootState) => state.sharedPosts.filteredSharedPostCount,
  );
  const companyResultFetchedAt = useSelector(
    (state: RootState) => state.posts.filteredPostFetchedAt,
  );
  const sharedResultFetchedAt = useSelector(
    (state: RootState) => state.sharedPosts.filteredSharedPostFetchedAt,
  );

  const sourcePosts = isSharedFeed ? sharedPosts : companyPosts;
  const newestPostDate = sourcePosts[0]?.displayDate ?? null;
  const useNetworkFilters = isSupplier && isSharedFeed;

  const { isEnabled } = useCompanyIntegrations(companyId);
  const galloEnabled = isEnabled("galloAxis");
  const { users: availableUsers, loading: usersLoading } =
    useAvailableFilterUsers(isSharedFeed);
  const { goals: availableGoals, loading: goalsLoading } = useAvailableGoals(
    isSupplier,
    companyId,
  );
  const availableBrands = useAvailableBrands();

  const emptyFilters = useMemo(() => clearAllFilters(feedType), [feedType]);
  const [draftFilters, setDraftFilters] = useState<PostQueryFilters>(
    appliedFilters ? { ...appliedFilters, feedType } : emptyFilters,
  );
  const [openSection, setOpenSection] = useState<string | null>("date");
  const [tagInput, setTagInput] = useState("");
  const [brandInput, setBrandInput] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedUserInput, setSelectedUserInput] = useState("");
  const [distributorInput, setDistributorInput] = useState("");
  const [selectedDistributor, setSelectedDistributor] =
    useState<DistributorOption | null>(null);
  const [accountNameInput, setAccountNameInput] = useState("");
  const autoApplyTimerRef = useRef<number | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  const useNetworkAccountFilters =
    useNetworkFilters && openSection === "account";
  const {
    accountTypes: networkAccountTypes,
    chains: networkChains,
    getAccountNameOptions,
  } = useNetworkAccountFacets(useNetworkAccountFilters);

  const availableAccountNameFacets = useMemo(() => {
    if (!useNetworkAccountFilters) return [];
    return getAccountNameOptions(accountNameInput);
  }, [accountNameInput, getAccountNameOptions, useNetworkAccountFilters]);

  const availableAccountTypes = useMemo(() => {
    if (useNetworkFilters) return networkAccountTypes;

    return Array.from(
      new Set(
        accounts
          .map((account) => account.typeOfAccount?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort();
  }, [accounts, networkAccountTypes, useNetworkFilters]);

  const availableChains = useMemo(() => {
    if (useNetworkFilters) return networkChains;

    return Array.from(
      new Set(
        accounts
          .map((account) => account.chain?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort();
  }, [accounts, networkChains, useNetworkFilters]);

  const availableDistributors = useMemo(() => {
    const distributors = new Map<string, string>();

    sourcePosts.forEach((post) => {
      if (
        !post.companyId ||
        !post.postUserCompanyName ||
        !post.brands?.length
      ) {
        return;
      }
      distributors.set(post.companyId, post.postUserCompanyName);
    });

    return Array.from(distributors, ([id, name]) => ({ id, name }));
  }, [sourcePosts]);

  const availableAccounts = useMemo(() => {
    if (useNetworkAccountFilters) {
      return availableAccountNameFacets.filter(
        (facet) =>
          Boolean(draftFilters.distributorCompanyId) &&
          facet.originCompanyId === draftFilters.distributorCompanyId,
      );
    }

    return accounts
      .filter((account) => account.accountName)
      .map((account) => ({
        accountName: account.accountName,
        accountNumber: String(account.accountNumber ?? ""),
        originCompanyId: companyId ?? "",
        originCompanyName: "Your Company",
      }));
  }, [
    accounts,
    availableAccountNameFacets,
    companyId,
    draftFilters.distributorCompanyId,
    useNetworkAccountFilters,
  ]);

  const { applyFilters, isApplying } = useFeedFilterResults({
    companyId,
    feedType,
    newestPostDate,
    onApplied: onFiltersApplied,
    onApplyingChange,
  });

  const cancelScheduledApply = useCallback(() => {
    if (autoApplyTimerRef.current == null) return;
    window.clearTimeout(autoApplyTimerRef.current);
    autoApplyTimerRef.current = null;
  }, []);

  useEffect(() => cancelScheduledApply, [cancelScheduledApply]);

  const commitFilters = useCallback(
    (
      nextFilters: PostQueryFilters,
      timing: "instant" | "debounced" = "instant",
    ) => {
      const normalizedFilters = { ...nextFilters, feedType };
      setDraftFilters(normalizedFilters);
      cancelScheduledApply();

      const run = () => {
        autoApplyTimerRef.current = null;
        if (hasActiveFilters(normalizedFilters)) {
          void applyFilters(normalizedFilters);
        } else {
          onClearFilters(feedType);
        }
      };

      if (timing === "debounced") {
        autoApplyTimerRef.current = window.setTimeout(run, 450);
      } else {
        run();
      }
    },
    [applyFilters, cancelScheduledApply, feedType, onClearFilters],
  );

  useEffect(() => {
    const nextFilters = appliedFilters
      ? { ...appliedFilters, feedType }
      : clearAllFilters(feedType);

    setDraftFilters(nextFilters);
    setTagInput(nextFilters.hashtag || nextFilters.starTag || "");
    setBrandInput(nextFilters.brand || "");
    setSelectedBrand(nextFilters.brand || null);
    setAccountNameInput(nextFilters.accountName || "");
    setDistributorInput(nextFilters.distributorCompanyName || "");
    setSelectedDistributor(
      nextFilters.distributorCompanyId
        ? {
            id: nextFilters.distributorCompanyId,
            name:
              nextFilters.distributorCompanyName ||
              nextFilters.distributorCompanyId,
          }
        : null,
    );
  }, [appliedFilters, feedType]);

  useEffect(() => {
    if (!draftFilters.postUserUid) {
      setSelectedUserInput("");
      return;
    }

    const selectedUser = companyUsers.find(
      (user) => user.uid === draftFilters.postUserUid,
    );
    setSelectedUserInput(
      selectedUser
        ? `${selectedUser.firstName ?? ""} ${selectedUser.lastName ?? ""}`.trim()
        : "",
    );
  }, [companyUsers, draftFilters.postUserUid]);

  const accountFilterDisabled =
    isSupplier && isSharedFeed && !draftFilters.distributorCompanyId;

  useEffect(() => {
    if (!accountFilterDisabled) return;

    setAccountNameInput("");
    setDraftFilters((current) => ({
      ...current,
      accountName: null,
      accountNumber: null,
    }));
  }, [accountFilterDisabled]);

  const activeFilterCount = getActiveFilterCount(draftFilters);
  const hasDraftFilters = hasActiveFilters(draftFilters);
  const resultCount = isSharedFeed ? sharedResultCount : companyResultCount;
  const resultFetchedAt = isSharedFeed
    ? sharedResultFetchedAt
    : companyResultFetchedAt;
  const formattedResultFetchedAt = formatResultUpdatedAt(resultFetchedAt);

  const updateFilters = (
    changes: Partial<PostQueryFilters>,
    timing: "instant" | "debounced" = "instant",
  ) => {
    commitFilters({ ...draftFilters, ...changes }, timing);
  };

  const handleDateChange = (
    startDate: string | null,
    endDate: string | null,
  ) => {
    updateFilters(
      { dateRange: { startDate, endDate } },
      "debounced",
    );
  };

  const resetDraft = () => {
    setDraftFilters(clearAllFilters(feedType));
    setTagInput("");
    setBrandInput("");
    setSelectedBrand(null);
    setSelectedUserInput("");
    setDistributorInput("");
    setSelectedDistributor(null);
    setAccountNameInput("");
  };

  const handleClearFilters = () => {
    cancelScheduledApply();
    resetDraft();
    onClearFilters(feedType);
  };

  const handleRemoveFilter = (
    field: keyof PostQueryFilters,
    value?: string,
  ) => {
    const updatedFilters = removeFilterField(draftFilters, field, value);
    commitFilters(updatedFilters);

    if (field === "hashtag" || field === "starTag") setTagInput("");
    if (field === "brand") {
      setBrandInput("");
      setSelectedBrand(null);
    }
    if (field === "accountName" || field === "accountNumber") {
      setAccountNameInput("");
    }
    if (
      field === "distributorCompanyId" ||
      field === "distributorCompanyName"
    ) {
      setDistributorInput("");
      setSelectedDistributor(null);
      setAccountNameInput("");
    }
    if (field === "postUserUid") setSelectedUserInput("");
  };

  const handleViewResults = () => {
    if (window.matchMedia("(max-width: 899px)").matches) toggleFilterMenu();
  };

  const startDate = formatDateInputForDisplay(
    draftFilters.dateRange?.startDate,
  );
  const endDate = formatDateInputForDisplay(draftFilters.dateRange?.endDate);
  const dateSummary = summarize([
    startDate && endDate ? `${startDate} – ${endDate}` : startDate || endDate,
  ]);
  const productSummary = summarize([
    draftFilters.brand,
    draftFilters.minCaseCount != null
      ? `≥ ${draftFilters.minCaseCount} cases`
      : null,
  ]);
  const accountSummary = summarize([
    draftFilters.accountName,
    draftFilters.accountType,
    draftFilters.accountChain,
    draftFilters.chainType,
  ]);
  const selectedUser = companyUsers.find(
    (user) => user.uid === draftFilters.postUserUid,
  );
  const userSummary = selectedUser
    ? `${selectedUser.firstName ?? ""} ${selectedUser.lastName ?? ""}`.trim()
    : draftFilters.postUserUid || "";
  const tagSummary = draftFilters.hashtag || draftFilters.starTag || "";

  return (
    <aside
      className="enhanced-sidebar side-bar-box"
      aria-label="Display filters"
    >
      <header className="filter-panel-header">
        <div className="filter-panel-title">
          <span className="filter-panel-title__icon" aria-hidden="true">
            <TuneRoundedIcon />
          </span>
          <div className="filter-panel-title__copy">
            <span>Refine the feed</span>
            <h2>Filters</h2>
          </div>
        </div>
        <span className="filter-count-badge">{activeFilterCount} active</span>
      </header>

      {(activeFilterCount > 0 || isApplying) && (
        <div
          className={`filter-panel-result-status${
            isApplying ? " is-loading" : ""
          }`}
          aria-live="polite"
          aria-busy={isApplying}
        >
          <span className="filter-panel-result-status__dot" aria-hidden="true" />
          <div>
            <strong>
              {isApplying
                ? "Updating results…"
                : resultCount === 0
                  ? "No displays match"
                  : `${resultCount} display${resultCount === 1 ? "" : "s"} match`}
            </strong>
            {!isApplying && formattedResultFetchedAt && (
              <small>Updated {formattedResultFetchedAt}</small>
            )}
          </div>
        </div>
      )}

      {activeFilterCount > 0 ? (
        <FilterChips
          filters={draftFilters}
          selectedDistributorName={selectedDistributor?.name}
          onRemove={handleRemoveFilter}
        />
      ) : (
        <p className="filter-panel-empty-copy">
          Selections update the feed automatically.
        </p>
      )}

      <div className="filter-panel-sections">
        <FilterAccordionSection
          id="date"
          title="Date range"
          icon={<CalendarMonthOutlinedIcon />}
          open={openSection === "date"}
          summary={dateSummary}
          onToggle={toggleSection}
        >
          <div className="filter-date-grid">
            <label>
              <span>From</span>
              <input
                aria-label="Start date"
                type="date"
                value={draftFilters.dateRange?.startDate || ""}
                max={draftFilters.dateRange?.endDate || undefined}
                onChange={(event) =>
                  handleDateChange(
                    event.target.value || null,
                    draftFilters.dateRange?.endDate || null,
                  )
                }
              />
            </label>
            <label>
              <span>To</span>
              <input
                aria-label="End date"
                type="date"
                value={draftFilters.dateRange?.endDate || ""}
                min={draftFilters.dateRange?.startDate || undefined}
                onChange={(event) =>
                  handleDateChange(
                    draftFilters.dateRange?.startDate || null,
                    event.target.value || null,
                  )
                }
              />
            </label>
          </div>
        </FilterAccordionSection>

        <FilterAccordionSection
          id="product"
          title="Product and quantity"
          icon={<Inventory2OutlinedIcon />}
          open={openSection === "product"}
          summary={productSummary}
          onToggle={toggleSection}
        >
          <BrandAutoComplete
            options={availableBrands}
            inputValue={brandInput}
            selectedBrand={selectedBrand}
            onInputChange={setBrandInput}
            onBrandChange={(brand) => {
              setSelectedBrand(brand);
              updateFilters({ brand });
            }}
          />
          <label className="filter-field-label">
            <span>Minimum display quantity</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="Any quantity"
              value={draftFilters.minCaseCount ?? ""}
              onChange={(event) =>
                updateFilters(
                  {
                    minCaseCount: event.target.value
                      ? Number(event.target.value)
                      : null,
                  },
                  "debounced",
                )
              }
            />
          </label>
        </FilterAccordionSection>

        {isSupplier && (
          <FilterAccordionSection
            id="distributor"
            title="Distributor"
            icon={<LocalShippingOutlinedIcon />}
            open={openSection === "distributor"}
            summary={draftFilters.distributorCompanyName || ""}
            onToggle={toggleSection}
          >
            <DistributorAutoComplete
              options={availableDistributors}
              inputValue={distributorInput}
              selectedDistributor={selectedDistributor}
              onInputChange={setDistributorInput}
              onDistributorChange={(distributor) => {
                setSelectedDistributor(distributor);
                updateFilters({
                  distributorCompanyId: distributor?.id ?? null,
                  distributorCompanyName: distributor?.name ?? null,
                  accountName: null,
                  accountNumber: null,
                });
                setAccountNameInput("");
              }}
            />
          </FilterAccordionSection>
        )}

        <FilterAccordionSection
          id="account"
          title="Account"
          icon={<StorefrontOutlinedIcon />}
          open={openSection === "account"}
          summary={accountSummary}
          onToggle={toggleSection}
        >
          <AccountNameAutocomplete
            disabled={accountFilterDisabled}
            options={availableAccounts}
            inputValue={accountNameInput}
            selectedValue={draftFilters.accountName}
            onInputChange={setAccountNameInput}
            onSelect={(account) => {
              updateFilters({
                accountName: account?.accountName ?? null,
                accountNumber: account?.accountNumber ?? null,
              });
            }}
          />
          <AccountTypeSelect
            options={availableAccountTypes}
            selectedValue={draftFilters.accountType}
            onSelect={(value) => updateFilters({ accountType: value })}
          />
          <ChainNameAutocomplete
            options={availableChains}
            selectedValue={draftFilters.accountChain}
            onSelect={(value) => updateFilters({ accountChain: value })}
          />
          <ChainTypeSelect
            selectedValue={draftFilters.chainType}
            onSelect={(value) => updateFilters({ chainType: value })}
          />
        </FilterAccordionSection>

        <FilterAccordionSection
          id="user"
          title="User"
          icon={<PersonOutlineRoundedIcon />}
          open={openSection === "user"}
          summary={userSummary}
          onToggle={toggleSection}
        >
          <UserFilterAutocomplete
            options={availableUsers}
            loading={usersLoading}
            inputValue={selectedUserInput}
            selectedUserId={draftFilters.postUserUid ?? null}
            onInputChange={setSelectedUserInput}
            onTypeChange={(uid) => {
              const user =
                availableUsers.find((candidate) => candidate.uid === uid) ||
                null;
              setSelectedUserInput(
                user
                  ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                  : "",
              );
              updateFilters({ postUserUid: uid });
            }}
          />
        </FilterAccordionSection>

        <FilterAccordionSection
          id="goal"
          title="Company goal"
          icon={<TrackChangesOutlinedIcon />}
          open={openSection === "goal"}
          summary={draftFilters.companyGoalTitle || ""}
          onToggle={toggleSection}
        >
          <GoalFilterGroup
            goals={availableGoals}
            loading={goalsLoading}
            selectedGoalId={draftFilters.companyGoalId}
            onChange={(id, title) => {
              updateFilters({ companyGoalId: id, companyGoalTitle: title });
            }}
          />
        </FilterAccordionSection>

        {galloEnabled && (
          <FilterAccordionSection
            id="gallo-goal"
            title="Gallo goal"
            icon={<WineBarOutlinedIcon />}
            open={openSection === "gallo-goal"}
            summary={draftFilters.galloGoalTitle || ""}
            onToggle={toggleSection}
          >
            <GalloGoalFilterGroup
              goals={galloGoals}
              selectedGoalId={draftFilters.galloGoalId}
              onChange={(id, title) => {
                updateFilters({ galloGoalId: id, galloGoalTitle: title });
              }}
            />
          </FilterAccordionSection>
        )}

        <FilterAccordionSection
          id="tags"
          title="Tags"
          icon={<SellOutlinedIcon />}
          open={openSection === "tags"}
          summary={tagSummary}
          onToggle={toggleSection}
        >
          <label className="filter-field-label">
            <span>Hashtag or star tag</span>
            <input
              placeholder="#display or *priority"
              value={tagInput}
              onChange={(event) => {
                let value = event.target.value.trim();
                if (value && !value.startsWith("#") && !value.startsWith("*")) {
                  value = `#${value}`;
                }

                setTagInput(value);
                const normalized = value.toLowerCase();

                if (normalized.startsWith("#")) {
                  updateFilters(
                    { hashtag: normalized, starTag: null },
                    "debounced",
                  );
                } else if (normalized.startsWith("*")) {
                  updateFilters(
                    { starTag: normalized, hashtag: null },
                    "debounced",
                  );
                } else {
                  updateFilters(
                    { hashtag: null, starTag: null },
                    "debounced",
                  );
                }
              }}
            />
          </label>
        </FilterAccordionSection>
      </div>

      <footer className="filter-panel-footer">
        <button
          type="button"
          className="filter-panel-clear"
          onClick={handleClearFilters}
          disabled={!hasDraftFilters && !appliedFilters}
        >
          <RestartAltRoundedIcon aria-hidden="true" />
          Clear all
        </button>
        <button
          type="button"
          className="filter-panel-done"
          onClick={handleViewResults}
        >
          Show results
        </button>
      </footer>
    </aside>
  );
};

export default EnhancedFilterSidebar;
