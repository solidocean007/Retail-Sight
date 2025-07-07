import { useSelector } from "react-redux";
import { selectCompanyConnections } from "../slices/companySlice";

export const useCompanyConnections = () => {
  const connections = useSelector(selectCompanyConnections);

  const hasIntegration = (integrationName: string) =>
    connections.some(
      (c) => c.integration === integrationName && c.status === "approved"
    );

  return { connections, hasIntegration };
};
