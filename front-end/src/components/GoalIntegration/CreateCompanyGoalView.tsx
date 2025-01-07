import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Checkbox,
  Pagination,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { CompanyAccountType } from "../../utils/types";
import { useSelector } from "react-redux";
import { RootState } from "../../utils/store";
import { db } from "../../utils/firebase";
import { collection, doc, getDoc, setDoc } from "@firebase/firestore";
import getCompanyAccountId from "../../utils/helperFunctions/getCompanyAccountId";
import { createCompanyGoal } from "../../utils/helperFunctions/createCompanyGoal";

const itemsPerPage = 20;

const CreateCompanyGoalView = () => {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const companyId = currentUser?.companyId;
  const [isSaving, setIsSaving] = useState(false);
  const [accounts, setAccounts] = useState<CompanyAccountType[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<
    CompanyAccountType[]
  >([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isGlobal, setIsGlobal] = useState(true);
  const [goalDescription, setGoalDescription] = useState("");
  const [goalMetric, setGoalMetric] = useState("");
  const [goalValueMin, setGoalValueMin] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [goalStartDate, setGoalStartDate] = useState("");
  const [goalEndDate, setGoalEndDate] = useState("");

  const readyForCreation: boolean =
    goalDescription.length > 0 &&
    goalMetric.length > 0 &&
    Number(goalValueMin) > 0;

  useEffect(() => {
    fetchAccounts();
    console.log(paginatedAccounts);
  }, []);

  useEffect(() => {
    const filtered = accounts.filter(
      (account) =>
        account.accountName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.accountNumber?.toString().includes(searchTerm) // Convert to string before calling includes
    );
    setFilteredAccounts(filtered);
    setCurrentPage(1); // Reset to the first page when search term changes
  }, [searchTerm, accounts]);

  const fetchAccounts = async () => {
    console.log("Fetching accounts...");
    if (!companyId) {
      console.error("No companyId found for user");
      return;
    }

    try {
      setLoading(true);
      const accountsId = await getCompanyAccountId(companyId);

      if (!accountsId) {
        console.error("No accountsId found for company");
        return;
      }

      const accountsDocRef = doc(db, "accounts", accountsId);
      const accountsSnapshot = await getDoc(accountsDocRef);

      if (accountsSnapshot.exists()) {
        const accountsData = accountsSnapshot.data();
        const formattedAccounts = (
          accountsData.accounts as CompanyAccountType[]
        ).map((account) => ({
          ...account,
          salesRouteNums: Array.isArray(account.salesRouteNums)
            ? account.salesRouteNums
            : [account.salesRouteNums].filter(Boolean),
        }));
        setAccounts(formattedAccounts);
        setFilteredAccounts(formattedAccounts); // Ensure `filteredAccounts` is updated too
      } else {
        console.error("No accounts found in Firestore");
      }
    } catch (error) {
      console.error("Error fetching accounts from Firestore:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelection = (accountId: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = event.target.value.toLowerCase();
    setSearchTerm(searchTerm);

    const filtered = accounts.filter((account) => {
      const accountName = account.accountName?.toLowerCase() || ""; // Fallback to empty string
      const accountNumber = account.accountNumber
        ? account.accountNumber.toString()
        : ""; // Ensure string
      return (
        accountName.includes(searchTerm) || accountNumber.includes(searchTerm)
      );
    });

    setFilteredAccounts(filtered);
  };

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    page: number
  ) => {
    setCurrentPage(page);
  };

  const paginatedAccounts = filteredAccounts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCreateGoal = async () => {
    if (!goalDescription || !goalMetric || !goalValueMin) {
      alert("Please fill out all fields.");
      return;
    }

    setIsSaving(true);
    try {
      const newGoal = {
        companyId: companyId || "",
        goalDescription,
        goalMetric,
        goalValueMin: Number(goalValueMin),
        goalStartDate,
        goalEndDate,
        accounts: isGlobal ? "Global" : selectedAccounts,
      };

      // Use the abstracted function
      await createCompanyGoal(newGoal);

      alert("Goal created successfully!");
      setGoalDescription("");
      setGoalMetric("");
      setGoalValueMin(1);
      setIsGlobal(true);
      setSelectedAccounts([]);
    } catch (error) {
      alert("Error creating goal. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container>
      <Box mb={4}>
        <Typography variant="h5" align="justify" gutterBottom>
          Create a New Goal
        </Typography>
        <Box
          display="flex"
          flexDirection="column"
          alignItems={"flex-start"}
          gap={2}
          mb={2}
        >
          <TextField
            label="Goal Description"
            value={goalDescription}
            onChange={(e) => setGoalDescription(e.target.value)}
            // fullWidth
          />

          <Typography variant="h6" gutterBottom>
            Goal Dates
          </Typography>
          <TextField
            label="Start Date"
            type="date"
            value={goalStartDate}
            onChange={(e) => setGoalStartDate(e.target.value)}
            // fullWidth
            InputLabelProps={{
              shrink: true,
            }}
          />
          <TextField
            label="End Date"
            type="date"
            value={goalEndDate}
            onChange={(e) => setGoalEndDate(e.target.value)}
            // fullWidth
            InputLabelProps={{
              shrink: true,
            }}
          />

          <Typography variant="h6" gutterBottom>
            Goal Metric
          </Typography>
          <ToggleButtonGroup
            value={goalMetric}
            exclusive
            onChange={(event, value) => {
              if (value) setGoalMetric(value);
            }}
            aria-label="Goal Metric"
          >
            <ToggleButton value="cases">Cases</ToggleButton>
            <ToggleButton value="bottles">Bottles</ToggleButton>
          </ToggleButtonGroup>

          <Box display="flex" alignItems="center">
            <Typography>Global Goal:</Typography>
            <Checkbox
              checked={isGlobal}
              onChange={() => setIsGlobal((prev) => !prev)}
            />
          </Box>
          <Typography variant="h6" gutterBottom>
            Minimum Value
          </Typography>
          <Box display="flex" alignItems="center">
            <Button
              variant="outlined"
              onClick={() =>
                setGoalValueMin((prev) => Math.max(1, Number(prev) - 1))
              }
            >
              -
            </Button>
            <TextField
              type="number"
              value={goalValueMin}
              onChange={(e) =>
                setGoalValueMin(Math.max(1, Number(e.target.value)))
              }
              size="small"
              sx={{ width: 60, textAlign: "center", mx: 1 }}
              inputProps={{ min: 1 }}
            />
            <Button
              variant="outlined"
              onClick={() => setGoalValueMin((prev) => Number(prev) + 1)}
            >
              +
            </Button>
          </Box>
        </Box>

        {!isGlobal && (
          <Box mb={4}>
            <TextField
              label="Search Account"
              variant="outlined"
              fullWidth
              value={searchTerm}
              onChange={handleSearch}
              sx={{ marginBottom: 2 }}
            />
            {loading ? (
              <CircularProgress />
            ) : (
              <>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Select</TableCell>
                      <TableCell>Account Name</TableCell>
                      <TableCell>Account Address</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedAccounts.map((account) => (
                      <TableRow key={account.accountNumber}>
                        <TableCell>
                          <Checkbox
                            checked={selectedAccounts.includes(
                              account.accountNumber
                            )}
                            onChange={() =>
                              handleAccountSelection(account.accountNumber)
                            }
                          />
                        </TableCell>
                        <TableCell>{account.accountName}</TableCell>
                        <TableCell>{account.accountAddress}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination
                  count={Math.ceil(filteredAccounts.length / itemsPerPage)}
                  page={currentPage}
                  onChange={handlePageChange}
                  sx={{ marginTop: 2 }}
                />
              </>
            )}
          </Box>
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateGoal}
          disabled={!readyForCreation}
        >
          Create Goal
        </Button>
      </Box>
    </Container>
  );
};

export default CreateCompanyGoalView;
