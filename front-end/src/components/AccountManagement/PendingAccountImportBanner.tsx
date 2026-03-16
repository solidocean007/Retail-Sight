import { Box, Button, Typography } from "@mui/material";

interface Props {
  importDoc: any;
  onReview: () => void;
}

export default function PendingAccountImportBanner({
  importDoc,
  onReview,
}: Props) {
  return (
    <Box
      sx={{
        background: "#fff3cd",
        border: "1px solid #ffeeba",
        padding: 2,
        marginBottom: 2,
        borderRadius: 1,
      }}
    >
      <Typography variant="body1" sx={{ mb: 1 }}>
        ⚠️ <strong>{importDoc.totalChanges}</strong> account changes detected.
      </Typography>

      <Typography variant="body2" sx={{ mb: 2 }}>
        These changes require review before they are applied.
      </Typography>

      <Button variant="contained" onClick={onReview}>
        Review Changes
      </Button>
    </Box>
  );
}