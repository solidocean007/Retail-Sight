import { useEffect, useMemo, useState } from "react";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import {
  Button,
  CircularProgress,
  InputAdornment,
  MenuItem,
  TextField,
} from "@mui/material";
import { useSelector } from "react-redux";

import {
  loadUserAccounts,
  selectUserAccounts,
  selectUserAccountsError,
  selectUserAccountsLoading,
} from "../Slices/userAccountsSlice";
import { selectUser } from "../Slices/userSlice";
import { useAppDispatch } from "../utils/store";
import { CompanyAccountType } from "../utils/types";
import UserAccountsTable from "./UserAccountsTable";

import "./myAccounts.css";

const ALL_ACCOUNT_TYPES = "all";

const MyAccounts = () => {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const accounts = useSelector(selectUserAccounts);
  const loading = useSelector(selectUserAccountsLoading);
  const error = useSelector(selectUserAccountsError);
  const [searchTerm, setSearchTerm] = useState("");
  const [accountType, setAccountType] = useState(ALL_ACCOUNT_TYPES);

  const refreshAccounts = () => {
    if (!user?.companyId || !user.salesRouteNum) return;
    dispatch(
      loadUserAccounts({
        companyId: user.companyId,
        salesRouteNum: user.salesRouteNum,
        forceRefresh: true,
      }),
    );
  };

  useEffect(() => {
    refreshAccounts();
    // Revalidate once whenever the signed-in user's account scope changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.companyId, user?.salesRouteNum]);

  const accountTypes = useMemo(
    () =>
      Array.from(
        new Set(
          accounts
            .map((account) => account.typeOfAccount?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [accounts],
  );

  const filteredAccounts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return accounts.filter((account: CompanyAccountType) => {
      const matchesType =
        accountType === ALL_ACCOUNT_TYPES ||
        account.typeOfAccount === accountType;
      if (!matchesType) return false;
      if (!search) return true;

      return [
        account.accountName,
        account.accountNumber,
        account.streetAddress,
        account.accountAddress,
        account.city,
        account.state,
        account.chain,
        account.typeOfAccount,
      ].some((value) => value?.toLowerCase().includes(search));
    });
  }, [accountType, accounts, searchTerm]);

  return (
    <main className="my-accounts-page">
      <header className="my-accounts-page__header">
        <div className="my-accounts-page__title-group">
          <span className="my-accounts-page__mark" aria-hidden="true">
            <StorefrontOutlinedIcon />
          </span>
          <div>
            <span className="my-accounts-page__eyebrow">Workspace</span>
            <h1>My accounts</h1>
            <p>Stores and locations assigned to your route.</p>
          </div>
        </div>

        <Button
          className="my-accounts-refresh"
          variant="outlined"
          size="small"
          startIcon={
            loading === "pending" ? (
              <CircularProgress size={15} />
            ) : (
              <RefreshOutlinedIcon />
            )
          }
          disabled={loading === "pending" || !user?.salesRouteNum}
          onClick={refreshAccounts}
        >
          Refresh
        </Button>
      </header>

      <section
        className="my-accounts-panel"
        aria-labelledby="my-accounts-list-title"
      >
        <div className="my-accounts-panel__heading">
          <div>
            <span className="my-accounts-panel__icon" aria-hidden="true">
              <ApartmentOutlinedIcon />
            </span>
            <div>
              <h2 id="my-accounts-list-title">Account directory</h2>
              <p>
                {filteredAccounts.length === accounts.length
                  ? `${accounts.length.toLocaleString()} accounts available`
                  : `${filteredAccounts.length.toLocaleString()} of ${accounts.length.toLocaleString()} accounts`}
              </p>
            </div>
          </div>
        </div>

        <div className="my-accounts-toolbar">
          <TextField
            className="my-accounts-search"
            label="Search accounts"
            placeholder="Name, number, city, chain…"
            size="small"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlinedIcon aria-hidden="true" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            className="my-accounts-type-filter"
            select
            label="Account type"
            size="small"
            value={accountType}
            onChange={(event) => setAccountType(event.target.value)}
          >
            <MenuItem value={ALL_ACCOUNT_TYPES}>All account types</MenuItem>
            {accountTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>
        </div>

        {error && (
          <div
            className="my-accounts-state my-accounts-state--error"
            role="alert"
          >
            <strong>Accounts could not be refreshed</strong>
            <span>{error}</span>
          </div>
        )}

        {loading === "pending" && accounts.length === 0 ? (
          <div className="my-accounts-state" role="status">
            <CircularProgress size={30} />
            <strong>Loading your accounts</strong>
            <span>Checking the latest route assignments.</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="my-accounts-state">
            <StorefrontOutlinedIcon aria-hidden="true" />
            <strong>No accounts assigned yet</strong>
            <span>
              Accounts will appear here when they are assigned to your route.
            </span>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="my-accounts-state">
            <SearchOutlinedIcon aria-hidden="true" />
            <strong>No matching accounts</strong>
            <span>Try a broader search or choose another account type.</span>
          </div>
        ) : (
          <UserAccountsTable accounts={filteredAccounts} />
        )}
      </section>
    </main>
  );
};

export default MyAccounts;
