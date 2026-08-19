import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private validateDatabaseUrl(): void {
    const raw = process.env.DATABASE_URL;

    if (!raw || !raw.trim()) {
      throw new Error(
        'DATABASE_URL is missing. Set a valid PostgreSQL URL in the runtime environment.',
      );
    }

    const value = raw.trim();

    // Render-style env vars are raw strings; wrapping the value in quotes makes the URL invalid.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      throw new Error(
        'DATABASE_URL appears to be wrapped in quotes. Store it as a plain value without surrounding quotes.',
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(
        'DATABASE_URL is malformed. Expected format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE',
      );
    }

    if (!['postgresql:', 'postgres:'].includes(parsed.protocol)) {
      throw new Error(
        'DATABASE_URL must use the PostgreSQL protocol (postgresql:// or postgres://).',
      );
    }

    if (!parsed.port || !/^\d+$/.test(parsed.port)) {
      throw new Error('DATABASE_URL must include a numeric port value.');
    }

    if (!parsed.pathname || parsed.pathname === '/') {
      throw new Error('DATABASE_URL must include a database name in the path segment.');
    }
  }

  async onModuleInit() {
    this.validateDatabaseUrl();
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
