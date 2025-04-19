import { createTheme } from "@mui/material/styles";

// 🔧 Extend the MUI theme to include our custom design tokens
declare module '@mui/material/styles' {
  interface Theme {
    custom: { [key: string]: string };
  }
  interface ThemeOptions {
    custom?: { [key: string]: string };
  }
}

// 🔍 Utility to safely read CSS variables from the DOM
const getCssVar = (name: string, fallback = '#000') => {
  if (typeof window === 'undefined') return fallback; // Prevent SSR crash
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
};

// 🚀 Main Theme Function
export const getTheme = (isDarkMode: boolean) => {
  const themeVars = {
    // 🌈 Color Tokens from theme.css
    backgroundBody: getCssVar("--background-body", "#f3efff"),
    postCardBackground: getCssVar("--post-card-background", "#ffffff"),
    textColor: getCssVar("--text-color", "#2e2e2e"),

    buttonBackground: getCssVar("--button-background", "#5e82f1"),
    buttonBackgroundHover: getCssVar("--button-background-hover", "#4a6ed4"),
    buttonTextColor: getCssVar("--button-text-color", "#ffffff"),

    borderColor: getCssVar("--border-color", "#dcdcdc"),

    inputBackground: getCssVar("--input-background", "#ffffff"),
    inputTextColor: getCssVar("--input-text", "#111"),

    formBackground: getCssVar("--background-overlay", "#e9e4f0"),
    menuBackground: getCssVar("--menu-background-color", "#ffffff"),
    altMenuBackground: getCssVar("--alt-menu-background-color", "#f3f4f6"),
    footerBackground: getCssVar("--footer-background-color", "#f3f4f6"),
    drawerColor: getCssVar("--drawer-background", "#ffffff"),

    cardRadius: getCssVar("--card-radius", "16px"),
    cardShadow: getCssVar("--card-shadow", "0 15px 35px rgba(0, 0, 0, 0.08)"),

    // Optional - for outlined button styles
    outlinedButtonBorder: getCssVar("--outlined-button-border", "#444"),
    outlinedButtonHover: getCssVar("--outlined-button-hover", "#ddd"),
  };

  // 🌟 Create and return the Material UI theme
  return createTheme({
    palette: {
      mode: isDarkMode ? "dark" : "light",
      background: {
        default: themeVars.backgroundBody,
        paper: themeVars.postCardBackground,
      },
      text: {
        primary: themeVars.textColor,
      },
      primary: {
        main: themeVars.buttonBackground,
        contrastText: themeVars.buttonTextColor,
      },
      divider: themeVars.borderColor,
    },
    typography: {
      fontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            background: themeVars.backgroundBody,
            color: themeVars.textColor,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: themeVars.cardRadius,
            textTransform: "none",
            fontWeight: 600,
          },
          containedPrimary: {
            backgroundColor: getCssVar("--primary-button-bg", "#111"),
            color: themeVars.buttonTextColor,
            "&:hover": {
              backgroundColor: getCssVar("--primary-button-hover", "#222"),
            },
          },
          containedSecondary: {
            backgroundColor: getCssVar("--secondary-button-bg", "#e4e4e4"),
            color: themeVars.textColor,
            "&:hover": {
              backgroundColor: getCssVar("--secondary-button-hover", "#ccc"),
            },
          },
          outlined: {
            borderColor: getCssVar("--outlined-button-border", "#444"),
            color: themeVars.textColor,
            "&:hover": {
              backgroundColor: getCssVar("--outlined-button-hover", "#eee"),
            },
          },
        },
      },
      
    },
    custom: {
      ...themeVars,
    },
  });
};


