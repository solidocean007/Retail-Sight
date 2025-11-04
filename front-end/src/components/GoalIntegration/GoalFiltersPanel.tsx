import {
  Box,
  Button,
  Chip,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import FilterMultiSelect from "./FilterMultiSelect";
import { CompanyAccountType, UserType } from "../../utils/types";
import { useEffect, useMemo } from "react";

interface FilterTypes {
  chains: string[];
  chainType: string;
  typeOfAccounts: string[];
  userIds: string[];
  supervisorIds: string[];
}

interface GoalFiltersPanelProps {
  filters: FilterTypes;
  setFilters: React.Dispatch<React.SetStateAction<FilterTypes>>;
  chains: string[];
  customerTypes: string[];
  normalizedCompanyUsers: UserType[];
  savedFilterSets: Record<string, FilterTypes>;
  setSavedFilterSets: (val: Record<string, FilterTypes>) => void;
  filterSetName: string;
  setFilterSetName: (val: string) => void;
  filteredAccounts: { salesRouteNums?: string[] }[]; // ✅ add this
  assigneeType: string;
  allAccounts: CompanyAccountType[];
}

const GoalFiltersPanel: React.FC<GoalFiltersPanelProps> = ({
  filters,
  setFilters,
  chains,
  customerTypes,
  normalizedCompanyUsers,
  savedFilterSets,
  setSavedFilterSets,
  filterSetName,
  setFilterSetName,
  filteredAccounts,
  assigneeType,
  allAccounts,
}) => {
  const filteredAccountsForOptions = useMemo(() => {
    // Start from all accounts in the company (you might need to pass them in as a prop)
    // For now assume you can access `allAccounts` from props or global store.
    return allAccounts.filter((a) => {
      // respect current filter values
      const typeMatch =
        filters.typeOfAccounts.length === 0 ||
        filters.typeOfAccounts.includes(a.typeOfAccount || "");
      const chainMatch =
        filters.chains.length === 0 || filters.chains.includes(a.chain || "");
      const chainTypeMatch =
        !filters.chainType || filters.chainType === a.chainType;
      return typeMatch && chainMatch && chainTypeMatch;
    });
  }, [allAccounts, filters]);

  // 🔹 Derive counts for each option dynamically
  const chainCounts = useMemo(() => {
    const map = new Map<string, number>();
    allAccounts.forEach((a) => {
      if (!a.chain) return;

      const typeOk =
        filters.typeOfAccounts.length === 0 ||
        filters.typeOfAccounts.includes(a.typeOfAccount || "");
      const chainTypeOk =
        !filters.chainType || filters.chainType === a.chainType;

      if (typeOk && chainTypeOk) {
        map.set(a.chain, (map.get(a.chain) || 0) + 1);
      }
    });
    return map;
  }, [allAccounts, filters.typeOfAccounts, filters.chainType]);

  const typeCounts = useMemo(() => {
    const map = new Map<string, number>();
    allAccounts.forEach((a) => {
      if (!a.typeOfAccount) return;

      const chainOk =
        filters.chains.length === 0 || filters.chains.includes(a.chain || "");
      const chainTypeOk =
        !filters.chainType || filters.chainType === a.chainType;

      if (chainOk && chainTypeOk) {
        map.set(a.typeOfAccount, (map.get(a.typeOfAccount) || 0) + 1);
      }
    });
    return map;
  }, [allAccounts, filters.chains, filters.chainType]);

  const availableChains = useMemo(() => {
    const set = new Set<string>();
    filteredAccountsForOptions.forEach((a) => {
      if (a.chain) set.add(a.chain);
    });
    return Array.from(set).sort();
  }, [filteredAccountsForOptions]);

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    filteredAccountsForOptions.forEach((a) => {
      if (a.typeOfAccount) set.add(a.typeOfAccount);
    });
    return Array.from(set).sort();
  }, [filteredAccountsForOptions]);

  useEffect(() => {
    const validChains = new Set(availableChains);
    setFilters((prev) => ({
      ...prev,
      chains: prev.chains.filter((c) => validChains.has(c)),
    }));
  }, [availableChains]);

  useEffect(() => {
    const validTypes = new Set(availableTypes);
    setFilters((prev) => ({
      ...prev,
      typeOfAccounts: prev.typeOfAccounts.filter((t) => validTypes.has(t)),
    }));
  }, [availableTypes]);

  const saveCurrentFilterSet = () => {
    if (!filterSetName.trim()) {
      alert("Enter a name to save this filter set.");
      return;
    }
    const updated = { ...savedFilterSets, [filterSetName]: filters };
    setSavedFilterSets(updated);
    localStorage.setItem("displaygram_filter_sets", JSON.stringify(updated));
    setFilterSetName("");
  };

  return (
    <>
      <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
        {/* Chain Filter */}
        <FilterMultiSelect
          label="Chain"
          options={availableChains.map((chain) => {
            const count = chainCounts.get(chain) || 0;
            return `${chain} (${count})`;
          })}
          selected={filters.chains}
          onChange={(newChains) =>
            setFilters((prev) => ({
              ...prev,
              chains: newChains.map((s) => s.split(" (")[0]), // strip counts on select
            }))
          }
        />

        {/* Chain Type */}
        <TextField
          select
          label="Chain Type"
          value={filters.chainType}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, chainType: e.target.value }))
          }
          sx={{ minWidth: 160 }}
          size="small"
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="chain">Chain</MenuItem>
          <MenuItem value="independent">Independent</MenuItem>
        </TextField>

        {/* Type of Account */}
        <FilterMultiSelect
          label="Type of Account"
          options={availableTypes.map((type) => {
            const count = typeCounts.get(type) || 0;
            return `${type} (${count})`;
          })}
          selected={filters.typeOfAccounts}
          onChange={(newTypes) =>
            setFilters((prev) => ({
              ...prev,
              typeOfAccounts: newTypes.map((s) => s.split(" (")[0]),
            }))
          }
        />

        {/* Salesperson */}
        {assigneeType === "sales" && (
          <FilterMultiSelect
            label="Salesperson"
            options={normalizedCompanyUsers.map(
              (u) => `${u.firstName} ${u.lastName}`
            )}
            selected={filters.userIds.map((id) => {
              const user = normalizedCompanyUsers.find((u) => u.uid === id);
              return `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
            })}
            onChange={(selectedNames) => {
              const userIds = selectedNames
                .map(
                  (name) =>
                    normalizedCompanyUsers.find(
                      (u) => `${u.firstName} ${u.lastName}` === name
                    )?.uid
                )
                .filter(Boolean) as string[];
              setFilters((prev) => ({ ...prev, userIds }));
            }}
          />
        )}

        {/* Supervisor */}
        {assigneeType === "supervisor" && (
          <FilterMultiSelect
            label="Supervisor"
            options={normalizedCompanyUsers
              .filter((u) => u.role === "supervisor")
              .map((u) => `${u.firstName} ${u.lastName}`)}
            selected={filters.supervisorIds.map((id) => {
              const sup = normalizedCompanyUsers.find((u) => u.uid === id);
              return `${sup?.firstName || ""} ${sup?.lastName || ""}`.trim();
            })}
            onChange={(selectedNames) => {
              const supervisorIds = selectedNames
                .map(
                  (name) =>
                    normalizedCompanyUsers.find(
                      (u) =>
                        `${u.firstName} ${u.lastName}` === name &&
                        u.role === "supervisor"
                    )?.uid
                )
                .filter(Boolean) as string[];
              setFilters((prev) => ({ ...prev, supervisorIds }));
            }}
          />
        )}

        {/* Clear Button */}
        <Button
          variant="outlined"
          size="large"
          onClick={() =>
            setFilters({
              chains: [],
              chainType: "",
              typeOfAccounts: [],
              userIds: [],
              supervisorIds: [],
            })
          }
        >
          Clear Filters
        </Button>
      </Box>

      {(filters.chains.length > 0 ||
        filters.chainType ||
        filters.typeOfAccounts.length > 0 ||
        filters.userIds ||
        filters.supervisorIds.length > 0) && (
        <Box display="flex" gap={2} flexWrap="wrap" sx={{ mb: 1, mt: 1 }}>
          Filters applied:
          <div className="chains-container">
            {filters.chains.map((c) => (
              <Chip
                key={c}
                label={`Chain: ${c}`}
                onDelete={() =>
                  setFilters({
                    ...filters,
                    chains: filters.chains.filter((x) => x !== c), // and here
                  })
                }
              />
            ))}
          </div>
          <div className="chain-type-container">
            {filters.chainType && (
              <Chip
                label={`Chain Type: ${filters.chainType}`}
                onDelete={() => setFilters({ ...filters, chainType: "" })} // and here
              />
            )}
          </div>
          <div className="types-of-account-container">
            {filters.typeOfAccounts.map((t) => (
              <Chip
                key={t}
                label={`Type: ${t}`}
                onDelete={() =>
                  setFilters({
                    ...filters,
                    typeOfAccounts: filters.typeOfAccounts.filter(
                      // and here
                      (x) => x !== t
                    ),
                  })
                }
              />
            ))}
          </div>
          {filters.userIds.length > 0 && (
            <Box
              className="sales-people-container"
              sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}
            >
              <Typography variant="subtitle2" sx={{ mr: 1 }}>
                Salespeople:
              </Typography>
              {filters.userIds.map((uid) => {
                const user = normalizedCompanyUsers.find((u) => u.uid === uid);
                const name = user
                  ? `${user.firstName} ${user.lastName}`
                  : "Unknown User";

                return (
                  <Chip
                    key={uid}
                    label={`User: ${name}`}
                    color={
                      filteredAccounts.some((account) =>
                        account.salesRouteNums?.includes(
                          user?.salesRouteNum || ""
                        )
                      )
                        ? "default"
                        : "error"
                    }
                    onDelete={() =>
                      setFilters({
                        ...filters,
                        userIds: filters.userIds.filter((id) => id !== uid), // and here
                      })
                    }
                  />
                );
              })}
            </Box>
          )}
          {filters.supervisorIds.length > 0 && (
            <Box
              className="supervisors-container"
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                mt: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ mr: 1 }}>
                Supervisors:
              </Typography>
              {filters.supervisorIds.map((uid) => {
                const sup = normalizedCompanyUsers.find((u) => u.uid === uid);
                const name = sup
                  ? `${sup.firstName} ${sup.lastName}`
                  : "Unknown Supervisor";
                return (
                  <Chip
                    key={uid}
                    label={`Supervisor: ${name}`}
                    onDelete={() =>
                      setFilters({
                        ...filters,
                        supervisorIds: filters.supervisorIds.filter(
                          // and here
                          (id) => id !== uid
                        ),
                      })
                    }
                  />
                );
              })}
            </Box>
          )}
        </Box>
      )}

      {/* Save Filters Section */}
      <Box display="flex" gap={2} alignItems="center" mt={2}>
        <TextField
          label="Save Filter Set As"
          value={filterSetName}
          onChange={(e) => setFilterSetName(e.target.value)}
          size="small"
        />
        <Button variant="outlined" onClick={saveCurrentFilterSet}>
          Save Filters
        </Button>
      </Box>

      {Object.keys(savedFilterSets).length > 0 && (
        <Box mt={1}>
          <Typography variant="caption">Saved Filters:</Typography>
          <Box display="flex" gap={1} flexWrap="wrap" mt={0.5}>
            {Object.entries(savedFilterSets).map(([name, set]) => (
              <Chip
                key={name}
                label={name}
                onClick={() => setFilters(() => set)}
                onDelete={() => {
                  const updated = { ...savedFilterSets };
                  delete updated[name];
                  setSavedFilterSets(updated);
                  localStorage.setItem(
                    "displaygram_filter_sets",
                    JSON.stringify(updated)
                  );
                }}
              />
            ))}
          </Box>
        </Box>
      )}
    </>
  );
};

export default GoalFiltersPanel;
