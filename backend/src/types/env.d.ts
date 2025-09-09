declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT: string;
      DATABASE_URL: string;
      DB_HOST: string;
      DB_PORT: string;
      DB_USER: string;
      DB_PASSWORD: string;
      DB_NAME: string;
      DESCOPE_PROJECT_ID: string;
      DESCOPE_MANAGEMENT_KEY: string;
      DESCOPE_INBOUND_CLIENT_ID: string;
      VERIFIER_PRIVATE_KEY: string;
      CORS_ORIGIN: string;
      RATE_LIMIT_WINDOW_MS: string;
      RATE_LIMIT_MAX_REQUESTS: string;
      LOG_FORMAT: string;
      LOG_LEVEL: string;
      API_BASE_URL: string;
      DEMO_MODE: string;
      SLACK_BOT_TOKEN: string;
      GOOGLE_CALENDAR_ACCESS_TOKEN: string;
      TWILIO_ACCOUNT_SID: string;
      TWILIO_AUTH_TOKEN: string;
      TWILIO_PHONE_NUMBER: string;
    }
  }
}

export {};