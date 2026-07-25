import { cpus } from 'node:os';
import { z } from 'zod';

const options = z
  .object({
    DATABASE_URL: z.url().startsWith('postgresql://'),
    BENCH_WARMUP: z.coerce.number().int().nonnegative().default(20),
    BENCH_SAMPLES: z.coerce.number().int().positive().default(200),
    BENCH_THROUGHPUT_OPS: z.coerce.number().int().positive().default(500),
    BENCH_CONCURRENCY: z.coerce.number().int().positive().default(10),
    BENCH_OUTPUT: z.string().default('benchmarks/results.json'),
  })
  .parse(process.env);

type Fixture = { prefix: string; userId: string; guildId: string; channelId: string };
type Adapter = {
  name: string;
  version: string;
  setup: () => Promise<Fixture>;
  userById: (fixture: Fixture, n: number) => Promise<unknown>;
  membership: (fixture: Fixture, n: number) => Promise<unknown>;
  messagesWithRelations: (fixture: Fixture, n: number) => Promise<unknown>;
  insertMessage: (fixture: Fixture, n: number) => Promise<unknown>;
  updateUser: (fixture: Fixture, n: number) => Promise<unknown>;
  cleanup: (fixture: Fixture) => Promise<void>;
  close: () => Promise<void>;
};

const packageJson = await Bun.file(new URL('../package.json', import.meta.url)).json();
const isDrizzle = Boolean(packageJson.dependencies['drizzle-orm']);
const adapter = isDrizzle ? await drizzleAdapter() : await prismaNextAdapter();
let fixture: Fixture | undefined;

try {
  fixture = await adapter.setup();
  const scenarios = [
    ['User by primary key', adapter.userById],
    ['Membership by compound key', adapter.membership],
    ['100 messages + relations', adapter.messagesWithRelations],
    ['Insert message', adapter.insertMessage],
    ['Update user', adapter.updateUser],
  ] as const;

  const results = [];
  for (const [name, operation] of scenarios) {
    process.stdout.write(`${name}... `);
    for (let i = 0; i < options.BENCH_WARMUP; i++) await operation(fixture, -i - 1);

    const durations = [];
    for (let i = 0; i < options.BENCH_SAMPLES; i++) {
      const start = Bun.nanoseconds();
      await operation(fixture, i);
      durations.push((Bun.nanoseconds() - start) / 1e6);
    }

    const throughputStart = Bun.nanoseconds();
    for (let i = 0; i < options.BENCH_THROUGHPUT_OPS; i += options.BENCH_CONCURRENCY) {
      await Promise.all(
        Array.from(
          { length: Math.min(options.BENCH_CONCURRENCY, options.BENCH_THROUGHPUT_OPS - i) },
          (_, offset) => operation(fixture!, 1_000_000 + i + offset)
        )
      );
    }
    const throughputSeconds = (Bun.nanoseconds() - throughputStart) / 1e9;
    durations.sort((a, b) => a - b);
    const result = {
      name,
      p50Ms: percentile(durations, 0.5),
      p95Ms: percentile(durations, 0.95),
      meanMs: durations.reduce((sum, value) => sum + value, 0) / durations.length,
      opsPerSecond: options.BENCH_THROUGHPUT_OPS / throughputSeconds,
    };
    results.push(result);
    console.log(`${result.p50Ms.toFixed(2)} ms p50, ${result.opsPerSecond.toFixed(1)} ops/s`);
  }

  const database = new URL(options.DATABASE_URL);
  const output = {
    schemaVersion: 1,
    implementation: adapter.name,
    version: adapter.version,
    commit: command('git', 'rev-parse', '--short=12', 'HEAD'),
    timestamp: new Date().toISOString(),
    runtime: `Bun ${Bun.version}`,
    machine: `${cpus()[0]?.model ?? 'unknown CPU'} (${cpus().length} logical cores)`,
    database: database.host,
    config: {
      warmup: options.BENCH_WARMUP,
      samples: options.BENCH_SAMPLES,
      throughputOps: options.BENCH_THROUGHPUT_OPS,
      concurrency: options.BENCH_CONCURRENCY,
      fixtureMessages: 100,
    },
    results,
  };
  await Bun.write(options.BENCH_OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${options.BENCH_OUTPUT}`);
} finally {
  if (fixture) await adapter.cleanup(fixture);
  await adapter.close();
}

function percentile(sorted: number[], value: number) {
  return sorted[Math.min(Math.ceil(sorted.length * value) - 1, sorted.length - 1)]!;
}

function command(...args: string[]) {
  const result = Bun.spawnSync(args);
  return result.success ? result.stdout.toString().trim() : 'unknown';
}

async function drizzleAdapter(): Promise<Adapter> {
  const drizzlePackage = 'drizzle-orm/bun-sql';
  const operatorsPackage = 'drizzle-orm';
  const schemaPath = '../src/db/schema.ts';
  const [{ drizzle }, { eq, inArray }, schema] = await Promise.all([
    import(drizzlePackage),
    import(operatorsPackage),
    import(schemaPath),
  ]);
  const db = drizzle({
    connection: options.DATABASE_URL,
    relations: (await import('../src/db/relations')).relations,
  });
  const { users, guilds, guildMembers, channels, messages } = schema;

  return {
    name: 'Drizzle',
    version: packageJson.dependencies['drizzle-orm'],
    async setup() {
      const prefix = `bench-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date();
      const userId = `${prefix}-user-0`;
      const guildId = `${prefix}-guild`;
      const channelId = `${prefix}-channel`;
      await db.insert(users).values(
        Array.from({ length: 10 }, (_, i) => ({
          id: `${prefix}-user-${i}`,
          username: `${prefix}-${i}`,
          homeserver: 'benchmark.invalid',
          displayName: `Benchmark user ${i}`,
          avatarUrl: null,
          isBot: false,
          createdAt: now,
          updatedAt: now,
        }))
      );
      await db.insert(guilds).values({ id: guildId, name: 'Benchmark', ownerId: userId });
      await db
        .insert(guildMembers)
        .values(Array.from({ length: 10 }, (_, i) => ({ guildId, userId: `${prefix}-user-${i}` })));
      await db.insert(channels).values({ id: channelId, guildId, name: 'benchmark', position: 0 });
      await db.insert(messages).values(
        Array.from({ length: 100 }, (_, i) => ({
          id: `${prefix}-seed-message-${i}`,
          channelId,
          authorId: `${prefix}-user-${i % 10}`,
          content: `Benchmark message ${i}`,
          nonce: `${prefix}-seed-nonce-${i}`,
        }))
      );
      return { prefix, userId, guildId, channelId };
    },
    userById: ({ userId }) => db.query.users.findFirst({ where: { id: userId } }),
    membership: ({ userId, guildId }) =>
      db.query.guildMembers.findFirst({ where: { userId, guildId } }),
    messagesWithRelations: ({ channelId }) =>
      db.query.messages.findMany({
        where: { channelId },
        orderBy: { createdAt: 'asc' },
        with: { author: true, attachments: true },
      }),
    insertMessage: ({ prefix, channelId, userId }, n) =>
      db
        .insert(messages)
        .values({
          id: `${prefix}-measured-message-${n}`,
          channelId,
          authorId: userId,
          content: 'Measured insert',
          nonce: `${prefix}-measured-nonce-${n}`,
        })
        .returning(),
    updateUser: ({ userId }, n) =>
      db
        .update(users)
        .set({ status: n % 2 ? 'ONLINE' : 'IDLE' })
        .where(eq(users.id, userId))
        .returning(),
    async cleanup({ guildId, prefix }) {
      await db.delete(guilds).where(eq(guilds.id, guildId));
      await db.delete(users).where(
        inArray(
          users.id,
          Array.from({ length: 10 }, (_, i) => `${prefix}-user-${i}`)
        )
      );
    },
    close: () => db.$client.close(),
  };
}

