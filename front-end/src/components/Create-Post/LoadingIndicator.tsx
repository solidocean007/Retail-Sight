import React from "react";
import "./LoadingIndicator.css";
// import { Box, CircularProgress, LinearProgress, Typography } from "@mui/material";
import { Box, LinearProgress, Typography } from "@mui/material";

interface LoadingIndicatorProps {
  progress: number; // Progress in percentage
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ progress }) => {
  const rounded = Math.round(progress);
  return (
    <Box position="relative" width="80%" mt={1}>
      {/* the bar itself */}
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 30, // ← thickness
          borderRadius: 5, // round the bar’s corners
          "& .MuiLinearProgress-bar": {
            borderRadius: 5, // round the fill segment
          },
        }}
      />

      {/* overlay the text, centered */}
      <Box
        position="absolute"
        top={0}
        left={0}
        width="100%"
        height="100%"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Typography
          variant="subtitle1"
          component="div"
          color="textPrimary"
          sx={{ fontWeight: "bold" }}
        >
          {rounded}%
        </Typography>
      </Box>
    </Box>
  );
};

export default LoadingIndicator;
