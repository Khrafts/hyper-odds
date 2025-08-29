import { z } from 'zod';
import { MetricValue, Subject, SubjectKind } from './base';
import { logger } from '../../config/logger';
import { createHash } from 'crypto';

// Enhanced validation schemas with more specific constraints
export const ValidatedMetricValueSchema = z.object({
  value: z.string().min(1).max(78), // Max digits for uint256
  normalizedValue: z.string().min(1).max(78),
  decimals: z.number().min(0).max(18),
  source: z.string().min(1).max(50),
  confidence: z.number().min(0).max(1),
  timestamp: z.date(),
  hash: z.string().length(64), // SHA-256 hash
  metadata: z.record(z.unknown()),
});

export const MarketSubjectSchema = z.object({
  kind: z.nativeEnum(SubjectKind),
  metricId: z.string().optional(),
  tokenIdentifier: z.string().optional(),
  valueDecimals: z.number().min(0).max(18),
}).refine(
  (data) => {
    // HL_METRIC requires metricId, TOKEN_PRICE requires tokenIdentifier
    if (data.kind === SubjectKind.HL_METRIC) {
      return !!data.metricId;
    }
    if (data.kind === SubjectKind.TOKEN_PRICE) {
      return !!data.tokenIdentifier;
    }
    return true;
  },
  {
    message: "HL_METRIC requires metricId, TOKEN_PRICE requires tokenIdentifier",
    path: ['metricId', 'tokenIdentifier'],
  }
);

export type ValidatedMetricValue = z.infer<typeof ValidatedMetricValueSchema>;
export type ValidatedSubject = z.infer<typeof MarketSubjectSchema>;

// Market predicate operations
export enum PredicateOp {
  GT = 0,  // Greater than
  GTE = 1, // Greater than or equal
  LT = 2,  // Less than
  LTE = 3, // Less than or equal
}

export const PredicateSchema = z.object({
  op: z.nativeEnum(PredicateOp),
  threshold: z.string().min(1).max(78), // BigInt as string
});

export type Predicate = z.infer<typeof PredicateSchema>;

// Resolution result schema
export const ResolutionResultSchema = z.object({
  metricValue: ValidatedMetricValueSchema,
  predicate: PredicateSchema,
  result: z.boolean(),
  resolvedAt: z.date(),
  confidence: z.number().min(0).max(1),
  sources: z.array(z.string()).min(1),
});

export type ResolutionResult = z.infer<typeof ResolutionResultSchema>;

export class MetricDataValidator {
  /**
   * Validate and normalize metric value from fetcher
   */
  static validateMetricValue(
    rawValue: MetricValue,
    subject: Subject,
    requireHash = true
  ): ValidatedMetricValue {
    // First validate the subject
    const validatedSubject = MarketSubjectSchema.parse(subject);
    
    // Validate basic metric value structure
    const baseValidation = {
      value: rawValue.value,
      timestamp: rawValue.timestamp,
      decimals: rawValue.decimals,
      source: rawValue.source,
      confidence: rawValue.confidence ?? 0.8,
      metadata: rawValue.metadata ?? {},
    };

    // Normalize the value based on expected decimals
    const normalizedValue = this.normalizeValue(
      rawValue.value,
      rawValue.decimals,
      validatedSubject.valueDecimals
    );

    // Generate canonical hash
    const hash = requireHash 
      ? this.generateMetricHash(rawValue.value, rawValue.timestamp, rawValue.source)
      : this.generateMetricHash(rawValue.value, rawValue.timestamp, rawValue.source);

    const result = {
      ...baseValidation,
      normalizedValue,
      hash,
    };

    // Validate the complete result
    return ValidatedMetricValueSchema.parse(result);
  }

