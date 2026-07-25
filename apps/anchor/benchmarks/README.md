# ORM migration benchmark

This suite runs the same isolated fixture and query shapes against Prisma Next on `landmark/before-drizzle` and
Drizzle on `refactor/drizzle`. It measures client-observed latency and concurrent throughput

Use the same machine, database, Bun version, and environment values for both runs. Point
`DATABASE_URL` at a disposable PostgreSQL database: the suite creates and removes its own rows,
but it performs real writes.

## Disclaimer

This suite has been completely AI generated with GPT-5.6 Sol for demonstration purposes only. It has not been reviewed by any maintainer. Use at your discretion.

## Usage

```sh
# Run Drizzle from this branch.
DATABASE_URL=postgresql://... \
  BENCH_OUTPUT=/tmp/drizzle.json \
  bun run --filter anchor bench

# Keep the pre-Drizzle landmark checked out separately and give it the branch-neutral suite.
git worktree add ../novarum-before-drizzle origin/landmark/before-drizzle
cp -R apps/anchor/benchmarks ../novarum-before-drizzle/apps/anchor/
(cd ../novarum-before-drizzle && bun install)
(cd ../novarum-before-drizzle && DATABASE_URL=postgresql://... \
  BENCH_OUTPUT=/tmp/prisma-next.json \
  bun apps/anchor/benchmarks/run.ts)

# From refactor/drizzle, generate blog-ready SVGs and a Markdown table.
bun run --filter anchor bench:report \
  /tmp/prisma-next.json /tmp/drizzle.json benchmarks/report
```

The defaults are 20 warmups, 200 latency samples, and 500 throughput operations at concurrency 10. Override them with `BENCH_WARMUP`, `BENCH_SAMPLES`, `BENCH_THROUGHPUT_OPS`, and
`BENCH_CONCURRENCY`. The report rejects runs with different settings.

For a publishable result, run each branch at least three times in alternating order and use the
median run. Do not compare a local database with a remote one, or a cold database with a warmed
one. Keep the generated JSON beside the blog post so readers can inspect the raw measurements.
