// CompanyMissionsComponent.tsx
// CompanyMissionsComponent.tsx
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../Slices/userSlice';
import { RootState, useAppDispatch } from '../../utils/store';
import { fetchCompanyMissions, fetchMissionById, submitSelectedMissions } from '../../thunks/missionsThunks';
import { SubmittedMissionType } from '../../utils/types';

const CompanyMissionsComponent = () => {
  const dispatch = useAppDispatch();
  const userData = useSelector(selectUser);
  const { companyMissions, missions } = useSelector((state: RootState) => state.missions);
  const [selectedMissions, setSelectedMissions] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (userData?.companyId) {
      dispatch(fetchCompanyMissions(userData.companyId));
    }
  }, [dispatch, userData?.companyId]);

  useEffect(() => {
    Object.values(companyMissions).forEach(companyMission => {
      if (companyMission.missionId) {
        dispatch(fetchMissionById(companyMission.missionId));
      }
    });
  }, [companyMissions, dispatch]);

  const handleCheckboxChange = (missionId: string) => {
    setSelectedMissions(prevState => ({
      ...prevState,
      [missionId]: !prevState[missionId]
    }));
  };

  const handleSubmit = () => {
    Object.keys(selectedMissions).forEach(missionId => {
      if (selectedMissions[missionId]) {
        const submittedMission: SubmittedMissionType = {
          companyMissionId: missionId,
          postIdForObjective: "somePostId", // Replace with actual post ID
        };
        dispatch(submitSelectedMissions(submittedMission));
      }
    });
  };

  return (
    <div>
      <h2>Company Missions</h2>
      <ul>
        {Object.values(companyMissions).map(companyMission => {
          const mission = missions[companyMission.missionId];
          return (
            <li key={companyMission.id}>
              <input
                type="checkbox"
                checked={!!selectedMissions[companyMission.missionId]}
                onChange={() => handleCheckboxChange(companyMission.missionId)}
              />
              {mission ? (
                <>
                  <strong>{mission.missionObjective}</strong>: {mission.missionDescription}
                </>
              ) : (
                "Loading mission details..."
              )}
            </li>
          );
        })}
      </ul>
      <button onClick={handleSubmit}>Submit Selected Missions</button>
    </div>
  );
};

export default CompanyMissionsComponent;

