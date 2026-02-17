import React from "react";
import { Card, CardContent, Typography, Grid } from "@mui/material";

interface Props {
  sent: number;
  read: number;
  clicked: number;
  ctr: number;
  readRate: number;
}

const percent = (v: number) => `${(v * 100).toFixed(1)}%`;

const NotificationStatsCard: React.FC<Props> = ({
  sent,
  read,
  clicked,
  ctr,
  readRate,
}) => {
  return (
    <Card>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Sent</Typography>
            <Typography variant="h6">{sent}</Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="subtitle2">Read</Typography>
            <Typography variant="h6">
              {read} ({percent(readRate)})
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="subtitle2">Clicked</Typography>
            <Typography variant="h6">
              {clicked} ({percent(ctr)})
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default NotificationStatsCard;
