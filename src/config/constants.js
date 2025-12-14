// API Configuration
// For physical device testing, use your computer's local IP address
// Find your IP with: ipconfig (look for IPv4 Address under your WiFi adapter)
// Example: 'http://192.168.1.100:3000/api'

// If using Expo tunnel (exp://), you need to either:
// 1. Use ngrok or similar to expose your backend
// 2. Deploy your backend to a public URL
// 3. Use local network (LAN) instead of tunnel

const getApiUrl = () => {
  // Check if we have an environment variable
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  // Fallback to localhost (won't work on physical devices)
  console.warn('No EXPO_PUBLIC_API_URL found - using localhost. This will not work on physical devices or with tunnel connections.');
  return 'http://localhost:3000/api';
};

export const API_URL = getApiUrl();

console.log('API URL configured as:', API_URL);

// App Configuration
export const APP_NAME = 'MatchTracker';
export const APP_VERSION = '1.0.0';

// Match Types
export const MATCH_TYPES = {
  LEAGUE: 'league',
  CUP: 'cup',
  FRIENDLY: 'friendly',
};

// Venue Types
export const VENUE_TYPES = {
  HOME: 'home',
  AWAY: 'away',
};

// Colors
export const COLORS = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  background: '#F2F2F7',
  text: '#000000',
  textSecondary: '#8E8E93',
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
  },
  blue: {
    50: '#eff6ff',
    500: '#3b82f6',
    600: '#2563eb',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
  },
};

// Fonts
export const FONTS = {
  heading: 'BebasNeue_400Regular',
  body: 'RobotoCondensed_400Regular',
  bodyLight: 'RobotoCondensed_300Light',
  bodyBold: 'RobotoCondensed_700Bold',
};

