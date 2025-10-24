// Utility helper functions

/**
 * Format date to readable string (DD-MM-YYYY HH:MM)
 * @param {Date|string} date 
 * @returns {string}
 */
export const formatDateTime = (date) => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

/**
 * Format date to readable string (DD-MM-YYYY)
 * @param {Date|string} date 
 * @returns {string}
 */
export const formatDate = (date) => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
};

/**
 * Format time to readable string (HH:MM)
 * @param {Date|string} date 
 * @returns {string}
 */
export const formatTime = (date) => {
  const d = new Date(date);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  return `${hours}:${minutes}`;
};

/**
 * Delay execution
 * @param {number} ms 
 * @returns {Promise}
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Validate email format
 * @param {string} email 
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Calculate win rate percentage
 * @param {number} wins 
 * @param {number} total 
 * @returns {string}
 */
export const calculateWinRate = (wins, total) => {
  if (total === 0) return '0';
  return ((wins / total) * 100).toFixed(1);
};

/**
 * Get match result (win/draw/loss)
 * @param {number} goalsFor 
 * @param {number} goalsAgainst 
 * @returns {string}
 */
export const getMatchResult = (goalsFor, goalsAgainst) => {
  if (goalsFor > goalsAgainst) return 'win';
  if (goalsFor < goalsAgainst) return 'loss';
  return 'draw';
};

/**
 * Get result color
 * @param {string} result 
 * @returns {string}
 */
export const getResultColor = (result) => {
  switch (result) {
    case 'win':
      return '#22c55e';
    case 'loss':
      return '#ef4444';
    case 'draw':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
};

/**
 * Truncate text
 * @param {string} text 
 * @param {number} maxLength 
 * @returns {string}
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Sort players by goals descending
 * @param {Array} players 
 * @returns {Array}
 */
export const sortPlayersByGoals = (players) => {
  return [...players].sort((a, b) => b.goals - a.goals);
};

/**
 * Sort players by assists descending
 * @param {Array} players 
 * @returns {Array}
 */
export const sortPlayersByAssists = (players) => {
  return [...players].sort((a, b) => b.assists - a.assists);
};

/**
 * Get player by ID
 * @param {Array} players 
 * @param {string} playerId 
 * @returns {Object|null}
 */
export const getPlayerById = (players, playerId) => {
  return players.find(p => p.id === playerId) || null;
};

/**
 * Get players by team ID
 * @param {Array} players 
 * @param {string} teamId 
 * @returns {Array}
 */
export const getPlayersByTeamId = (players, teamId) => {
  return players.filter(p => p.teamId === teamId);
};

/**
 * Validate required fields
 * @param {Object} data 
 * @param {Array} requiredFields 
 * @returns {Object}
 */
export const validateRequiredFields = (data, requiredFields) => {
  const missing = requiredFields.filter(field => !data[field]);
  
  if (missing.length > 0) {
    return {
      valid: false,
      message: `Missing required fields: ${missing.join(', ')}`
    };
  }
  
  return { valid: true };
};

