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
import { onConnectionRemoved } from "./onConnectionRemoved";
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
import { supervisorDisplayAlert } from "./notifications/supervisorDisplayAlert";
import { sendTestPush } from "./notifications/sendTestPush";
import { onActivityEventCreated } from "./notifications/onActivityEventCreated";
import {
  galloFetchPrograms,
  galloFetchAccounts,
  galloFetchGoals,
  galloSyncProgramsByChangeStamp,
  syncGalloProgramsForCompany,
  runGalloScheduledImportNow,
  getGalloScheduledImportStatus,
} from "./galloKeys/gallo";
import { galloSendAchievement } from "./galloKeys/galloSendAchievment";
import { analyzePostImages } from "./analyzePostImages";

// 🧾 Billing – Callables
import { testBraintreeAuth } from "./billing/billingHandlers/testBraintreeAuth";
import {
  getClientToken,
  createSubscription,
  updateSubscriptionWithProration,
  addAddon,
  removeAddon,
  cancelSubscription,
} from "./billing/billingHandlers/callables";

// 🧾 Billing – Webhook
import { handleBraintreeWebhook } from "./billing/billingHandlers/webhooks";

// 🧾 Billing – Usage Counters
import {
  onUserStatusChange,
  onConnectionStatusChange,
} from "./billing/usageCounters";

// Notification system
import { onUserNotificationCreated } from "./notifications/onUserNotificationCreated";
import { sendNotificationToUser } from "./notifications/sendNotificationToUser";

export {
  getExternalApiKeyStatus,
  upsertGalloAxisKey,
  deleteGalloAxisKey,
  galloSendAchievement,
  galloFetchPrograms,
  galloFetchAccounts,
  galloFetchGoals,
  galloSyncProgramsByChangeStamp,
  syncGalloProgramsForCompany,
  getGalloScheduledImportStatus,
  runGalloScheduledImportNow,
  // General functions
  createInviteAndEmail,
  deleteAuthUser,
  checkUserExists,
  getExternalApiKey,
  syncUserRoleClaim,
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

  // Billing
  testBraintreeAuth,
  getClientToken,
  createSubscription,
  updateSubscriptionWithProration,
  addAddon,
  removeAddon,
  cancelSubscription,
  handleBraintreeWebhook,
  onUserStatusChange,
  onConnectionStatusChange,

  // Connection function
  createInviteAndDraftConnection,
  onConnectionBrandsUpdated,
  lookupConnectionTarget,
  acceptInviteAutoResolve,
  onPendingNewUserAndCompanyInviteCreate,
  onActivityEventCreated,
  onConnectionRemoved,

  // Notifications
  onUserNotificationCreated,
  sendNotificationToUser,
  supervisorDisplayAlert,
  sendTestPush,
  analyzePostImages,
};
