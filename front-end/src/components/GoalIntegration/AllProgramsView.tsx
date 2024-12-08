import React, { useEffect, useState } from "react";
import { FireStoreGalloGoalDocType } from "../../utils/types";
import {
  getAllCompanyGoalsFromIndexedDB,
  saveAllCompanyGoalsToIndexedDB,
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
} from "@mui/material";
import { useAppDispatch } from "../../utils/store";
import { fetchAllCompanyGoals } from "../../Slices/goalsSlice";
import { showMessage } from "../../Slices/snackbarSlice";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { deleteGoalFromFirestore } from "../../utils/helperFunctions/deleteGoalFRomFirestore";
import { getCompanyUsersFromIndexedDB } from "../../utils/database/userDataIndexedDB";
import "./allGoalsView.css";
import { collection, onSnapshot, query, where } from "@firebase/firestore";
import { db } from "../../utils/firebase";

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

const AllProgramsView = ({ companyId }: { companyId: string | undefined }) => {
  const [goals, setGoals] = useState<FireStoreGalloGoalDocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string>("accountName");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [employeeMap, setEmployeeMap] = useState<Record<string, string>>({});
  const [programs, setPrograms] = useState<MappedProgramType[]>([]);
  // New state for programs
  const dispatch = useAppDispatch();

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
    const loadGoals = async () => {
      try {
        if (!companyId) {
          setLoading(false);
          return;
        }

        const savedGoals = await getAllCompanyGoalsFromIndexedDB();
        if (savedGoals.length > 0) {
          setGoals(savedGoals);
        } else {
          const fetchedGoals = await dispatch(
            fetchAllCompanyGoals({ companyId })
          ).unwrap();
          setGoals(fetchedGoals);
          await saveAllCompanyGoalsToIndexedDB(fetchedGoals);
        }

        // Step 3: Set up a listener to watch Firestore for changes
        const q = query(
          collection(db, "GalloGoals"),
          where("companyId", "==", companyId)
        );
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const updatedGoals = snapshot.docs.map(
            (doc) => doc.data() as FireStoreGalloGoalDocType
          );
          setGoals(updatedGoals);
          await saveAllCompanyGoalsToIndexedDB(updatedGoals);
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

    loadGoals();
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
      const programsMap = goals.reduce<Record<string, MappedProgramType>>(
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
  }, [goals]);

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGoalFromFirestore(goalId);
      const updatedGoals = goals.filter(
        (goal) => goal.goalDetails.goalId !== goalId
      );
      setGoals(updatedGoals);
      await saveAllCompanyGoalsToIndexedDB(updatedGoals);
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
      // Add logic to remove program from database
      const updatedPrograms = programs.filter(
        (program) => program.programId !== programId
      );
      setPrograms(updatedPrograms);
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
    <Box className="table-container">
      <Typography variant="h4" gutterBottom>
        Programs
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
                  <IconButton onClick={() => toggleExpand(program.programId)}>
                    {expandedGoals.has(program.programId) ? (
                      <ExpandLessIcon />
                    ) : (
                      <ExpandMoreIcon />
                    )}
                  </IconButton>
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
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {goals
                            .filter(
                              (goal) =>
                                goal.programDetails.programId ===
                                program.programId
                            )
                            .map((goal) => (
                              <React.Fragment key={goal.goalDetails.goalId}>
                                <TableRow>
                                  <TableCell>{goal.goalDetails.goal}</TableCell>
                                  <TableCell>
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

                                {expandedGoals.has(goal.goalDetails.goalId) && (
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
                                                    handleSort("accountName")
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
                                                    handleSort("accountAddress")
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
                                                    handleSort("salesRouteNums")
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
                                                      sortColumn === "salesman"
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
                                                      {employeeMap[
                                                        Array.isArray(
                                                          account.salesRouteNums
                                                        )
                                                          ? account
                                                              .salesRouteNums[0]
                                                          : account.salesRouteNums ||
                                                            ""
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
                                                            | string
                                                            | number
                                                        ) => (
                                                          <TableRow
                                                            key={`${account.distributorAcctId}-${routeNum}`}
                                                          >
                                                            <TableCell />
                                                            <TableCell />
                                                            <TableCell>
                                                              {routeNum}
                                                            </TableCell>
                                                            <TableCell>
                                                              {employeeMap[
                                                                routeNum
                                                              ] || "Unknown"}
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
  );
};

export default AllProgramsView;
