// AccountManagement/AccountForm.tsx
import React, { useState } from "react";
import { CompanyAccountType } from "../../utils/types";
import "./styles/accountForm.css";
import { Box, Chip, TextField } from "@mui/material";

interface AccountFormProps {
  isOpen: boolean;
  initialData?: CompanyAccountType;
  onSubmit: (data: CompanyAccountType) => void;
  onCancel?: () => void;
  editMode?: boolean;
}

// const customerTypes: customerType[] = [
const customerTypes = [
  "Supermarket",
  "Supercenter",
  "Convenience",
  "Military On prem",
  "Other on prem",
  "Restaurants",
  "Warehouse Club",
  "Department Store",
  "Drug Store",
  "Bars",
  "Private Club",
  "Concession",
  "Drug",
  "Music/Dance Club",
  "Hotel/Motel",
  "Bowling",
  "Adult Entertainment",
  "Golf/Country club",
  "Retail",
  "Other",
];

const AccountForm: React.FC<AccountFormProps> = ({
  isOpen,
  initialData,
  onSubmit,
  onCancel,
  editMode,
}) => {
  if (!isOpen) return null;
  const [formData, setFormData] = useState<CompanyAccountType>(
    initialData || {
      accountNumber: "",
      accountName: "",
      accountAddress: "",
      streetAddress: "",
      salesRouteNums: [],
      city: "",
      postalCode: "",
      typeOfAccount: undefined,
      chain: "",
      chainType: "independent",
    }
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSalesRouteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const routes = e.target.value.split(",").map((route) => route.trim());
    setFormData((prev) => ({
      ...prev,
      salesRouteNums: routes,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.accountNumber ||
      !formData.accountName
      // !formData.salesRouteNums.length
    ) {
      alert(
        // "Account number, name, and at least one route number are required.",
        "Account number and name are required."
      );
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="account-form-backdrop">
      <form onSubmit={handleSubmit} className="account-form">
        <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>
          {editMode ? "Edit Account" : "Add New Account"}
        </h2>
        <label>
          Account Number:
          <input
            name="accountNumber"
            value={formData.accountNumber}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Account Name:
          <input
            name="accountName"
            value={formData.accountName}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Address:
          <input
            name="streetAddress"
            value={formData.streetAddress}
            onChange={handleChange}
          />
        </label>
        {/* <label>
          Address:
          <input
            name="accountAddress"
            value={formData.accountAddress}
            onChange={handleChange}
          />
        </label> */}

        <label>
          Sales Route Numbers:
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {formData.salesRouteNums.map((route, index) => (
              <Chip
                key={index}
                label={route}
                onDelete={() =>
                  setFormData((prev) => ({
                    ...prev,
                    salesRouteNums: prev.salesRouteNums.filter(
                      (_, i) => i !== index
                    ),
                  }))
                }
              />
            ))}
            <TextField
              size="small"
              placeholder="Add route number"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const target = e.target as HTMLInputElement;
                  if (target.value.trim()) {
                    e.preventDefault();
                    const newRoute = target.value.trim();
                    if (!formData.salesRouteNums.includes(newRoute)) {
                      setFormData((prev) => ({
                        ...prev,
                        salesRouteNums: [...prev.salesRouteNums, newRoute],
                      }));
                    }
                    target.value = "";
                  }
                }
              }}
            />
          </Box>
        </label>
        <label>
          City:
          <input name="city" value={formData.city} onChange={handleChange} />
        </label>
        <label>
          State:
          <input name="state" value={formData.state} onChange={handleChange} />
        </label>
        <label>
          Zip Code:
          <input
            name="postalCode"
            value={formData.postalCode}
            onChange={handleChange}
          />
        </label>
        <label>
          Type of Account
          <select
            name="typeOfAccount"
            value={formData.typeOfAccount || ""}
            onChange={handleChange}
          >
            <option value="">-- Select --</option>
            {customerTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Chain Name:
          <input
            name="chain"
            value={formData.chain || ""}
            onChange={handleChange}
          />
        </label>
        <label>
          Chain Type:
          <select
            name="chainType"
            value={formData.chainType || "independent"}
            onChange={handleChange}
          >
            <option value="chain">Chain</option>
            <option value="independent">Independent</option>
          </select>
        </label>
        <div className="form-actions">
          <button type="submit">{editMode ? "Save Changes" : "Save"}</button>

          {onCancel && (
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AccountForm;
