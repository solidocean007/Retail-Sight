// components/Gallo/GalloGoalsSection.tsx
import { Box, Typography } from "@mui/material";
import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

const AdminGalloGoalsSection: React.FC<Props> = ({
  title,
  subtitle,
  children,
}) => {
  if (!children) return null;

  return (
    <Box mb={4}>
      <Box mb={1}>
        <Typography variant="h6">{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      <Box className="programs-wrapper">{children}</Box>
    </Box>
  );
};

export default AdminGalloGoalsSection;
