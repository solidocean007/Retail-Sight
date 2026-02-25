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
import { markNotificationReadCallable } from "./notifications/markNotificationReadCallable";
import { developerRecomputeCompanyCounts } from "./billing/developerRecomputeCompanyCounts";
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
  cancelSubscription,
  scheduleBillingDowngrade,
  cancelScheduledDowngrade,
  changePlanAndRestartBillingCycle,
} from "./billing/billingHandlers/callables";

import { acceptCompanyInvite } from "./acceptCompanyInvite";

// 🧾 Billing – Webhook
import { handleBraintreeWebhook } from "./billing/billingHandlers/webhooks";

// 🧾 Billing – Usage Counters

import { getMyAuthClaims } from "./billing/auth/getMyAuthClaims";

// Notification system
import { onUserNotificationCreated } from "./notifications/onUserNotificationCreated";
import { sendSystemNotification } from "./notifications/sendSystemNotification";
import { resendSystemNotification } from "./notifications/resendSystemNotification";
import { deleteSystemNotification } from "./notifications/deleteSystemNotification";
import { createDeveloperNotificationCore } from "./notifications/createDeveloperNotificationCore";
import { createDeveloperNotification } from "./notifications/createDeveloperNotification";
import { processScheduledDeveloperNotifications } from "./notifications/processScheduledDeveloperNotifications";
import { updateSystemNotificationSchedule } from "./notifications/updateSystemNotificationSchedule";
import { getNotificationAnalytics } from "./notifications/getNotificationAnalytics";
import { trackEmailClick } from "./notifications/sendEmailNotificationCore";

export {
  developerRecomputeCompanyCounts,
  acceptCompanyInvite,
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

  // Auth
  getMyAuthClaims,

  // Billing
  testBraintreeAuth,
  getClientToken,
  createSubscription,
  cancelSubscription,
  handleBraintreeWebhook,
  scheduleBillingDowngrade,
  cancelScheduledDowngrade,
  changePlanAndRestartBillingCycle,

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
  supervisorDisplayAlert,
  sendTestPush,
  analyzePostImages,
  sendSystemNotification,
  resendSystemNotification,
  deleteSystemNotification,
  createDeveloperNotificationCore,
  createDeveloperNotification,
  processScheduledDeveloperNotifications,
  updateSystemNotificationSchedule,
  getNotificationAnalytics,
  trackEmailClick,
  markNotificationReadCallable,
};
