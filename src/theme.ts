// theme.ts
import { createTheme } from '@mui/material/styles';

// Define your color palette
const colors = {
  prussianBlue: '#0B3C5D',
  skyBlue: '#328CC1',
  goldLeaf: '#D9B310',
  ivoryBlack: '#1D2731',
};

export const getTheme = (isDarkMode: boolean) => createTheme({
  palette: {
    mode: isDarkMode ? 'dark' : 'light',
    primary: {
      main: isDarkMode ? colors.ivoryBlack : colors.skyBlue, // Choose colors based on theme
    },
    secondary: {
      main: isDarkMode ? colors.goldLeaf : colors.prussianBlue,
    },
    // You can continue to define other colors based on your theme
    error: {
      main: '#f44336', // You may want to define a variable for this
    },
    warning: {
      main: '#ff9800', // And for this
    },
    info: {
      main: '#2196f3', // And this
    },
    success: {
      main: '#4caf50', // And this
    },
  },
  // Any other theme customizations go here
});
