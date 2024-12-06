// GenerateApiKeyComponent.tsx
import React, { useState } from "react";
import "firebase/functions";
import { Box, Button, Card, CircularProgress, Modal, Typography } from "@mui/material";
import { getFunctions, httpsCallable } from "@firebase/functions";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { PermissionsType } from "../../utils/types";

interface ApiKeyResponse {
  apiKey: string;
  permissions: PermissionsType['permissions'];
}

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
};

const ApiKeyModal = ({ open, onClose }: { open: boolean, onClose: () => void }) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [permissions, setPermissions] = useState<PermissionsType['permissions'] | null>(null);
  const dashboardUser = useSelector(selectUser);
  const [loadingKey, setLoadingKey] = useState(false);

  if (!dashboardUser) {
    return null;
  }

  const fetchApiKey = async () => {
    const functions = getFunctions();
    const getApiKey = httpsCallable(functions, 'getApiKey');
    try {
      const result = await getApiKey({ companyId: dashboardUser.companyId });
      const { apiKey, permissions } = result.data as ApiKeyResponse;
      setApiKey(apiKey);
      setPermissions(permissions);
      setLoadingKey(false);
    } catch (error) {
      console.error('Error fetching API key:', error);
    }
  };

  const handleGenerateNewApiKey = async () => {
    const functions = getFunctions();
    const generateApiKey = httpsCallable(functions, 'generateApiKey');
    try {
      const permissions: PermissionsType['permissions'] = {
        missions: { canRead: true, canWrite: true },
        companyMissions: { canRead: true, canWrite: true },
        submittedMissions: { canRead: true, canWrite: true },
        posts: { canRead: true, canWrite: true },
      };
      const result = await generateApiKey({ companyId: dashboardUser.companyId, permissions });
      const { apiKey } = result.data as ApiKeyResponse;
      setApiKey(apiKey);
      setPermissions(permissions);
      setLoadingKey(false);
    } catch (error) {
      console.error('Error generating API key:', error);
    }
  };

  React.useEffect(() => {
    if (open) {
      setLoadingKey(true);
      fetchApiKey();
    }
  }, [open]);

  const handleCopyToClipboard = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey).then(
        () => {
          console.log("API Key copied to clipboard successfully!");
        },
        (err) => {
          console.error("Failed to copy API Key to clipboard: ", err);
        }
      );
    }
  };
  
  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Typography variant="h6">API Key for {dashboardUser.company}</Typography>
        <Box>
          {loadingKey && <CircularProgress />}
        </Box>
        {apiKey ? (
          <>
            <Typography variant="body1">{apiKey}</Typography>
            <Typography variant="body2">Permissions: {JSON.stringify(permissions, null, 2)}</Typography>
          </>
        ) : (
          <Typography variant="body1">No API key found</Typography>
        )}
        <Button onClick={handleCopyToClipboard}>Copy to clipboard</Button>
        <Button onClick={handleGenerateNewApiKey}>Generate New API Key</Button>
        <Button onClick={onClose}>Close</Button>
      </Box>
    </Modal>
  );
};

export default ApiKeyModal;