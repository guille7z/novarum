import Elysia, { t } from "elysia";
import { sessionCookieName, validateSessionToken } from "../auth/provider";
import { db, friendRelationships } from "../../src/db";
import { and, eq } from "drizzle-orm";

export const friends = new Elysia({ prefix: '/friends' })
  .resolve(async ({ cookie, status }) => {
    const token = cookie[sessionCookieName]?.value as string | undefined;
    const session = await validateSessionToken(token);
    if (!session) {
      return status(401, { error: 'Unauthorized' });
    }
    return { session };
  })
  .get('/', async ({ session, status }) => {
    const friends = await db.query.friendRelationships.findMany({
      where: {
        OR: [
          { userOneId: session.userId },
          { userTwoId: session.userId }
        ]
      }
    })

    const acceptedFriends = friends.filter(friend => friend.status === 'ACCEPTED');
    const incoming = friends.filter(friend => friend.status === 'PENDING' && friend.requestedById !== session.userId);
    const outgoing = friends.filter(friend => friend.status === 'PENDING' && friend.requestedById === session.userId);

    return {
      accepted: acceptedFriends,
      incoming,
      outgoing
    };
  })
  .post('/request', async ({ session, body, status }) => {
    const { friendId } = body;

    const [userOne, userTwo] = [session.userId, friendId].sort();
    const existingFriendship = await db.query.friendRelationships.findFirst({
      where: {
        userOneId: userOne,
        userTwoId: userTwo
      }
    });

    if (existingFriendship) {
      return status(400, { error: 'Friend request already exists or you are already friends.' });
    }

    const [newFriendship] = await db
      .insert(friendRelationships)
      .values({
        requestedById: session.userId,
        // overriding undefined because typescript is an idiot sometimes.
        userOneId: userOne!,
        userTwoId: userTwo!,
        status: 'PENDING',
      })
      .returning();

    return newFriendship;
  }, {
    body: t.Object({
      friendId: t.String(),
    })
  })
  .post('/requests/:userId/accept', async ({ session, params, status }) => {
    const { userId } = params;

    const [userOne, userTwo] = [session.userId, userId].sort();
    const existingFriendship = await db.query.friendRelationships.findFirst({
      where: {
        userOneId: userOne,
        userTwoId: userTwo,
        status: 'PENDING'
      }
    });

    if (!existingFriendship) {
      return status(400, { error: 'No pending friend request found.' });
     }

    const [updatedFriendship] = await db
      .update(friendRelationships)
      .set({ status: 'ACCEPTED', acceptedAt: new Date() })
      .where(and(eq(friendRelationships.userOneId, userOne!), eq(friendRelationships.userTwoId, userTwo!), eq(friendRelationships.status, 'PENDING')))
      .returning();

    return updatedFriendship;
  })
  .post('/requests/:userId/decline', async ({ session, params, status }) => {
    const { userId } = params;

    const [userOne, userTwo] = [session.userId, userId].sort();
    const existingFriendship = await db.query.friendRelationships.findFirst({
      where: {
        userOneId: userOne,
        userTwoId: userTwo,
        status: 'PENDING'
      }
    });

    if (!existingFriendship) {
      return status(400, { error: 'No pending friend request found.' });
    }

    await db
      .delete(friendRelationships)
      .where(and(eq(friendRelationships.userOneId, userOne!), eq(friendRelationships.userTwoId, userTwo!), eq(friendRelationships.status, 'PENDING')));

    return { message: 'Friend request declined.' };
  }).delete('/:userId', async ({ session, params, status }) => {
    const { userId } = params;

    const [userOne, userTwo] = [session.userId, userId].sort();
    const existingFriendship = await db.query.friendRelationships.findFirst({
      where: {
        userOneId: userOne,
        userTwoId: userTwo,
      }
    });

    if (!existingFriendship) {
      return status(400, { error: 'No friendship found to remove.' });
    }

    if (existingFriendship.status === 'PENDING' && existingFriendship.requestedById !== session.userId) {
      return status(400, { error: 'Cannot remove a pending friend request you did not send.' });
    }

    await db
      .delete(friendRelationships)
      .where(and(eq(friendRelationships.userOneId, userOne!), eq(friendRelationships.userTwoId, userTwo!)));

    return { message: 'Friend removed successfully.' };
  });
