import AccessRequestsPanel from "../DeveloperDashboard/AccessRequestPanel";
import CompanyOnboardingAdmin from "../DeveloperDashboard/CompanyOnboardingAdmin";
import DeveloperUsersManager from "./DeveloperUsersManager";

const DeveloperOperations = () => {
  return (
    <>
      <AccessRequestsPanel />
      <CompanyOnboardingAdmin />
      <DeveloperUsersManager />
    </>
  );
};

export default DeveloperOperations;
