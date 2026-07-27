<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Author } from '$lib/types/chat';
  import * as Popover from '$lib/components/ui/popover/index.js';
  import { settings } from '$lib/settings.svelte';
  import Avatar from './avatar.svelte';
  import AnimatedImage from './animated-image.svelte';

  let {
    user,
    children,
    class: className = '',
  }: {
    user: Author;
    children: Snippet;
    class?: string;
  } = $props();

  const name = $derived(user.displayName || user.username);
</script>

<Popover.Root>
  <Popover.Trigger class="cursor-pointer text-left {className}">
    {@render children()}
  </Popover.Trigger>

  <Popover.Content align="start" side="right" class="w-72 overflow-hidden mx-2 p-0">
    <div class="relative aspect-[3/1] overflow-hidden bg-primary/15">
      {#if user.bannerUrl}
        <AnimatedImage
          src={user.bannerUrl}
          alt=""
          class="size-full"
          focused={false}
          fit="contain"
        />
      {:else}
        <div
          class="absolute inset-0 opacity-20"
          style="background-image: repeating-linear-gradient(135deg, transparent 0 10px, currentColor 10px 11px)"
        ></div>
      {/if}
    </div>

    <div class="px-4 pb-4">
      <div class="relative -mt-8 w-fit">
        <Avatar src={user.avatarUrl} {name} class="size-16 border-4 border-popover text-xl" />
        {#if user.status}
          <span
            class="absolute bottom-0 right-0 size-3.5 border-[3px] border-popover {user.status ===
            'ONLINE'
              ? 'bg-emerald-500'
              : 'bg-muted-foreground'}"
            class:rounded-full={settings.value.circleIcons}
            aria-label={user.status === 'ONLINE' ? 'Online' : 'Offline'}
          ></span>
        {/if}
      </div>

      <div class="mt-2 flex items-center gap-2">
        <Popover.Title class="truncate text-base font-semibold">{name}</Popover.Title>
        {#if user.isBot}
          <span
            class="bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-primary"
          >
            BOT
          </span>
        {/if}
      </div>
      <Popover.Description class="truncate font-mono text-[11px]">
        @{user.username}:{user.server}
      </Popover.Description>
      {#if user.about}
        <p class="mt-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/80">
          {user.about}
        </p>
      {/if}
    </div>
  </Popover.Content>
</Popover.Root>
