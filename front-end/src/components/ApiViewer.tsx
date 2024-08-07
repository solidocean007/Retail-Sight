import {
  Box,
  Button,
  Container,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import { UserType } from "../utils/types";
import GenerateApiKeyComponent from "./GenerateApiKey/GenerateApiKeyComponent";
import { useState } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";

// const ApiViewer = (user: UserType) => {
const ApiViewer = () => {
  const user = useSelector(selectUser);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isAdmin = user?.role === "admin";
  const isDeveloper = user?.role === "developer";
  const isSuperAdmin = user?.role === "super-admin";
  const companyName = user?.company;

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const NoApiPermissionUser = () => {
    return (
      <Box>
        <Typography>
          Administration permissions required for accessing api keys.
        </Typography>
      </Box>
    );
  };

  return (
    <Container>
      {isSuperAdmin || isAdmin ? (
        <Box>
          <Typography variant="h4">API Management</Typography>
          <Button variant="contained" color="primary" onClick={handleOpenModal}>
            Generate API Key
          </Button>
          <GenerateApiKeyComponent
            open={isModalOpen}
            onClose={handleCloseModal}
          />
          <Divider style={{ margin: "20px 0" }} />
          <Typography variant="h6">How to Use the API Key</Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="1. Communicate Missions to the Sales Team"
                secondary={
                  <>
                    <Typography>
                      Use the <strong>/writeData</strong> endpoint to
                      communicate new missions.
                    </Typography>
                    <Typography>Example:</Typography>
                    <pre>
                      {`
POST https://<region>-<project-id>.cloudfunctions.net/writeData?apiKey=YOUR_API_KEY&collection=missions

Body:
{
  "title": "New Mission Title",
  "description": "Mission description",
  "companyId": "COMPANY_ID"
}
                      `}
                    </pre>
                  </>
                }
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="2. Read Submissions"
                secondary={
                  <>
                    <Typography>
                      Use the <strong>/readData</strong> endpoint to read
                      submitted missions.
                    </Typography>
                    <Typography>Example:</Typography>
                    <pre>
                      {`
GET https://<region>-<project-id>.cloudfunctions.net/readData?apiKey=YOUR_API_KEY&collection=submittedMissions
                      `}
                    </pre>
                  </>
                }
              />
            </ListItem>
          </List>
          <Divider style={{ margin: "20px 0" }} />
          <Typography variant="h6">API Key Usage Guidelines</Typography>
          <List>
            <ListItem>
              <ListItemText primary="Keep your API key secure and do not share it publicly." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Use the API key only for authorized operations." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Regularly rotate your API key for enhanced security." />
            </ListItem>
          </List>
        </Box>
      ) : (
        <NoApiPermissionUser />
      )}
    </Container>
  );
};

export default ApiViewer;
