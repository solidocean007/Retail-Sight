// Routes.tsx
import { Route, Routes } from 'react-router-dom';
import { SignUpLogin } from '../components/SignUpLogIn';
import { UserHomePage } from '../components/UserHomePage';
import { UserProfilePage } from '../components/UserProfilePage';
import { CreatePost } from '../components/CreatePost';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<SignUpLogin />} />
      <Route path="/userHomePage" element={<UserHomePage />} />
      <Route path="/profile-page" element={<UserProfilePage />} />
      <Route path="/createPost" element={<CreatePost />} />
    </Routes>
  );
};