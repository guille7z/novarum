#!/usr/bin/env -S node
import { Migration, MigrationCLI, col, primaryKey } from '@prisma-next/postgres/migration';

export default class M extends Migration {
  override describe() {
    return {
      from: 'sha256:9ab74198e40d6ea166f71e23a24bc88ea6354fd100d9b480e0dbfb56554deb35',
      to: 'sha256:30c84f1f4efbc25157d1c26286e580bf833e9ac5651f9ca7654ca2a575e18e7c',
    };
  }

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'channel_read_state',
        columns: [
          col('channelId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastReadCreatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('lastReadMessageId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['userId', 'channelId'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'channel_read_state',
        index: 'channel_read_state_userId_idx',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'channel_read_state',
        index: 'channel_read_state_channelId_idx',
        columns: ['channelId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'local_credential',
        index: 'local_credential_userId_idx',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'channel_read_state',
        foreignKey: {
          name: 'channel_read_state_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'channel_read_state',
        foreignKey: {
          name: 'channel_read_state_channelId_fkey',
          columns: ['channelId'],
          references: { schema: 'public', table: 'channel', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
