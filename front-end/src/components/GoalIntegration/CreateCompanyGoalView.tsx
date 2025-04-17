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
  const [selectedAccounts, setSelectedAccounts] = useState<
    CompanyAccountType[]
  >([]);
  const [isGlobal, setIsGlobal] = useState(false);
  const [goalDescription, setGoalDescription] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
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
  }, []);

  useEffect(() => {
    const filtered = accounts.filter(
      (account) =>
        account.accountName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.accountNumber?.toString().includes(searchTerm)
    );
    setFilteredAccounts(filtered);
    setCurrentPage(1);
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
        setFilteredAccounts(formattedAccounts);
      } else {
        console.error("No accounts found in Firestore");
      }
    } catch (error) {
      console.error("Error fetching accounts from Firestore:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelection = (account: CompanyAccountType) => {
    setSelectedAccounts((prev) => {
      const exists = prev.some(
        (selected) => selected.accountNumber === account.accountNumber
      );
      if (exists) {
        return prev.filter(
          (selected) => selected.accountNumber !== account.accountNumber
        );
      } else {
        return [...prev, account];
      }
    });
  };

  const handleSelectAllAccounts = () => {
    const allSelected = selectedAccounts.length === filteredAccounts.length;
    if (allSelected) {
      // Deselect all accounts
      setSelectedAccounts([]);
    } else {
      // Select all filtered accounts
      setSelectedAccounts(filteredAccounts);
    }
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
    if (!goalDescription || !goalMetric || !goalValueMin || !goalTitle) {
      alert("Please fill out all fields.");
      return;
    }

    setIsSaving(true);
    try {
      const newGoal = {
        companyId: companyId || "",
        goalTitle,
        goalDescription,
        goalMetric,
        goalValueMin: Number(goalValueMin),
        goalStartDate,
        goalEndDate,
        accounts: isGlobal ? "Global" : selectedAccounts,
      };

      // Use the abstracted function
      await createCompanyGoal(newGoal); // 'appliesToAllAccounts' is declared here.

      alert("Goal created successfully!");
      setGoalTitle("");
      setGoalDescription("");
      setGoalMetric("");
      setGoalValueMin(1);
      setIsGlobal(true);
      setGoalStartDate("");
      setGoalEndDate("");
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
        <Typography variant="h5" gutterBottom>
          Create a New Goal
        </Typography>

        <Box display="flex" flexDirection="column" gap={2} mb={4}>
          {/* Goal Title and Description */}
          <TextField
            label="Goal Title"
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
          />
          <TextField
            label="Goal Description"
            value={goalDescription}
            onChange={(e) => setGoalDescription(e.target.value)}
          />

          <Typography variant="h6" gutterBottom>
            Goal Dates
          </Typography>
          <Box sx={{ display: "flex" }}>
            <TextField
              label="Start Date"
              type="date"
              value={goalStartDate}
              onChange={(e) => setGoalStartDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              label="End Date"
              type="date"
              value={goalEndDate}
              onChange={(e) => setGoalEndDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-around" }}>
            <Box>
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
                <Typography variant="body1" sx={{ mx: 3 }}>
                  or
                </Typography>
                <ToggleButton value="bottles">Bottles</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box>
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
          </Box>

          <Box display="flex" alignItems="center">
            <Typography>Global Goal for all accounts?:</Typography>
            <Checkbox
              checked={isGlobal}
              onChange={() => setIsGlobal((prev) => !prev)}
            />
            {isGlobal && (
              <Typography>All accounts are available for this goal.</Typography>
            )}
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateGoal}
            disabled={!readyForCreation}
          >
            Create Goal
          </Button>

          {/* Selected Accounts */}
          {!isGlobal && selectedAccounts.length > 0 && (
            <Box mb={4}>
              <Typography variant="h6">{`${selectedAccounts.length} Selected Accounts`}</Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Select</TableCell>
                    <TableCell>Account Name</TableCell>
                    <TableCell>Account Address</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedAccounts.map((account) => (
                    <TableRow key={account.accountNumber}>
                      <TableCell>
                        <Checkbox
                          checked
                          onChange={() => handleAccountSelection(account)}
                        />
                      </TableCell>
                      <TableCell>{account.accountName}</TableCell>
                      <TableCell>{account.accountAddress}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* Account Selection */}
          {!isGlobal && (
            <Box>
              <TextField
                label="Search Account"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
              />

              {loading ? (
                <CircularProgress />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          mb={2}
                        >
                          <Typography variant="h6">Select Accounts</Typography>
                          <Checkbox
                            indeterminate={
                              selectedAccounts.length > 0 &&
                              selectedAccounts.length < filteredAccounts.length
                            }
                            checked={
                              selectedAccounts.length ===
                              filteredAccounts.length
                            }
                            onChange={handleSelectAllAccounts}
                          />
                          <Typography>
                            {selectedAccounts.length === filteredAccounts.length
                              ? "Deselect All"
                              : "Select All"}
                          </Typography>
                        </Box>
                        Select
                      </TableCell>
                      <TableCell>Account Name</TableCell>
                      <TableCell>Account Address</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedAccounts.map((account) => (
                      <TableRow key={account.accountNumber}>
                        <TableCell>
                          <Checkbox
                            checked={selectedAccounts.some(
                              (selected) =>
                                selected.accountNumber === account.accountNumber
                            )}
                            onChange={() => handleAccountSelection(account)}
                          />
                        </TableCell>
                        <TableCell>{account.accountName}</TableCell>
                        <TableCell>{account.accountAddress}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <Pagination
                count={Math.ceil(filteredAccounts.length / itemsPerPage)}
                page={currentPage}
                onChange={handlePageChange}
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default CreateCompanyGoalView;
