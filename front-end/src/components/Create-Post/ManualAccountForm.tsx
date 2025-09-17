import { useState } from "react";
import { CompanyAccountType } from "../../utils/types";
import "./storeSelector.css";

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
  const [form, setForm] = useState<ManualFormState>({
    accountName: "",
    streetAddress: "",
    city: "",
    state: "",
    chainName: "",
  });

  if (!open) return null;

  const handleSave = () => {
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
          <input
            title="Store Name"
            placeholder="Store Name"
            value={form.accountName}
            onChange={(e) => setForm({ ...form, accountName: e.target.value })}
          />
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
