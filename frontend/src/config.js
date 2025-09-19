// Centralized frontend configuration
// Computes API_BASE_URL based on environment variables

const REACT_APP_ENV = process.env.REACT_APP_ENV || 'DEVELOPMENT';
const REACT_APP_IP = process.env.REACT_APP_IP || process.env.REACT_APP_API_HOST || 'localhost';
const REACT_APP_PORT = process.env.REACT_APP_PORT || process.env.REACT_APP_API_PORT || '3002';
const REACT_APP_AZURE_APP_SERVICE = process.env.REACT_APP_AZURE_APP_SERVICE || process.env.REACT_APP_AZURE_APP_SERVIES || '';

// Add protocol for browser calls; keep formula semantics
const API_BASE_URL = REACT_APP_ENV === 'DEVELOPMENT'
  ? `http://${REACT_APP_IP}:${REACT_APP_PORT}`
  : `https://${REACT_APP_AZURE_APP_SERVICE}`;

export { REACT_APP_ENV, REACT_APP_IP, REACT_APP_PORT, REACT_APP_AZURE_APP_SERVICE, API_BASE_URL };


