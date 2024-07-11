import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../Slices/userSlice';
import { RootState, useAppDispatch } from '../../utils/store';
import { fetchCompanyMissions } from '../../thunks/missionsThunks';

const CompanyMissionsComponent = () => {
  const dispatch = useAppDispatch();
  const userData = useSelector(selectUser);
  const companyMissions = useSelector((state: RootState) => state.companyMissions);
  console.log(companyMissions);
  useEffect(() => {
    if (userData?.companyId) {
      dispatch(fetchCompanyMissions(userData.companyId));
    }
  }, [dispatch, userData?.companyId]);

  return (
    <div>
      <h2>Company Missions</h2>
      <ul>
        {Object.values(companyMissions).map(mission => (
          <li key={mission.id}>
            Mission ID: {mission.missionId}, Assigned to Company: {mission.companyIdAssigned}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CompanyMissionsComponent;
