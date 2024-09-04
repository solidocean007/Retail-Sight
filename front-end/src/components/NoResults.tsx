import { Box, Typography, Button } from "@mui/material";
import SearchOffIcon from '@mui/icons-material/SearchOff';

const NoResults = (onClearFilters: (() => Promise<void>) | undefined) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    height="100%"
    textAlign="center"
    p={3}
  >
    <SearchOffIcon style={{ fontSize: 64, color: 'gray' }} />
    <Typography variant="h6" color="textSecondary" gutterBottom>
      No posts match your current filters.
    </Typography>
    <Button variant="contained" color="primary" onClick={onClearFilters}>
      Clear Filters
    </Button>
  </Box>
);

export default NoResults;