import { and, eq, inArray } from 'drizzle-orm';
import { db, users } from '../src/db';
import { getConfig } from './config';

export async function clearOnlineUsers(userIds?: string[]) {
  if (userIds?.length === 0) return;

  const localOnline = and(
    eq(users.status, 'ONLINE'),
    eq(users.homeserver, getConfig().server.homeserver)
  );
  await db
    .update(users)
    .set({ status: 'OFFLINE' })
    .where(userIds ? and(localOnline, inArray(users.id, userIds)) : localOnline);
}

export async function getOnlineUsers() {
  return await db.query.users.findMany({
    where: { status: 'ONLINE', homeserver: getConfig().server.homeserver },
  });
}
