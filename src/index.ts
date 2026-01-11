import express, { Request, Response } from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { typeDefs, resolvers } from './graphql';
import { authMiddleware, createGraphQLContext } from './middleware';
import { Logger } from './utils/logger';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Parse allowed origins from environment
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:8081'];

// Create Express app
const app = express();

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.includes(origin) || NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'DaanaRx GraphQL Backend',
    version: '1.0.0',
    graphql: '/graphql',
    health: '/health',
  });
});

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: NODE_ENV !== 'production', // Enable introspection in dev
  formatError: (error) => {
    Logger.error('GraphQL Error:', {
      message: error.message,
      code: error.extensions?.code,
      path: error.path,
    });
    return {
      message: error.message,
      code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
      extensions: error.extensions,
    };
  },
});

// Start server
async function startServer() {
  try {
    // Start Apollo Server
    await server.start();
    Logger.info('Apollo Server started');

    // Apply auth middleware
    app.use(authMiddleware);

    // Apply Apollo middleware
    app.use(
      '/graphql',
      expressMiddleware(server, {
        context: async ({ req }) => createGraphQLContext(req),
      })
    );

    // Start listening
    app.listen(PORT, () => {
      Logger.info(`🚀 Server ready at http://localhost:${PORT}`);
      Logger.info(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`);
      Logger.info(`💚 Health check: http://localhost:${PORT}/health`);
      Logger.info(`🌍 Environment: ${NODE_ENV}`);
      Logger.info(`🔒 Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
    });
  } catch (error) {
    Logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  Logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  Logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start the server
startServer();