  /**
   * Normalize metric value to target decimal precision
   */
  static normalizeValue(value: string, currentDecimals: number, targetDecimals: number): string {
    try {
      // Parse the value as a number for precision conversion
      const numericValue = parseFloat(value);
      
      if (isNaN(numericValue)) {
        throw new Error(`Invalid numeric value: ${value}`);
      }

      // If decimals are the same, return as-is
      if (currentDecimals === targetDecimals) {
        return value;
      }

      // Convert to target precision
      if (currentDecimals > targetDecimals) {
        // Reduce precision
        const divisor = Math.pow(10, currentDecimals - targetDecimals);
        const normalized = Math.round(numericValue / divisor);
        return normalized.toString();
      } else {
        // Increase precision
        const multiplier = Math.pow(10, targetDecimals - currentDecimals);
        const normalized = Math.round(numericValue * multiplier);
        return normalized.toString();
      }

    } catch (error) {
      logger.error('Failed to normalize metric value', {
        value,
        currentDecimals,
        targetDecimals,
        error: error instanceof Error ? error.message : error,
      });
      throw new Error(`Value normalization failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Generate canonical hash for metric data
   */
  static generateMetricHash(value: string, timestamp: Date, source: string): string {
    const canonical = `${value}|${timestamp.toISOString()}|${source}`;
    return createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Validate predicate evaluation
   */
  static validatePredicate(predicate: Predicate): Predicate {
    return PredicateSchema.parse(predicate);
  }

  /**
   * Evaluate predicate against metric value
   */
  static evaluatePredicate(
    metricValue: ValidatedMetricValue,
    predicate: Predicate
  ): boolean {
    const validatedPredicate = this.validatePredicate(predicate);
    
    try {
      // Convert both values to BigInt for precise comparison
      const metricBigInt = BigInt(metricValue.normalizedValue);
      const thresholdBigInt = BigInt(validatedPredicate.threshold);

      switch (validatedPredicate.op) {
        case PredicateOp.GT:
          return metricBigInt > thresholdBigInt;
        case PredicateOp.GTE:
          return metricBigInt >= thresholdBigInt;
        case PredicateOp.LT:
          return metricBigInt < thresholdBigInt;
        case PredicateOp.LTE:
          return metricBigInt <= thresholdBigInt;
        default:
          throw new Error(`Unknown predicate operation: ${predicate.op}`);
      }

    } catch (error) {
      logger.error('Failed to evaluate predicate', {
        metricValue: metricValue.normalizedValue,
        threshold: predicate.threshold,
        operation: predicate.op,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Validate and create resolution result
   */
  static createResolutionResult(
    metricValue: ValidatedMetricValue,
    predicate: Predicate,
    additionalSources: string[] = []
  ): ResolutionResult {
    const validatedPredicate = this.validatePredicate(predicate);
    const result = this.evaluatePredicate(metricValue, validatedPredicate);
    
    const resolutionResult: ResolutionResult = {
      metricValue,
      predicate: validatedPredicate,
      result,
      resolvedAt: new Date(),
      confidence: metricValue.confidence,
      sources: [metricValue.source, ...additionalSources],
    };

    return ResolutionResultSchema.parse(resolutionResult);
  }

  /**
   * Aggregate multiple metric values from different sources
   */
  static aggregateMetricValues(
    values: ValidatedMetricValue[],
    method: 'median' | 'average' | 'weighted' = 'median'
  ): ValidatedMetricValue {
    if (values.length === 0) {
      throw new Error('Cannot aggregate empty metric values');
    }

    if (values.length === 1) {
      return values[0]!;
    }

    // Validate all values have same decimals
    const decimals = values[0]!.decimals;
    const mismatchedDecimals = decimals !== undefined && values.some(v => v.decimals !== decimals);
    if (mismatchedDecimals) {
      throw new Error('All metric values must have the same decimals for aggregation');
    }

    let aggregatedValue: string;
    let aggregatedConfidence: number;
    const sources = values.map(v => v.source);
    const timestamps = values.map(v => v.timestamp);

    switch (method) {
      case 'median':
        aggregatedValue = this.calculateMedianString(values.map(v => v.normalizedValue));
        aggregatedConfidence = this.calculateMedian(values.map(v => v.confidence));
        break;

      case 'average':
        aggregatedValue = this.calculateAverageString(values.map(v => v.normalizedValue));
        aggregatedConfidence = this.calculateAverage(values.map(v => v.confidence));
        break;

      case 'weighted':
        const result = this.calculateWeightedAverage(values);
        aggregatedValue = result.value;
        aggregatedConfidence = result.confidence;
        break;

      default:
        throw new Error(`Unknown aggregation method: ${method}`);
    }

    // Use the latest timestamp
    const latestTimestamp = new Date(Math.max(...timestamps.map(t => t.getTime())));

    const aggregated: ValidatedMetricValue = {
      value: aggregatedValue,
      normalizedValue: aggregatedValue,
      decimals: decimals!,
      source: 'aggregated',
      confidence: Math.min(aggregatedConfidence, 1.0),
      timestamp: latestTimestamp,
      hash: this.generateMetricHash(aggregatedValue, latestTimestamp, 'aggregated'),
      metadata: {
        method,
        sources,
        sourceCount: sources.length,
        originalValues: values.map(v => v.normalizedValue),
      },
    };

    return ValidatedMetricValueSchema.parse(aggregated);
  }

  private static calculateMedianString(values: string[]): string {
    const nums = values.map(v => parseFloat(v)).sort((a, b) => a - b);
    const mid = Math.floor(nums.length / 2);
    
    if (nums.length % 2 === 0) {
      return Math.round((nums[mid - 1]! + nums[mid]!) / 2).toString();
    } else {
      return Math.round(nums[mid]!).toString();
    }
  }

  private static calculateAverageString(values: string[]): string {
    const nums = values.map(v => parseFloat(v));
    const sum = nums.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / nums.length).toString();
  }

  private static calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1]! + sorted[mid]!) / 2;
    } else {
      return sorted[mid]!;
    }
  }

  private static calculateAverage(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private static calculateWeightedAverage(values: ValidatedMetricValue[]): {
    value: string;
    confidence: number;
  } {
    let totalWeightedValue = 0;
    let totalWeight = 0;
    let totalWeightedConfidence = 0;

    for (const value of values) {
      const weight = value.confidence;
      const numericValue = parseFloat(value.normalizedValue);
      
      totalWeightedValue += numericValue * weight;
      totalWeightedConfidence += value.confidence * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      throw new Error('Total weight cannot be zero for weighted average');
    }

    return {
      value: Math.round(totalWeightedValue / totalWeight).toString(),
      confidence: totalWeightedConfidence / totalWeight,
    };
  }

  /**
   * Validate data freshness
   */
  static validateDataFreshness(
    timestamp: Date,
    maxAgeMinutes = 10
  ): boolean {
    const now = new Date();
    const ageMs = now.getTime() - timestamp.getTime();
    const maxAgeMs = maxAgeMinutes * 60 * 1000;
    
    return ageMs <= maxAgeMs;
  }

  /**
   * Validate confidence threshold
   */
  static validateConfidence(
    confidence: number,
    minConfidence = 0.7
  ): boolean {
    return confidence >= minConfidence;
  }

  /**
   * Create error result for failed resolution
   */
  static createErrorResult(error: Error): {
    success: false;
    error: string;
    timestamp: Date;
  } {
    return {
      success: false,
      error: error.message,
      timestamp: new Date(),
    };
  }
}