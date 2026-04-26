import React, { useMemo, useState } from "react";
import { Autocomplete, TextField } from "@mui/material";
import { NetworkAccountFacet } from "../../utils/database/networkFilterCacheDB";

interface Props {
  options: NetworkAccountFacet[] | string[];
  inputValue: string;
  selectedValue: string | null | undefined;
  onInputChange: (val: string) => void;
  onSelect: (val: string | null) => void;
}

const MIN_SEARCH_LENGTH = 2;

const normalize = (str: string) =>
  str.toLowerCase().replace(/[\s\-#]+/g, "").trim();

const isFacet = (
  option: NetworkAccountFacet | string,
): option is NetworkAccountFacet => typeof option !== "string";

const getAccountLabel = (option: NetworkAccountFacet | string): string => {
  if (typeof option === "string") return option;

  const name = option.accountName || "";
  return option.originCompanyName
    ? `${name} (${option.originCompanyName})`
    : name;
};

const AccountNameAutocomplete: React.FC<Props> = ({
  options,
  inputValue,
  selectedValue,
  onInputChange,
  onSelect,
}) => {
  const [open, setOpen] = useState(false);

  const normalizedOptions = useMemo(() => {
    if (inputValue.trim().length < MIN_SEARCH_LENGTH) return [];

    return options.filter((opt) => {
      if (typeof opt === "string") return Boolean(opt.trim());
      return Boolean(opt.accountName?.trim());
    });
  }, [options, inputValue]);

  const selectedOption = useMemo(() => {
    if (!selectedValue) return null;

    return (
      normalizedOptions.find((opt) => {
        if (typeof opt === "string") return opt === selectedValue;
        return opt.accountName === selectedValue;
      }) ?? null
    );
  }, [normalizedOptions, selectedValue]);

  return (
    <Autocomplete<NetworkAccountFacet | string, false, false, true>
      freeSolo
      options={normalizedOptions}
      value={selectedOption}
      inputValue={inputValue}
      open={open && normalizedOptions.length > 0}
      onOpen={() => {
        if (inputValue.trim().length >= MIN_SEARCH_LENGTH) {
          setOpen(true);
        }
      }}
      onClose={() => setOpen(false)}
      getOptionLabel={getAccountLabel}
      isOptionEqualToValue={(option, value) => {
        if (typeof option === "string" || typeof value === "string") {
          return getAccountLabel(option) === getAccountLabel(value);
        }

        return (
          option.originCompanyId === value.originCompanyId &&
          (option.accountNumber || option.accountName) ===
            (value.accountNumber || value.accountName)
        );
      }}
      onInputChange={(_, val, reason) => {
        if (reason !== "input" && reason !== "clear") return;

        onInputChange(val);
        setOpen(val.trim().length >= MIN_SEARCH_LENGTH);
      }}
      onChange={(_, val) => {
        if (!val) {
          onSelect(null);
          setOpen(false);
          return;
        }

        if (typeof val === "string") {
          onSelect(val);
          setOpen(false);
          return;
        }

        onSelect(val.accountName ?? null);
        onInputChange(val.accountName ?? "");
        setOpen(false);
      }}
      filterOptions={(opts, { inputValue: iv }) => {
        const normalizedIv = normalize(iv);

        if (normalizedIv.length < MIN_SEARCH_LENGTH) return [];

        return opts.filter((opt) => {
          const label = getAccountLabel(opt);
          const normalizedOpt = normalize(label);

          return normalizedOpt.includes(normalizedIv);
        });
      }}
      renderOption={(props, option) => {
        if (!isFacet(option)) {
          return (
            <li {...props} key={option}>
              {option}
            </li>
          );
        }

        return (
          <li
            {...props}
            key={`${option.originCompanyId}-${option.accountNumber || option.accountName}`}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span>{option.accountName}</span>
              <span style={{ fontSize: "0.75em", color: "var(--text-color)" }}>
                {option.originCompanyName}
                {option.accountNumber ? ` • #${option.accountNumber}` : ""}
              </span>
            </div>
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Account Name"
          placeholder="Type 2+ characters"
        />
      )}
      fullWidth
      clearOnBlur={false}
      autoHighlight
    />
  );
};

export default AccountNameAutocomplete;