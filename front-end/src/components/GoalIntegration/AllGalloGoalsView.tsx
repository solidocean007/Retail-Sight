import React, { useEffect, useState } from "react";
import { CompanyGoalType, FireStoreGalloGoalDocType } from "../../utils/types";
import {
  getAllGalloGoalsFromIndexedDB,
  // getAllCompanyGoalsFromIndexedDB,
  // getGalloGoalsFromIndexedDB,
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
} from "@mui/material";
import { useAppDispatch } from "../../utils/store";
import {
  FireStoreGalloGoalWithId,
  selectAllGalloGoals,
  selectCompanyGoalsIsLoading,
} from "../../Slices/goalsSlice";
import { showMessage } from "../../Slices/snackbarSlice";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { deleteGalloGoalFromFirestore } from "../../utils/helperFunctions/deleteGalloGoalFromFirestore";
import { getCompanyUsersFromIndexedDB } from "../../utils/database/userDataIndexedDB";
import "./allGoalsView.css";
import { deleteDoc, doc } from "@firebase/firestore";
import { db } from "../../utils/firebase";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import { useNavigate } from "react-router-dom";

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

const AllGalloGoalsView = (galloGoals: FireStoreGalloGoalDocType[]) => {
  const dispatch = useAppDispatch();
  const companyId = useSelector(selectUser)?.companyId;
  const navigate = useNavigate();
  const isLoading = useSelector(selectCompanyGoalsIsLoading);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string>("accountName");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [employeeMap, setEmployeeMap] = useState<Record<string, string>>({});
  const [programs, setPrograms] = useState<MappedProgramType[]>([]);

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

  const handleDeleteGalloGoal = async (goalId: string) => {
    try {
      await deleteGalloGoalFromFirestore(goalId);
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
      // Step 1: Fetch all goals associated with the programId
      const programGoals = galloGoals.filter(
        (goal) => goal.programDetails.programId === programId
      );

      if (!programGoals.length) {
        console.warn(`No goals found for program ID: ${programId}`);
        return;
      }

      // Step 2: Delete each goal from Firestore
      const deletePromises = programGoals.map((goal) => {
        const goalDocRef = doc(db, "galloGoals", goal.goalDetails.goalId); // Firestore document reference
        return deleteDoc(goalDocRef);
      });

      await Promise.all(deletePromises); // Wait for all deletions to complete

      // Step 3: Notify the user
      dispatch(
        showMessage("Program and its associated goals deleted successfully.")
      );
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

  if (isLoading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
        <Typography>Loading Gallo goals...</Typography>
      </Box>
    );
  }

  return (
    <Container>
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
                                    <TableCell>
                                      <Button
                                        variant="contained"
                                        color="secondary"
                                        onClick={() =>
                                          handleDeleteGalloGoal(
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
                                                  <TableCell
                                                    onClick={() =>
                                                      handleSort("postStatus")
                                                    }
                                                  >
                                                    <TableSortLabel
                                                      active={
                                                        sortColumn === "status"
                                                      }
                                                      direction={sortOrder}
                                                    >
                                                      Status
                                                    </TableSortLabel>
                                                  </TableCell>
                                                  <TableCell>Actions</TableCell>
                                                </TableRow>
                                              </TableHead>
                                              <TableBody>
                                                {sortData(
                                                  goal.accounts,
                                                  sortColumn,
                                                  sortOrder
                                                ).map((account, index) => {
                                                  const hasSubmittedPost =
                                                    Boolean(
                                                      account.submittedPostId
                                                    ); // ✅ Check if post was submitted

                                                  return (
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
                                                        <TableCell>
                                                          {hasSubmittedPost ? (
                                                            <Typography color="primary">
                                                              Post Submitted
                                                            </Typography>
                                                          ) : (
                                                            <Typography color="error">
                                                              Not Submitted
                                                            </Typography>
                                                          )}
                                                        </TableCell>
                                                        <TableCell>
                                                          {hasSubmittedPost && (
                                                            <Button
                                                              variant="text"
                                                              color="primary"
                                                              onClick={() =>
                                                                navigate(
                                                                  `/user-home-page?postId=${account.submittedPostId}`
                                                                )
                                                              }
                                                            >
                                                              View Post
                                                            </Button>
                                                          )}
                                                        </TableCell>
                                                      </TableRow>

                                                      {/* Nested Rows for Additional Route Numbers */}
                                                      {Array.isArray(
                                                        account.salesRouteNums
                                                      ) &&
                                                        account.salesRouteNums
                                                          .slice(1)
                                                          .map(
                                                            (routeNum: string, idx: string) => (
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
                                                                  {employeeMap[
                                                                    routeNum
                                                                  ] ||
                                                                    "Unknown"}
                                                                </TableCell>
                                                                <TableCell />
                                                                <TableCell />
                                                              </TableRow>
                                                            )
                                                          )}
                                                    </React.Fragment>
                                                  );
                                                })}
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
    </Container>
  );
};

export default AllGalloGoalsView;
