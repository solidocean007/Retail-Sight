export type UnifiedDiffType = {
  type: "new" | "update";
  accountNumber: string;
  updated: CompanyAccountType;
  old?: CompanyAccountType;
  fieldsChanged: (keyof CompanyAccountType)[]; // ✅ strict typing
  routeNumChange?: {
    old: string[];
    new: string[];
    added: string[];
    removed: string[];
  };
};

export type CompanyAccountType = {
  accountNumber: string;
  accountName: string;
  accountAddress: string;
  streetAddress: string;
  salesRouteNums: string[];
  city?: string;
  state?: string;
  postalCode?: string;
  typeOfAccount?: string;
  chain?: string; // e.g., "Food Lion" or "Walmart" or "Target"
  chainType?: "chain" | "independent"; // e.g., "Chain" or "Independent"
  createdAt?: string;
  updatedAt?: string;
};