async function prismaNextAdapter(): Promise<Adapter> {
  const runtimePackage = '@prisma-next/postgres/runtime';
  const postgres = (await import(runtimePackage)).default;
  const contractJson = await Bun.file(new URL('../prisma/contract.json', import.meta.url)).json();
  const db = postgres({ contractJson, url: options.DATABASE_URL });

  return {
    name: 'Prisma Next',
    version: packageJson.dependencies['@prisma-next/postgres'],
    async setup() {
      const prefix = `bench-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date();
      const userId = `${prefix}-user-0`;
      const guildId = `${prefix}-guild`;
      const channelId = `${prefix}-channel`;
      for (let i = 0; i < 10; i++) {
        await db.orm.public.User.create({
          id: `${prefix}-user-${i}`,
          username: `${prefix}-${i}`,
          homeserver: 'benchmark.invalid',
          displayName: `Benchmark user ${i}`,
          avatarUrl: null,
          isBot: false,
          createdAt: now,
          updatedAt: now,
        });
      }
      await db.orm.public.Guild.create({ id: guildId, name: 'Benchmark', ownerId: userId });
      for (let i = 0; i < 10; i++) {
        await db.orm.public.GuildMember.create({ guildId, userId: `${prefix}-user-${i}` });
      }
      await db.orm.public.Channel.create({
        id: channelId,
        guildId,
        name: 'benchmark',
        position: 0,
      });
      for (let i = 0; i < 100; i++) {
        await db.orm.public.Message.create({
          id: `${prefix}-seed-message-${i}`,
          channelId,
          authorId: `${prefix}-user-${i % 10}`,
          content: `Benchmark message ${i}`,
          nonce: `${prefix}-seed-nonce-${i}`,
        });
      }
      return { prefix, userId, guildId, channelId };
    },
    userById: ({ userId }) => db.orm.public.User.where({ id: userId }).first(),
    membership: ({ userId, guildId }) =>
      db.orm.public.GuildMember.where({ userId, guildId }).first(),
    messagesWithRelations: ({ channelId }) =>
      db.orm.public.Message.where({ channelId })
        .include('author')
        .include('attachments')
        .orderBy((message: any) => message.createdAt.asc())
        .all(),
    insertMessage: ({ prefix, channelId, userId }, n) =>
      db.orm.public.Message.create({
        id: `${prefix}-measured-message-${n}`,
        channelId,
        authorId: userId,
        content: 'Measured insert',
        nonce: `${prefix}-measured-nonce-${n}`,
      }),
    updateUser: ({ userId }, n) =>
      db.orm.public.User.where({ id: userId }).update({ status: n % 2 ? 'ONLINE' : 'IDLE' }),
    async cleanup({ guildId, prefix }) {
      await db.orm.public.Guild.where({ id: guildId }).delete();
      for (let i = 0; i < 10; i++) {
        await db.orm.public.User.where({ id: `${prefix}-user-${i}` }).delete();
      }
    },
    close: () => db.close(),
  };
}
