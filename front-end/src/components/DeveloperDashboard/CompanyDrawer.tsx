// components/admin/CompanyDrawer.tsx
import { Box, Button, Chip, Divider, Drawer, List, ListItem, ListItemIcon, ListItemText, Typography } from "@mui/material";
import { CheckCircle, RadioButtonUnchecked } from "@mui/icons-material";

export default function CompanyDrawer({
  company,
  onClose,
  onChanged,
}: {
  company: any;
  onClose: () => void;
  onChanged: (c: any) => void;
}) {
  const steps = [
    { key: "hasMinUsers", label: "Invite at least 1 admin & 1 employee", done: company.onboarding?.hasMinUsers },
    { key: "hasAccounts", label: "Add accounts", done: company.onboarding?.hasAccounts },
    { key: "hasProductsOrBrands", label: "Add products/brands (suppliers) or follow brands (distributors)", done: company.onboarding?.hasProductsOrBrands },
    { key: "hasGoalsOrQuotas", label: "Create first goal/quota", done: company.onboarding?.hasGoalsOrQuotas },
  ];

  async function verifyAndActivate() {
    // callable function: set companyVerified=true, accessStatus limited/on based on score,
    // send onboarding email, write audit log.
  }

  async function suspendAccess() {
    // callable function: accessStatus='off'
  }

  return (
    <Drawer anchor="right" open onClose={onClose}>
      <Box p={2} width={420} display="flex" flexDirection="column" gap={2}>
        <Typography variant="h6">{company.companyName}</Typography>
        <Box display="flex" gap={1} alignItems="center">
          <Chip label={`Tier: ${company.tier}`} size="small" />
          <Chip label={`Access: ${company.accessStatus.toUpperCase()}`} size="small" />
          {company.companyVerified && <Chip label="Verified" color="success" size="small" />}
        </Box>

        <Divider />

        <Typography variant="subtitle2">Onboarding ({company.onboardingScore}%)</Typography>
        <List dense>
          {steps.map(s => (
            <ListItem key={s.key}>
              <ListItemIcon>
                {s.done ? <CheckCircle fontSize="small" color="success" /> : <RadioButtonUnchecked fontSize="small" />}
              </ListItemIcon>
              <ListItemText primary={s.label} />
              {!s.done && (
                <Button size="small" variant="outlined" onClick={() => {/* deep link to that screen */}}>
                  Fix
                </Button>
              )}
            </ListItem>
          ))}
        </List>

        <Divider />

        <Typography variant="subtitle2">Quick actions</Typography>
        <Box display="flex" flexDirection="column" gap={1}>
          <Button variant="outlined" onClick={() => {/* open Invite Users modal */}}>Invite users</Button>
          <Button variant="outlined" onClick={() => {/* open CSV import */}}>Import accounts</Button>
          <Button variant="outlined" onClick={() => {/* create sample goal */}}>Create sample goal</Button>
          <Button variant="outlined" onClick={() => {/* brand linking */}}>Select brands</Button>
        </Box>

        <Divider />

        <Box display="flex" gap={1}>
          {!company.companyVerified ? (
            <Button variant="contained" onClick={verifyAndActivate}>Verify & Activate</Button>
          ) : (
            <Button variant="outlined" color="warning" onClick={suspendAccess}>Suspend</Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </Box>
      </Box>
    </Drawer>
  );
}
