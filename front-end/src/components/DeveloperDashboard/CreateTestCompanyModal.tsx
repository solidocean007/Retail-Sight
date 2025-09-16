import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
} from "@mui/material";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (companyData: any) => void;
}

const defaultCompanyData = {
  verified: false,
  userType: "distributor", // default, can change
  subscriptionTier: "free",
  connections: [],
  createdAt: new Date().toISOString(),
};

export const CreateTestCompanyModal: React.FC<Props> = ({
  open,
  onClose,
  onCreate,
}) => {
  const [companyName, setCompanyName] = useState("");

  const handleSubmit = () => {
    if (!companyName.trim()) return;
    onCreate({
      ...defaultCompanyData,
      companyName,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create Test Company</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <TextField
            label="Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            fullWidth
            required
          />
          <Typography variant="body2" color="textSecondary">
            Defaults: Distributor, Free Tier, Not Verified
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};
