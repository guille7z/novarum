import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

const resultSchema = z.object({
  schemaVersion: z.literal(1),
  implementation: z.string(),
  version: z.string(),
  commit: z.string(),
  timestamp: z.string(),
  runtime: z.string(),
  machine: z.string(),
  database: z.string(),
  config: z.object({
    warmup: z.number(),
    samples: z.number(),
    throughputOps: z.number(),
    concurrency: z.number(),
    fixtureMessages: z.number(),
  }),
  results: z.array(
    z.object({
      name: z.string(),
      p50Ms: z.number(),
      p95Ms: z.number(),
      meanMs: z.number(),
      opsPerSecond: z.number(),
    })
  ),
});

const [, , firstPath, secondPath, outputDirectory = 'benchmarks/report'] = process.argv;
if (!firstPath || !secondPath) {
  console.error('Usage: bun run bench:report <first.json> <second.json> [output-directory]');
  process.exit(1);
}

const runs = (await Promise.all(
  [firstPath, secondPath].map(async (path) => resultSchema.parse(await Bun.file(path).json()))
)) as [z.infer<typeof resultSchema>, z.infer<typeof resultSchema>];
const names = runs[0].results.map(({ name }) => name);
if (runs[1].results.map(({ name }) => name).join('\0') !== names.join('\0')) {
  throw new Error('Benchmark files contain different scenarios');
}
if (JSON.stringify(runs[0].config) !== JSON.stringify(runs[1].config)) {
  throw new Error('Benchmark files use different warmup, sample, fixture, or concurrency settings');
}

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  Bun.write(join(outputDirectory, 'latency.svg'), chart('p95Ms', 'P95 LATENCY', 'ms', false)),
  Bun.write(
    join(outputDirectory, 'throughput.svg'),
    chart('opsPerSecond', 'THROUGHPUT', 'ops/s', true)
  ),
  Bun.write(join(outputDirectory, 'results.md'), markdown()),
]);
console.log(`Wrote ${outputDirectory}/latency.svg, throughput.svg, and results.md`);

function chart(
  metric: 'p95Ms' | 'opsPerSecond',
  title: string,
  unit: string,
  higherIsBetter: boolean
) {
  const width = 1200;
  const rowHeight = 118;
  const top = 210;
  const height = top + names.length * rowHeight + 100;
  const left = 390;
  const chartWidth = width - left - 90;
  const maximum = Math.max(...runs.flatMap((run) => run.results.map((result) => result[metric])));
  const colors = ['#d14d41', '#ad8301'];
  const rows = names
    .map((name, index) => {
      const y = top + index * rowHeight;
      const bars = runs
        .map((run, runIndex) => {
          const value = run.results[index]![metric];
          const barWidth = (value / maximum) * chartWidth;
          return `<rect x="${left}" y="${y + runIndex * 36}" width="${barWidth}" height="24" rx="3" fill="${colors[runIndex]}"/>
            <text x="${left + barWidth + 12}" y="${y + runIndex * 36 + 18}" class="value">${format(value)} ${unit}</text>`;
        })
        .join('');
      return `<text x="64" y="${y + 31}" class="scenario">${escapeXml(name)}</text>${bars}`;
    })
    .join('');
  const legend = runs
    .map(
      (run, index) =>
        `<rect x="${64 + index * 310}" y="142" width="18" height="18" rx="2" fill="${colors[index]}"/><text x="${92 + index * 310}" y="157" class="legend">${escapeXml(run.implementation)} ${escapeXml(run.version)}</text>`
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${title}: ${runs.map((run) => run.implementation).join(' versus ')}</title>
  <desc id="desc">${higherIsBetter ? 'Higher' : 'Lower'} values are better. ${names.length} database scenarios compared.</desc>
  <defs><pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" fill="none" stroke="#e6e4d9" stroke-width="1"/></pattern></defs>
  <rect width="100%" height="100%" fill="#fffcf0"/><rect x="32" y="32" width="1136" height="${height - 64}" fill="url(#grid)" stroke="#100f0f" stroke-width="2"/>
  <style>.title{font:700 34px Georgia,serif;letter-spacing:2px}.kicker,.legend,.value{font:600 16px ui-monospace,monospace}.kicker{fill:#6f6e69;letter-spacing:3px}.scenario{font:700 18px Georgia,serif}.value{fill:#100f0f}.note{font:14px Georgia,serif;fill:#6f6e69}</style>
  <text x="64" y="85" class="kicker">NOVARUM / ORM MIGRATION</text><text x="64" y="123" class="title">${title}</text>${legend}${rows}
  <text x="64" y="${height - 55}" class="note">${higherIsBetter ? 'Higher is better' : 'Lower is better'} / ${runs[0].config.samples} latency samples / concurrency ${runs[0].config.concurrency} / ${escapeXml(runs[0].runtime)}</text>
</svg>`;
}

function markdown() {
  const heading = `| Scenario | ${runs.map((run) => `${run.implementation} p50 / p95`).join(' | ')} | Change in p95 | ${runs.map((run) => `${run.implementation} ops/s`).join(' | ')} | Change in throughput |`;
  const separator = `| --- | ${runs.map(() => '---:').join(' | ')} | ---: | ${runs.map(() => '---:').join(' | ')} | ---: |`;
  const rows = names.map((name, index) => {
    const a = runs[0].results[index]!;
    const b = runs[1].results[index]!;
    return `| ${name} | ${format(a.p50Ms)} / ${format(a.p95Ms)} ms | ${format(b.p50Ms)} / ${format(b.p95Ms)} ms | ${change(a.p95Ms, b.p95Ms, false)} | ${format(a.opsPerSecond)} | ${format(b.opsPerSecond)} | ${change(a.opsPerSecond, b.opsPerSecond, true)} |`;
  });
  const provenance = runs.map(
    (run) => `- ${run.implementation} ${run.version}: commit \`${run.commit}\`, ${run.timestamp}`
  );
  return `# ORM benchmark\n\n![P95 latency](./latency.svg)\n\n![Throughput](./throughput.svg)\n\n${heading}\n${separator}\n${rows.join('\n')}\n\n## Method\n\n- ${runs[0].config.fixtureMessages} messages in the relation fixture\n- ${runs[0].config.warmup} warmup operations and ${runs[0].config.samples} measured latency operations per scenario\n- ${runs[0].config.throughputOps} throughput operations at concurrency ${runs[0].config.concurrency}\n- Runtime: ${runs[0].runtime}\n- Machine: ${runs[0].machine}\n- Database host: ${runs[0].database}\n\n${provenance.join('\n')}\n`;
}

function change(before: number, after: number, higherIsBetter: boolean) {
  const percent = ((after - before) / before) * 100;
  const improvement = higherIsBetter ? percent : -percent;
  return `${improvement >= 0 ? '+' : ''}${improvement.toFixed(1)}%`;
}

function format(value: number) {
  return value < 10 ? value.toFixed(2) : value.toFixed(1);
}

function escapeXml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!
  );
}
