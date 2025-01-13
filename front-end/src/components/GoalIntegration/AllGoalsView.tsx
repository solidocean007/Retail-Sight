import React, { useEffect, useState } from "react";
import { CompanyGoalType, FireStoreGalloGoalDocType } from "../../utils/types";
import {
  getAllCompanyGoalsFromIndexedDB,
  getGalloGoalsFromIndexedDB,
  saveAllGalloGoalsToIndexedDB,
} from "../../utils/database/indexedDBUtils";
import {
  Box,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Collapse,
  Button,
  IconButton,
  TableSortLabel,
  Container,
  Tabs,
  Tab,
} from "@mui/material";
import { useAppDispatch } from "../../utils/store";
import { fetchAllCompanyGoals, fetchAllGalloGoals } from "../../Slices/goalsSlice";
import { showMessage } from "../../Slices/snackbarSlice";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { deleteGalloGoalFromFirestore } from "../../utils/helperFunctions/deleteGalloGoalFromFirestore";
import { getCompanyUsersFromIndexedDB } from "../../utils/database/userDataIndexedDB";
import "./allGoalsView.css";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from "@firebase/firestore";
import { db } from "../../utils/firebase";
import CompanyGoalsView from "./CompanyGoalsView";

type SortOrder = "asc" | "desc";

export interface MappedProgramType {
  programId: string;
  programTitle: string;
  programStartDate: string;
  programEndDate: string;
  programDisplayDate?: string;
  goals: Array<{
    goalId: string;
    goal: string;
    metric: string;
    valueMin: string;
  }>;
}

