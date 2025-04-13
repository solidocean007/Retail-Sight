// front-end/src/theme.ts
import { createTheme } from "@mui/material/styles";

declare module '@mui/material/styles' {
  interface Theme {
    custom: { [key: string]: string };
  }
  interface ThemeOptions {
    custom?: { [key: string]: string };
  }
}

export const getTheme = (isDarkMode: boolean) => {

  

  const getCssVar = (name: string, fallback = '#000') => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!value) {
      console.warn(`⚠️ Missing CSS variable: ${name}, using fallback: ${fallback}`);
    }
    return value || fallback;
  };
  
  
  const themeVars = {
    backgroundBody: getCssVar("--background-body"),
    postCardBackground: getCssVar("--post-card-background"),
    textColor: getCssVar("--text-color"),
    buttonBackground: getCssVar("--button-background"),
    buttonTextColor: getCssVar("--button-text-color"),
    borderColor: getCssVar("--border-color"),
    inputBackground: getCssVar("--input-background"),
    inputTextColor: getCssVar("--input-text-color"),
    formBackground: getCssVar("--form-background-color"),
    menuBackground: getCssVar("--menu-background-color"),
    altMenuBackground: getCssVar("--alt-menu-background-color"),
    footerBackground: getCssVar("--footer-background-color"),
    drawerColor: getCssVar(
      isDarkMode ? "--drawer-color-dark" : "--drawer-color-light"
    ),
  };

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
      fontFamily:
        "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
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
    },
    custom: { // Object literal may only specify known properties, and 'custom' does not exist in type 'Omit<ThemeOptions, "components"> & Pick<CssVarsThemeOptions, "components" | "defaultColorScheme" | "colorSchemes"> & { ...; }'
      ...themeVars, // You can now access these in your app via theme.custom.*
    },
  });
};

