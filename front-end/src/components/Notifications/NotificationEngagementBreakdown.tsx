import React from "react";
import { Card, CardContent, Typography, Stack } from "@mui/material";

interface Props {
  clickedFrom: {
    push: number;
    modal: number;
    dropdown: number;
  };
}

const NotificationEngagementBreakdown: React.FC<Props> = ({
  clickedFrom,
}) => {
  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>
          Engagement Source
        </Typography>

        <Stack spacing={1}>
          <Typography>Push: {clickedFrom.push}</Typography>
          <Typography>Modal: {clickedFrom.modal}</Typography>
          <Typography>Dropdown: {clickedFrom.dropdown}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default NotificationEngagementBreakdown;
