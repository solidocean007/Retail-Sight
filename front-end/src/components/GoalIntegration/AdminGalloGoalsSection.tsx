// components/Gallo/GalloGoalsSection.tsx
import { Box, Typography } from "@mui/material";
import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  count?: number;
  tone?: "default" | "archived" | "disabled";
  children: React.ReactNode;
};

const AdminGalloGoalsSection: React.FC<Props> = ({
  title,
  subtitle,
  count,
  tone = "default",
  children,
}) => {
  if (!children) return null;

  return (
    <Box mb={4} className={`admin-gallo-section admin-gallo-section--${tone}`}>
      <Box mb={1} className="admin-gallo-section__header">
        <Typography variant="h6">
          {title}
          {typeof count === "number" && (
            <span className="admin-gallo-section__count">{count}</span>
          )}
        </Typography>
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
