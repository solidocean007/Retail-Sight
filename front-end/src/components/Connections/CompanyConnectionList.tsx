import React from "react";
import CompanyConnectionCard from "./CompanyConnectionCard";
import "./companyConnectionList.css";
import { CompanyConnectionType } from "../../utils/types";

interface CompanyConnectionListProps {
  connections: CompanyConnectionType[];
  currentCompanyId?: string;
  statusFilter?: string;
  isAdminView?: boolean;
}

const CompanyConnectionList: React.FC<CompanyConnectionListProps> = ({
  connections,
  currentCompanyId,
  statusFilter = "all",
  isAdminView = false,
}) => {
  const filtered = connections.filter(
    (c) => statusFilter === "all" || c.status === statusFilter
  );

  if (filtered.length === 0) {
    return (
      <div className="connections-list-empty">
        <p>No connections found.</p>
      </div>
    );
  }

  return (
    <div className="connections-list">
      Connections
      {filtered.map((c) => (
        <CompanyConnectionCard
          key={c.id}
          connection={c}
          currentCompanyId={currentCompanyId}
          isAdminView={isAdminView}
        />
      ))}
    </div>
  );
};

export default CompanyConnectionList;
