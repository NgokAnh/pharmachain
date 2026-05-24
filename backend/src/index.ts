import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import {
  checkDatabaseConnection,
  DATABASE_UNAVAILABLE_MESSAGE,
  isDatabaseConnectionError,
} from './lib/prisma';

// Import routers
import authRouter from './routes/auth';
import medicinesRouter from './routes/medicines';
import branchesRouter from './routes/branches';
import posRouter from './routes/pos';
import purchasesRouter from './routes/purchases';
import transfersRouter from './routes/transfers';
import auditRouter from './routes/audit';
import customersRouter from './routes/customers';
import usersRouter from './routes/users';
import reportsRouter from './routes/reports';
import inventoryChecksRouter from './routes/inventory-checks';
import promotionsRouter from './routes/promotions';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware configuration
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for Base64 camera images
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', async (_req, res) => {
  const timestamp = new Date().toISOString();

  try {
    await checkDatabaseConnection();
    res.json({ status: 'healthy', database: 'connected', timestamp });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      timestamp,
      error: isDatabaseConnectionError(error) ? DATABASE_UNAVAILABLE_MESSAGE : 'Health check failed',
    });
  }
});

// Route bindings
app.use('/api/auth', authRouter);
app.use('/api/branches', branchesRouter);
app.use('/api', medicinesRouter);
app.use('/api/pos', posRouter);
app.use('/api', purchasesRouter);
app.use('/api', transfersRouter);
app.use('/api', auditRouter);
app.use('/api/customers', customersRouter);
app.use('/api/users', usersRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/inventory-checks', inventoryChecksRouter);
app.use('/api/promotions', promotionsRouter);

// Start server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀  PharmaChain Backend listening on port ${PORT}`);
  console.log(`🔗  Endpoint URL: http://localhost:${PORT}`);
  console.log(`=================================================`);

  void checkDatabaseConnection()
    .then(() => {
      console.log('✅  Database connectivity check passed');
    })
    .catch((error) => {
      if (isDatabaseConnectionError(error)) {
        console.error(`⚠️  ${DATABASE_UNAVAILABLE_MESSAGE}`);
        return;
      }

      console.error('⚠️  Database connectivity check failed:', error);
    });
});
