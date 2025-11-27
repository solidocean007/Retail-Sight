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
import { detectBrands } from "./ml/detectBrands";
import { enforceSuperAdminLimit } from "./enforceSuperAdminLimit";
import { createCompanyOrRequest } from "./createCompanyOrRequest";
import { markAccessRequestComplete } from "./markAccessRequestComplete";
import { rejectAccessRequest } from "./rejectAccessRequest";
import { approveAccessRequest } from "./approveAccessRequest";
import { getPlanDetails } from "./planHandlers";
import { enforcePlanLimits } from "./enforcePlanLimits";
import { generatePostShareToken } from "./generatePostShareToken";
import { validatePostShareToken } from "./validatePostShareToken";
import { createInviteAndDraftConnection } from "./createInviteAndDraftConnection";
import { lookupConnectionTarget } from "./lookupConnectionTarget";
import { acceptInviteAutoResolve } from "./acceptInviteAutoResolve";
import { onPendingNewUserAndCompanyInviteCreate } from "./onPendingNewUserAndCompanyInviteCreate";

// 🧾 Braintree Billing System
import {
  updateSubscriptionWithProration,
  createBraintreeCustomer,
  createSubscription,
  cancelSubscription,
  handleBraintreeWebhook,
  getClientToken,
  addAddon,
  removeAddon,
  calculateSubscriptionTotal,
  syncAddonUsage,
  updatePaymentMethod,
  listPlansAndAddons,
  initCompanyBilling,
  backfillBillingForCompanies,
} from "./braintreeHandlers";

// Notification system
import { onUserNotificationCreated } from "./notifications/onUserNotificationCreated";
import { sendNotificationToUser } from "./notifications/sendNotificationToUser";

import { syncPlanLimits } from "./braintreeHelpers";

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
  onPostCreated,
  detectBrands,
  enforceSuperAdminLimit,
  createCompanyOrRequest,
  approveAccessRequest,
  markAccessRequestComplete,
  rejectAccessRequest,
  getPlanDetails,
  enforcePlanLimits,
  generatePostShareToken,
  validatePostShareToken,

  // Billing functions
  updateSubscriptionWithProration,
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
  updatePaymentMethod,
  listPlansAndAddons,
  initCompanyBilling,
  backfillBillingForCompanies,

  // Connection function
  createInviteAndDraftConnection,
  onConnectionBrandsUpdated,
  lookupConnectionTarget,
  acceptInviteAutoResolve,
  onPendingNewUserAndCompanyInviteCreate,

  // Notifications
  onUserNotificationCreated,
  sendNotificationToUser,
};
