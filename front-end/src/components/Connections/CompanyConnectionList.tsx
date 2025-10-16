import React from "react";
import { CompanyConnectionType } from "../../utils/types";
import CompanyConnectionCard from "./CompanyConnectionCard";

interface CompanyConnectionListProps {
  connections: CompanyConnectionType[];
  currentCompanyId?: string;
  isAdminView?: boolean;
  onEdit: (connection: CompanyConnectionType) => void;
}

const CompanyConnectionList: React.FC<CompanyConnectionListProps> = ({
  connections,
  currentCompanyId,
  isAdminView = false,
  onEdit,
}) => {
  if (connections.length === 0) {
    return (
      <div className="connections-list-empty">
        <p>No connections found.</p>
      </div>
    );
  }
  // console.log(connections)
  return (
    <div className="connections-list">
      {/* {connections.map((c) => (
        <CompanyConnectionCard
          key={c.id}
          connection={c}
          currentCompanyId={currentCompanyId}
          onEdit={onEdit}
          isAdminView={isAdminView}
        />
      ))} */}
      {connections.map((c) => (
        <CompanyConnectionCard
          key={c.id}
          connection={c}
          currentCompanyId={currentCompanyId}
          // onEdit={onEdit}
          isAdminView={isAdminView}
        />
      ))}
    </div>
  );
};

export default CompanyConnectionList;
