export function mentionHandles(content: string | null) {
  return new Set(
    [
      ...(content ?? '')
        .replace(/https?:\/\/[^\s]+/g, '')
        .matchAll(/(?<![a-zA-Z0-9._])@[a-zA-Z0-9._]+:[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?/g),
    ].map(([handle]) => handle.toLowerCase())
  );
}
