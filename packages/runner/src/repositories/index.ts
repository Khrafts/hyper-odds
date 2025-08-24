export { BaseRepository } from './base';
export { MarketRepository } from './market';
export { JobRepository } from './job';

// Repository factory for dependency injection
import { PrismaClient } from '@prisma/client';
import { MarketRepository } from './market';
import { JobRepository } from './job';

export class RepositoryFactory {
  private prisma: PrismaClient;
  private marketRepo?: MarketRepository;
  private jobRepo?: JobRepository;

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

  // Create all repositories at once for testing
  createAll() {
    return {
      markets: this.markets,
      jobs: this.jobs,
    };
  }
}