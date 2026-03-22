/**
 * Client Configuration
 * Allows easy switching between local development and production APIs.
 */
const config = {
    // Falls back to localhost if the environment variable is not set
    API_BASE_URL: process.env.REACT_APP_API_URL || "http://localhost:5000/api"
};

export default config;
