import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../config/constants";

const ThemeContext = createContext();

export const lightTheme = {
  ...COLORS,
  mode: "light",
  background: "#F5F5F5",
  cardBackground: "#FFFFFF",
  text: "#333333",
  textSecondary: "#666666",
  border: "#E0E0E0",
  headerBackground: COLORS.primary,
  headerText: "#FFFFFF",
  inputBackground: "#FFFFFF",
  inputBorder: "#E0E0E0",
  shadow: "#000000",
  modalOverlay: "rgba(0, 0, 0, 0.5)",
  statusBarStyle: "dark",
};

export const darkTheme = {
  ...COLORS,
  mode: "dark",
  background: "#121212",
  cardBackground: "#1E1E1E",
  text: "#FFFFFF",
  textSecondary: "#B0B0B0",
  border: "#333333",
  headerBackground: "#1E1E1E",
  headerText: "#FFFFFF",
  inputBackground: "#2C2C2C",
  inputBorder: "#3C3C3C",
  shadow: "#000000",
  modalOverlay: "rgba(0, 0, 0, 0.8)",
  statusBarStyle: "light",

  // Adjust primary colors for better dark mode visibility
  primary: "#5BA3F5",
  success: "#66BB6A",
  error: "#EF5350",
  warning: "#FFA726",
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("themeMode");
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === "dark");
      }
    } catch (error) {
      console.error("Error loading theme preference:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      await AsyncStorage.setItem("themeMode", newMode ? "dark" : "light");
    } catch (error) {
      console.error("Error saving theme preference:", error);
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider
      value={{ theme, isDarkMode, toggleTheme, isLoading }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
