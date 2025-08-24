import express from 'express';
import cors from 'cors';
import { logger } from '../config/logger';
import { config } from '../config/config';
import { createHealthRouter } from './health';
import { HealthMonitorService } from '../services/health-monitor';
import { AlertManagerService } from '../services/alert-manager';

export class APIServer {
  private app: express.Application;
  private server: any;
  private healthMonitor: HealthMonitorService;
  private alertManager: AlertManagerService | undefined;

  constructor(healthMonitor: HealthMonitorService, alertManager?: AlertManagerService) {
    this.healthMonitor = healthMonitor;
    this.alertManager = alertManager;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // CORS
    this.app.use(cors());

    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.debug('API Request', {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
      next();
    });

    // Error handling middleware
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('API Error:', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.url,
      });

      res.status(err.status || 500).json({
        error: 'Internal server error',
        timestamp: new Date(),
      });
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check routes
    this.app.use('/api/v1', createHealthRouter(this.healthMonitor, this.alertManager));

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Market Runner API',
        version: '1.0.0',
        timestamp: new Date(),
        endpoints: {
          health: '/api/v1/health',
          detailedHealth: '/api/v1/health/detailed',
          readiness: '/api/v1/health/ready',
          liveness: '/api/v1/health/live',
          metrics: '/api/v1/metrics',
          info: '/api/v1/info',
          alerts: '/api/v1/alerts',
          alertStats: '/api/v1/alerts/stats',
          alertRules: '/api/v1/alerts/rules',
          alertChannels: '/api/v1/alerts/channels',
        },
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        method: req.method,
        path: req.originalUrl,
        timestamp: new Date(),
      });
    });
  }

  /**
   * Start the API server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const port = config.HEALTH_CHECK_PORT || 3001;

        this.server = this.app.listen(port, () => {
          logger.info('API server started', {
            port,
            environment: config.NODE_ENV,
          });
          resolve();
        });

        this.server.on('error', (error: any) => {
          logger.error('API server error:', {
            error: error.message,
            code: error.code,
            port,
          });
          reject(error);
        });

      } catch (error) {
        logger.error('Failed to start API server:', {
          error: error instanceof Error ? error.message : error,
        });
        reject(error);
      }
    });
  }

  /**
   * Stop the API server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('API server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get Express app instance (for testing)
   */
  getApp(): express.Application {
    return this.app;
  }
}