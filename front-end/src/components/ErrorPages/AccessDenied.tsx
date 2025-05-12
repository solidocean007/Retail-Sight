import { useNavigate } from "react-router-dom";
import { Box, Typography, Button } from "@mui/material";

export const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      height="100vh"
      textAlign="center"
      sx={{ px: 2 }}
    >
      <Typography variant="h2" gutterBottom>
        🚫 Access Denied
      </Typography>
      <Typography variant="body1" gutterBottom>
        You do not have permission to view this page. This may be because the
        link is invalid, expired, or you do not have the necessary access
        rights.
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Please check the link you followed or contact support if you believe
        this is a mistake.
      </Typography>

      <Box mt={3} display="flex" gap={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate("/")}
        >
          Go to Home
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate("/dashboard")}
        >
          Go to Dashboard
        </Button>
        <Button variant="outlined" onClick={() => navigate("/contact")}>
          Contact Support
        </Button>
      </Box>
    </Box>
  );
};

export default AccessDenied;
