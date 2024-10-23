import {
  Box,
  Button,
  Container,
  Divider,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import ApiKeyModal from "./GenerateApiKey/ApiKeyModal";

type ExternalApiKey = {
  name: string;
  key: string;
};

const ApiView = () => {
  const user = useSelector(selectUser);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [externalApiKey, setExternalApiKey] = useState("");
  const [externalApiName, setExternalApiName] = useState("");
  const [storedExternalApiKeys, setStoredExternalApiKeys] = useState<ExternalApiKey[]>([]); // Proper typing here

  const isAdmin = user?.role === "admin";
  const isDeveloper = user?.role === "developer";
  const isSuperAdmin = user?.role === "super-admin";

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleExternalApiKeySubmit = () => {
    const newApiKey: ExternalApiKey = { name: externalApiName, key: externalApiKey };
    setStoredExternalApiKeys((prevKeys) => [...prevKeys, newApiKey]);
    setExternalApiKey("");
    setExternalApiName("");
  };

  const NoApiPermissionUser = () => (
    <Box>
      <Typography>
        Administration permissions required for accessing API keys.
      </Typography>
    </Box>
  );

  return (
    <Container>
      {isSuperAdmin || isAdmin ? (
        <Box>
          <Typography variant="h4">API Management</Typography>
          <Button variant="contained" color="primary" onClick={handleOpenModal}>
            Show Internal API Key
          </Button>

          <Divider style={{ margin: "20px 0" }} />
          <Typography variant="h6">How to Use the API Key</Typography>

          <List>
            <ListItem>
              <ListItemText
                primary="1. Create mission for your objective."
                secondary={
                  <>
                    <Typography>
                      Use the <strong>writeData</strong> endpoint to communicate new missions to the missions endpoint.
                    </Typography>
                    <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {`
POST https://us-central1-retail-sight.cloudfunctions.net/writeData?apiKey=YOUR_API_KEY&collection=missions

Body:
{
  "missionTitle": "New Mission Title",
  "missionDescription": "Mission description",
}
                      `}
                    </pre>
                  </>
                }
              />
            </ListItem>

            <ListItem>
              <ListItemText
                primary="2. Communicate Missions to the Sales Team or Company"
                secondary={
                  <>
                    <Typography>
                      Use the <strong>writeData</strong> endpoint to communicate new missions to the companyMissions endpoint.
                    </Typography>
                    <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {`
POST https://us-central1-retail-sight.cloudfunctions.net/writeData?apiKey=YOUR_API_KEY&collection=companyMissions

Body:
{
  "missionId": {mission.id},
  "companyIdAssigned": {company.id},
  "missionStart": "2024-9-01T23:59:59Z",
  "missionEnd": "2024-12-31T23:59:59Z"
}
                      `}
                    </pre>
                  </>
                }
              />
            </ListItem>

            <ListItem>
              <ListItemText
                primary="3. Read Submissions"
                secondary={
                  <>
                    <Typography>
                      Use the <strong>/readData</strong> endpoint to read submitted missions.
                    </Typography>
                    <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {`
GET https://us-central1-retail-sight.cloudfunctions.net/readData?apiKey=YOUR_API_KEY&collection=submittedMissions
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

          <Divider style={{ margin: "20px 0" }} />
          <Typography variant="h6">External API Key Management</Typography>
          <TextField
            label="API Key Name"
            fullWidth
            margin="normal"
            value={externalApiName}
            onChange={(e) => setExternalApiName(e.target.value)}
          />
          <TextField
            label="External API Key"
            fullWidth
            margin="normal"
            value={externalApiKey}
            onChange={(e) => setExternalApiKey(e.target.value)}
          />
          <Button
            variant="contained"
            color="secondary"
            onClick={handleExternalApiKeySubmit}
            style={{ marginTop: "10px" }}
          >
            Save External API Key
          </Button>

          <Divider style={{ margin: "20px 0" }} />
          <Typography variant="h6">Stored External API Keys</Typography>
          <List>
            {storedExternalApiKeys.map((keyData, index) => (
              <ListItem key={index}>
                <ListItemText primary={keyData.name} secondary={keyData.key} />
              </ListItem>
            ))}
          </List>
        </Box>
      ) : (
        <NoApiPermissionUser />
      )}
      <ApiKeyModal open={isModalOpen} onClose={handleCloseModal} />
    </Container>
  );
};

export default ApiView;


