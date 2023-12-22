// ThemeToggle.tsx
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleTheme } from '../actions/themeActions';
import Switch from '@mui/material/Switch';
import Fab from '@mui/material/Fab';
import SettingsIcon from '@mui/icons-material/Settings';
import { RootState } from '../utils/store';

export const ThemeToggle: React.FC = () => {
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state: RootState ) => state.theme.isDarkMode);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleToggleClick = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  // ThemeToggle.tsx
const handleThemeChange = () => {
  dispatch(toggleTheme());

  // Update the body's data-theme attribute
  if (isDarkMode) {
    document.body.setAttribute('data-theme', 'light');
  } else {
    document.body.setAttribute('data-theme', 'dark');
  }
};


  return (
    <div style={{ position: 'fixed', top: '3.5rem', left: '1rem', zIndex: '20' }}>
      <Fab color="primary" aria-label="settings" onClick={handleToggleClick}>
        <SettingsIcon />
      </Fab>

      {isDrawerOpen && (
        <div style={{ position: 'fixed', top: '4rem', left: '4rem', background: '#fff', padding: '1rem', borderRadius: '0.25rem' }}>
          <Switch checked={isDarkMode} onChange={handleThemeChange} />
        </div>
      )}
    </div>
  );
};

