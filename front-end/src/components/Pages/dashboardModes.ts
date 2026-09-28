import type { DashboardModeType, UserType } from "../../utils/types";

export type DashboardAccessContext = {
  isSupplier: boolean;
  role?: UserType["role"];
};

type AccessRule = (context: DashboardAccessContext) => boolean;

const isAdminRole = (role?: UserType["role"]) =>
  role === "admin" || role === "super-admin" || role === "developer";

const isSupervisorOrAbove = (role?: UserType["role"]) =>
  role === "supervisor" || isAdminRole(role);

const DASHBOARD_MODE_ACCESS: Partial<Record<DashboardModeType, AccessRule>> = {
  ConnectionsMode: ({ isSupplier, role }) => isSupplier || isAdminRole(role),
  TeamMode: ({ isSupplier, role }) => !isSupplier && isAdminRole(role),
  NotificationsMode: () => true,
  UsersMode2: ({ role }) => isAdminRole(role),
  AccountsMode: ({ isSupplier, role }) => !isSupplier && isAdminRole(role),
  ProductsMode: ({ isSupplier, role }) => !isSupplier && isAdminRole(role),
  MyAccountsMode: ({ isSupplier }) => !isSupplier,
  MyGoalsMode: ({ isSupplier }) => !isSupplier,
  ProfileMode: () => true,
  IntegrationsMode: ({ role }) => isAdminRole(role),
  GoalManagerMode: ({ isSupplier, role }) => isSupplier || isAdminRole(role),
  SupervisorFeedbackMode: ({ isSupplier, role }) =>
    !isSupplier && isSupervisorOrAbove(role),
  CollectionsMode: () => true,
  TutorialMode: () => true,
  AnnouncementsMode: ({ role }) => isAdminRole(role),
  DeveloperViewAsMode: ({ role }) => role === "developer",
};

export const SUPPORTED_DASHBOARD_MODES = Object.keys(
  DASHBOARD_MODE_ACCESS,
) as DashboardModeType[];

export const isSupportedDashboardMode = (
  value: unknown,
): value is DashboardModeType =>
  typeof value === "string" &&
  Object.prototype.hasOwnProperty.call(DASHBOARD_MODE_ACCESS, value);

export const canAccessDashboardMode = (
  mode: DashboardModeType,
  context: DashboardAccessContext,
) => DASHBOARD_MODE_ACCESS[mode]?.(context) ?? false;

export const getDefaultDashboardMode = ({
  isSupplier,
  role,
}: DashboardAccessContext): DashboardModeType => {
  if (isSupplier) return "ConnectionsMode";
  if (isAdminRole(role)) return "GoalManagerMode";
  return "MyGoalsMode";
};

export const resolveDashboardMode = (
  requestedMode: unknown,
  context: DashboardAccessContext,
): DashboardModeType => {
  if (
    isSupportedDashboardMode(requestedMode) &&
    canAccessDashboardMode(requestedMode, context)
  ) {
    return requestedMode;
  }

  return getDefaultDashboardMode(context);
};

export const getAllowedDashboardModes = (context: DashboardAccessContext) =>
  new Set(
    SUPPORTED_DASHBOARD_MODES.filter((mode) =>
      canAccessDashboardMode(mode, context),
    ),
  );
