// FilterChips.tsx
import React, { useEffect } from "react";
import { PostQueryFilters } from "../../utils/types";
// import "./styles/filterChips.css"; // create this if needed
import { useSelector } from "react-redux";
import { selectCompanyUsers } from "../../Slices/userSlice";

interface FilterChipsProps {
  filters: PostQueryFilters;
  onRemove: (field: keyof PostQueryFilters, valueToRemove?: string) => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({ filters, onRemove }) => {
  const companyUsers = useSelector(selectCompanyUsers) ?? [];

  const hasAnyFilter = Object.entries(filters).some(([key, val]) => {
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "object" && val !== null && "startDate" in val) {
      return val.startDate || val.endDate;
    }
    return !!val;
  });

  if (!hasAnyFilter) {
    return <div className="active-filters-chip-row" />; // empty row
  }

  const user =
    filters.postUserUid &&
    companyUsers.find((u) => u.uid === filters.postUserUid);

  return (
    <div className="active-filters-chip-row">
      {filters.hashtag && (
        <span className="chip" onClick={() => onRemove("hashtag")}>
          {/* #{filters.hashtag} ✕ */}
          {filters.hashtag} ✕
        </span>
      )}
      {filters.starTag && (
        <span className="chip" onClick={() => onRemove("starTag")}>
          {/* ⭐{filters.starTag} ✕ */}
          {filters.starTag} ✕
        </span>
      )}
      {filters.brand && (
        <span className="chip" onClick={() => onRemove("brand")}>
          Brand: {filters.brand} ✕
        </span>
      )}
      {filters.productType && (
        <span className="chip" onClick={() => onRemove("productType")}>
          Type: {filters.productType} ✕
        </span>
      )}
      {filters.accountName && (
        <span className="chip" onClick={() => onRemove("accountName")}>
          Store: {filters.accountName} ✕
        </span>
      )}
      {filters.accountNumber && (
        <span className="chip" onClick={() => onRemove("accountNumber")}>
          Acct #: {filters.accountNumber} ✕
        </span>
      )}
      {filters.accountChain && (
        <span className="chip" onClick={() => onRemove("accountChain")}>
          Chain: {filters.accountChain} ✕
        </span>
      )}

      {/* {filters.chainType && (
        <span className="chip" onClick={() => onRemove("chainType")}>
          Type: {filters.chainType} ✕
        </span>
      )} */}
      {/* {filters.channel && (
        <span className="chip" onClick={() => onRemove("channel")}>
          Channel: {filters.channel} ✕
        </span>
      )}
      {filters.category && (
        <span className="chip" onClick={() => onRemove("category")}>
          Category: {filters.category} ✕
        </span>
      )} */}
      {filters.postUserUid && (
        <span className="chip" onClick={() => onRemove("postUserUid")}>
          User:{" "}
          {user ? `${user.firstName} ${user.lastName}` : filters.postUserUid} ✕
        </span>
      )}
      {filters.accountType && (
        <span className="chip" onClick={() => onRemove("accountType")}>
          Type: {filters.accountType} ✕
        </span>
      )}

      {filters.chainType && (
        <span className="chip" onClick={() => onRemove("chainType")}>
          Chain Type: {filters.chainType} ✕
        </span>
      )}
      {filters.companyGoalId && filters.companyGoalTitle && (
        <span className="chip" onClick={() => onRemove("companyGoalId")}>
          Goal: {filters.companyGoalTitle} ✕
        </span>
      )}
      {filters.galloGoalId && filters.galloGoalTitle && (
        <span className="chip" onClick={() => onRemove("galloGoalId")}>
          Gallo Goal: {filters.galloGoalTitle} ✕
        </span>
      )}

      {filters.dateRange?.startDate && (
        <span className="chip" onClick={() => onRemove("dateRange")}>
          From: {new Date(filters.dateRange.startDate).toLocaleDateString()} ✕
        </span>
      )}

      {filters.dateRange?.endDate && (
        <span className="chip" onClick={() => onRemove("dateRange")}>
          To: {new Date(filters.dateRange.endDate).toLocaleDateString()} ✕
        </span>
      )}

      {filters.states?.map((state) => (
        <span
          className="chip"
          key={`state-${state}`}
          onClick={() => onRemove("states", state)}
        >
          State: {state} ✕
        </span>
      ))}
      {filters.cities?.map((city) => (
        <span
          className="chip"
          key={`city-${city}`}
          onClick={() => onRemove("cities", city)}
        >
          City: {city} ✕
        </span>
      ))}
      {filters.minCaseCount !== null && filters.minCaseCount !== undefined && (
        <span className="chip" onClick={() => onRemove("minCaseCount")}>
          Min Cases: {filters.minCaseCount} ✕
        </span>
      )}
    </div>
  );
};

export default FilterChips;
