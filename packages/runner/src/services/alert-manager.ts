import { logger } from '../config/logger';
import { config } from '../config/config';
import { HealthCheckResult, ComponentHealth } from './health-monitor';

export interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  source: string;
  data?: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  condition: (health: HealthCheckResult) => boolean;
  cooldownMinutes: number;
  channels: string[];
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'console';
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}

export class AlertManagerService {
  private alerts = new Map<string, Alert>();
  private alertRules: AlertRule[] = [];
  private notificationChannels = new Map<string, NotificationChannel>();
  private cooldowns = new Map<string, Date>();
  private alertCounter = 0;

  constructor() {
    this.initializeDefaultRules();
    this.initializeDefaultChannels();
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    this.alertRules = [
      {
        id: 'database_unhealthy',
        name: 'Database Connection Failed',
        description: 'Database connectivity check failed',
        severity: 'critical',
        enabled: true,
        condition: (health) => health.checks.database?.status === 'unhealthy',
        cooldownMinutes: 5,
        channels: ['console', 'webhook'],
      },
      {
        id: 'oracle_unhealthy',
        name: 'Oracle Service Failed',
        description: 'Oracle service is not responding or has critical issues',
        severity: 'high',
        enabled: true,
        condition: (health) => health.checks.oracle?.status === 'unhealthy',
        cooldownMinutes: 10,
        channels: ['console', 'webhook'],
      },
      {
        id: 'system_degraded',
        name: 'System Performance Degraded',
        description: 'One or more services are experiencing performance issues',
        severity: 'medium',
        enabled: true,
        condition: (health) => health.status === 'degraded',
        cooldownMinutes: 15,
        channels: ['console'],
      },
      {
        id: 'transaction_monitor_issues',
        name: 'Transaction Monitor Issues',
        description: 'Transaction monitoring service has issues',
        severity: 'medium',
        enabled: true,
        condition: (health) => health.checks.transactionMonitor?.status === 'unhealthy',
        cooldownMinutes: 10,
        channels: ['console', 'webhook'],
      },
      {
        id: 'job_queue_stuck',
        name: 'Job Queue Has Stuck Jobs',
        description: 'Job processing queue has stuck or failed jobs',
        severity: 'medium',
        enabled: true,
        condition: (health) => {
          const jobDetails = health.checks.jobQueue?.details;
          return Boolean(jobDetails && (jobDetails.stuckJobs > 0 || jobDetails.failedRatio > 20));
        },
        cooldownMinutes: 20,
        channels: ['console'],
      },
      {
        id: 'metric_fetchers_down',
        name: 'Metric Fetchers Unavailable',
        description: 'All or most metric fetchers are unavailable',
        severity: 'high',
        enabled: true,
        condition: (health) => health.checks.metricFetchers?.status === 'unhealthy',
        cooldownMinutes: 10,
        channels: ['console', 'webhook'],
      },
    ];

    logger.info('Initialized default alert rules', {
      rulesCount: this.alertRules.length,
    });
  }

