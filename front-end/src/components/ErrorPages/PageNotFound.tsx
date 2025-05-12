import { useNavigate } from "react-router-dom";
import { Box, Typography, Button } from "@mui/material";

export const PageNotFound = () => {
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
        🗺️ Page Not Found
      </Typography>
      <Typography variant="body1" gutterBottom>
        The page you are looking for does not exist or may have been moved.
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Please check the URL or use the button below to return to the homepage.
      </Typography>

      <Box mt={3}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate("/")}
        >
          Go to Home
        </Button>
      </Box>
    </Box>
  );
};

export default PageNotFound;
