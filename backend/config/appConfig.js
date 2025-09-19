import dotenv from 'dotenv';

dotenv.config();

const ENV = process.env.ENV || 'DEVELOPMENT';
const IP = process.env.IP || 'localhost';
const PORT = process.env.PORT || 3002;
const AZURE_APP_SERVICE = process.env.AZURE_APP_SERVICE || process.env.AZURE_APP_SERVIES || '';

// Keep KISS: return host:port in dev, domain in non-dev; protocol added by consumers
const PUBLIC_BASE_URL = ENV === 'DEVELOPMENT' ? `${IP}:${PORT}` : `${AZURE_APP_SERVICE}`;

export default {
  ENV,
  IP,
  PORT,
  AZURE_APP_SERVICE,
  PUBLIC_BASE_URL
};


