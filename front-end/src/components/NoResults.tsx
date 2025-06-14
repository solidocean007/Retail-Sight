import { Box, Typography, Button } from "@mui/material";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import React from "react";

interface NoResultsProps {
  // onClearFilters: () => Promise<void> | undefined;
}

const NoResults: React.FC<NoResultsProps> = () => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100%"
      textAlign="center"
      p={3}
    >
      <SearchOffIcon style={{ fontSize: 64, color: "gray" }} />
      <Typography variant="h6" color="textSecondary" gutterBottom>
        No posts match your current filters.
      </Typography>
      {/* <Button variant="contained" color="primary" onClick={onClearFilters}> */}
      {/* <Button variant="contained" color="primary">
        Clear Filters
      </Button> */}
    </Box>
  );
};

export default NoResults;
