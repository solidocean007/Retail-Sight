import React, { useState } from "react";
import { useSelector } from "react-redux";
import { CompanyAccountType } from "../utils/types";
import { selectUserAccounts } from "../Slices/userAccountsSlice";
import { TextField, Box, Typography } from "@mui/material";
import UserAccountsTable from "./UserAccountsTable";

const MyAccounts: React.FC = () => {
  const accounts = useSelector(selectUserAccounts);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = accounts.filter((acc: CompanyAccountType) => {
    const search = searchTerm.toLowerCase();
    return (
      acc.accountName?.toLowerCase().includes(search) ||
      acc.accountNumber?.toLowerCase().includes(search) ||
      acc.city?.toLowerCase().includes(search) ||
      acc.state?.toLowerCase().includes(search)
    );
  });

  return (
    <Box p={3}>
     {accounts.length > 0 ? <Typography variant="h5" gutterBottom>
        My Accounts
      </Typography> : (
        <Typography variant="h6" gutterBottom>
          No accounts have been imported for your user yet.
        </Typography>
      )}

      <TextField
        label="Search"
        variant="outlined"
        fullWidth
        sx={{ my: 2 }}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <UserAccountsTable accounts={filtered} />
    </Box>
  );
};

export default MyAccounts;
