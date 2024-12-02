import React from 'react';
import './LoadingIndicator.css';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingIndicatorProps {
  progress: number; // Progress in percentage
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ progress }) => {
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000, // Ensure it's on top of all components
      }}
    >
      <CircularProgress size={80} />
      <Typography sx={{ mt: 2, color: "#fff" }}>{`Uploading... ${progress}%`}</Typography>
    </Box>
  );
};

export default LoadingIndicator;

