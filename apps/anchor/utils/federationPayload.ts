import { publicUser } from './publicUser';

export function federationUserPayload(session: { user: Parameters<typeof publicUser>[0] }) {
  const { userId: _, ...user } = publicUser(session.user);
  return user;
}
