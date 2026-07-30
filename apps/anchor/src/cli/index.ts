import { parseArgs } from 'node:util';
import { db, users } from '../db';
import { and, eq } from 'drizzle-orm';
import { getConfig } from '../../utils/config';
import { getAverageColor } from 'fast-average-color-node';

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

if (command === 'compute-avatar-color') {
  const allUsers = await db.query.users.findMany({
    where: {
      homeserver,
      AND: [
        { avatarUrl: { isNotNull: true } },
        { avatarColor: { isNull: true } }
      ]
    }
  });

  console.log(`computing avatar colors for ${allUsers.length} users...`);

  for (const user of allUsers) {
    try {
      const response = await fetch(user.avatarUrl!);
      if (!response.ok) {
        console.error(`failed to fetch avatar for user ${user.username}: ${response.statusText}`);
        console.error('ensure the server is up so the avatar can be fetched.');
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const color = await getAverageColor(buffer);

      await db
        .update(users)
        .set({ avatarColor: color.hex.toUpperCase() })
        .where(eq(users.id, user.id));

      console.log(`${user.username} complete (${color.hex.toUpperCase()})`);
    } catch (error) {
      console.error(`error computing for ${user.username}:`, error);
    }
  }
}

console.log('no valid command, check docs');
process.exit(0);
