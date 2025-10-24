// Utility functions for backend

/**
 * Generate a unique ID
 * @returns {string}
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Validate request body
 * @param {Object} body 
 * @param {Array} requiredFields 
 * @returns {Object}
 */
export const validateBody = (body, requiredFields) => {
  const missing = requiredFields.filter(field => !body[field]);
  
  if (missing.length > 0) {
    return {
      valid: false,
      message: `Missing required fields: ${missing.join(', ')}`
    };
  }
  
  return { valid: true };
};

/**
 * Format API response
 * @param {boolean} success 
 * @param {*} data 
 * @param {string} message 
 * @returns {Object}
 */
export const formatResponse = (success, data = null, message = null) => {
  return {
    success,
    data,
    message,
    timestamp: new Date().toISOString()
  };
};
