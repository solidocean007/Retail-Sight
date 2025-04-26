// src/Slices/themeSlice.ts
import { createSlice } from '@reduxjs/toolkit';

interface ThemeState {
  isDarkMode: boolean;
}

const initialState: ThemeState = {
  isDarkMode: false, // Default to light mode
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setDarkMode(state, action) {
      state.isDarkMode = action.payload;

      // Immediately sync body attribute and localStorage
      document.body.setAttribute("data-theme", action.payload ? "dark" : "light");
      localStorage.setItem('theme', action.payload ? "dark" : "light");
    },
    toggleTheme(state) {
      state.isDarkMode = !state.isDarkMode;

      // Immediately sync body attribute and localStorage
      document.body.setAttribute("data-theme", state.isDarkMode ? "dark" : "light");
      localStorage.setItem('theme', state.isDarkMode ? "dark" : "light");
    },
  },
});

export const { setDarkMode, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