const AllGoalsView = ({ companyId }: { companyId: string | undefined }) => {
  const [value, setValue] = useState(0);
  const [galloGoals, setGalloGoals] = useState<FireStoreGalloGoalDocType[]>([]);
  const [companyGoals, setCompanyGoals] = useState<CompanyGoalType[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string>("accountName");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [employeeMap, setEmployeeMap] = useState<Record<string, string>>({});
  const [programs, setPrograms] = useState<MappedProgramType[]>([]);
  // New state for programs
  const dispatch = useAppDispatch();

  interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
  }

  function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`simple-tabpanel-${index}`}
        aria-labelledby={`simple-tab-${index}`}
        {...other}
      >
        {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
      </div>
    );
  }

  function a11yProps(index: number) {
    return {
      id: `simple-tab-${index}`,
      "aria-controls": `simple-tabpanel-${index}`,
    };
  }

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  useEffect(() => {
    const loadEmployees = async () => {
      const employees = await getCompanyUsersFromIndexedDB();
      const employeeMap: Record<string, string> = {};
      employees.forEach((employee) => {
        if (employee.salesRouteNum) {
          employeeMap[
            employee.salesRouteNum
          ] = `${employee.firstName} ${employee.lastName}`;
        }
      });
      setEmployeeMap(employeeMap);
    };

    loadEmployees();
  }, []);

  useEffect(() => {
    const loadGalloGoals = async () => {
      try {
        if (!companyId) {
          setLoading(false);
          return;
        }

        const savedGoals = await getGalloGoalsFromIndexedDB();
        if (savedGoals.length > 0) {
          setGalloGoals(savedGoals);
        } else {
          const fetchedGoals = await dispatch(
            fetchAllGalloGoals({ companyId })
          ).unwrap();
          setGalloGoals(fetchedGoals);
          await saveAllGalloGoalsToIndexedDB(fetchedGoals);
        }

        // Step 3: Set up a listener to watch Firestore for changes
        const q = query(
          collection(db, "galloGoals"),
          where("companyId", "==", companyId)
        );
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const updatedGoals = snapshot.docs.map(
            (doc) => doc.data() as FireStoreGalloGoalDocType
          );
          setGalloGoals(updatedGoals);
          await saveAllGalloGoalsToIndexedDB(updatedGoals);
        });

        // Cleanup listener on component unmount
        return () => unsubscribe();
      } catch (error) {
        console.error("Error loading company goals:", error);
        dispatch(
          showMessage("Failed to load company goals. Please try again.")
        );
      } finally {
        setLoading(false);
      }
    };

    loadGalloGoals();
  }, [companyId, dispatch]);

  const toggleExpand = (id: string) => {
    setExpandedGoals((prev) => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      return updated;
    });
  };

  const toggleExpandGoal = (goalId: string) => {
    toggleExpand(goalId); // Reuse the same logic for goals
  };

  useEffect(() => {
    const updatePrograms = () => {
      const programsMap = galloGoals.reduce<Record<string, MappedProgramType>>(
        (map, goal) => {
          const {
            programId,
            programTitle,
            programStartDate,
            programEndDate,
            programDisplayDate,
          } = goal.programDetails;

          if (!map[programId]) {
            map[programId] = {
              programId,
              programTitle,
              programStartDate,
              programEndDate,
              programDisplayDate,
              goals: [],
            };
          }

          map[programId].goals.push({
            goalId: goal.goalDetails.goalId,
            goal: goal.goalDetails.goal,
            metric: goal.goalDetails.goalMetric, // Updated mapping
            valueMin: goal.goalDetails.goalValueMin, // Updated mapping
          });

          return map;
        },
        {}
      );

      setPrograms(Object.values(programsMap));
    };

    updatePrograms();
  }, [galloGoals]);

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGalloGoalFromFirestore(goalId);
      const updatedGoals = galloGoals.filter(
        (goal) => goal.goalDetails.goalId !== goalId
      );
      setGalloGoals(updatedGoals);
      await saveAllGalloGoalsToIndexedDB(updatedGoals);
      dispatch(showMessage("Goal deleted successfully."));
    } catch (error) {
      console.error("Error deleting goal:", error);
      dispatch(showMessage("Failed to delete goal. Please try again."));
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle sort order if column is already active
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set a new column for sorting
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  const handleDeleteProgram = async (programId: string) => {
    try {
      // Find the Firestore doc that matches the programId
      const programToDelete = galloGoals.find(
        (goal) => goal.programDetails.programId === programId
      );

      if (!programToDelete) {
        console.warn(`No program found with ID: ${programId}`);
        return;
      }

      const goalId = programToDelete.goalDetails.goalId; // Firestore document ID
      const goalDocRef = doc(db, "galloGoals", goalId);

      // Step 1: Delete the Firestore document
      await deleteDoc(goalDocRef);
      console.log(`Program and Goal with ID ${goalId} deleted.`);

      // Step 2: Update Local State
      const updatedPrograms = programs.filter(
        (program) => program.programId !== programId
      );
      setPrograms(updatedPrograms);

      const updatedGoals = galloGoals.filter(
        (goal) => goal.programDetails.programId !== programId
      );
      setGalloGoals(updatedGoals);

      // Step 3: Update IndexedDB
      await saveAllGalloGoalsToIndexedDB(updatedGoals);

      dispatch(showMessage("Program deleted successfully."));
    } catch (error) {
      console.error("Error deleting program:", error);
      dispatch(showMessage("Failed to delete program. Please try again."));
    }
  };

  const sortData = (data: any[], column: string, order: SortOrder) => {
    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (column) {
        case "accountName":
          aValue = a.accountName;
          bValue = b.accountName;
          break;
        case "accountAddress":
          aValue = a.accountAddress;
          bValue = b.accountAddress;
          break;
        case "salesman":
          aValue = employeeMap[a.salesRouteNums?.[0] || ""] || "Unknown";
          bValue = employeeMap[b.salesRouteNums?.[0] || ""] || "Unknown";
          break;
        case "salesRouteNums":
          aValue = a.salesRouteNums?.[0] || 0; // Use only the first route number for sorting
          bValue = b.salesRouteNums?.[0] || 0;
          break;
        default:
          aValue = "";
          bValue = "";
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return order === "asc" ? aValue - bValue : bValue - aValue;
      }

      return order === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  };

  if (loading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
        <Typography>Loading company goals...</Typography>
      </Box>
    );
  }

  return (
    <Container>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="all-goals-view tabs"
        >
          <Tab label="Company Goals" {...a11yProps(0)} />
          <Tab label="Gallo Programs & Goals" {...a11yProps(1)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <Box className="table-container">
          <CompanyGoalsView goals={companyGoals} />
        </Box>
      </TabPanel>
      <TabPanel value={value} index={1}>
        <Box className="table-container">
          <Typography variant="h4" gutterBottom>
            Gallo Programs
          </Typography>
          <Table className="table">
            <TableHead>
              <TableRow>
                <TableCell>Program Title</TableCell>
                <TableCell>Display Date</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {programs.map((program) => (
                <React.Fragment key={program.programId}>
                  <TableRow>
                    <TableCell>{program.programTitle}</TableCell>
                    <TableCell>{program.programDisplayDate || "N/A"}</TableCell>
                    <TableCell>{program.programStartDate}</TableCell>
                    <TableCell>{program.programEndDate}</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => handleDeleteProgram(program.programId)}
                      >
                        Delete Program
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <IconButton
                        sx={{
                          marginRight: "1rem",
                          border: "1px solid #dcdcdc",
                          borderRadius: "4px",
                          padding: "8px",
                          "&:hover": {
                            backgroundColor: "#e9f6ff",
                            borderColor: "#b0b0b0",
                          },
                          transition: "all 0.2s ease-in-out",
                        }}
                        onClick={() => toggleExpand(program.programId)}
                      >
                        {expandedGoals.has(program.programId) ? (
                          <ExpandLessIcon />
                        ) : (
                          <ExpandMoreIcon />
                        )}
                        {expandedGoals.has(program.programId)
                          ? "Collapse Goals"
                          : "Show Goals"}
                      </IconButton>
                    </TableCell>
                  </TableRow>

                  {expandedGoals.has(program.programId) && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Box className="table-container">
                          <Typography variant="h5" gutterBottom>
                            Goals for {program.programTitle}
                          </Typography>
                          <Table className="table">
                            <TableHead>
                              <TableRow>
                                <TableCell>Goal</TableCell>
                                {/* <TableCell>Actions</TableCell> */}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {galloGoals
                                .filter(
                                  (goal) =>
                                    goal.programDetails.programId ===
                                    program.programId
                                )
                                .map((goal) => (
                                  <React.Fragment key={goal.goalDetails.goalId}>
                                    <TableRow>
                                      <TableCell>
                                        {goal.goalDetails.goal}
                                      </TableCell>
                                      {/* <TableCell>
                                    <Button
                                      variant="contained"
                                      color="secondary"
                                      onClick={() =>
                                        handleDeleteGoal(
                                          goal.goalDetails.goalId
                                        )
                                      }
                                    >
                                      Delete Goal
                                    </Button>
                                  </TableCell> */}
                                    </TableRow>
                                    <TableRow>
                                      <TableCell>
                                        <IconButton
                                          sx={{
                                            marginRight: "1rem",
                                            border: "1px solid #dcdcdc",
                                            borderRadius: "4px",
                                            padding: "8px",
                                            "&:hover": {
                                              backgroundColor: "#e9f6ff",
                                              borderColor: "#b0b0b0",
                                            },
                                            transition: "all 0.2s ease-in-out",
                                          }}
                                          onClick={() =>
                                            toggleExpandGoal(
                                              goal.goalDetails.goalId
                                            )
                                          }
                                        >
                                          {expandedGoals.has(
                                            goal.goalDetails.goalId
                                          ) ? (
                                            <ExpandLessIcon />
                                          ) : (
                                            <ExpandMoreIcon />
                                          )}
                                          {expandedGoals.has(
                                            goal.goalDetails.goalId
                                          )
                                            ? "Collapse Accounts"
                                            : "Show Accounts"}
                                        </IconButton>
                                      </TableCell>
                                    </TableRow>

                                    {expandedGoals.has(
                                      goal.goalDetails.goalId
                                    ) && (
                                      <TableRow>
                                        <TableCell colSpan={2}>
                                          <Collapse
                                            in={expandedGoals.has(
                                              goal.goalDetails.goalId
                                            )}
                                            timeout="auto"
                                            unmountOnExit
                                          >
                                            <Box margin={2}>
                                              <Typography variant="h6">
                                                Accounts
                                              </Typography>
                                              <Table size="small">
                                                <TableHead>
                                                  <TableRow>
                                                    <TableCell
                                                      onClick={() =>
                                                        handleSort(
                                                          "accountName"
                                                        )
                                                      }
                                                    >
                                                      <TableSortLabel
                                                        active={
                                                          sortColumn ===
                                                          "accountName"
                                                        }
                                                        direction={sortOrder}
                                                      >
                                                        Account Name
                                                      </TableSortLabel>
                                                    </TableCell>
                                                    <TableCell
                                                      onClick={() =>
                                                        handleSort(
                                                          "accountAddress"
                                                        )
                                                      }
                                                    >
                                                      <TableSortLabel
                                                        active={
                                                          sortColumn ===
                                                          "accountAddress"
                                                        }
                                                        direction={sortOrder}
                                                      >
                                                        Address
                                                      </TableSortLabel>
                                                    </TableCell>
                                                    <TableCell
                                                      onClick={() =>
                                                        handleSort(
                                                          "salesRouteNums"
                                                        )
                                                      }
                                                    >
                                                      <TableSortLabel
                                                        active={
                                                          sortColumn ===
                                                          "salesRouteNums"
                                                        }
                                                        direction={sortOrder}
                                                      >
                                                        Route Number
                                                      </TableSortLabel>
                                                    </TableCell>
                                                    <TableCell
                                                      onClick={() =>
                                                        handleSort("salesman")
                                                      }
                                                    >
                                                      <TableSortLabel
                                                        active={
                                                          sortColumn ===
                                                          "salesman"
                                                        }
                                                        direction={sortOrder}
                                                      >
                                                        Salesman
                                                      </TableSortLabel>
                                                    </TableCell>
                                                  </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                  {sortData(
                                                    goal.accounts,
                                                    sortColumn,
                                                    sortOrder
                                                  ).map((account, index) => (
                                                    <React.Fragment
                                                      key={`${account.distributorAcctId}-${index}`}
                                                    >
                                                      {/* Primary Account Row */}
                                                      <TableRow>
                                                        <TableCell>
                                                          {account.accountName ||
                                                            "N/A"}
                                                        </TableCell>
                                                        <TableCell>
                                                          {account.accountAddress ||
                                                            "N/A"}
                                                        </TableCell>
                                                        <TableCell>
                                                          {Array.isArray(
                                                            account.salesRouteNums
                                                          )
                                                            ? account
                                                                .salesRouteNums[0]
                                                            : account.salesRouteNums ||
                                                              "N/A"}
                                                        </TableCell>
                                                        <TableCell>
                                                          {/* Fetch salesman name from employeeMap */}
                                                          {Array.isArray(
                                                            account.salesRouteNums
                                                          )
                                                            ? employeeMap[
                                                                account
                                                                  .salesRouteNums[0]
                                                              ] || "Unknown"
                                                            : employeeMap[
                                                                account
                                                                  .salesRouteNums
                                                              ] || "Unknown"}
                                                        </TableCell>
                                                      </TableRow>

                                                      {/* Nested Rows for Additional Route Numbers */}
                                                      {Array.isArray(
                                                        account.salesRouteNums
                                                      ) &&
                                                        account.salesRouteNums
                                                          .slice(1)
                                                          .map(
                                                            (
                                                              routeNum:
                                                                | number
                                                                | string,
                                                              idx: number
                                                            ) => (
                                                              <TableRow
                                                                key={`${account.distributorAcctId}-${routeNum}-${idx}`}
                                                              >
                                                                <TableCell />{" "}
                                                                {/* Empty cell for indentation */}
                                                                <TableCell />
                                                                <TableCell>
                                                                  {routeNum}
                                                                </TableCell>
                                                                <TableCell>
                                                                  {/* Fetch salesman name for additional route number */}
                                                                  {employeeMap[
                                                                    routeNum
                                                                  ] ||
                                                                    "Unknown"}
                                                                </TableCell>
                                                              </TableRow>
                                                            )
                                                          )}
                                                    </React.Fragment>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </Box>
                                          </Collapse>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </React.Fragment>
                                ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </Box>
      </TabPanel>
    </Container>
  );
};

export default AllGoalsView;
