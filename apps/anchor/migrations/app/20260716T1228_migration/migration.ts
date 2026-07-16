#!/usr/bin/env -S node
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma-next/postgres/migration';

export default class M extends Migration {
  override describe() {
    return {
      from: 'sha256:30c84f1f4efbc25157d1c26286e580bf833e9ac5651f9ca7654ca2a575e18e7c',
      to: 'sha256:8e6b5196f77d25705a0b842c25e0d5ab00de6fda55f945bb3a017ab93ac37b49',
    };
  }

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'emojis',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('unicode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'local_credential',
        index: 'local_credential_userId_idx',
        columns: ['userId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
