// MissionSelection.tsx
import React, { useEffect, useState } from "react";
import { Box, Checkbox, Modal, Typography } from "@mui/material";
import { useAppDispatch } from "../../utils/store";
import {
  fetchCompanyMissions,
  fetchMissions,
} from "../../thunks/missionsThunks";
import { CompanyMissionType, MissionType } from "../../utils/types";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";

interface MissionSelectionProps {
  open: boolean;
  onClose: () => void;
  setSelectedCompanyMission: React.Dispatch<
    React.SetStateAction<CompanyMissionType | undefined>
  >;
  setSelectedMission: React.Dispatch<React.SetStateAction<MissionType | null>>;
}

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "100%",
  bgcolor: "#ffffff",
  border: "2px solid #000",
  boxShadow: 24,
  p: 2,
  margin: "10px",
};

export const MissionSelection: React.FC<MissionSelectionProps> = ({
  open,
  onClose,
  setSelectedCompanyMission,
  setSelectedMission,
}) => {
  const dispatch = useAppDispatch();
  const userData = useSelector(selectUser);
  const [companyMissions, setCompanyMissions] = useState<CompanyMissionType[]>(
    [],
  );
  const [missions, setMissions] = useState<MissionType[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const fetchMissionsData = async () => {
      if (userData?.companyId) {
        const companyMissionsAction = await dispatch(
          fetchCompanyMissions(userData.companyId),
        );
        const companyMissionsPayload =
          companyMissionsAction.payload as CompanyMissionType[];

        setCompanyMissions(companyMissionsPayload);

        const missionPromises = companyMissionsPayload.map((companyMission) =>
          dispatch(fetchMissions(companyMission.missionId)),
        );
        const missionResults = await Promise.all(missionPromises);
        const missionData = missionResults.map(
          (result) => result.payload as MissionType,
        );

        setMissions(missionData);
      }
    };

    fetchMissionsData();
  }, [dispatch, userData?.companyId]);

  const handleMissionSelect = (companyMission: CompanyMissionType) => {
    const mission = missions.find((m) => m.id === companyMission.missionId);
    setSelectedMission(mission || null); // Set the corresponding MissionType
    setSelectedMissionId(companyMission.missionId);
    setSelectedCompanyMission(companyMission);
    onClose(); // Close the modal after selecting the mission
  };

  console.log("companyMissions: ", companyMissions);
  console.log("missions: ", missions);

  return (
    <Modal open={open} onClose={onClose} sx={style}>
      <Box>
        <h2>Select a Mission</h2>
        <ul>
          {companyMissions.map((companyMission: CompanyMissionType) => {
            const mission = missions.find(
              (m) => m.id === companyMission.missionId,
            );
            return (
              <li
                key={companyMission.id}
                onClick={() => handleMissionSelect(companyMission)}
              >
                <Checkbox
                  checked={selectedMissionId === companyMission.missionId}
                />
                <Typography variant="body1">
                  Mission Name: {mission?.missionTitle || "Loading..."}
                </Typography>
                <Typography variant="body2">
                  Description: {mission?.missionDescription || "Loading..."}
                </Typography>
              </li>
            );
          })}
        </ul>
      </Box>
    </Modal>
  );
};
