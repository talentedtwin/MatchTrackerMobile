import axios from "axios";
import { API_URL } from "../config/constants";

// Store the getToken function globally
let getClerkToken = null;

// Function to set the Clerk token getter
export const setClerkTokenGetter = (getter) => {
  getClerkToken = getter;
};

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    // Log the request for debugging
    console.log("API Request:", {
      method: config.method?.toUpperCase(),
      url: config.baseURL + config.url,
      params: config.params,
      hasAuth: !!config.headers.Authorization,
    });

    // Add Clerk auth token if available
    try {
      if (getClerkToken) {
        const token = await getClerkToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error("Error getting Clerk token:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Handle errors globally
    if (error.response) {
      // Server responded with error status
      console.error("API Error:", error.response.status, error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error("Network Error - No response from server:", {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method,
      });
    } else {
      // Something else happened
      console.error("API Error:", error.message);
    }

    // Handle authentication errors
    if (error.response?.status === 401) {
      console.log("Authentication error - token may be invalid");
    }

    return Promise.reject(error);
  }
);

// Player API
export const playerApi = {
  async getAll(teamId = null) {
    const params = {};
    if (teamId) {
      params.teamId = teamId;
    }
    return apiClient.get("/players", { params });
  },

  async create(data) {
    return apiClient.post("/players", data);
  },

  async update(id, data) {
    return apiClient.put(`/players/${id}`, data);
  },

  async delete(id) {
    return apiClient.delete(`/players/${id}`);
  },
};

// Team API
export const teamApi = {
  async getAll(options = {}) {
    const params = {};
    if (options.include) {
      params.include = Array.isArray(options.include)
        ? options.include.join(",")
        : options.include;
    }
    if (options.summary) {
      params.summary = "true";
    }
    return apiClient.get("/teams", { params });
  },

  async create(data) {
    return apiClient.post("/teams", data);
  },

  async update(id, data) {
    return apiClient.put(`/teams/${id}`, data);
  },

  async delete(id) {
    return apiClient.delete(`/teams/${id}`);
  },
};

// Match API
export const matchApi = {
  async getAll(teamId = null, options = {}) {
    const params = {};
    if (teamId) {
      params.teamId = teamId;
    }
    if (options.isFinished !== undefined) {
      params.isFinished = options.isFinished;
    }
    if (options.matchType) {
      params.matchType = options.matchType;
    }
    if (options.venue) {
      params.venue = options.venue;
    }
    if (options.fields) {
      params.fields = options.fields; // 'basic' or 'full'
    }
    if (options.limit) {
      params.limit = options.limit;
    }
    return apiClient.get("/matches", { params });
  },

  async getById(id) {
    return apiClient.get(`/matches/${id}`);
  },

  async create(data) {
    return apiClient.post("/matches", data);
  },

  async update(id, data) {
    return apiClient.put(`/matches/${id}`, data);
  },

  async delete(id) {
    return apiClient.delete(`/matches/${id}`);
  },
};

// Player Match Stats API
export const playerMatchStatsApi = {
  async getAll(params) {
    return apiClient.get("/player-match-stats", { params });
  },

  async create(data) {
    return apiClient.post("/player-match-stats", data);
  },

  async update(id, data) {
    return apiClient.put(`/player-match-stats/${id}`, data);
  },

  async delete(id) {
    return apiClient.delete(`/player-match-stats/${id}`);
  },
};

// Stats API
export const statsApi = {
  async getUserStats(userId) {
    return apiClient.get(`/stats?userId=${userId}`);
  },
};

// Dashboard API (combined data for HomeScreen)
export const dashboardApi = {
  async getHomeData(teamId) {
    const params = teamId ? { teamId } : {};
    return apiClient.get("/dashboard", { params });
  },
};

// User API
export const userApi = {
  async getProfile() {
    return apiClient.get("/users/profile");
  },

  async updateProfile(data) {
    return apiClient.put("/users/profile", data);
  },
};

// Health Check
export const healthApi = {
  async check() {
    return apiClient.get("/health");
  },
};

// Helper to get base URL (for direct fetch calls)
export const getBaseUrl = () => API_URL;

// Default export with helper methods
export default {
  ...apiClient,
  getBaseUrl,
};
