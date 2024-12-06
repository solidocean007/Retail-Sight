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
import './allGoalsView.css'

type SortOrder = "asc" | "desc";

const AllGoalsView = ({ companyId }: { companyId: string | undefined }) => {
  const [goals, setGoals] = useState<FireStoreGalloGoalDocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string>("accountName");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [employeeMap, setEmployeeMap] = useState<Record<string, string>>({});
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

  const toggleExpand = (goalId: string) => {
    setExpandedGoals((prev) => {
      const newExpandedGoals = new Set(prev);
      if (newExpandedGoals.has(goalId)) {
        newExpandedGoals.delete(goalId);
      } else {
        newExpandedGoals.add(goalId);
      }
      return newExpandedGoals;
    });
  };

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
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  // const sortData = (data: any[], column: string, order: SortOrder) => {
  //   return [...data].sort((a, b) => {
  //     let aValue: any;
  //     let bValue: any;

  //     switch (column) {
  //       case "accountName":
  //         aValue = a.accountName;
  //         bValue = b.accountName;
  //         break;
  //       case "accountAddress":
  //         aValue = a.accountAddress;
  //         bValue = b.accountAddress;
  //         break;
  //       case "salesman":
  //         aValue = employeeMap[a.salesRouteNums?.[0] || ""] || "Unknown";
  //         bValue = employeeMap[b.salesRouteNums?.[0] || ""] || "Unknown";
  //         break;
  //       case "salesRouteNums":
  //         aValue = a.salesRouteNums?.[0] || 0;
  //         bValue = b.salesRouteNums?.[0] || 0;
  //         break;
  //       default:
  //         aValue = "";
  //         bValue = "";
  //     }

  //     if (typeof aValue === "number" && typeof bValue === "number") {
  //       return order === "asc" ? aValue - bValue : bValue - aValue;
  //     }

  //     return order === "asc"
  //       ? String(aValue).localeCompare(String(bValue))
  //       : String(bValue).localeCompare(String(aValue));
  //   });
  // };

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

  console.log(goals)

  return (
    <Box className="table-container">
      <Typography variant="h4" gutterBottom>
        Company Goals
      </Typography>
      {goals.length === 0 ? (
        <Typography>No goals found for this company.</Typography>
      ) : (
        <Table className="table">
          <TableHead>
            <TableRow>
              <TableCell className="sortable">
                <TableSortLabel
                  active={sortColumn === "accountName"}
                  direction={sortOrder}
                  onClick={() => handleSort("accountName")}
                >
                  Account Name
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortColumn === "accountAddress"}
                  direction={sortOrder}
                  onClick={() => handleSort("accountAddress")}
                >
                  Address
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortColumn === "salesRouteNums"}
                  direction={sortOrder}
                  onClick={() => handleSort("salesRouteNums")}
                >
                  Route Number
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortColumn === "salesman"}
                  direction={sortOrder}
                  onClick={() => handleSort("salesman")}
                >
                  Salesman
                </TableSortLabel>
              </TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {goals.map((goal) => (
              <React.Fragment key={goal.goalDetails.goalId}>
                {/* Parent Goal Row */}
                <TableRow>
                  <TableCell>
                    <IconButton
                      onClick={() => toggleExpand(goal.goalDetails.goalId)}
                    >
                      {expandedGoals.has(goal.goalDetails.goalId) ? (
                        <ExpandLessIcon />
                      ) : (
                        <ExpandMoreIcon />
                      )}
                    </IconButton>
                  </TableCell>
                  <TableCell colSpan={3}>
                    <Typography variant="h6">
                      {goal.goalDetails.goal}
                    </Typography>
                    <Typography variant="body2">
                      {goal.programDetails?.programTitle ||
                        "No description available"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => handleDeleteGoal(goal.goalDetails.goalId)}
                    >
                      Delete Goal
                    </Button>
                  </TableCell>
                </TableRow>

                {/* Expandable Account Rows */}
                {expandedGoals.has(goal.goalDetails.goalId) && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      style={{ padding: 0, border: "none" }}
                    >
                      <Collapse
                        in={expandedGoals.has(goal.goalDetails.goalId)}
                        timeout="auto"
                        unmountOnExit
                      >
                        <Box margin={2}>
                          <Typography variant="h6">Accounts</Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>
                                  <TableSortLabel
                                    active={sortColumn === "accountName"}
                                    direction={sortOrder}
                                    onClick={() => handleSort("accountName")}
                                  >
                                    Account Name
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                  <TableSortLabel
                                    active={sortColumn === "accountAddress"}
                                    direction={sortOrder}
                                    onClick={() => handleSort("accountAddress")}
                                  >
                                    Address
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                  <TableSortLabel
                                    active={sortColumn === "accountNumber"}
                                    direction={sortOrder}
                                    // onClick={() => handleSort("accountAddress")}
                                  >
                                    Account Number
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                  <TableSortLabel
                                    active={sortColumn === "salesRouteNums"}
                                    direction={sortOrder}
                                    onClick={() => handleSort("salesRouteNums")}
                                  >
                                    Route Number
                                  </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                  <TableSortLabel
                                    active={sortColumn === "salesman"}
                                    direction={sortOrder}
                                    onClick={() => handleSort("salesman")}
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
                              ).flatMap((account) => {
                                const rows = [];

                                // Render a row for each sales route number
                                if (
                                  Array.isArray(account.salesRouteNums) &&
                                  account.salesRouteNums.length > 1
                                ) {
                                  account.salesRouteNums.forEach(
                                    (routeNum: string, index: number) => {
                                      rows.push(
                                        <TableRow
                                          key={`${account.distributorAcctId}-${index}`}
                                        >
                                          <TableCell>
                                            {index === 0
                                              ? account.accountName
                                              : ""}
                                          </TableCell>
                                          <TableCell>
                                            {index === 0
                                              ? account.accountAddress
                                              : ""}
                                          </TableCell>
                                          <TableCell>
                                            number
                                            {index === 0
                                              ? account.distributorAcctId
                                              : ""}
                                          </TableCell>
                                          <TableCell>{routeNum}</TableCell>
                                          <TableCell>
                                            {employeeMap[routeNum] || "Unknown"}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    }
                                  );
                                } else {
                                  rows.push(
                                    <TableRow key={account.distributorAcctId}>
                                      <TableCell>
                                        {account.accountName}
                                      </TableCell>
                                      <TableCell>
                                        {account.accountAddress}
                                      </TableCell>
                                      <TableCell>
                                        {account.distributorAcctId}
                                      </TableCell>
                                      <TableCell>
                                        {Array.isArray(account.salesRouteNums)
                                          ? account.salesRouteNums[0]
                                          : account.salesRouteNums || "N/A"}
                                      </TableCell>
                                      <TableCell>
                                        {employeeMap[
                                          Array.isArray(account.salesRouteNums)
                                            ? account.salesRouteNums[0]
                                            : account.salesRouteNums || ""
                                        ] || "Unknown"}
                                      </TableCell>
                                    </TableRow>
                                  );
                                }

                                return rows;
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
      )}
    </Box>
  );
};

export default AllGoalsView;
