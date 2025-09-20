import { useState } from "react";
import stringSimilarity from "string-similarity";
import { CompanyAccountType } from "../../utils/types";
import "./storeSelector.css";
import { useSelector } from "react-redux";
import { RootState } from "../../utils/store";
import { Autocomplete, TextField, Typography } from "@mui/material";

interface ManualFormState {
  accountName: string;
  streetAddress: string;
  city: string;
  state: string;
  chainName?: string;
}

const ManualAccountForm: React.FC<{
  open: boolean;
  onSave: (account: CompanyAccountType) => void;
}> = ({ open, onSave }) => {
  const customAccounts = useSelector(
    (state: RootState) => state.customAccounts.accounts
  );
  const existingStoreNames = customAccounts.map((acc) => acc.accountName);
  const [selectedMatch, setSelectedMatch] = useState<CompanyAccountType | null>(
    null
  );

  const [form, setForm] = useState<ManualFormState>({
    accountName: "",
    streetAddress: "",
    city: "",
    state: "",
    chainName: "",
  });

  const normalizedKey = (form: ManualFormState) =>
    `${form.accountName?.trim().toLowerCase()}|${form.streetAddress
      ?.trim()
      .toLowerCase()}|${form.city?.trim().toLowerCase()}|${form.state
      ?.trim()
      .toLowerCase()}`;

  const existingKeys = new Set(
    customAccounts.map(
      (acc) =>
        `${acc.accountName?.trim().toLowerCase()}|${acc.streetAddress
          ?.trim()
          .toLowerCase()}|${acc.city?.trim().toLowerCase()}|${acc.state
          ?.trim()
          .toLowerCase()}`
    )
  );

  const likelyDup =
    form.accountName.length > 2
      ? existingStoreNames.find(
          (name) =>
            stringSimilarity.compareTwoStrings(
              name.toLowerCase(),
              form.accountName.toLowerCase()
            ) > 0.8
        )
      : null;

  if (!open) return null;

  const handleSave = () => {
    // Check if this account already exists in our customAccounts
    const matched = customAccounts.find(
      (acc) =>
        acc.accountName.trim().toLowerCase() ===
        form.accountName.trim().toLowerCase()
    );

    if (matched) {
      onSave(matched);
      return;
    }

    const key = normalizedKey(form);
    if (existingKeys.has(key)) {
      alert("This store already exists.");
      return;
    }

    const chain = form.chainName?.trim() || "";
    const chainType = chain ? "chain" : "independent";

    const manualAccount: CompanyAccountType = {
      accountNumber: `manual-${Date.now()}`,
      accountName: form.accountName,
      accountAddress: `${form.streetAddress}, ${form.city}, ${form.state}`,
      streetAddress: form.streetAddress,
      city: form.city,
      state: form.state,
      salesRouteNums: [],
      typeOfAccount: "manual",
      chain,
      chainType,
    };

    onSave(manualAccount);
  };

  return (
    <div className="store-input-box">
      <div className="store-address-input-box">
        <div className="input-field">
          <label>Store Name</label>
          <Autocomplete
            freeSolo
            options={existingStoreNames}
            inputValue={form.accountName}
            onInputChange={(_, newInput, reason) => {
              if (reason === "reset") return; // ignore blur clear

              setForm((prev) => ({ ...prev, accountName: newInput }));

              const match = customAccounts.find(
                (acc) =>
                  acc.accountName.trim().toLowerCase() ===
                  newInput.trim().toLowerCase()
              );

              if (match) {
                setSelectedMatch(match);
                setForm({
                  accountName: match.accountName,
                  streetAddress: match.streetAddress || "",
                  city: match.city || "",
                  state: match.state || "",
                  chainName: match.chain || "",
                });
              } else {
                setSelectedMatch(null);
              }
            }}
            filterOptions={(options, { inputValue }) => {
              if (!inputValue || inputValue.length < 2) return [];

              const safeOptions = options.filter(
                (opt): opt is string => typeof opt === "string"
              );

              if (typeof inputValue !== "string" || safeOptions.length === 0)
                return [];

              const matches = stringSimilarity.findBestMatch(
                inputValue,
                safeOptions
              );

              return matches.ratings
                .filter((r) => r.rating > 0.3)
                .sort((a, b) => b.rating - a.rating)
                .map((r) => r.target);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Store Name"
                placeholder="e.g. Food Lion"
              />
            )}
          />
          {selectedMatch ? (
            <Typography variant="caption" color="success.main">
              Using existing store: {selectedMatch.accountName}
            </Typography>
          ) : likelyDup ? (
            <Typography variant="caption" color="warning.main">
              Similar store exists: {likelyDup}
            </Typography>
          ) : null}
        </div>

        <div className="input-field">
          <label>Street Address</label>
          <input
            title="Street Address"
            placeholder="Street Address"
            value={form.streetAddress}
            onChange={(e) =>
              setForm({ ...form, streetAddress: e.target.value })
            }
          />
        </div>

        <div className="input-field">
          <label>City</label>
          <input
            title="City"
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>

        <div className="input-field">
          <label>State</label>
          <input
            title="State"
            placeholder="State"
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
          />
        </div>

        <div className="input-field">
          <label>Chain (optional)</label>
          <input
            title="Chain"
            placeholder="Chain"
            value={form.chainName}
            onChange={(e) => setForm({ ...form, chainName: e.target.value })}
          />
        </div>
      </div>

      <button className="button-primary" onClick={handleSave}>
        Save Store
      </button>
    </div>
  );
};

export default ManualAccountForm;
