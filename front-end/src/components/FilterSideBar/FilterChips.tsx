import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useSelector } from "react-redux";

import { selectCompanyUsers } from "../../Slices/userSlice";
import { formatDateInputForDisplay } from "../../utils/dateRange";
import { PostQueryFilters } from "../../utils/types";
import { getActiveFilterCount } from "./utils/filterUtils";

interface FilterChipsProps {
  filters: PostQueryFilters;
  selectedDistributorName?: string | null;
  onRemove: (field: keyof PostQueryFilters, valueToRemove?: string) => void;
}

type Chip = {
  key: string;
  label: string;
  field: keyof PostQueryFilters;
  value?: string;
};

const FilterChips = ({
  filters,
  selectedDistributorName,
  onRemove,
}: FilterChipsProps) => {
  const companyUsers = useSelector(selectCompanyUsers) ?? [];
  const user =
    filters.postUserUid &&
    companyUsers.find((candidate) => candidate.uid === filters.postUserUid);

  if (getActiveFilterCount(filters) === 0) return null;

  const chips: Chip[] = [];
  const add = (
    key: string,
    label: string | null | undefined,
    field: keyof PostQueryFilters,
    value?: string,
  ) => {
    if (label) chips.push({ key, label, field, value });
  };

  add(
    "distributor",
    filters.distributorCompanyId
      ? `Distributor: ${
          selectedDistributorName ||
          filters.distributorCompanyName ||
          filters.distributorCompanyId
        }`
      : null,
    "distributorCompanyId",
  );
  add("hashtag", filters.hashtag, "hashtag");
  add("star-tag", filters.starTag, "starTag");
  add("brand", filters.brand && `Brand: ${filters.brand}`, "brand");
  add(
    "product-type",
    filters.productType && `Product: ${filters.productType}`,
    "productType",
  );
  add(
    "account",
    filters.accountName && `Account: ${filters.accountName}`,
    "accountName",
  );
  add(
    "account-type",
    filters.accountType && `Type: ${filters.accountType}`,
    "accountType",
  );
  add(
    "chain",
    filters.accountChain && `Chain: ${filters.accountChain}`,
    "accountChain",
  );
  add(
    "chain-type",
    filters.chainType && `Chain type: ${filters.chainType}`,
    "chainType",
  );
  add(
    "user",
    filters.postUserUid
      ? `User: ${
          user
            ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
            : filters.postUserUid
        }`
      : null,
    "postUserUid",
  );
  add(
    "company-goal",
    filters.companyGoalId
      ? `Goal: ${filters.companyGoalTitle || filters.companyGoalId}`
      : null,
    "companyGoalId",
  );
  add(
    "gallo-goal",
    filters.galloGoalId
      ? `Gallo goal: ${filters.galloGoalTitle || filters.galloGoalId}`
      : null,
    "galloGoalId",
  );

  const startDate = formatDateInputForDisplay(filters.dateRange?.startDate);
  const endDate = formatDateInputForDisplay(filters.dateRange?.endDate);
  add(
    "date-range",
    startDate || endDate
      ? startDate && endDate
        ? `${startDate} – ${endDate}`
        : `Date: ${startDate || endDate}`
      : null,
    "dateRange",
  );

  filters.states?.forEach((state) =>
    add(`state-${state}`, `State: ${state}`, "states", state),
  );
  filters.cities?.forEach((city) =>
    add(`city-${city}`, `City: ${city}`, "cities", city),
  );
  add(
    "minimum-cases",
    filters.minCaseCount != null
      ? `At least ${filters.minCaseCount} cases`
      : null,
    "minCaseCount",
  );

  return (
    <div className="active-filters-chip-row" aria-label="Selected filters">
      {chips.map((chip) => (
        <button
          type="button"
          className="chip"
          key={chip.key}
          aria-label={`Remove ${chip.label} filter`}
          onClick={() => onRemove(chip.field, chip.value)}
        >
          <span>{chip.label}</span>
          <CloseRoundedIcon aria-hidden="true" />
        </button>
      ))}
    </div>
  );
};

export default FilterChips;
