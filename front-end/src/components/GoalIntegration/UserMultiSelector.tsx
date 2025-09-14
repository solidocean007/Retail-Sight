// UserMultiSelector.tsx
import React, { useState, useMemo } from "react";
import {
  Box,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Typography,
  Pagination,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from "@mui/material";
import { UserType } from "../../utils/types";
import "./userMultiSelector.css";

interface UserMultiSelectorProps {
  users: UserType[];
  selectedUserIds: string[];
  setSelectedUserIds: React.Dispatch<React.SetStateAction<string[]>>;
  itemsPerPage?: number;
}

const UserMultiSelector: React.FC<UserMultiSelectorProps> = ({
  users,
  selectedUserIds,
  setSelectedUserIds,
  itemsPerPage = 10,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const fullName = `${user.firstName ?? ""} ${
        user.lastName ?? ""
      }`.toLowerCase();
      const nameMatch = fullName.includes(searchTerm.toLowerCase());

      const emailMatch = user.email
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      const roleMatch = selectedRole === "all" || user.role === selectedRole;
      return (nameMatch || emailMatch) && roleMatch;
    });
  }, [searchTerm, selectedRole, users]);

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleSelectAll = () => {
    const allSelected = selectedUserIds.length === filteredUsers.length;
    if (allSelected) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map((u) => u.uid));
    }
  };

  const toggleUserSelection = (uid: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  };

  return (
    <Box className="user-multi-selector">
      <Box className="search-row">
        <TextField
          className="search-input"
          label="Search by name or email"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <FormControl className="role-filter-dropdown">
          <InputLabel id="role-select-label">Role</InputLabel>
          <Select
            labelId="role-select-label"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            label="Role"
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="employee">Employee</MenuItem>
            <MenuItem value="supervisor">Supervisor</MenuItem>
            <MenuItem value="super-admin">Super Admin</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box className="select-all-row">
        <Checkbox
          indeterminate={
            selectedUserIds.length > 0 &&
            selectedUserIds.length < filteredUsers.length
          }
          checked={selectedUserIds.length === filteredUsers.length}
          onChange={handleSelectAll}
        />
        <Typography>
          {selectedUserIds.length === filteredUsers.length
            ? "Deselect All"
            : "Select All"}
        </Typography>
      </Box>

      <Table className="user-table">
        <TableHead>
          <TableRow>
            <TableCell>Select</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Route #</TableCell>
            <TableCell>Role</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedUsers.map((user) => (
            <TableRow key={user.uid}>
              <TableCell>
                <Checkbox
                  checked={selectedUserIds.includes(user.uid)}
                  onChange={() => toggleUserSelection(user.uid)}
                />
              </TableCell>
              <TableCell>{`${user.firstName} ${user.lastName}`}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.salesRouteNum}</TableCell>
              <TableCell>{user.role}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination
        className="pagination-control"
        count={Math.ceil(filteredUsers.length / itemsPerPage)}
        page={currentPage}
        onChange={(_, page) => setCurrentPage(page)}
      />
    </Box>
  );
};

export default UserMultiSelector;
