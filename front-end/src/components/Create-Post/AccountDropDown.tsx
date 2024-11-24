import React, { useState, useEffect } from "react";
import { Autocomplete, TextField } from "@mui/material";
import { getUserAccountsFromIndexedDB } from "../../utils/database/indexedDBUtils";
import { CompanyAccountType } from "../../utils/types";

interface AccountDropdownProps {
  onAccountSelect: (account: CompanyAccountType) => void;
}

const AccountDropdown: React.FC<AccountDropdownProps> = ({ onAccountSelect }) => {
  const [accounts, setAccounts] = useState<CompanyAccountType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchAccounts = async () => {
      const indexedDBAccounts = await getUserAccountsFromIndexedDB();
      setAccounts(indexedDBAccounts);
    };
    fetchAccounts();
  }, []);

  return (
    <Autocomplete
      options={accounts}
      getOptionLabel={(account) =>
        `${account.accountName} - ${account.accountAddress}`
      }
      onInputChange={(e, value) => setSearchQuery(value)}
      onChange={(e, value) => {
        if (value) onAccountSelect(value);
      }}
      renderInput={(params) => (
        <TextField {...params} label="Search Accounts" variant="outlined" />
      )}
      sx={{
        width: "100%", // Make it take the full width of its container
        maxWidth: 400, // Optionally set a maximum width
        margin: "0 auto", // Center the dropdown if needed
      }}
    />
  );
};

export default AccountDropdown;
