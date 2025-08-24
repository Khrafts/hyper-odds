export { BaseRepository } from './base';
export { MarketRepository } from './market';
export { JobRepository } from './job';
export { ResolutionRepository } from './resolution';
export { MetricDataRepository } from './metric-data';

// Repository factory for dependency injection
import { PrismaClient } from '@prisma/client';
import { MarketRepository } from './market';
import { JobRepository } from './job';
import { ResolutionRepository } from './resolution';
import { MetricDataRepository } from './metric-data';

export class RepositoryFactory {
  private prisma: PrismaClient;
  private marketRepo?: MarketRepository;
  private jobRepo?: JobRepository;
  private resolutionRepo?: ResolutionRepository;
  private metricDataRepo?: MetricDataRepository;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  get markets(): MarketRepository {
    if (!this.marketRepo) {
      this.marketRepo = new MarketRepository(this.prisma);
    }
    return this.marketRepo;
  }

  get jobs(): JobRepository {
    if (!this.jobRepo) {
      this.jobRepo = new JobRepository(this.prisma);
    }
    return this.jobRepo;
  }

  get resolutions(): ResolutionRepository {
    if (!this.resolutionRepo) {
      this.resolutionRepo = new ResolutionRepository(this.prisma);
    }
    return this.resolutionRepo;
  }

  get metricData(): MetricDataRepository {
    if (!this.metricDataRepo) {
      this.metricDataRepo = new MetricDataRepository(this.prisma);
    }
    return this.metricDataRepo;
  }

  // Create all repositories at once for testing
  createAll() {
    return {
      markets: this.markets,
      jobs: this.jobs,
      resolutions: this.resolutions,
      metricData: this.metricData,
    };
  }
}