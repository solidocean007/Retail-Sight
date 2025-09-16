import React from "react";
import { useSelector } from "react-redux";
import { selectCompanyUsers } from "../Slices/userSlice";
import { UserType } from "../utils/types";
import { Card, CardContent, Typography, Select, MenuItem } from "@mui/material";
import "./teamsViewer.css";
import { useAppDispatch } from "../utils/store";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { setCompanyUsers } from "../Slices/userSlice";

const TeamsViewer = () => {
  const dispatch = useAppDispatch();
  const users = useSelector(selectCompanyUsers) || [];
  const supervisors = users.filter((u) => u.role === "supervisor");
  const supervisorUids = new Set(supervisors.map((s) => s.uid));

  const employees = users.filter((u) => u.role === "employee");

  const grouped: Record<string, UserType[]> = {};

  employees.forEach((user) => {
    if (!user.reportsTo) return;
    if (!grouped[user.reportsTo]) grouped[user.reportsTo] = [];
    grouped[user.reportsTo].push(user);
  });

  const handleSupervisorChange = async (
    user: UserType,
    newSupervisorId: string
  ) => {
    try {
      await updateDoc(doc(db, "users", user.uid), {
        reportsTo: newSupervisorId,
      });
      const updatedUsers = users.map((u) =>
        u.uid === user.uid ? { ...u, reportsTo: newSupervisorId } : u
      );
      dispatch(setCompanyUsers(updatedUsers));
    } catch (err) {
      console.error("Failed to update supervisor:", err);
    }
  };

  const unassignedUsers = users.filter(
    (user) =>
      user.role === "employee" &&
      (!user.reportsTo || !supervisorUids.has(user.reportsTo))
  );

  return (
    <div className="team-container">
      {supervisors.length > 0 ? <h2 style={{ textAlign: "center" }}>Company Teams</h2> : (
        <Typography variant="h6" gutterBottom style={{ textAlign: "center" }}>
          No supervisors found for this company yet.
        </Typography>
      )}
      <div className="teams-viewer">
        {supervisors.map((supervisor) => (
          <Card key={supervisor.uid} className="team">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Supervisor: {supervisor.firstName} {supervisor.lastName}
              </Typography>
              {grouped[supervisor.uid]?.map((emp) => (
                <div key={emp.uid} className="team-member">
                  <div>
                    {emp.firstName} {emp.lastName} ({emp.email})<br />
                    Route #{emp.salesRouteNum || "—"}
                  </div>
                  <Select
                    size="small"
                    value={emp.reportsTo || ""}
                    onChange={(e) =>
                      handleSupervisorChange(emp, e.target.value)
                    }
                    style={{ marginTop: 4, width: "100%" }}
                  >
                    {supervisors.map((s) => (
                      <MenuItem key={s.uid} value={s.uid}>
                        {s.firstName} {s.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </div>
              )) || <Typography variant="body2">No direct reports</Typography>}
            </CardContent>
          </Card>
        ))}
      </div>
      {unassignedUsers.length > 0 && (
        <div className="team unassigned-team">
          <h3>Unassigned Employees</h3>
          {unassignedUsers.map((user) => (
            <div key={user.uid}>
              {user.firstName} {user.lastName} ({user.email}){" "}
              {user.salesRouteNum && <div>Route #{user.salesRouteNum}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamsViewer;
