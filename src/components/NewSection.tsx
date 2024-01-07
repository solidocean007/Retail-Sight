// NewSection.tsx
import { useNavigate } from 'react-router';
import { RootState } from '../utils/store';
import './NewSection.css'
import { useSelector } from 'react-redux';

const NewSection = () => {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const navigate = useNavigate();
  return (
    <div className="new-section">
      <button onClick={() => navigate('/dashboard')}>{currentUser?.company}</button>
    </div>
  )
}
export default NewSection;