  /**
   * Initialize default notification channels
   */
  private initializeDefaultChannels(): void {
    // Console logger channel
    this.notificationChannels.set('console', {
      id: 'console',
      type: 'console',
      name: 'Console Logging',
      enabled: true,
      config: {},
    });

    // Webhook channel if configured
    if (config.ALERT_WEBHOOK_URL) {
      this.notificationChannels.set('webhook', {
        id: 'webhook',
        type: 'webhook',
        name: 'Webhook Notifications',
        enabled: true,
        config: {
          url: config.ALERT_WEBHOOK_URL,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      });
    }

    // Email channel if configured
    if (config.ALERT_EMAIL) {
      this.notificationChannels.set('email', {
        id: 'email',
        type: 'email',
        name: 'Email Notifications',
        enabled: false, // Disabled by default, requires SMTP configuration
        config: {
          to: config.ALERT_EMAIL,
          from: 'noreply@market-runner.local',
          smtp: {
            // SMTP configuration would go here
          },
        },
      });
    }

    logger.info('Initialized notification channels', {
      channels: Array.from(this.notificationChannels.keys()),
    });
  }

  /**
   * Process health check results and trigger alerts
   */
  async processHealthCheck(healthResult: HealthCheckResult): Promise<void> {
    const triggeredAlerts: Alert[] = [];

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      try {
        if (rule.condition(healthResult)) {
          const alert = await this.createAlert(rule, healthResult);
          if (alert) {
            triggeredAlerts.push(alert);
          }
        }
      } catch (error) {
        logger.error('Error evaluating alert rule:', {
          ruleId: rule.id,
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    if (triggeredAlerts.length > 0) {
      logger.info('Triggered alerts from health check', {
        alertCount: triggeredAlerts.length,
        alerts: triggeredAlerts.map(a => ({ id: a.id, severity: a.severity, title: a.title })),
      });
    }
  }

  /**
   * Create and send an alert
   */
  private async createAlert(rule: AlertRule, healthResult: HealthCheckResult): Promise<Alert | null> {
    // Check cooldown
    const cooldownKey = `${rule.id}`;
    const lastAlert = this.cooldowns.get(cooldownKey);
    const now = new Date();

    if (lastAlert) {
      const cooldownEnd = new Date(lastAlert.getTime() + rule.cooldownMinutes * 60 * 1000);
      if (now < cooldownEnd) {
        logger.debug('Alert rule in cooldown period', {
          ruleId: rule.id,
          cooldownEnds: cooldownEnd.toISOString(),
        });
        return null;
      }
    }

    // Create alert
    const alert: Alert = {
      id: `alert_${++this.alertCounter}_${Date.now()}`,
      severity: rule.severity,
      title: rule.name,
      message: rule.description,
      timestamp: now,
      source: 'health_monitor',
      data: {
        ruleId: rule.id,
        healthStatus: healthResult.status,
        healthSummary: healthResult.summary,
        affectedChecks: Object.entries(healthResult.checks)
          .filter(([_, check]) => check.status !== 'healthy')
          .reduce((acc, [key, check]) => ({ ...acc, [key]: check }), {}),
      },
      resolved: false,
    };

    // Store alert
    this.alerts.set(alert.id, alert);

    // Set cooldown
    this.cooldowns.set(cooldownKey, now);

    // Send notifications
    await this.sendNotifications(alert, rule.channels);

    return alert;
  }

  /**
   * Send notifications for an alert
   */
  private async sendNotifications(alert: Alert, channelIds: string[]): Promise<void> {
    const notifications = channelIds.map(channelId => 
      this.sendNotification(alert, channelId)
    );

    const results = await Promise.allSettled(notifications);
    
    let successCount = 0;
    let failureCount = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        failureCount++;
        logger.error('Failed to send alert notification:', {
          alertId: alert.id,
          channelId: channelIds[index],
          error: result.reason,
        });
      }
    });

    logger.info('Alert notifications sent', {
      alertId: alert.id,
      successCount,
      failureCount,
      totalChannels: channelIds.length,
    });
  }

  /**
   * Send notification to a specific channel
   */
  private async sendNotification(alert: Alert, channelId: string): Promise<void> {
    const channel = this.notificationChannels.get(channelId);
    
    if (!channel || !channel.enabled) {
      logger.debug('Notification channel disabled or not found', { channelId });
      return;
    }

    switch (channel.type) {
      case 'console':
        await this.sendConsoleNotification(alert);
        break;
      case 'webhook':
        await this.sendWebhookNotification(alert, channel);
        break;
      case 'email':
        await this.sendEmailNotification(alert, channel);
        break;
      case 'slack':
        await this.sendSlackNotification(alert, channel);
        break;
      default:
        logger.warn('Unknown notification channel type', { 
          channelId, 
          type: channel.type 
        });
    }
  }

  /**
   * Send console notification
   */
  private async sendConsoleNotification(alert: Alert): Promise<void> {
    const logLevel = this.getLogLevelForSeverity(alert.severity);
    const logData = {
      alertId: alert.id,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      timestamp: alert.timestamp.toISOString(),
      source: alert.source,
      data: alert.data,
    };

    logger[logLevel](`🚨 ALERT: ${alert.title}`, logData);
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(alert: Alert, channel: NotificationChannel): Promise<void> {
    const payload = {
      alert: {
        id: alert.id,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        timestamp: alert.timestamp.toISOString(),
        source: alert.source,
      },
      service: {
        name: 'market-runner',
        environment: config.NODE_ENV,
      },
      data: alert.data,
    };

    try {
      // In a real implementation, you would use a HTTP client like axios
      // For now, just log what would be sent
      logger.info('Would send webhook notification', {
        url: channel.config.url,
        payload,
      });

      // Simulated webhook call
      // const response = await fetch(channel.config.url, {
      //   method: channel.config.method || 'POST',
      //   headers: channel.config.headers || {},
      //   body: JSON.stringify(payload),
      // });
      
      // if (!response.ok) {
      //   throw new Error(`Webhook failed with status ${response.status}`);
      // }

    } catch (error) {
      logger.error('Webhook notification failed:', {
        error: error instanceof Error ? error.message : error,
        url: channel.config.url,
      });
      throw error;
    }
  }

  /**
   * Send email notification (placeholder implementation)
   */
  private async sendEmailNotification(alert: Alert, channel: NotificationChannel): Promise<void> {
    // This would require an email service like nodemailer
    logger.info('Would send email notification', {
      to: channel.config.to,
      subject: `Alert: ${alert.title}`,
      alert: {
        id: alert.id,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
      },
    });
  }

  /**
   * Send Slack notification (placeholder implementation)
   */
  private async sendSlackNotification(alert: Alert, channel: NotificationChannel): Promise<void> {
    // This would require Slack API integration
    logger.info('Would send Slack notification', {
      channel: channel.config.channel,
      alert: {
        id: alert.id,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
      },
    });
  }

  /**
   * Get appropriate log level for alert severity
   */
  private getLogLevelForSeverity(severity: string): 'info' | 'warn' | 'error' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      case 'low':
      default:
        return 'info';
    }
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get alert by ID
   */
  getAlert(id: string): Alert | undefined {
    return this.alerts.get(id);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(id: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(id);
    if (!alert || alert.resolved) {
      return false;
    }

    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    logger.info('Alert acknowledged', {
      alertId: id,
      acknowledgedBy,
      acknowledgedAt: alert.acknowledgedAt.toISOString(),
    });

    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(id: string): boolean {
    const alert = this.alerts.get(id);
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();

    logger.info('Alert resolved', {
      alertId: id,
      resolvedAt: alert.resolvedAt.toISOString(),
    });

    return true;
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    totalAlerts: number;
    activeAlerts: number;
    resolvedAlerts: number;
    bySeverity: Record<string, number>;
    recentAlerts: Alert[];
  } {
    const alerts = Array.from(this.alerts.values());
    const activeAlerts = alerts.filter(a => !a.resolved);
    const resolvedAlerts = alerts.filter(a => a.resolved);

    const bySeverity = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentAlerts = alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      totalAlerts: alerts.length,
      activeAlerts: activeAlerts.length,
      resolvedAlerts: resolvedAlerts.length,
      bySeverity,
      recentAlerts,
    };
  }

  /**
   * Add a custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
    logger.info('Added custom alert rule', { ruleId: rule.id, name: rule.name });
  }

  /**
   * Add a notification channel
   */
  addNotificationChannel(channel: NotificationChannel): void {
    this.notificationChannels.set(channel.id, channel);
    logger.info('Added notification channel', { channelId: channel.id, type: channel.type });
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * Get all notification channels
   */
  getNotificationChannels(): NotificationChannel[] {
    return Array.from(this.notificationChannels.values());
  }
}