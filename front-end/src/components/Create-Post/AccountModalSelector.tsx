// AccountModalSelector.tsx
import {
  Autocomplete,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { CompanyAccountType } from "../../utils/types";

interface AccountModalSelectorProps {
  open: boolean;
  onClose: () => void;
  accounts?: CompanyAccountType[] | undefined;
  onAccountSelect: (account: CompanyAccountType) => void;
  isAllStoresShown: boolean;
  setIsAllStoresShown: (isAllStoresShown: boolean) => void;
  showStoreScopeToggle?: boolean;
  showOriginCompany?: boolean;
}

const AccountModalSelector: React.FC<AccountModalSelectorProps> = ({
  open,
  onClose,
  accounts = [],
  onAccountSelect,
  isAllStoresShown,
  setIsAllStoresShown,
  showStoreScopeToggle = true,
  showOriginCompany = false,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      fullScreen={fullScreen}
      scroll="paper"
      maxWidth="sm"
      sx={{
        "& .MuiDialog-container": {
          alignItems: "flex-start", // Push the dialog toward the top of the screen
        },
      }}
      slotProps={{
        paper: {
          sx: {
            mt: { mt: fullScreen ? 0 : 2 }, // Margin from the top
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
      {showStoreScopeToggle && <Box display="flex" justifyContent="center" mb={2}>
        <Button
          variant={isAllStoresShown ? "contained" : "outlined"}
          onClick={() => setIsAllStoresShown(false)}
          sx={{ mx: 1 }}
        >
          My Stores
        </Button>
        <Button
          variant={!isAllStoresShown ? "contained" : "outlined"}
          onClick={() => setIsAllStoresShown(true)}
          sx={{ mx: 1 }}
        >
          All Stores
        </Button>
      </Box>}

      <DialogContent>
        <Autocomplete
          options={accounts}
          filterOptions={(options, { inputValue }) => {
            const search = inputValue.trim().toLowerCase();
            const matches = search
              ? options.filter((acc) =>
                  `${acc.accountName} ${acc.accountAddress} ${showOriginCompany ? acc.originCompanyName || "" : ""}`
                    .toLowerCase()
                    .includes(search)
                )
              : options;
            return matches.slice(0, 100);
          }}
          noOptionsText="No matching stores"
          getOptionLabel={(account) =>
            `${account.accountName} - ${account.accountAddress}${showOriginCompany && account.originCompanyName ? ` (${account.originCompanyName})` : ""}`
          }
          onChange={(e, value) => {
            if (value) {
              onAccountSelect(value);
              onClose(); // ✅ Only close after real selection
            }
          }}
          onInputChange={(e, value, reason) => {
            // don't close modal while typing
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search account"
              placeholder="Browse stores or search by name, address, or distributor"
              helperText={accounts.length > 100 ? `Showing the first 100 of ${accounts.length} stores. Search to find any store.` : undefined}
              variant="outlined"
              sx={{
                mt: 1,
                "& .MuiInputLabel-root": {
                  top: "4px",
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
