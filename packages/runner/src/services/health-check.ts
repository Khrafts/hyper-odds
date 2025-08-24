import http from 'http';
import { config } from '../config/config';
import { logger } from '../config/logger';
import { ServiceContainer } from './container';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    [key: string]: {
      status: 'healthy' | 'unhealthy';
      message?: string;
    };
  };
  uptime: number;
  version: string;
}

export class HealthCheckService {
  private server?: http.Server;
  private startTime = Date.now();

  constructor(private container: ServiceContainer) {}

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(this.handleRequest.bind(this));
      
      this.server.listen(config.HEALTH_CHECK_PORT, () => {
        logger.info(`Health check server listening on port ${config.HEALTH_CHECK_PORT}`);
        resolve();
      });

      this.server.on('error', (error) => {
        logger.error('Health check server error:', { error: error.message });
        reject(error);
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close(() => {
        logger.info('Health check server stopped');
        resolve();
      });
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (req.method === 'GET' && req.url === '/health') {
      const healthStatus = await this.checkHealth();
      
      res.writeHead(
        healthStatus.status === 'healthy' ? 200 : 503,
        { 'Content-Type': 'application/json' }
      );
      res.end(JSON.stringify(healthStatus, null, 2));
    } else if (req.method === 'GET' && req.url === '/ready') {
      const isReady = this.container.isInitialized();
      
      res.writeHead(isReady ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ready: isReady }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  private async checkHealth(): Promise<HealthStatus> {
    const services: HealthStatus['services'] = {};
    let overallHealthy = true;

    // Check container initialization
    if (!this.container.isInitialized()) {
      services.container = {
        status: 'unhealthy',
        message: 'Service container not initialized'
      };
      overallHealthy = false;
    } else {
      services.container = { status: 'healthy' };
    }

    // Check database health
    try {
      const dbHealthy = await this.container.database.isHealthy();
      if (dbHealthy) {
        services.database = { status: 'healthy' };
      } else {
        services.database = { 
          status: 'unhealthy',
          message: 'Database connection failed'
        };
      }
      if (!dbHealthy) overallHealthy = false;
    } catch (error) {
      services.database = {
        status: 'unhealthy',
        message: `Database error: ${error instanceof Error ? error.message : error}`
      };
      overallHealthy = false;
    }

    // Check overall container health
    try {
      const containerHealthy = await this.container.isHealthy();
      if (!containerHealthy) {
        overallHealthy = false;
      }
    } catch (error) {
      logger.error('Container health check failed:', {
        error: error instanceof Error ? error.message : error
      });
      overallHealthy = false;
    }

    // TODO: Add more health checks as services are implemented
    // - Redis connection
    // - Blockchain RPC connection
    // - External APIs

    return {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services,
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0'
    };
  }
}