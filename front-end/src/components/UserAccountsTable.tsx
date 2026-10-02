import { CompanyAccountType } from "../utils/types";

import "./userAccountsTable.css";

type Props = {
  accounts: CompanyAccountType[];
};

const getLocation = (account: CompanyAccountType) =>
  [account.city, account.state].filter(Boolean).join(", ") ||
  "Location unavailable";

const UserAccountsTable = ({ accounts }: Props) => (
  <div className="accounts-table-wrapper">
    <table className="accounts-table">
      <thead>
        <tr>
          <th scope="col">Account</th>
          <th scope="col">Location</th>
          <th scope="col">Type</th>
          <th scope="col">Network</th>
        </tr>
      </thead>
      <tbody>
        {accounts.map((account) => (
          <tr key={account.accountNumber}>
            <td data-label="Account">
              <div className="account-identity">
                <strong>{account.accountName || "Unnamed account"}</strong>
                <span>#{account.accountNumber}</span>
                {account.isTestAccount && <em>Test</em>}
              </div>
            </td>
            <td data-label="Location">
              <div className="account-location">
                <strong>{getLocation(account)}</strong>
                <span>
                  {account.streetAddress ||
                    account.accountAddress ||
                    "Address unavailable"}
                </span>
              </div>
            </td>
            <td data-label="Type">
              <span className="account-type-pill">
                {account.typeOfAccount || "Uncategorized"}
              </span>
            </td>
            <td data-label="Network">
              <div className="account-network">
                <strong>{account.chain || "Independent"}</strong>
                <span>
                  {account.chainType === "chain"
                    ? "Chain account"
                    : "Local account"}
                </span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default UserAccountsTable;
