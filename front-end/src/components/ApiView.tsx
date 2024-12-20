//ApiView.tsx
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
import ApiKeyModal from "./ApiKeyLogic/ApiKeyModal";
import { handleSubmitNewExternalApiKey } from "./ApiKeyLogic/apiKeyService";

type ExternalApiKey = {
  name: string;
  key: string;
};

const ApiView = () => {
  const user = useSelector(selectUser);
  const companyId = user?.companyId;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [externalApiKey, setExternalApiKey] = useState("");
  const [externalApiName, setExternalApiName] = useState("");
  const [storedExternalApiKeys, setStoredExternalApiKeys] = useState<
    ExternalApiKey[]
  >([]);
  const [message, setMessage] = useState("");

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

  // const handleSubmitNewExternalApiKey = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   try {
  //     const response = await fetch("https://my-fetch-data-api.vercel.app/api/storeExternalApiKey", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({companyId, externalApiName, externalApiKey }), // just added companyId
  //     });

  //     console.log(response.body);

  //     const data = await response.json();
  //     if (response.ok) {
  //       setMessage("External API Key added successfully!");
  //     } else {
  //       setMessage(`Error: ${data.error}`);
  //     }
  //   } catch (error) {
  //     console.error("Error submitting external API key:", error);
  //     setMessage("Failed to add external API key.");
  //   }
  // };

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
                    {/* Use Typography for inline text */}
                    <Typography variant="body2" component="span">
                      Use the <strong>writeData</strong> endpoint to communicate
                      new missions to the missions endpoint.
                    </Typography>

                    {/* Separate block-level elements in their own container */}
                    <Box mt={1}>
                      <Typography variant="body2" component="span">
                        Example:
                      </Typography>
                      <Box
                        component="pre"
                        sx={{
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          mt: 1,
                        }}
                      >
                        {`
POST https://us-central1-retail-sight.cloudfunctions.net/writeData?apiKey=YOUR_API_KEY&collection=missions

Body:
{
  "missionTitle": "New Mission Title",
  "missionDescription": "Mission description",
}
              `}
                      </Box>
                    </Box>
                  </>
                }
              />
            </ListItem>

            <ListItem>
              <ListItemText
                primary="2. Communicate Missions to the Sales Team or Company"
                secondary={
                  <>
                    {/* Use Typography for inline text */}
                    <Typography variant="body2" component="span">
                      Use the <strong>writeData</strong> endpoint to communicate
                      new missions to the companyMissions endpoint.
                    </Typography>

                    {/* Separate block-level elements in their own container */}
                    <Box mt={1}>
                      <Typography variant="body2" component="span">
                        Example:
                      </Typography>
                      <Box
                        component="pre"
                        sx={{
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          mt: 1,
                        }}
                      >
                        {`
POST https://us-central1-retail-sight.cloudfunctions.net/writeData?apiKey=YOUR_API_KEY&collection=companyMissions

Body:
{
  "missionId": {mission.id},
  "companyIdAssigned": {company.id},
  "missionStart": {Timestamp} Example: "2024-9-01T23:59:59Z",
  "missionEnd": {Timestamp} Example: "2024-12-31T23:59:59Z"
}
              `}
                      </Box>
                    </Box>
                  </>
                }
              />
            </ListItem>

            <ListItem>
              <ListItemText
                primary="3. Read Submissions"
                secondary={
                  <>
                    {/* Use Typography for inline text */}
                    <Typography variant="body2" component="span">
                      Use the <strong>/readData</strong> endpoint to read
                      submitted missions.
                    </Typography>

                    {/* Separate block-level elements in their own container */}
                    <Box mt={1}>
                      <Typography variant="body2" component="span">
                        Example:
                      </Typography>
                      <Box
                        component="pre"
                        sx={{
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          mt: 1,
                        }}
                      >
                        {`
GET https://us-central1-retail-sight.cloudfunctions.net/readData?apiKey=YOUR_API_KEY&collection=submittedMissions
              `}
                      </Box>
                    </Box>
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
          <Typography variant="h6">Add External API Key</Typography>
          <form onSubmit={(e) => handleSubmitNewExternalApiKey(e, companyId)}>
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
              type="submit"
              variant="contained"
              color="secondary"
              style={{ marginTop: "10px" }}
            >
              Submit
            </Button>
          </form>

          <Divider style={{ margin: "20px 0" }} />
          <Typography variant="h6">Stored External API Keys</Typography>
          <List>
            {storedExternalApiKeys.map((externalApiKey, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={externalApiKey.name} // Property 'name' does not exist on type 'never'
                  secondary={externalApiKey.key} // Property 'key' does not exist on type 'never'
                />
              </ListItem>
            ))}
          </List>
        </Box>
      ) : (
        <NoApiPermissionUser />
      )}
      <ApiKeyModal open={isModalOpen} onClose={handleCloseModal} />
      {message && (
        <Typography variant="body1" style={{ marginTop: "10px" }}>
          {message}
        </Typography>
      )}
    </Container>
  );
};

export default ApiView;
