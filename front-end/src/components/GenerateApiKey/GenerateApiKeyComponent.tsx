// GenerateApiKeyComponent.tsx
import React, { useState } from "react";
import "firebase/functions";
import { Button, Card, Modal, Typography } from "@mui/material";
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


const GenerateApiKeyComponent = ({ open, onClose }: { open: boolean, onClose: () => void }) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [permissions, setPermissions] = useState<PermissionsType['permissions'] | null>(null);
  const dashboardUser = useSelector(selectUser);

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
      };
      const result = await generateApiKey({ companyId: dashboardUser.companyId, permissions });
      console.log(result.data.apiKey);
      setPermissions(permissions);
    } catch (error) {
      console.error('Error generating API key:', error);
    }
  };

  React.useEffect(() => {
    if (open) {
      fetchApiKey();
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose}>
      <Card style={{ padding: 20, background: 'white', margin: 'auto', maxWidth: 400 }}>
        <Typography variant="h6">API Key for {dashboardUser.company}</Typography>
        {apiKey ? (
          <>
            <Typography variant="body1">{apiKey}</Typography>
            <Typography variant="body2">Permissions: {JSON.stringify(permissions, null, 2)}</Typography>
          </>
        ) : (
          <Typography variant="body1">No API key found</Typography>
        )}
        <Button onClick={handleGenerateNewApiKey}>Generate New API Key</Button>
        <Button onClick={onClose}>Close</Button>
      </Card>
    </Modal>
  );
};

export default GenerateApiKeyComponent;