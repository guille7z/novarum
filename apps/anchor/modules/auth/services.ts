import Elysia, { t } from 'elysia';
import { db } from '../../prisma/db';
import { randomString } from '../../utils/randomString';
import {
  createBlankSessionCookie,
  createSession,
  createSessionCookie,
  deleteSessionToken,
  sessionCookieName,
  validateSessionToken,
} from './provider';
import { getConfig } from '../../utils/config';
import { storage } from '../../utils/services/storage';

const maxAvatarSize = getConfig().files.max_avatar_size * 1024 * 1024;

function userResponse(
  user: {
    id: string;
    username: string;
    homeserver: string;
    displayName: string | null;
    avatarUrl: string | null;
    isBot: boolean;
  },
  email: string | null = null
) {
  return {
    id: user.id,
    username: user.username,
    homeserver: user.homeserver,
    handle: `@${user.username}:${user.homeserver}`,
    displayName: user.displayName,
    email,
    avatarUrl: user.avatarUrl,
    isBot: user.isBot,
  };
}

export const auth = new Elysia({ prefix: '/auth' })
  .get('/avatar/:userId', async ({ params, status }) => {
    const user = await db.orm.public.User.where({ id: params.userId }).first();
    if (!user?.avatarUrl) return status(404, { error: 'Avatar not found' });

    const url = storage.presign(`avatars/${user.id}`, {
      method: 'GET',
      expiresIn: 5 * 60,
      type: 'image/png',
      contentDisposition: 'inline',
    });

    return Response.redirect(url);
  })
  .post(
    '/signup',
    async ({ body, cookie, request, status }) => {
      const { username, displayName, email, password } = body;
      const homeserver = getConfig().server.homeserver;
      const now = new Date();

      const existingCredential = await db.orm.public.LocalCredential.where({ email }).first();
      if (existingCredential) {
        return status(409, { error: 'User already exists' });
      }

      const existingUsername = await db.orm.public.User.where({ username, homeserver }).first();
      if (existingUsername) {
        return status(409, { error: 'Username is already taken' });
      }

      const user = await db.orm.public.User.create({
        id: randomString(),
        username,
        homeserver,
        displayName: displayName || null,
        avatarUrl: null,
        isBot: false,
        createdAt: now,
        updatedAt: now,
      });

      await db.orm.public.LocalCredential.create({
        userId: user.id,
        email,
        passwordHash: await Bun.password.hash(password),
      });

      const session = await createSession(user.id);
      const sessionCookie = createSessionCookie(session.token, request);

      cookie[sessionCookie.name]!.set({
        value: sessionCookie.value,
        ...sessionCookie.attributes,
      });

      return {
        user: userResponse(user, email),
      };
    },
    {
      body: t.Object({
        username: t.String({ minLength: 2, maxLength: 32, pattern: '^[a-zA-Z0-9._]+$' }),
        displayName: t.Optional(t.String({ maxLength: 64 })),
        email: t.String({ type: 'email' }),
        password: t.String({ minLength: 8 }),
      }),
    }
  )
  .post(
    '/login',
    async ({ body, cookie, request, status }) => {
      const { username, password } = body;
      const homeserver = getConfig().server.homeserver;

      const user = await db.orm.public.User.where({ username, homeserver }).first();
      if (!user) {
        return status(401, { error: 'Invalid username or password' });
      }

      const credential = await db.orm.public.LocalCredential.where({ userId: user.id }).first();
      if (!credential) {
        return status(401, { error: 'Invalid username or password' });
      }

      const validPassword = await Bun.password.verify(password, credential.passwordHash);
      if (!validPassword) {
        return status(401, { error: 'Invalid username or password' });
      }

      const session = await createSession(user.id);
      const sessionCookie = createSessionCookie(session.token, request);

      cookie[sessionCookie.name]!.set({
        value: sessionCookie.value,
        ...sessionCookie.attributes,
      });

      return {
        user: userResponse(user, credential.email),
      };
    },
    {
      body: t.Object({
        username: t.String({ minLength: 2, maxLength: 32, pattern: '^[a-zA-Z0-9._]+$' }),
        password: t.String({ minLength: 8 }),
      }),
    }
  )
  .post('/logout', async ({ cookie, request }) => {
    const sessionCookie = cookie[sessionCookieName]?.value as string | undefined;
    if (sessionCookie) {
      await deleteSessionToken(sessionCookie);
    }

    const blankCookie = createBlankSessionCookie(request);
    cookie[sessionCookieName]!.set({
      value: blankCookie.value,
      ...blankCookie.attributes,
    });

    return { success: true, message: 'Logged out successfully' };
  })
  .post(
    '/avatar',
    async ({ body, cookie, status }) => {
      const token = cookie[sessionCookieName]?.value as string | undefined;
      const session = await validateSessionToken(token);
      if (!session) return status(401, { error: 'Unauthorized' });
      if (body.avatar.type !== 'image/png') {
        return status(415, { error: 'Avatar must be a PNG image' });
      }
      if (body.avatar.size > maxAvatarSize) {
        return status(413, { error: 'Avatar must be smaller than 2 MB' });
      }

      await storage.write(`avatars/${session.userId}`, body.avatar, { type: 'image/png' });

      const version = Date.now();
      const avatarUrl = new URL(
        `/auth/avatar/${encodeURIComponent(session.userId)}?v=${version}`,
        getConfig().server.baseUrl
      ).toString();
      await db.orm.public.User.where({ id: session.userId }).update({
        avatarUrl,
        updatedAt: new Date(),
      });
      const user = await db.orm.public.User.where({ id: session.userId }).first();
      if (!user) return status(404, { error: 'User not found' });

      return { user: userResponse(user) };
    },
    {
      body: t.Object({
        avatar: t.File({
          type: 'image/png',
          maxSize: maxAvatarSize,
        }),
      }),
    }
  )
  .get('/me', async ({ cookie, request, status }) => {
    const token = cookie[sessionCookieName]?.value as string | undefined;
    if (!token) {
      return status(401, { user: null });
    }

    const session = await validateSessionToken(token);
    if (!session) {
      const blankCookie = createBlankSessionCookie(request);

      cookie[blankCookie.name]!.set({
        value: blankCookie.value,
        ...blankCookie.attributes,
      });

      return status(401, { user: null });
    }

    const user = await db.orm.public.User.where({ id: session.userId }).first();
    if (!user) {
      return status(401, { user: null });
    }

    const credential = await db.orm.public.LocalCredential.where({ userId: user.id }).first();

    return {
      user: userResponse(user, credential?.email ?? null),
    };
  });
