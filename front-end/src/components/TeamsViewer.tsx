import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectCompanyUsers, selectUser } from "../Slices/userSlice";
import Select, { ActionMeta, MultiValue } from "react-select";
import "./teamsViewer.css";
import { addTeam, fetchTeams } from "../thunks/teamsThunks";
import { CompanyTeamType, TeamWithID } from "../utils/types";
import { RootState, useAppDispatch } from "../utils/store";

// Define the type for options
type OptionType = {
  value: string;
  label: string;
};

const TeamsViewer = () => {
  const dispatch = useAppDispatch();
  const teams = useSelector((state: RootState) => state.CompanyTeam.teams);
  const teamStatus = useSelector(
    (state: RootState) => state.CompanyTeam.status
  );
  const teamError = useSelector((state: RootState) => state.CompanyTeam.error);
  const [showTeams, setShowTeams] = useState(false);
  const [showTeamsCreation, setShowTeamsCreation] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [teamMembers, setTeamMembers] = useState<string[]>([]);

  const fellowEmployees = useSelector(selectCompanyUsers);
  const user = useSelector(selectUser);

  useEffect(() => {
    if (teamStatus === "idle") {
      dispatch(fetchTeams());
    }
  }, [teamStatus, dispatch]);

  function toggleShowTeams() {
    setShowTeams((prevState) => !prevState);
  }

  function toggleShowTeamsCreation() {
    setShowTeamsCreation((prevState) => !prevState);
  }

  function handleCreateTeam() {
    if (teamName && supervisorId && teamMembers.length > 0) {
      const teamData: CompanyTeamType = {
        teamName: teamName,
        teamSupervisor: [{
          uid: supervisorId,
          name: fellowEmployees.find(emp => emp.uid === supervisorId)?.firstName || "Unknown" // Fallback if name is undefined
        }],
        teamMembers: teamMembers.map(uid => {
          const member = fellowEmployees.find(emp => emp.uid === uid);
          return {
            uid,
            name: member ? member.firstName || "Unknown" : "Unknown" // Provide a default for undefined names
          };
        })
      };
  
      dispatch(addTeam(teamData)); // Dispatch the thunk to create the team
  
      // Reset form after submission
      setTeamName("");
      setSupervisorId("");
      setTeamMembers([]);
    } else {
      alert("Please fill in all fields.");
    }
  }
  

  const options: OptionType[] = fellowEmployees.map((employee) => ({
    value: employee.uid,
    label: `${employee.firstName} ${employee.lastName} ${employee.email}`,
  }));

  const customHandleMemberSelection = (
    selectedOptions: MultiValue<OptionType>,
    actionMeta: ActionMeta<OptionType>
  ) => {
    const selectedMembers = selectedOptions.map((option) => option.value);
    setTeamMembers(selectedMembers);
  };

  return (
    <>
      <button className="button-blue" onClick={toggleShowTeams}>
        <h4>Teams</h4>
      </button>
      {showTeams && (
        <div className="team-container">
          <h3>Teams</h3>
          <button className="button-blue" onClick={toggleShowTeamsCreation}>
            Create new team
          </button>
          <div className="teams-viewer">
            <h1>Current Teams</h1>
            {teamStatus === "loading" && <p>Loading...</p>}
            {teamStatus === "succeeded" && (
              <ul>
                {teams.map((team: TeamWithID) => (
                  <li key={team.id}>
                    <h3>{team.teamName}</h3>
                    {/* Display the first supervisor's name, or list all if there are multiple */}
                    <p>
                      Supervisor:{" "}
                      {team.teamSupervisor.map((sup) => sup.name).join(", ")}
                    </p>
                    {/* Map over teamMembers to extract names and then join them with a comma */}
                    <p>
                      Members:{" "}
                      {team.teamMembers.map((member) => member.name).join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {teamStatus === "failed" && <p>Error: {teamError}</p>}
          </div>
        </div>
      )}
      {showTeamsCreation && (
        <div className="team-creation-container">
          <div>
            <label>Team Name:</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter team name"
            />
          </div>
          <div>
            <label>Supervisor:</label>
            <select
              value={supervisorId}
              onChange={(e) => setSupervisorId(e.target.value)}
            >
              {fellowEmployees.map((employee) => (
                <option key={employee.uid} value={employee.uid}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="team-members-selector">
            <label>Team Members:</label>
            <Select
              options={options}
              isMulti
              onChange={customHandleMemberSelection}
              className="basic-multi-select"
              classNamePrefix="select"
            />
          </div>
          <button onClick={handleCreateTeam}>Submit Team</button>
        </div>
      )}
    </>
  );
};

export default TeamsViewer;
