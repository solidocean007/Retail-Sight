import AccessRequestsPanel from "../DeveloperDashboard/AccessRequestPanel";
import CompanyOnboardingAdmin from "../DeveloperDashboard/CompanyOnboardingAdmin";
import DeveloperUsersManager from "./DeveloperUsersManager";
import OrphanedUsersPanel from "../DeveloperDashboard/OrphanedUsersPanel";

const DeveloperOperations = () => {
  return (
    <>
      <AccessRequestsPanel />
      <CompanyOnboardingAdmin />
      <OrphanedUsersPanel />
      <DeveloperUsersManager />
    </>
  );
};

export default DeveloperOperations;
