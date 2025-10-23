import { ping } from "./ping";
import { createInviteAndEmail } from "./createInviteAndEmail";
import { deleteAuthUser } from "./deleteAuthUser";
import { checkUserExists } from "./checkUserExists";
import { getExternalApiKey } from "./galloKeys/getExternalApiKey";
import { getExternalApiKeyStatus } from "./galloKeys/getExternalApiKeyStatus";
import { syncUserRoleClaim } from "./syncUserRoleClaim";
import { upsertGalloAxisKey } from "./galloKeys/upsertGalloAxisKey";
import { deleteGalloAxisKey } from "./galloKeys/deleteGalloAxisKey";
import { resolveCompanyEmail } from "./resolveCompanyEmail";
import { onConnectionApproved } from "./onConnectionsApproved";
import { sharePostWithCompany } from "./sharePostWithCompany";
import { onSharePost } from "./onSharePost";
import { onConnectionBrandsUpdated } from "./onConnectionBrandsUpdated";
import { onPostCreated } from "./onPostCreated";

// 🧾 Braintree Billing System
import {
  createBraintreeCustomer,
  createSubscription,
  cancelSubscription,
  handleBraintreeWebhook,
  getClientToken,
  addAddon,
  removeAddon,
  calculateSubscriptionTotal,
  syncPlanLimits,
  syncAddonUsage,
} from "./braintreeHandlers";

export {
  // General functions
  ping,
  createInviteAndEmail,
  deleteAuthUser,
  checkUserExists,
  getExternalApiKey,
  getExternalApiKeyStatus,
  syncUserRoleClaim,
  upsertGalloAxisKey,
  deleteGalloAxisKey,
  resolveCompanyEmail,
  onConnectionApproved,
  sharePostWithCompany,
  onSharePost,
  onConnectionBrandsUpdated,
  onPostCreated,

  // Billing functions
  createBraintreeCustomer,
  createSubscription,
  cancelSubscription,
  handleBraintreeWebhook,
  getClientToken,
  addAddon,
  removeAddon,
  calculateSubscriptionTotal,
  syncPlanLimits,
  syncAddonUsage,
};
