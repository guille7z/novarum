import { parseArgs } from 'node:util';
import { db, users } from '../db';
import { and, eq } from 'drizzle-orm';
import { getConfig } from '../../utils/config';

const { positionals } = parseArgs({
  args: Bun.argv.slice(3),
  allowPositionals: true,
});
const homeserver = getConfig().server.homeserver;

const [command, arg1] = positionals;

// TODO: refactor the cli (but no extra deps!)
if (command === 'promote-admin' && arg1) {
  if (!(await db.query.users.findFirst({ where: { username: arg1, homeserver } }))) {
    console.error(`User ${arg1} does not exist on this homeserver.`);
    process.exit(1);
  }
  await db
    .update(users)
    .set({ isHomeserverAdmin: true })
    .where(and(eq(users.username, arg1), eq(users.homeserver, homeserver)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
  console.log(`${arg1} has been elevated to homeserver admin.`);
  process.exit(0);
}

if (command === 'demote-admin' && arg1) {
  if (!(await db.query.users.findFirst({ where: { username: arg1, homeserver } }))) {
    console.error(`User ${arg1} does not exist on this homeserver.`);
    process.exit(1);
  }
  await db
    .update(users)
    .set({ isHomeserverAdmin: false })
    .where(and(eq(users.username, arg1), eq(users.homeserver, homeserver)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
  console.log(`${arg1} has been demoted from homeserver admin.`);
  process.exit(0);
}

console.log('no valid command, check docs');
process.exit(0);
