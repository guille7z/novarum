#!/usr/bin/env -S node
import { Migration, MigrationCLI, col } from '@prisma-next/postgres/migration';

export default class M extends Migration {
  override describe() {
    return {
      from: 'sha256:8026a54d33435185d91fb2e21508a73f8f5f44eec414e5daa0074111271742c6',
      to: 'sha256:997f145d5109c84fce252ed4940e218527a58b21a9b521ea2fafd5dc7629c911',
    };
  }

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'guild',
        column: col('extAnchorDown', 'bool', { codecRef: { codecId: 'pg/bool@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'federation_nonce',
        index: 'federation_nonce_createdAt_idx',
        columns: ['createdAt'],
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
