import { useState } from "react";
import { CompanyAccountType } from "../../utils/types";
import "./storeSelector.css
"

const ManualAccountForm: React.FC<{
  open: boolean;
  onSave: (account: CompanyAccountType) => void;
}> = ({ open, onSave }) => {
  const [form, setForm] = useState({
    accountName: "",
    streetAddress: "",
    city: "",
    state: "",
  });
  if(!open) return null;
  return (
    <div className="store-input-box">
      <div className="store-address-input-box">
        <div className="input-field">
          <label>Store Name</label>
          <input
            value={form.accountName}
            onChange={(e) => setForm({ ...form, accountName: e.target.value })}
          />
        </div>
        <div className="input-field">
          <label>Street Address</label>
          <input
            value={form.streetAddress}
            onChange={(e) =>
              setForm({ ...form, streetAddress: e.target.value })
            }
          />
        </div>
        <div className="input-field">
          <label>City</label>
          <input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
        <div className="input-field">
          <label>State</label>
          <input
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
          />
        </div>
      </div>
      <button
        className="button-primary"
        onClick={() =>
          onSave({
            accountName: form.accountName,
            streetAddress: form.streetAddress,
            city: form.city,
            state: form.state,
            accountAddress: `${form.streetAddress}, ${form.city}, ${form.state}`,
            accountNumber: `manual-${Date.now()}`,
            salesRouteNums: [],
            typeOfAccount: "manual",
            chain: "",
            chainType: "",
          } as CompanyAccountType)
        }
      >
        Save Store
      </button>
    </div>
  );
};

export default ManualAccountForm;
