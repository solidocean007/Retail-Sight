// MissionSelection.tsx
import React, { useEffect } from "react";
import { Box, Container, Modal, Typography } from "@mui/material";
import CompanyMissionsComponent from "./CompanyMissionsComponent";

interface MissionSelectionProps {
  open: boolean;
  onClose: () => void;
}

// useEffect(()=> {
  // fetch missions by companyId
  // sort missions by date newest to oldest
  // add to redux
  // add to indexedDb
  // when should i fetch again?
  // it could be real time updates to companyMissions where the users companyId is added to a new doc
  // should i create a missions slice along with a missions thunks
// },[])

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 600,
  bgcolor: "#ffffff",
  border: "2px solid #000",
  boxShadow: 24,
  p: 2,
};

export const MissionSelection: React.FC<MissionSelectionProps> = ({ open, onClose }) => {
  console.log('MissionSelection')
  return (
    <div className="mission=selection">
      <Modal open={open} onClose={onClose} sx={style}>
      <Container>
        <CompanyMissionsComponent />
      </Container>
    </Modal>
    </div>
    
  );
};
