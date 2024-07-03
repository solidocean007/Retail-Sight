// GenerateApiKeyComponent.tsx
import React, { useState } from "react";
import firebase from "firebase/app";
import "firebase/functions";
import { Button, Card, Modal, Typography } from "@mui/material";
import { getFunctions, httpsCallable } from "@firebase/functions";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../utils/firebase";

interface ApiKeyResponse {
  apiKey: string;
}

const GenerateApiKeyComponent = ({ open, onClose } : { open: boolean, onClose : ()=> void}) => {
  const [apiKey, setApiKey] = useState('');
  const dashboardUser = useSelector(selectUser);

  if (!dashboardUser) {
    return null;
  }

  const fetchApiKey = async () => {
    const functions = getFunctions();
    const getApiKey = httpsCallable(functions, 'getApiKey');
    try {
      const result = await getApiKey({ companyId: dashboardUser.companyId });
      console.log("result: ", result);
      setApiKey((result.data as ApiKeyResponse).apiKey);
    } catch (error) {
      console.error('Error fetching API key:', error);
    }
  };

  const handleGenerateNewApiKey = async () => {
    const functions = getFunctions();
    const generateApiKey = httpsCallable(functions, 'generateApiKey');
    try {
      const result = await generateApiKey({ companyId: dashboardUser.companyId, permissions: { canRead: true, canWrite: true } });
      setApiKey((result.data as ApiKeyResponse).apiKey);
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
      <div style={{ padding: 20, background: 'white', margin: 'auto', maxWidth: 400 }}>
        <Typography variant="h6">API Key for {dashboardUser.company}</Typography>
        {apiKey ? (
          <Typography variant="body1">{apiKey}</Typography>
        ) : (
          <Typography variant="body1">No API key found</Typography>
        )}
        <Button onClick={handleGenerateNewApiKey}>Generate New API Key</Button>
        <Button onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
};

export default GenerateApiKeyComponent;