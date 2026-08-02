<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Author } from '$lib/types/chat';
  import * as Popover from '$lib/components/ui/popover/index.js';
  import { settings } from '$lib/settings.svelte';
  import { friends } from '$lib/friends.svelte';
  import { useSession } from '$lib/session.svelte';
  import { Button } from '$lib/components/ui/button';
  import { UserRound, UserRoundArrowLeft, UserRoundCheck, UserRoundCog } from '@lucide/svelte';
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

  const session = useSession();
  const name = $derived(user.displayName || user.username);
  const friendStatus = $derived(friends.statusFor(user.userId));
  const busy = $derived(friends.busyUserIds.includes(user.userId));
  const canAddFriend = $derived(
    Boolean(user.userId) && user.userId !== session.user?.id && !user.isBot
  );
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

    <div class="relative px-4 pb-4">
      {#if canAddFriend}
        <Button
          variant="outline"
          size="icon"
          class="absolute top-1 right-3"
          aria-label="User action"
        >
          {#if friendStatus === 'INCOMING'}
            <UserRoundArrowLeft />
            {:else if friendStatus === 'OUTGOING'}
            <UserRoundCog />
            {:else if friendStatus === 'FRIEND'}
            <UserRoundCheck />
          {:else}
            <UserRound />
          {/if}
        </Button>
      {/if}

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

      {#if canAddFriend}
        <div class="mt-4 border-t border-border pt-3">
          {#if friendStatus === 'INCOMING'}
            <div class="grid grid-cols-2 gap-2">
              <Button disabled={busy} onclick={() => friends.accept(user.userId)}>Accept</Button>
              <Button variant="outline" disabled={busy} onclick={() => friends.decline(user.userId)}
                >Decline</Button
              >
            </div>
          {:else if friendStatus === 'OUTGOING'}
            <Button
              class="w-full"
              variant="outline"
              disabled={busy}
              onclick={() => friends.remove(user.userId)}>Cancel request</Button
            >
          {:else if friendStatus === 'FRIEND'}
            <Button
              class="w-full"
              variant="ghost"
              disabled={busy}
              onclick={() => friends.remove(user.userId)}>Remove friend</Button
            >
          {:else}
            <Button class="w-full" disabled={busy} onclick={() => friends.request(user.userId)}>
              Add friend
            </Button>
          {/if}
          {#if friends.error}
            <p class="mt-2 text-[10px] leading-4 text-destructive">{friends.error}</p>
          {/if}
        </div>
      {/if}
    </div>
  </Popover.Content>
</Popover.Root>
