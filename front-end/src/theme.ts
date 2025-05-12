import { createTheme } from "@mui/material/styles";

// 🔧 Extend the MUI theme to include our custom design tokens
declare module "@mui/material/styles" {
  interface Theme {
    custom: { [key: string]: string };
  }
  interface ThemeOptions {
    custom?: { [key: string]: string };
  }
}

// 🚀 Main Theme Function
export const getTheme = (isDarkMode: boolean) => {
  return createTheme({
    palette: {
      mode: isDarkMode ? "dark" : "light",
      background: {
        default: isDarkMode ? "#111827" : "#e2e8f0", // fallback only
        paper: isDarkMode ? "#1f2937" : "#ffffff",
      },
      text: {
        primary: isDarkMode ? "#f3f4f6" : "#111827",
      },
      primary: {
        main: isDarkMode ? "#3b82f6" : "#3b82f6", // same in both modes
        contrastText: "#ffffff",
      },
      divider: isDarkMode ? "#444" : "#dcdcdc",
    },
    typography: {
      fontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            background: "var(--background-body)",
            color: "var(--text-color)",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            color: "var(--text-color)",
            borderRadius: "var(--card-radius)",
            textTransform: "none",
            fontWeight: 600,
          },
          containedPrimary: {
            backgroundColor: "var(--primary-button-bg)",
            color: "var(--button-text-color)",
            "&:hover": {
              backgroundColor: "var(--primary-button-hover)",
            },
          },
          outlined: {
            borderColor: "var(--outlined-button-border)",
            color: "var(--text-color)",
            "&:hover": {
              backgroundColor: "var(--outlined-button-hover)",
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            color: "var(--text-color)",
            borderColor: "var(--border-color)",
          },
          head: {
            backgroundColor: "var(--gray-300)",
            fontWeight: 600,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: "var(--background-body)",
            color: "var(--text-color)",
            border: "1px solid var(--border-color)",
          },
        },
      },
    },
    custom: {
      textColor: "var(--text-color)",
      buttonBackground: "var(--button-background)",
      buttonTextColor: "var(--button-text-color)",
      borderColor: "var(--border-color)",
    },
  });
};
