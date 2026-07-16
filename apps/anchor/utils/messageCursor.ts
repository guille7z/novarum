export type MessageCursor = { createdAt: Date | string; id: string };

export function isMessageAfter(message: MessageCursor, cursor?: MessageCursor) {
  if (!cursor) return true;

  const messageTime = new Date(message.createdAt).getTime();
  const cursorTime = new Date(cursor.createdAt).getTime();
  return messageTime > cursorTime || (messageTime === cursorTime && message.id > cursor.id);
}
