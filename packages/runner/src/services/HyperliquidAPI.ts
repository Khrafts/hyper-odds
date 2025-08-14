import axios from 'axios';
import { logger } from '../utils/logger.js';

export class HyperliquidAPI {
  constructor(private apiUrl: string) {}

  async getMetricValue(metricId: string, timestamp: number): Promise<bigint> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          type: 'metrics',
          metricId,
          timestamp
        }
      );

      const value = response.data.value;
      return BigInt(value);
    } catch (error) {
      logger.error({ error, metricId, timestamp }, 'Failed to fetch metric from Hyperliquid');
      throw error;
    }
  }

  async getTokenPrice(token: string, timestamp: number): Promise<bigint> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          type: 'tokenPrice',
          token,
          timestamp
        }
      );

      // Assuming price is returned with 8 decimals
      const price = response.data.price;
      return BigInt(Math.floor(price * 1e8));
    } catch (error) {
      logger.error({ error, token, timestamp }, 'Failed to fetch token price from Hyperliquid');
      throw error;
    }
  }

  async getTimeAverageValue(
    metricId: string,
    startTime: number,
    endTime: number,
    isTokenPrice: boolean = false
  ): Promise<bigint> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          type: isTokenPrice ? 'tokenPriceAverage' : 'metricAverage',
          metricId,
          startTime,
          endTime
        }
      );

      const value = response.data.average;
      return BigInt(value);
    } catch (error) {
      logger.error({ 
        error, 
        metricId, 
        startTime, 
        endTime 
      }, 'Failed to fetch time average from Hyperliquid');
      throw error;
    }
  }

  async getExtremumValue(
    metricId: string,
    startTime: number,
    endTime: number,
    isMax: boolean,
    isTokenPrice: boolean = false
  ): Promise<bigint> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          type: isTokenPrice ? 'tokenPriceExtremum' : 'metricExtremum',
          metricId,
          startTime,
          endTime,
          extremumType: isMax ? 'max' : 'min'
        }
      );

      const value = response.data.value;
      return BigInt(value);
    } catch (error) {
      logger.error({ 
        error, 
        metricId, 
        startTime, 
        endTime,
        isMax 
      }, 'Failed to fetch extremum from Hyperliquid');
      throw error;
    }
  }

  async getGenericValue(dataHash: string): Promise<bigint> {
    try {
      // For generic values, we might fetch from IPFS or another data source
      // For now, return a placeholder
      logger.warn({ dataHash }, 'Generic value fetching not yet implemented');
      return BigInt(0);
    } catch (error) {
      logger.error({ error, dataHash }, 'Failed to fetch generic value');
      throw error;
    }
  }
}