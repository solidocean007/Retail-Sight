// AccountModalSelector.tsx
import {
  Autocomplete,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { CompanyAccountType } from "../../utils/types";

interface AccountModalSelectorProps {
  open: boolean;
  onClose: () => void;
  accounts: CompanyAccountType[] | undefined;
  onAccountSelect: (account: CompanyAccountType) => void;
}

const AccountModalSelector: React.FC<AccountModalSelectorProps> = ({
  open,
  onClose,
  accounts,
  onAccountSelect,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      sx={{
        '& .MuiDialog-container': {
          alignItems: 'flex-start', // Push the dialog toward the top of the screen
        },
      }}
      slotProps={{
        paper: {
          sx: {
            mt: 10, // Margin from the top
            borderRadius: 2,
            boxShadow: 3,
          },
        },
      }}
    >
      <DialogTitle>
        Select Account
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Autocomplete
          options={accounts}
          getOptionLabel={(account) =>
            `${account.accountName} - ${account.accountAddress}`
          }
          onChange={(e, value) => {
            if (value) {
              onAccountSelect(value);
              onClose();
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search account"
              variant="outlined"
              sx={{
                mt: 1,
                "& .MuiInputLabel-root": {
                  top: "4px", // ensures label doesn't get clipped
                },
                "& .MuiInputBase-root": {
                  paddingTop: "10px",
                },
              }}
            />
          )}
          fullWidth
        />
      </DialogContent>
    </Dialog>
  );
};

export default AccountModalSelector;
