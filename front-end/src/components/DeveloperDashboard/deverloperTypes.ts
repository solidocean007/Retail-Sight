// src/components/DeveloperDashboard

import { BusinessType } from "../../utils/types";

// utils/types.ts
export interface CompanyCounts {
  usersTotal: number;
  usersPending: number;
  connectionsApproved: number;
  connectionsPending: number;
  brands: number;
  products: number;
  accounts: number;
  goalsActive: number;
}

// utils/types.ts
export interface CompanyDoc {
  companyName?: string;
  normalizedName?: string;
  companyType?: BusinessType;
  createdAt?: any;      // Firestore Timestamp | string
  lastUpdated?: any;    // Firestore Timestamp | string
  verified?: boolean;
  companyVerified?: boolean;
  tier?: "free" | "pro" | "enterprise";
  limits?: { maxUsers: number; maxConnections: number };
  primaryContact?: { name?: string; email?: string; phone?: string };
  counts?: Partial<CompanyCounts> | null;
  onboarding?: {
    hasMinUsers?: boolean;
    hasAccounts?: boolean;
    hasProductsOrBrands?: boolean;
    hasGoalsOrQuotas?: boolean;
  };
  onboardingScore?: number;
  accessStatus?: "off" | "limited" | "on";
  connections?: {
    approvedWith?: string[];
    pendingWith?: string[];
  };
}

export interface CompanyNormalized {
  id: string;
  companyName: string;
  normalizedName?: string;
  companyType?: BusinessType;
  createdAt?: string;
  lastUpdated?: string;
  verified: boolean;
  companyVerified: boolean;
  tier: "free" | "pro" | "enterprise";
  limits: { maxUsers: number; maxConnections: number };
  primaryContact: { name?: string; email?: string; phone?: string };
  counts: {
    usersTotal: number;
    usersPending: number;
    connectionsApproved: number;
    connectionsPending: number;
    brands: number;
    products: number;
    accounts: number;
    goalsActive: number;
  };
  onboarding: {
    hasMinUsers?: boolean;
    hasAccounts?: boolean;
    hasProductsOrBrands?: boolean;
    hasGoalsOrQuotas?: boolean;
  };
  onboardingScore: number;
  accessStatus: "off" | "limited" | "on";
  connections: {
    approvedWith: string[];
    pendingWith: string[];
  };
}




export interface CompanyOnboarding {
  hasMinUsers?: boolean;
  hasAccounts?: boolean;
  hasProductsOrBrands?: boolean;
}

// Access requests
export interface AccessRequestDraft {
  workEmail: string;
  firstName: string;
  lastName: string;
  phone?: string;
  notes?: string;
  userTypeHint: BusinessType;
  companyName: string;
}

export interface AccessRequestDoc extends AccessRequestDraft {
  id: string;                   // Firestore doc id
  createdAt: any;               // Firestore Timestamp
}

