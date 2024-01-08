// NewSection.tsx
import { useNavigate } from 'react-router';
import { RootState } from '../utils/store';
import './NewSection.css'
import { useSelector } from 'react-redux';
import { selectUser } from '../Slices/userSlice';

const NewSection = () => {
  const currentUser = useSelector((state: RootState) => state.user.currentUser); // why not just use selectUser here?
  const currentUserWithSelectUser = useSelector(selectUser);
  console.log(currentUserWithSelectUser);
  console.log(currentUser);
  const navigate = useNavigate();

  const handleDashboardClick = () => {
    const userIsDeveloper = currentUserWithSelectUser?.role === 'developer';
    console.log(userIsDeveloper);
    if(userIsDeveloper){
      navigate('/developer-dashboard')
    } else {
      navigate('/dashboard')
    }
  }
  return (
    <div className="new-section">
      <button onClick={handleDashboardClick}>{currentUser?.company}</button>
    </div>
  )
}
export default NewSection;