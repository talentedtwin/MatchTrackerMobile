// Database configuration
// Add your database connection logic here (MongoDB, PostgreSQL, etc.)

const dbConfig = {
  // MongoDB example
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/matchtracker',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  // PostgreSQL example
  postgresql: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'matchtracker',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
};

export default dbConfig;
