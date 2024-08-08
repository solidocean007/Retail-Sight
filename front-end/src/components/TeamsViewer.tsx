import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  selectCompanyUsers,
  selectUser,
  setCompanyUsers,
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
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import {
  getCompanyUsersFromIndexedDB,
  saveCompanyUsersToIndexedDB,
} from "../utils/database/userDataIndexedDB";

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
  const [showTeamsCreation, setShowTeamsCreation] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [teamMembers, setTeamMembers] = useState<string[]>([]);

  const fellowEmployees = useSelector(selectCompanyUsers);
  const user = useSelector(selectUser);
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );

  useEffect(() => {
    if (!companyId) {
      // If companyId is not defined, do not proceed with the query
      console.log("companyId is undefined, skipping Firestore query.");
      return;
    }

    const q = query(
      collection(db, "users"),
      where("companyId", "==", companyId)
    );

    // Firestore real-time subscription setup
    const unsubscribe = onSnapshot(
      q,
      async (onSnapshot) => {
        const usersFromFirestore = onSnapshot.docs.map(
          (doc) =>
            ({
              ...doc.data(),
              uid: doc.id,
            } as UserType)
        );

        dispatch(setCompanyUsers(usersFromFirestore)); // Update Redux store
        setLocalUsers(usersFromFirestore); // Update local state

        // Save the updated list to IndexedDB
        console.log("saving users to indexedDB");
        await saveCompanyUsersToIndexedDB(usersFromFirestore);
      },
      (error) => {
        console.error("Error fetching users:", error);
      }
    );

    // Return a cleanup function to unsubscribe from Firestore updates when the component unmounts
    return () => unsubscribe();
  }, [companyId]);

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
      const teamData: CompanyTeamType = {
        teamName: teamName,
        teamSupervisor: [
          {
            uid: supervisorId,
            name:
              fellowEmployees.find((emp) => emp.uid === supervisorId)
                ?.firstName || "Unknown", // Fallback if name is undefined
          },
        ],
        teamMembers: teamMembers.map((uid) => {
          const member = fellowEmployees.find((emp) => emp.uid === uid);
          return {
            uid,
            name: member ? member.firstName || "Unknown" : "Unknown", // Provide a default for undefined names
          };
        }),
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
    <Container sx={{ padding: "10px" }}>
      <Box
        sx={{ display: "flex", width: "100%", justifyContent: "space-between" }}
      >
        <Typography variant="h2" sx={{ fontSize: "2rem" }}>
          Teams
        </Typography>
        <Button variant="contained" onClick={toggleShowTeamsCreation}>
         {!showTeamsCreation?  "Create new team" : "Close"}
        </Button>
      </Box>
      {showTeamsCreation && (
        <Box
          sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" } }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", width: "100%", justifyContent: "start" }}>
            <Box
              sx={{ display: "flex", maxWidth: "300px", justifyContent: "space-between", margin: "1rem" }}
            >
              <label>Team Name:</label>
              
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
                style={{marginLeft: "1rem", width: "10rem"}}
              />
            </Box>
            <Box sx={{ display: "flex", maxWidth: "300px", justifyContent: "space-between", margin: "1rem" }}>
              <label>Supervisor:</label>
              <select
                value={supervisorId}
                onChange={(e) => setSupervisorId(e.target.value)}
                style={{marginLeft: "1rem", width: "10rem"}}
              >
                {fellowEmployees.map((employee) => (
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
        <Box sx={{ paddingTop: "10px" }}>
          <div className="teams-viewer">
            {teamStatus === "loading" && <CircularProgress />}
            {teamStatus === "succeeded" && (
              <>
                {teams.map((team: TeamWithID) => (
                  <Accordion
                    className="team"
                    key={team.id}
                    sx={{ width: { xs: "14rem" }, marginRight: "10px" }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls="panel1-content"
                      id="panel1-header"
                    >
                      <Typography>{team.teamName}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography>
                        Supervisor:{" "}
                        {team.teamSupervisor.map((sup) => sup.name).join(", ")}
                      </Typography>
                      <Box>
                        <Typography>Members: </Typography>
                        <List>
                          {team.teamMembers.map((member, index) => (
                            <ListItem key={index}>{member.name}</ListItem> // Assuming each member has a unique 'id'
                          ))}
                        </List>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </>
            )}

            {teamStatus === "failed" && <p>Error: {teamError}</p>}
          </div>
        </Box>
      )}
    </Container>
  );
};

export default TeamsViewer;
