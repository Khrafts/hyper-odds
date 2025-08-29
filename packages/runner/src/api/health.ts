import express from 'express';
import { logger } from '../config/logger';
import { HealthMonitorService } from '../services/health-monitor';
import { AlertManagerService } from '../services/alert-manager';

export function createHealthRouter(healthMonitor: HealthMonitorService, alertManager?: AlertManagerService): express.Router {
  const router = express.Router();

  /**
   * Basic health check endpoint
   * Returns 200 for healthy, 503 for degraded/unhealthy
   */
  router.get('/health', async (req, res) => {
    try {
      const healthResult = await healthMonitor.performHealthCheck();
      
      const statusCode = healthResult.status === 'healthy' ? 200 : 503;
      
      res.status(statusCode).json({
        status: healthResult.status,
        timestamp: healthResult.timestamp,
        summary: healthResult.summary,
      });

    } catch (error) {
      logger.error('Health check endpoint failed:', {
        error: error instanceof Error ? error.message : error,
      });
      
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date(),
        error: 'Health check failed',
      });
    }
  });

  /**
   * Detailed health check endpoint
   * Returns comprehensive health information
   */
  router.get('/health/detailed', async (req, res) => {
    try {
      const healthResult = await healthMonitor.performHealthCheck();
      
      const statusCode = healthResult.status === 'healthy' ? 200 : 503;
      
      res.status(statusCode).json(healthResult);

    } catch (error) {
      logger.error('Detailed health check endpoint failed:', {
        error: error instanceof Error ? error.message : error,
      });
      
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date(),
        error: 'Health check failed',
        checks: {},
        summary: { healthy: 0, degraded: 0, unhealthy: 1, total: 1 },
      });
    }
  });

  /**
   * Readiness probe for Kubernetes/Docker
   * Checks if service is ready to accept traffic
   */
  router.get('/health/ready', async (req, res) => {
    try {
      const healthResult = await healthMonitor.performHealthCheck();
      
      // Service is ready if it's healthy or degraded (but not unhealthy)
      const isReady = healthResult.status !== 'unhealthy';
      
      if (isReady) {
        res.status(200).json({
          status: 'ready',
          timestamp: new Date(),
        });
      } else {
        res.status(503).json({
          status: 'not ready',
          timestamp: new Date(),
          reason: 'Critical systems unhealthy',
        });
      }

    } catch (error) {
      logger.error('Readiness probe failed:', {
        error: error instanceof Error ? error.message : error,
      });
      
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date(),
        reason: 'Health check failed',
      });
    }
  });

  /**
   * Liveness probe for Kubernetes/Docker  
   * Checks if service is alive (should restart if fails)
   */
  router.get('/health/live', async (req, res) => {
    try {
      // Basic liveness check - just verify we can respond
      // More sophisticated checks could verify core services aren't deadlocked
      
      res.status(200).json({
        status: 'alive',
        timestamp: new Date(),
        uptime: process.uptime(),
      });

    } catch (error) {
      logger.error('Liveness probe failed:', {
        error: error instanceof Error ? error.message : error,
      });
      
      res.status(503).json({
        status: 'not alive',
        timestamp: new Date(),
        reason: 'Liveness check failed',
      });
    }
  });

  /**
   * System metrics endpoint
   * Returns system performance metrics
   */
  router.get('/metrics', async (req, res) => {
    try {
      const [systemMetrics, serviceStats] = await Promise.all([
        healthMonitor.getSystemMetrics(),
        healthMonitor.getServiceStatistics(),
      ]);

      res.status(200).json({
        system: systemMetrics,
        services: serviceStats,
      });

    } catch (error) {
      logger.error('Metrics endpoint failed:', {
        error: error instanceof Error ? error.message : error,
      });
      
      res.status(500).json({
        error: 'Failed to retrieve metrics',
        timestamp: new Date(),
      });
    }
  });

  /**
   * Service information endpoint
   * Returns basic service information
   */
  router.get('/info', async (req, res) => {
    try {
      const packageInfo = require('../../package.json');
      
      res.status(200).json({
        name: packageInfo.name,
        version: packageInfo.version,
        description: packageInfo.description,
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        uptime: process.uptime(),
        timestamp: new Date(),
      });

    } catch (error) {
      logger.error('Info endpoint failed:', {
        error: error instanceof Error ? error.message : error,
      });
      
      res.status(500).json({
        error: 'Failed to retrieve service info',
        timestamp: new Date(),
      });
    }
  });

  /**
   * Alert management endpoints
   */
  if (alertManager) {
    /**
     * Get all active alerts
     */
    router.get('/alerts', async (req, res) => {
      try {
        const alerts = alertManager.getActiveAlerts();
        
        res.status(200).json({
          alerts,
          count: alerts.length,
          timestamp: new Date(),
        });

      } catch (error) {
        logger.error('Alerts endpoint failed:', {
          error: error instanceof Error ? error.message : error,
        });
        
        res.status(500).json({
          error: 'Failed to retrieve alerts',
          timestamp: new Date(),
        });
      }
    });

    /**
     * Get alert statistics
     */
    router.get('/alerts/stats', async (req, res) => {
      try {
        const stats = alertManager.getAlertStats();
        
        res.status(200).json({
          ...stats,
          timestamp: new Date(),
        });

      } catch (error) {
        logger.error('Alert stats endpoint failed:', {
          error: error instanceof Error ? error.message : error,
        });
        
        res.status(500).json({
          error: 'Failed to retrieve alert statistics',
          timestamp: new Date(),
        });
      }
    });

    /**
     * Acknowledge an alert
     */
    router.post('/alerts/:id/acknowledge', async (req, res) => {
      try {
        const { id } = req.params;
        const { acknowledgedBy } = req.body;

        if (!acknowledgedBy) {
          res.status(400).json({
            error: 'acknowledgedBy field is required',
            timestamp: new Date(),
          });
          return;
        }

        const success = alertManager.acknowledgeAlert(id, acknowledgedBy);
        
        if (success) {
          res.status(200).json({
            message: 'Alert acknowledged',
            alertId: id,
            acknowledgedBy,
            timestamp: new Date(),
          });
        } else {
          res.status(404).json({
            error: 'Alert not found or already resolved',
            alertId: id,
            timestamp: new Date(),
          });
        }

      } catch (error) {
        logger.error('Alert acknowledge endpoint failed:', {
          error: error instanceof Error ? error.message : error,
          alertId: req.params.id,
        });
        
        res.status(500).json({
          error: 'Failed to acknowledge alert',
          timestamp: new Date(),
        });
      }
    });

    /**
     * Resolve an alert
     */
    router.post('/alerts/:id/resolve', async (req, res) => {
      try {
        const { id } = req.params;

        const success = alertManager.resolveAlert(id);
        
        if (success) {
          res.status(200).json({
            message: 'Alert resolved',
            alertId: id,
            timestamp: new Date(),
          });
        } else {
          res.status(404).json({
            error: 'Alert not found or already resolved',
            alertId: id,
            timestamp: new Date(),
          });
        }

      } catch (error) {
        logger.error('Alert resolve endpoint failed:', {
          error: error instanceof Error ? error.message : error,
          alertId: req.params.id,
        });
        
        res.status(500).json({
          error: 'Failed to resolve alert',
          timestamp: new Date(),
        });
      }
    });

    /**
     * Get alert rules
     */
    router.get('/alerts/rules', async (req, res) => {
      try {
        const rules = alertManager.getAlertRules();
        
        res.status(200).json({
          rules,
          count: rules.length,
          timestamp: new Date(),
        });

      } catch (error) {
        logger.error('Alert rules endpoint failed:', {
          error: error instanceof Error ? error.message : error,
        });
        
        res.status(500).json({
          error: 'Failed to retrieve alert rules',
          timestamp: new Date(),
        });
      }
    });

    /**
     * Get notification channels
     */
    router.get('/alerts/channels', async (req, res) => {
      try {
        const channels = alertManager.getNotificationChannels();
        
        res.status(200).json({
          channels,
          count: channels.length,
          timestamp: new Date(),
        });

      } catch (error) {
        logger.error('Alert channels endpoint failed:', {
          error: error instanceof Error ? error.message : error,
        });
        
        res.status(500).json({
          error: 'Failed to retrieve notification channels',
          timestamp: new Date(),
        });
      }
    });
  }

  return router;
}