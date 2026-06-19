<script lang="ts">
  import { Hash, Globe, Volume2, Pin, Users, Search, AtSign, Inbox } from "@lucide/svelte";
  import type { Channel, Message } from "$lib/data/mock";
  import MessageComponent from "./message.svelte";
  import MessageInput from "./message-input.svelte";

  let {
    channel,
    messages,
  }: {
    channel: Channel;
    messages: Message[];
  } = $props();
</script>

<div class="flex flex-1 flex-col bg-background">
  <!-- header -->
  <div class="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
    {#if channel.type === "voice"}
      <Volume2 class="size-5 text-muted-foreground" />
    {:else if channel.type === "federated"}
      <Globe class="size-5 text-primary/70" />
    {:else}
      <Hash class="size-5 text-muted-foreground" />
    {/if}
    <span class="text-sm font-semibold text-foreground">{channel.name}</span>
    {#if channel.topic}
      <span class="mx-1.5 text-muted-foreground/30">|</span>
      <span class="truncate text-xs text-muted-foreground/70">{channel.topic}</span>
    {/if}
    <div class="ml-auto flex items-center gap-1">
      <button class="flex size-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground" aria-label="At mentions">
        <AtSign class="size-4" />
      </button>
      <button class="flex size-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground" aria-label="Inbox">
        <Inbox class="size-4" />
      </button>
      <button class="flex size-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground" aria-label="Pinned messages">
        <Pin class="size-4" />
      </button>
      <button class="flex size-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground" aria-label="Member list">
        <Users class="size-4" />
      </button>
      <div class="ml-1 h-5 w-px bg-border"></div>
      <button class="flex size-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground" aria-label="Search">
        <Search class="size-4" />
      </button>
    </div>
  </div>

  <!-- messages -->
  <div class="flex-1 overflow-y-auto">
    <div class="flex flex-col justify-end min-h-full">
      <div class="pt-4">
        <!-- channel header area -->
        <div class="mb-4 flex items-start gap-3 px-4">
          <div class="flex size-16 items-center justify-center bg-primary/10 text-2xl font-bold text-primary">
            {#if channel.type === "federated"}
              <Globe class="size-8" />
            {:else if channel.type === "voice"}
              <Volume2 class="size-8" />
            {:else}
              <Hash class="size-8" />
            {/if}
          </div>
          <div class="pt-1">
            <h2 class="text-lg font-bold text-foreground">
              {channel.type === "federated" ? "🌐 " : ""}
              {channel.label || channel.name}
            </h2>
            {#if channel.topic}
              <p class="text-sm text-muted-foreground">{channel.topic}</p>
            {/if}
          </div>
        </div>

        <!-- message groups -->
        {#each messages as msg, i}
          {@const prev = messages[i - 1]}
          {@const grouped = prev !== undefined
            && prev.author.username === msg.author.username
            && prev.author.server === msg.author.server
            && (msg.timestamp.getTime() - prev.timestamp.getTime()) < 5 * 60 * 1000}
          <MessageComponent message={msg} {grouped} />
        {/each}
        <div class="h-2"></div>
      </div>
    </div>
  </div>

  <!-- input -->
  <MessageInput placeholder="Message #{channel.name}" />
</div>
