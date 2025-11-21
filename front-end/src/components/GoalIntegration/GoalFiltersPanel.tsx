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
import { useMemo } from "react";

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
  filteredAccounts: { salesRouteNums?: string[] }[];
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

  // -----------------------------------------------------
  // 🚨 FIXED: Options now come from FULL DATASET (allAccounts)
  // This enables true multi-select and eliminates "no options" bug.
  // -----------------------------------------------------
  const availableChains = useMemo(() => {
    const s = new Set<string>();
    allAccounts.forEach(acc => acc.chain && s.add(acc.chain));
    return Array.from(s).sort();
  }, [allAccounts]);

  const availableTypes = useMemo(() => {
    const s = new Set<string>();
    allAccounts.forEach(acc => acc.typeOfAccount && s.add(acc.typeOfAccount));
    return Array.from(s).sort();
  }, [allAccounts]);

  // -----------------------------------------------------
  // Counts still respect other active filters
  // -----------------------------------------------------
  const chainCounts = useMemo(() => {
    const map = new Map<string, number>();
    allAccounts.forEach(acc => {
      if (!acc.chain) return;

      const typeOK =
        filters.typeOfAccounts.length === 0 ||
        filters.typeOfAccounts.includes(acc.typeOfAccount || "");

      const chainTypeOK =
        !filters.chainType ||
        filters.chainType === acc.chainType;

      if (typeOK && chainTypeOK) {
        map.set(acc.chain, (map.get(acc.chain) || 0) + 1);
      }
    });
    return map;
  }, [allAccounts, filters.typeOfAccounts, filters.chainType]);

  const typeCounts = useMemo(() => {
    const map = new Map<string, number>();
    allAccounts.forEach(acc => {
      if (!acc.typeOfAccount) return;

      const chainOK =
        filters.chains.length === 0 ||
        filters.chains.includes(acc.chain || "");

      const chainTypeOK =
        !filters.chainType ||
        filters.chainType === acc.chainType;

      if (chainOK && chainTypeOK) {
        map.set(acc.typeOfAccount, (map.get(acc.typeOfAccount) || 0) + 1);
      }
    });
    return map;
  }, [allAccounts, filters.chains, filters.chainType]);

  // -----------------------------------------------------
  // Build option arrays with counts
  // -----------------------------------------------------
  const chainOptions = useMemo(
    () =>
      availableChains.map(chain => ({
        label: `${chain} (${chainCounts.get(chain) || 0})`,
        value: chain,
      })),
    [availableChains, chainCounts]
  );

  const typeOptions = useMemo(
    () =>
      availableTypes.map(type => ({
        label: `${type} (${typeCounts.get(type) || 0})`,
        value: type,
      })),
    [availableTypes, typeCounts]
  );

  const salespersonOptions = useMemo(
    () =>
      normalizedCompanyUsers.map(u => ({
        label: `${u.firstName} ${u.lastName}`,
        value: u.uid,
      })),
    [normalizedCompanyUsers]
  );

  const supervisorOptions = useMemo(
    () =>
      normalizedCompanyUsers
        .filter(u => u.role === "supervisor")
        .map(u => ({
          label: `${u.firstName} ${u.lastName}`,
          value: u.uid,
        })),
    [normalizedCompanyUsers]
  );

  // -----------------------------------------------------
  // Save Filters
  // -----------------------------------------------------
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

  // -----------------------------------------------------
  // UI
  // -----------------------------------------------------
  return (
    <>
      <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">

        <FilterMultiSelect
          label="Chain"
          options={chainOptions}
          selectedValues={filters.chains}
          onChange={(newChains) =>
            setFilters(prev => ({ ...prev, chains: newChains }))
          }
        />

        <TextField
          select
          label="Chain Type"
          value={filters.chainType}
          onChange={(e) =>
            setFilters(prev => ({ ...prev, chainType: e.target.value }))
          }
          sx={{ minWidth: 160 }}
          size="small"
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="chain">Chain</MenuItem>
          <MenuItem value="independent">Independent</MenuItem>
        </TextField>

        <FilterMultiSelect
          label="Type of Account"
          options={typeOptions}
          selectedValues={filters.typeOfAccounts}
          onChange={(newTypes) =>
            setFilters(prev => ({ ...prev, typeOfAccounts: newTypes }))
          }
        />

        {assigneeType === "sales" && (
          <FilterMultiSelect
            label="Salesperson"
            options={salespersonOptions}
            selectedValues={filters.userIds}
            onChange={(userIds) =>
              setFilters(prev => ({ ...prev, userIds }))
            }
          />
        )}

        {assigneeType === "supervisor" && (
          <FilterMultiSelect
            label="Supervisor"
            options={supervisorOptions}
            selectedValues={filters.supervisorIds}
            onChange={(supervisorIds) =>
              setFilters(prev => ({ ...prev, supervisorIds }))
            }
          />
        )}

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

      {/* Filter chip display */}
      {(filters.chains.length > 0 ||
        filters.chainType ||
        filters.typeOfAccounts.length > 0 ||
        filters.userIds.length > 0 ||
        filters.supervisorIds.length > 0) && (
        <Box display="flex" gap={2} flexWrap="wrap" sx={{ mb: 1, mt: 1 }}>
          Filters applied:

          {filters.chains.map(c => (
            <Chip
              key={c}
              label={`Chain: ${c}`}
              onDelete={() =>
                setFilters(prev => ({
                  ...prev,
                  chains: prev.chains.filter(x => x !== c),
                }))
              }
            />
          ))}

          {filters.chainType && (
            <Chip
              label={`Chain Type: ${filters.chainType}`}
              onDelete={() =>
                setFilters(prev => ({ ...prev, chainType: "" }))
              }
            />
          )}

          {filters.typeOfAccounts.map(t => (
            <Chip
              key={t}
              label={`Type: ${t}`}
              onDelete={() =>
                setFilters(prev => ({
                  ...prev,
                  typeOfAccounts: prev.typeOfAccounts.filter(x => x !== t),
                }))
              }
            />
          ))}
        </Box>
      )}

      {/* Save filter set */}
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
                onClick={() => setFilters(set)}
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
