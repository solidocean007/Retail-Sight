// theme.ts
import { createTheme } from '@mui/material/styles';

export const getTheme = (isDarkMode: boolean) => createTheme({
  palette: {
    mode: isDarkMode ? 'dark' : 'light',
    // You can add your custom primary and secondary colors here
    primary: {
      main: '#556cd6', // example color
    },
    secondary: {
      main: '#19857b', // example color
    },
    // Additional colors
    error: {
      main: '#f44336', // Example error color
    },
    warning: {
      main: '#ff9800', // Example warning color
    },
    info: {
      main: '#2196f3', // Example info color
    },
    success: {
      main: '#4caf50', // Example success color
    },
  },
  // Any other theme customizations
});