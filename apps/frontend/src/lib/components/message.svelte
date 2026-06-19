<script lang="ts">
  import { Globe, MessageCircle, Bot, Pencil } from "@lucide/svelte";
  import { cn } from "$lib/utils";
  import type { Message } from "$lib/data/mock";

  let {
    message,
    grouped,
  }: {
    message: Message;
    grouped: boolean;
  } = $props();

  function formatTime(date: Date): string {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
</script>

<div
  class="group flex gap-3 px-4 py-0.5 transition-colors hover:bg-white/[0.02]"
  class:pt-3={!grouped}
  class:pb-0.5={!grouped}
>
  {#if !grouped}
    <div class="relative mt-0.5 flex size-9 shrink-0 items-center justify-center text-xs font-bold text-white {message.author.avatarColor}">
      {message.author.displayName.charAt(0).toUpperCase()}
      {#if message.author.isBot}
        <div class="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center bg-sidebar">
          <Bot class="size-2.5 text-muted-foreground" />
        </div>
      {/if}
    </div>
  {:else}
    <div class="w-9 shrink-0 text-center">
      <span class="invisible text-[10px] text-muted-foreground group-hover:visible">
        {formatTime(message.timestamp)}
      </span>
    </div>
  {/if}

  <div class="min-w-0 flex-1 space-y-0.5">
    {#if !grouped}
      <div class="flex items-baseline gap-2">
        <span class="text-sm font-semibold text-foreground hover:underline cursor-pointer">
          {message.author.displayName}
        </span>
        <span class="text-[11px] text-muted-foreground">{formatTime(message.timestamp)}</span>
        {#if message.fromFederated}
          <span class="inline-flex items-center gap-1 rounded-none border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[10px] text-primary">
            <Globe class="size-2.5" />
            {message.author.server}
          </span>
        {:else}
          <span class="text-[10px] text-muted-foreground/50">{message.author.server}</span>
        {/if}
      </div>
    {/if}

    <div class="text-sm leading-relaxed text-foreground/90 [&_code]:rounded-none [&_code]:bg-muted/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:text-foreground [&_strong]:text-foreground">
      {#each message.content.split(/(\*\*[^*]+\*\*|`[^`]+`)/g) as segment}
        {#if segment.startsWith("**") && segment.endsWith("**")}
          <strong>{segment.slice(2, -2)}</strong>
        {:else if segment.startsWith("`") && segment.endsWith("`")}
          <code>{segment.slice(1, -1)}</code>
        {:else}
          {@const linkMatch = segment.match(/@(\w+)/g)}
          {#if linkMatch}
            {#each segment.split(/(@\w+)/g) as part}
              {#if part.startsWith("@")}
                <span class="cursor-pointer font-medium text-primary hover:underline">{part}</span>
              {:else}
                {part}
              {/if}
            {/each}
          {:else}
            {segment}
          {/if}
        {/if}
      {/each}
    </div>

    <div class="flex items-center gap-4 pt-0.5 opacity-0 transition-opacity group-hover:opacity-100">
      <button class="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground">
        <MessageCircle class="size-3.5" />
        {#if message.replies > 0}
          <span>{message.replies} replies</span>
        {:else}
          <span>Reply</span>
        {/if}
      </button>
      {#if message.edited}
        <span class="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Pencil class="size-3" />
          edited
        </span>
      {/if}
      {#if message.fromFederated}
        <span class="text-[10px] text-primary/60">
          routed via federation relay
        </span>
      {/if}
    </div>
  </div>
</div>
