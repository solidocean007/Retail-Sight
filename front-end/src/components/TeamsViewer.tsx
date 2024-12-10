import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  selectCompanyUsers,
  selectUser,
} from "../Slices/userSlice";
import Select, { ActionMeta, MultiValue } from "react-select";
import "./teamsViewer.css";
import { addTeam, fetchTeams } from "../thunks/teamsThunks";
import { CompanyTeamType, TeamWithID, UserType } from "../utils/types";
import { RootState, useAppDispatch } from "../utils/store";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  CircularProgress,
  Container,
  List,
  ListItem,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  getCompanyUsersFromIndexedDB,
} from "../utils/database/userDataIndexedDB";

// Define the type for options
type OptionType = {
  value: string;
  label: string;
};

const TeamsViewer = ({
  localUsers,
  setLocalUsers,
}: {
  localUsers: UserType[];
  setLocalUsers: React.Dispatch<React.SetStateAction<UserType[]>>;
}) => {
  const dispatch = useAppDispatch();
  const teams = useSelector((state: RootState) => state.CompanyTeam.teams);
  const teamStatus = useSelector(
    (state: RootState) => state.CompanyTeam.status
  );
  const teamError = useSelector((state: RootState) => state.CompanyTeam.error);
  const [showTeamsCreation, setShowTeamsCreation] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const fellowEmployees = useSelector(selectCompanyUsers);
  const user = useSelector(selectUser);
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );

  // Separate useEffect to attempt to load from IndexedDB when component mounts
  useEffect(() => {
    const loadFromIndexedDB = async () => {
      // Attempt to get users from IndexedDB
      const indexedDBUsers = await getCompanyUsersFromIndexedDB();
      if (indexedDBUsers && indexedDBUsers.length > 0) {
        setLocalUsers(indexedDBUsers);
      }
    };

    loadFromIndexedDB();
  }, []);

  useEffect(() => {
    if (teamStatus === "idle") {
      dispatch(fetchTeams());
    }
  }, [teamStatus, dispatch]);

  function toggleShowTeamsCreation() {
    setShowTeamsCreation((prevState) => !prevState);
  }

  function handleCreateTeam() {
    if (teamName && supervisorId && teamMembers.length > 0) {
      const supervisorUser = fellowEmployees?.find(
        (emp) => emp.uid === supervisorId
      );
      const teamData: CompanyTeamType = {
        teamName: teamName,
        teamSupervisor: [
          {
            uid: supervisorId,
            name: `${supervisorUser?.firstName} ${supervisorUser?.lastName}`,
          },
        ],
        teamMembers: teamMembers.map((uid) => {
          const member = fellowEmployees?.find((emp) => emp.uid === uid);
          return {
            uid,
            name: `${member?.firstName} ${member?.lastName}`,
          };
        }),
      };

      dispatch(addTeam(teamData));

      setTeamName("");
      setSupervisorId("");
      setTeamMembers([]);
    } else {
      alert("Please fill in all fields.");
    }
  }

  const options: OptionType[] =
    fellowEmployees?.map((employee) => ({
      value: employee.uid,
      label: `${employee.firstName} ${employee.lastName} ${employee.email}`,
    })) || [];

  const customHandleMemberSelection = (
    selectedOptions: MultiValue<OptionType>,
    actionMeta: ActionMeta<OptionType>
  ) => {
    const selectedMembers = selectedOptions.map((option) => option.value);
    setTeamMembers(selectedMembers);
  };

  return (
    <Container sx={{ padding: "10px" }}>
      <Box
        sx={{ display: "flex", width: "100%", justifyContent: "space-between" }}
      >
        <Typography variant="h2" sx={{ fontSize: "2rem" }}>
          Teams
        </Typography>
        <Button variant="contained" onClick={toggleShowTeamsCreation}>
          {!showTeamsCreation ? "Create new team" : "Close"}
        </Button>
      </Box>
      {showTeamsCreation && (
        <Box
          sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" } }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              justifyContent: "start",
            }}
          >
            <Box
              sx={{
                display: "flex",
                maxWidth: "300px",
                justifyContent: "space-between",
                margin: "1rem",
              }}
            >
              <label>Team Name:</label>

              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
                style={{ marginLeft: "1rem", width: "10rem" }}
              />
            </Box>
            <Box
              sx={{
                display: "flex",
                maxWidth: "300px",
                justifyContent: "space-between",
                margin: "1rem",
              }}
            >
              <label>Supervisor:</label>
              <select
                value={supervisorId}
                onChange={(e) => setSupervisorId(e.target.value)}
                style={{ marginLeft: "1rem", width: "10rem" }}
              >
                {fellowEmployees?.map((employee) => (
                  <option key={employee.uid} value={employee.uid}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </Box>
          </Box>

          <Box sx={{ maxWidth: "900px" }}>
            <label>Team Members:</label>
            <Select
              options={options}
              isMulti
              onChange={customHandleMemberSelection}
              className="basic-multi-select"
              classNamePrefix="select"
            />
          </Box>
          <button onClick={handleCreateTeam}>Submit Team</button>
        </Box>
      )}

      {!showTeamsCreation && (
        <Box
          sx={{
            paddingTop: "10px",
            display: "flex",
            flexDirection: { sm: "column", md: "row" },
            width: "100%",
            flexWrap: "wrap",
            height: "100%",
          }}
        >
          {teamStatus === "loading" && <CircularProgress />}
          {teamStatus === "succeeded" && (
            <>
              {teams.map((team: TeamWithID) => (
                <Accordion
                  className="team"
                  key={team.id}
                  sx={{
                    width: "20rem",
                    marginRight: "10px",
                    marginBottom: "1rem",
                    padding: "0px",
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="panel1-content"
                    id="panel1-header"
                    sx={{ marginBottom: "0rem" }}
                  >
                    <Typography variant="h5" sx={{ marginBottom: "0rem" }}>
                      {team.teamName}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      margin: "0",
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        display: "flex",
                        justifyContent: "start",
                        alignItems: "center",
                      }}
                    >
                      Supervisor:{"  "}
                      {team.teamSupervisor.map((sup) => sup.name)}
                    </Typography>
                    <Box>
                      <Typography
                        sx={{ display: "flex", justifyContent: "start" }}
                      >
                        Members: 
                      </Typography>
                      <List>
                        {team.teamMembers.map((member, index) => (
                          <ListItem sx={{ margin: "0" }} key={index}>
                            {member.name}
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </>
          )}

          {teamStatus === "failed" && <p>Error: {teamError}</p>}
        </Box>
      )}
    </Container>
  );
};

export default TeamsViewer;
