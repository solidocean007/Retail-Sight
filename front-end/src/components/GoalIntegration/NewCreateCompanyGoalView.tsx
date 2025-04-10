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
  Checkbox,
  CircularProgress,
  Pagination,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "../../utils/store";
import { db } from "../../utils/firebase";
import { doc, getDoc } from "firebase/firestore";
import getCompanyAccountId from "../../utils/helperFunctions/getCompanyAccountId";
import { CompanyAccountType, UserType } from "../../utils/types";
import { createCompanyGoal } from "../../utils/helperFunctions/createCompanyGoal";

const itemsPerPage = 20;

const NewCreateCompanyGoalView = () => {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const companyId = currentUser?.companyId;

  const [assignmentType, setAssignmentType] = useState<'all' | 'accounts' | 'salesReps'>('all');
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalMetric, setGoalMetric] = useState("cases");
  const [goalValueMin, setGoalValueMin] = useState(1);
  const [goalStartDate, setGoalStartDate] = useState("");
  const [goalEndDate, setGoalEndDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [accounts, setAccounts] = useState<CompanyAccountType[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<CompanyAccountType[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<CompanyAccountType[]>([]);
  const [salesReps, setSalesReps] = useState<UserType[]>([]);
  const [selectedSalesReps, setSelectedSalesReps] = useState<UserType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const paginatedAccounts = filteredAccounts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
    if (!companyId) return;
    try {
      setLoading(true);
      const accountId = await getCompanyAccountId(companyId);
      if (!accountId) return;
      const docSnap = await getDoc(doc(db, "accounts", accountId));
      if (docSnap.exists()) {
        const raw = docSnap.data().accounts;
        const formatted = raw.map((acc: any) => ({
          ...acc,
          salesRouteNums: Array.isArray(acc.salesRouteNums) ? acc.salesRouteNums : [acc.salesRouteNums].filter(Boolean),
        }));
        setAccounts(formatted);
        setFilteredAccounts(formatted);
      }
    } catch (e) {
      console.error("Error loading accounts", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelection = (account: CompanyAccountType) => {
    setSelectedAccounts((prev) => {
      const exists = prev.some((a) => a.accountNumber === account.accountNumber);
      return exists ? prev.filter((a) => a.accountNumber !== account.accountNumber) : [...prev, account];
    });
  };

  const handleSelectAllAccounts = () => {
    const allSelected = selectedAccounts.length === filteredAccounts.length;
    setSelectedAccounts(allSelected ? [] : filteredAccounts);
  };

  const handleCreate = async () => {
    if (!goalTitle || !goalMetric || !goalValueMin) return;
    setIsSaving(true);
    const payload: any = {
      companyId,
      goalTitle,
      goalDescription,
      goalMetric,
      goalValueMin,
      goalStartDate,
      goalEndDate,
    };

    if (assignmentType === "all") {
      payload.appliesToAllAccounts = true;
    } else if (assignmentType === "accounts") {
      payload.accounts = selectedAccounts;
    } else if (assignmentType === "salesReps") {
      payload.assignedToSalesReps = selectedSalesReps.map(rep => rep.salesRouteNum);
      payload.submissionLimit = 1;
    }

    await createCompanyGoal(payload);
    alert("Goal Created!");

    setGoalTitle("");
    setGoalDescription("");
    setGoalMetric("cases");
    setGoalValueMin(1);
    setGoalStartDate("");
    setGoalEndDate("");
    setSelectedAccounts([]);
    setSelectedSalesReps([]);
    setAssignmentType("all");
    setIsSaving(false);
  };

  return (
    <Container>
      <Typography variant="h5">Create a Company Goal</Typography>

      <Box mt={2} display="flex" flexDirection="column" gap={2}>
        <TextField fullWidth label="Goal Title" value={goalTitle} onChange={e => setGoalTitle(e.target.value)} />
        <TextField fullWidth multiline label="Description" value={goalDescription} onChange={e => setGoalDescription(e.target.value)} />

        <Box display="flex" gap={2}>
          <TextField type="date" label="Start Date" InputLabelProps={{ shrink: true }} value={goalStartDate} onChange={e => setGoalStartDate(e.target.value)} />
          <TextField type="date" label="End Date" InputLabelProps={{ shrink: true }} value={goalEndDate} onChange={e => setGoalEndDate(e.target.value)} />
        </Box>

        <Select
          fullWidth
          value={assignmentType}
          onChange={(e) => setAssignmentType(e.target.value as 'all' | 'accounts' | 'salesReps')}
        >
          <MenuItem value="all">All Accounts</MenuItem>
          <MenuItem value="accounts">Specific Accounts</MenuItem>
          <MenuItem value="salesReps">Specific Sales Reps</MenuItem>
        </Select>

        {assignmentType === 'accounts' && (
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
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6">Select Accounts</Typography>
                        <Checkbox
                          indeterminate={
                            selectedAccounts.length > 0 &&
                            selectedAccounts.length < filteredAccounts.length
                          }
                          checked={selectedAccounts.length === filteredAccounts.length}
                          onChange={handleSelectAllAccounts}
                        />
                        <Typography>
                          {selectedAccounts.length === filteredAccounts.length
                            ? "Deselect All"
                            : "Select All"}
                        </Typography>
                      </Box>
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
                          checked={selectedAccounts.some((a) => a.accountNumber === account.accountNumber)}
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
              onChange={(e, page) => setCurrentPage(page)}
              sx={{ mt: 2 }}
            />
          </Box>
        )}

        {assignmentType === 'salesReps' && (
          <Box mt={2}>
            <Typography>Select Sales Reps (Placeholder)</Typography>
            <TextField
              placeholder="e.g., rep1, rep2"
              fullWidth
              value={selectedSalesReps.map(rep => rep.salesRouteNum).join(', ')}
              onChange={(e) => {
                const newValues = e.target.value.split(',').map(v => v.trim());
                setSelectedSalesReps(newValues.map((num) => ({ salesRouteNum: num } as UserType)));
              }}
            />
          </Box>
        )}

        <Box>
          <Typography variant="h6" gutterBottom>Goal Metric</Typography>
          <ToggleButtonGroup
            value={goalMetric}
            exclusive
            onChange={(event, value) => value && setGoalMetric(value)}
            aria-label="Goal Metric"
          >
            <ToggleButton value="cases">Cases</ToggleButton>
            <Typography variant="body1" sx={{ mx: 2 }}>or</Typography>
            <ToggleButton value="bottles">Bottles</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>Minimum Value</Typography>
          <Box display="flex" alignItems="center">
            <Button
              variant="outlined"
              onClick={() => setGoalValueMin((prev) => Math.max(1, Number(prev) - 1))}
            >
              -
            </Button>
            <TextField
              type="number"
              value={goalValueMin}
              onChange={(e) => setGoalValueMin(Math.max(1, Number(e.target.value)))}
              size="small"
              sx={{ width: 60, mx: 2 }}
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

        <Box>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={isSaving || !goalTitle || !goalMetric || !goalValueMin}
          >
            {isSaving ? "Saving..." : "Create Goal"}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default NewCreateCompanyGoalView;
