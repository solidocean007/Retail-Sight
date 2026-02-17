import { Box, Button, Typography } from "@mui/material";
import { useState } from "react";
import { selectUser } from "../../Slices/userSlice";
import { useSelector } from "react-redux";

const DeveloperPlatform = () => {
  const dashboardUser = useSelector(selectUser);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleOpenModal = () => setIsModalOpen(true);
    const isDeveloper = dashboardUser?.role === "developer";
  
  return (
    <div className="developer-platform">
      API Keys
      <Box>
        <Typography variant="h6" mb={1}>
          API Keys
          {isDeveloper && (
            <Button variant="contained" onClick={handleOpenModal}>
              API Key
            </Button>
          )}
        </Typography>
        <Button variant="contained" onClick={handleOpenModal}>
          Generate API Key
        </Button>
      </Box>
      Integrations System Status
    </div>
  );
};
export default DeveloperPlatform;
