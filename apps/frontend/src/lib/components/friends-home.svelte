<script lang="ts">
  import { Check, Clock3, Menu, RefreshCw, UserPlus, Users, X } from '@lucide/svelte';
  import type { FriendEntry } from '$lib/friends.svelte';
  import { friends } from '$lib/friends.svelte';
  import { Button } from '$lib/components/ui/button';
  import Avatar from './avatar.svelte';
  import ProfileCard from './profile-card.svelte';

  let { onOpenNavigation }: { onOpenNavigation: () => void } = $props();

  function nameFor(entry: FriendEntry) {
    return entry.user.displayName || entry.user.username;
  }

  function profileFor(entry: FriendEntry) {
    return { ...entry.user, server: entry.user.homeserver };
  }
</script>

<main class="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
  <header
    class="flex h-12 shrink-0 items-center justify-between border-b border-border px-4 md:px-6"
  >
    <div class="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon-sm"
        class="md:hidden"
        aria-label="Open navigation"
        onclick={onOpenNavigation}
      >
        <Menu />
      </Button>
      <Users class="size-4 text-primary" />
      <h1 class="text-sm font-semibold">Friends</h1>
      <span class="border-l border-border pl-2 text-xs text-muted-foreground">
        {friends.accepted.length} connected
      </span>
    </div>
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Refresh friends"
      disabled={friends.loading}
      onclick={() => friends.load()}
    >
      <RefreshCw class={friends.loading ? 'size-3.5 animate-spin' : 'size-3.5'} />
    </Button>
  </header>

  <div class="min-h-0 flex-1 overflow-y-auto">
    <div
      class="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 md:grid-cols-[minmax(0,1fr)_18rem] md:px-8 md:py-10"
    >
      <section>
        <div class="mb-4 flex items-end justify-between border-b border-border pb-3">
          <div>
            <p class="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              Your circle
            </p>
            <h2 class="mt-1 text-xl font-semibold tracking-tight">All friends</h2>
          </div>
          <span class="text-xs tabular-nums text-muted-foreground">{friends.accepted.length}</span>
        </div>

        {#if friends.loading && friends.accepted.length === 0}
          <div
            class="border border-border bg-card/40 p-8 text-center text-sm text-muted-foreground"
          >
            Loading friends...
          </div>
        {:else if friends.accepted.length === 0}
          <div
            class="relative overflow-hidden border border-dashed border-border px-6 py-12 text-center"
          >
            <div class="absolute inset-x-0 top-0 h-px bg-primary/40"></div>
            <UserPlus class="mx-auto size-7 text-primary/70" />
            <p class="mt-4 text-sm font-medium">Your friends list is quiet</p>
            <p class="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
              Open someone’s profile from a server member list or a message, then send them a friend
              request.
            </p>
          </div>
        {:else}
          <div class="divide-y divide-border border-y border-border">
            {#each friends.accepted as entry (entry.user.userId)}
              {@const name = nameFor(entry)}
              <div class="group flex items-center gap-3 py-3">
                <ProfileCard user={profileFor(entry)}>
                  <Avatar src={entry.user.avatarUrl} {name} class="size-10 text-sm" />
                </ProfileCard>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium">{name}</p>
                  <p class="truncate font-mono text-[10px] text-muted-foreground">
                    @{entry.user.username}:{entry.user.homeserver}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={friends.busyUserIds.includes(entry.user.userId)}
                  onclick={() => friends.remove(entry.user.userId)}>Remove</Button
                >
              </div>
            {/each}
          </div>
        {/if}
      </section>

      <aside class="space-y-6">
        <section class="border border-border bg-card/40">
          <div class="flex items-center justify-between border-b border-border px-4 py-3">
            <div class="flex items-center gap-2">
              <UserPlus class="size-3.5 text-primary" />
              <h2 class="text-xs font-semibold uppercase tracking-wider">Requests</h2>
            </div>
            {#if friends.incoming.length > 0}
              <span class="bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {friends.incoming.length}
              </span>
            {/if}
          </div>

          {#if friends.incoming.length === 0}
            <p class="px-4 py-5 text-xs leading-5 text-muted-foreground">No incoming requests.</p>
          {:else}
            <div class="divide-y divide-border">
              {#each friends.incoming as entry (entry.user.userId)}
                {@const name = nameFor(entry)}
                <div class="p-3">
                  <div class="flex items-center gap-2.5">
                    <Avatar src={entry.user.avatarUrl} {name} class="size-8 text-xs" />
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-xs font-medium">{name}</p>
                      <p class="truncate font-mono text-[9px] text-muted-foreground">
                        @{entry.user.username}:{entry.user.homeserver}
                      </p>
                    </div>
                  </div>
                  <div class="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      disabled={friends.busyUserIds.includes(entry.user.userId)}
                      onclick={() => friends.accept(entry.user.userId)}><Check />Accept</Button
                    >
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={friends.busyUserIds.includes(entry.user.userId)}
                      onclick={() => friends.decline(entry.user.userId)}><X />Decline</Button
                    >
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </section>

        {#if friends.outgoing.length > 0}
          <section>
            <div class="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Clock3 class="size-3.5" /> Sent requests
            </div>
            <div class="divide-y divide-border border-y border-border">
              {#each friends.outgoing as entry (entry.user.userId)}
                <div class="flex items-center gap-2 py-2.5">
                  <Avatar
                    src={entry.user.avatarUrl}
                    name={nameFor(entry)}
                    class="size-7 text-[10px]"
                  />
                  <span class="min-w-0 flex-1 truncate text-xs">{nameFor(entry)}</span>
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={friends.busyUserIds.includes(entry.user.userId)}
                    onclick={() => friends.remove(entry.user.userId)}>Cancel</Button
                  >
                </div>
              {/each}
            </div>
          </section>
        {/if}

        {#if friends.error}
          <p class="border-l-2 border-destructive pl-3 text-xs leading-5 text-destructive">
            {friends.error}
          </p>
        {/if}
      </aside>
    </div>
  </div>
</main>
