import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: process.env.PORT || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
  jwtSecret: process.env.JWT_SECRET || 'supersecret',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'promptdeck',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION,
  },
};

export default config;