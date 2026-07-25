import React from "react";
import { Card, CardContent, Typography, Stack, Box } from "@mui/material";

interface Props {
  clickedFrom: {
    push: number;
    modal: number;
    dropdown: number;
    email?: number;
  };
}

const NotificationEngagementBreakdown: React.FC<Props> = ({ clickedFrom }) => {
  const rows: { label: string; value: number }[] = [
    { label: "Push notification", value: clickedFrom.push ?? 0 },
    { label: "Email link", value: clickedFrom.email ?? 0 },
    { label: "Notifications page", value: clickedFrom.modal ?? 0 },
    { label: "Header dropdown", value: clickedFrom.dropdown ?? 0 },
  ];

  const total = rows.reduce((sum, r) => sum + r.value, 0);

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>
          Engagement Source
        </Typography>

        <Stack spacing={1}>
          {rows.map((r) => (
            <Box
              key={r.label}
              sx={{ display: "flex", justifyContent: "space-between" }}
            >
              <Typography>{r.label}</Typography>
              <Typography fontWeight={r.value ? 600 : 400}>
                {r.value}
              </Typography>
            </Box>
          ))}

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "1px solid",
              borderColor: "divider",
              pt: 1,
              mt: 1,
            }}
          >
            <Typography color="text.secondary">Total clicks</Typography>
            <Typography color="text.secondary">{total}</Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default NotificationEngagementBreakdown;
