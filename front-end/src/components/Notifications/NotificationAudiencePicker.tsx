// components/Admin/NotificationAudienceBuilder.tsx
import React from "react";
import {
  Autocomplete,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { CompanyWithUsersAndId, UserType } from "../../utils/types";

interface Props {
  companies: CompanyWithUsersAndId[];
  selectedCompanies: CompanyWithUsersAndId[];
  onCompanyChange: (companies: CompanyWithUsersAndId[]) => void;

  selectedUsers: UserType[];
  onUserChange: (users: UserType[]) => void;

  selectedRoles: string[];
  onRoleChange: (roles: string[]) => void;
}

const NotificationAudienceBuilder: React.FC<Props> = ({
  companies,
  selectedCompanies,
  onCompanyChange,
  selectedUsers,
  onUserChange,
  selectedRoles,
  onRoleChange,
}) => {
  const allowedCompanyIds = new Set(selectedCompanies.map((c) => c.id));

  const allUsers = companies
    .filter((c) => allowedCompanyIds.size === 0 || allowedCompanyIds.has(c.id))
    .flatMap((company) =>
      [
        ...company.superAdminDetails,
        ...company.adminDetails,
        ...company.employeeDetails,
        ...company.pendingDetails,
      ].map((user) => ({
        ...user,
        companyName: company.companyName,
      })),
    );

  const formatUserLabel = (u: UserType & { companyName?: string }) =>
    `${u.firstName} ${u.lastName} — ${u.companyName ?? "No company"} · ${u.uid}`;

  return (
    <Stack spacing={2} style={{ marginBottom: "0.5rem" }}>
      <Typography variant="subtitle2">Select Companies</Typography>
      <Autocomplete
        multiple
        options={companies}
        getOptionLabel={(option) => option.companyName}
        value={selectedCompanies}
        onChange={(e, value) => onCompanyChange(value)}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              label={option.companyName}
              {...getTagProps({ index })}
              key={option.id}
            />
          ))
        }
        renderInput={(params) => (
          <TextField {...params} label="Companies" variant="outlined" />
        )}
      />

      <Typography variant="subtitle2">Select Roles</Typography>
      <Autocomplete
        multiple
        options={["superAdmin", "admin", "employee"]}
        getOptionLabel={(option) => option}
        value={selectedRoles}
        onChange={(e, value) => onRoleChange(value)}
        renderTags={(value, getTagProps) =>
          value.map((role, index) => (
            <Chip label={role} {...getTagProps({ index })} key={role} />
          ))
        }
        renderInput={(params) => (
          <TextField {...params} label="Roles" variant="outlined" />
        )}
      />

      <Typography variant="subtitle2">Select Specific Users</Typography>
      <Autocomplete
        multiple
        options={allUsers}
        getOptionLabel={formatUserLabel}
        value={selectedUsers}
        onChange={(e, value) => onUserChange(value)}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              label={formatUserLabel(option)}
              {...getTagProps({ index })}
              key={option.uid}
            />
          ))
        }
        renderInput={(params) => (
          <TextField {...params} label="Users" variant="outlined" />
        )}
      />
    </Stack>
  );
};

export default NotificationAudienceBuilder;
