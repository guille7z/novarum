import Elysia, { t } from 'elysia';
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
import { db, emailOtps, localCredentials, users } from '../../src/db';
import { publicUser, publicUserSchema } from '../../utils/publicUser';
import { z } from 'zod';
import { genericResponseErrorSchema } from '../../utils/genericResponseError';
import { eq } from 'drizzle-orm';
import { renderToStaticMarkup } from 'react-dom/server'
import OTPEmail from '../../src/emails/otp'

export const userResponseSchema = publicUserSchema.omit({ userId: true }).extend({
  id: publicUserSchema.shape.userId,
  handle: z.string(),
  email: z.string().nullable(),
});
const userPayloadResponseSchema = z.object({ user: userResponseSchema });

export const auth = new Elysia({ prefix: '/auth', tags: ['Auth'] })
  .post(
    '/signup',
    async ({ body, cookie, request, status }) => {
      const { username, displayName, email, password } = body;
      const homeserver = getConfig().server.homeserver;
      const now = new Date();

      const existingCredential = await db.query.localCredentials.findFirst({
        where: {
          email,
        },
      });
      if (existingCredential) {
        return status(409, { error: 'User with this email already exists' });
      }

      const existingUsername = await db.query.users.findFirst({
        where: {
          username,
          homeserver,
        },
      });
      if (existingUsername) {
        return status(409, { error: 'Username is already taken' });
      }

      const [user] = await db
        .insert(users)
        .values({
          id: randomString(),
          username,
          homeserver,
          displayName: displayName || null,
          avatarUrl: null,
          isBot: false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      if (!user) {
        return status(500, { error: 'Failed to create user' });
      }

      await db.insert(localCredentials).values({
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
      response: {
        200: userPayloadResponseSchema,
        409: genericResponseErrorSchema,
        500: genericResponseErrorSchema,
      },
    }
  )
  .post(
    '/login',
    async ({ body, cookie, request, status }) => {
      const { username, password } = body;
      const homeserver = getConfig().server.homeserver;

      const user = await db.query.users.findFirst({
        where: {
          username,
          homeserver,
        },
      });
      if (!user) {
        return status(401, { error: 'Invalid username or password' });
      }

      const credential = await db.query.localCredentials.findFirst({
        where: {
          userId: user.id,
        },
      });
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
      response: {
        200: userPayloadResponseSchema,
        401: genericResponseErrorSchema,
      },
    }
  )
  .post(
    '/logout',
    async ({ cookie, request }) => {
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
    },
    {
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
        }),
      },
    }
  )
  .get(
    '/me',
    async ({ cookie, request, status }) => {
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

      const user = await db.query.users.findFirst({
        where: {
          id: session.userId,
        },
      });
      if (!user) {
        return status(401, { user: null });
      }

      const credential = await db.query.localCredentials.findFirst({
        where: {
          userId: user.id,
        },
      });

      return {
        user: userResponse(user, credential?.email ?? null),
      };
    },
    {
      response: {
        200: userPayloadResponseSchema,
        401: z.object({ user: z.null() }),
      },
    }
  ).post('/reset-password', async ({ body, status }) => {
    const { email, newPassword } = body;

    const otp = await db.query.emailOtps.findFirst({
      where: {
        email,
        intent: 'PASSWORD_RESET',
        otp: body.verificationCode,
        expiresAt: { gte: new Date() },
      }
    });
    if (!otp) {
      return status(400, { error: 'Invalid or expired verification code' });
    }
    
    const credential = await db.query.localCredentials.findFirst({
      where: {
        email,
      },
    });
    if (!credential) {
      return status(404, { error: 'User not found' });
    }

    const passwordHash = await Bun.password.hash(newPassword);

    await db.update(localCredentials).set({ passwordHash }).where(eq(localCredentials.userId, credential.userId));

    return { success: true, message: 'Password reset successfully' };
  }, {
    body: t.Object({
      email: t.String({ type: 'email' }),
      newPassword: t.String({ minLength: 8 }),
      verificationCode: t.Number({ minLength: 6, maxLength: 6 }),
    }),
    response: {
      200: z.object({
        success: z.boolean(),
        message: z.string(),
      }),
      400: genericResponseErrorSchema,
      404: genericResponseErrorSchema
    },
  }).post('/password-reset/request', async ({ body, status }) => {
    const { email } = body;

    const userCredential = await db.query.localCredentials.findFirst({
      where: {
        email
      }
    });
    if (!userCredential) {
      return { success: true, message: 'Sent successfully if a user exists' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000); 
    const in10Minutes = new Date(Date.now() + 10 * 60 * 1000);
    await db.insert(emailOtps).values({
      // maybe this id thing should be refactored idk
      id: randomString(),
      email,
      expiresAt: in10Minutes,
      otp,
      intent: 'PASSWORD_RESET',
    });

    // sends email with otp!
    // commenting to commit and rename this to .tsx
    // const html = renderToStaticMarkup(<OTPEmail otp={otp} intent="reset-password" />);

    return { success: true, message: 'Sent successfully if a user exists' };
  }, {
    body: t.Object({
      email: t.String({ type: 'email' }),
    }),
    response: {
      200: z.object({
        success: z.boolean(),
        message: z.string(),
      }),
    },
  });

export function userResponse(user: Parameters<typeof publicUser>[0], email: string | null = null) {
  const { userId: id, ...profile } = publicUser(user);
  return {
    id,
    ...profile,
    handle: `@${user.username}:${user.homeserver}`,
    email,
  };
}
