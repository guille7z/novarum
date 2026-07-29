<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import { Switch } from '$lib/components/ui/switch/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { User, Palette, Bell, Volume2, LogOut } from '@lucide/svelte';
  import { anchor } from '$lib/anchor.svelte';
  import { goto } from '$app/navigation';
  import { useSession } from '$lib/session.svelte';
  import AvatarCropDialog from './avatar-crop-dialog.svelte';
  import Avatar from './avatar.svelte';
  import AnimatedImage from './animated-image.svelte';
  import { settings } from '$lib/settings.svelte';
  import type { Voice } from '$lib/voice.svelte';
  import { chat } from '$lib/chat-state.svelte';
  import {
    getNotificationPermission,
    notificationsSupported,
    requestNotificationPermission,
  } from '$lib/notifications';
  import { onMount } from 'svelte';
  import { getAnchorInfo } from '$lib/api';

  let { open = $bindable(false), voice }: { open: boolean; voice: Voice } = $props();

  const session = useSession();
  let displayName = $state('');
  let email = $state('');
  let about = $state('');
  let avatarInput: HTMLInputElement;
  let bannerInput: HTMLInputElement;
  let cropFile = $state<File | null>(null);
  let cropTarget = $state<'avatar' | 'banner'>('avatar');
  let cropOpen = $state(false);
  let mediaLoading = $state<'avatar' | 'banner' | null>(null);
  let mediaError = $state<string | null>(null);
  let aboutLoading = $state(false);
  let aboutError = $state<string | null>(null);
  let aboutSaved = $state(false);
  let mentionSound = $state(true);
  let showOnlineStatus = $state(true);
  let logoutLoading = $state(false);
  let audioDevices = $state<{ input: MediaDeviceInfo[]; output: MediaDeviceInfo[] }>({
    input: [],
    output: [],
  });
  let audioDeviceError = $state<string | null>(null);

  const anchorVersion = (await getAnchorInfo(anchor.homeServer)).version;
  const desktopVersion = await window.electron?.getVersion();
  const frontendVersion = __FRONTEND_VERSION__;
  const gitCommit = __GIT_COMMIT_HASH__.slice(0, 7);

  $effect(() => {
    if (!session.user) return;
    displayName = session.user.displayName ?? '';
    email = session.user.email ?? '';
    about = session.user.about ?? '';
  });

  onMount(() => {
    void refreshAudioDevices();
    navigator.mediaDevices.addEventListener('devicechange', refreshAudioDevices);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', refreshAudioDevices);
    };
  });

  function selectMedia(event: Event, target: 'avatar' | 'banner') {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    if (!['image/gif', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      mediaError = 'Choose a GIF, JPEG, PNG, or WebP image.';
      return;
    }

    mediaError = null;
    if (file.type === 'image/gif') {
      void uploadMedia(file, target);
      return;
    }

    cropTarget = target;
    cropFile = file;
    cropOpen = true;
  }

  async function uploadMedia(blob: Blob, target: 'avatar' | 'banner') {
    mediaLoading = target;
    mediaError = null;
    const type = blob.type === 'image/gif' ? 'image/gif' : 'image/png';
    const file = new File([blob], `${target}.${type === 'image/gif' ? 'gif' : 'png'}`, { type });

    try {
      const result =
        target === 'avatar'
          ? await anchor.client.user.avatar.post({ avatar: file })
          : await anchor.client.user.banner.post({ banner: file });
      if (result.error || !result.data || 'error' in result.data) {
        mediaError = `Could not upload your ${target}.`;
        return;
      }
      chat.updateUserProfile(result.data.user.id, result.data.user);
      await session.refresh();
    } catch {
      mediaError = `Could not upload your ${target}.`;
    } finally {
      mediaLoading = null;
    }
  }

  async function saveAbout() {
    aboutLoading = true;
    aboutError = null;
    aboutSaved = false;

    try {
      const result = await anchor.client.user.about.post({ about: about.trim() || null });
      if (result.error || !result.data || 'error' in result.data) {
        aboutError = 'Could not update your about section.';
        return;
      }

      chat.updateUserProfile(result.data.user.id, result.data.user);
      await session.refresh();
      aboutSaved = true;
    } catch {
      aboutError = 'Could not update your about section.';
    } finally {
      aboutLoading = false;
    }
  }

  async function logout() {
    logoutLoading = true;
    await anchor.client.auth.logout.post();
    const me = await anchor.client.auth.me.get();
    if (!me.data) {
      await goto('/login');
    }
  }

  let css = $state(localStorage.getItem('quickcss') ?? '');

  $effect(() => {
    let tag = document.getElementById('quickcss') as HTMLStyleElement;
    if (!tag) {
      tag = document.createElement('style');
      tag.id = 'quickcss';
      document.head.appendChild(tag);
    }
    tag.textContent = css;
    localStorage.setItem('quickcss', css);
  });

  async function setPushNotifications(enabled: boolean) {
    if (!enabled || !notificationsSupported()) {
      settings.value.pushNotifications = false;
      return;
    }

    const permission = await getNotificationPermission();
    const granted =
      permission === 'granted' || (await requestNotificationPermission()) === 'granted';

    settings.value.pushNotifications = granted;
    if (granted) new Notification('Novarum notifications enabled');
  }

  async function refreshAudioDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      audioDevices = {
        input: devices.filter(
          (device) => device.kind === 'audioinput' && device.deviceId !== 'default'
        ),
        output: devices.filter(
          (device) => device.kind === 'audiooutput' && device.deviceId !== 'default'
        ),
      };
    } catch (error) {
      console.error('Error getting audio devices:', error);
    }
  }

  async function setAudioDevice(kind: 'input' | 'output', deviceId: string) {
    audioDeviceError = null;
    try {
      if (kind === 'input') await voice.setInputDevice(deviceId);
      else await voice.setOutputDevice(deviceId);
      await refreshAudioDevices();
    } catch {
      audioDeviceError =
        kind === 'input'
          ? 'Could not switch to that microphone.'
          : 'Could not switch to that output device. Your browser may not support audio routing.';
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>User Settings</Dialog.Title>
      <Dialog.Description>Manage your account, appearance, and preferences.</Dialog.Description>
    </Dialog.Header>

    <Tabs.Root
      value="account"
      orientation="vertical"
      class="flex flex-col gap-4 sm:h-[480px] sm:flex-row sm:gap-0"
    >
      <div
        class="flex min-w-0 shrink-0 flex-col gap-2 sm:w-44 sm:border-r sm:border-border sm:pr-2"
      >
        <Tabs.List
          class="flex h-auto w-full items-stretch justify-start gap-0.5 overflow-x-auto bg-transparent p-0 sm:flex-col sm:overflow-visible"
        >
          <Tabs.Trigger
            value="account"
            class="min-h-10 shrink-0 justify-start gap-2 rounded-none px-2 py-1.5 data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground sm:w-full"
          >
            <User class="size-3.5" />
            Account
          </Tabs.Trigger>

          <Tabs.Trigger
            value="appearance"
            class="min-h-10 shrink-0 justify-start gap-2 rounded-none px-2 py-1.5 data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground sm:w-full"
          >
            <Palette class="size-3.5" />
            Appearance
          </Tabs.Trigger>

          <Tabs.Trigger
            value="notifications"
            class="min-h-10 shrink-0 justify-start gap-2 rounded-none px-2 py-1.5 data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground sm:w-full"
          >
            <Bell class="size-3.5" />
            Notifications
          </Tabs.Trigger>

          <Tabs.Trigger
            value="voice"
            class="min-h-10 shrink-0 justify-start gap-2 rounded-none px-2 py-1.5 data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground sm:w-full"
          >
            <Volume2 class="size-3.5" />
            Voice & Audio
          </Tabs.Trigger>
        </Tabs.List>

        <div class="flex flex-col gap-0.5 px-2 text-[11px] text-muted-foreground sm:mt-auto">
          <p>Frontend: v{frontendVersion}</p>
          <p>Anchor: {anchorVersion ?? 'Unknown'}</p>
          {#if desktopVersion}
            <p>Desktop: v{desktopVersion}</p>
          {/if}
          <p>
            Commit: <a
              href={`https://github.com/novarumsocial/novarum/commit/${gitCommit}`}
              class="underline">{gitCommit}</a
            >
          </p>
        </div>

        <Button
          variant="destructive"
          size="sm"
          class="w-full rounded-none"
          disabled={logoutLoading}
          onclick={logout}
        >
          <LogOut class="size-3.5" />
          Logout
        </Button>
      </div>

      <div class="min-w-0 flex-1 sm:pl-4">
        <Tabs.Content value="account" class="space-y-4 sm:h-full sm:overflow-y-auto sm:pr-1">
          <div class="grid gap-3">
            <div class="space-y-1.5">
              <div class="relative aspect-[3/1] overflow-hidden bg-primary/15">
                {#if session.user?.bannerUrl}
                  <AnimatedImage
                    src={session.user.bannerUrl}
                    alt="Profile banner"
                    class="size-full"
                    focused={false}
                    fit="contain"
                  />
                {/if}
              </div>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs font-medium">Profile Banner</p>
                  <p class="text-[11px] text-muted-foreground">GIF, JPEG, PNG, or WebP</p>
                </div>
                <input
                  bind:this={bannerInput}
                  type="file"
                  accept="image/gif,image/jpeg,image/png,image/webp"
                  class="hidden"
                  onchange={(event) => selectMedia(event, 'banner')}
                />
                <Button
                  variant="outline"
                  size="xs"
                  disabled={mediaLoading !== null}
                  onclick={() => bannerInput.click()}
                >
                  {mediaLoading === 'banner' ? 'Uploading...' : 'Change Banner'}
                </Button>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <Avatar
                src={session.user?.avatarUrl}
                name={session.user?.displayName || session.user?.username || '?'}
                class="size-14 text-lg"
              />
              <div class="space-y-1">
                <p class="text-xs font-medium">Avatar</p>
                <p class="text-[11px] text-muted-foreground">GIF, JPEG, PNG, or WebP</p>
                <input
                  bind:this={avatarInput}
                  type="file"
                  accept="image/gif,image/jpeg,image/png,image/webp"
                  class="hidden"
                  onchange={(event) => selectMedia(event, 'avatar')}
                />
                <Button
                  variant="outline"
                  size="xs"
                  disabled={mediaLoading !== null}
                  onclick={() => avatarInput.click()}
                >
                  {mediaLoading === 'avatar' ? 'Uploading...' : 'Change Avatar'}
                </Button>
              </div>
            </div>
            {#if mediaError}
              <p class="text-[11px] text-destructive">{mediaError}</p>
            {/if}
            <div class="grid gap-1.5">
              <Label for="display-name">Display Name</Label>
              <Input id="display-name" bind:value={displayName} />
            </div>
            <div class="grid gap-1.5">
              <Label for="email">Email</Label>
              <Input id="email" type="email" bind:value={email} />
            </div>
            <div class="grid gap-1.5">
              <div class="flex items-center justify-between">
                <Label for="about">About Me</Label>
                <span class="text-[10px] text-muted-foreground">{about.length}/512</span>
              </div>
              <textarea
                id="about"
                bind:value={about}
                maxlength="512"
                rows="3"
                placeholder="Tell people a little about yourself"
                class="w-full resize-none border border-input bg-input/30 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                oninput={() => (aboutSaved = false)}></textarea>
              <div class="flex items-center justify-between gap-3">
                <p class="text-[11px] text-destructive">{aboutError ?? ''}</p>
                <Button size="xs" disabled={aboutLoading} onclick={saveAbout} variant="outline">
                  {aboutLoading ? 'Saving...' : aboutSaved ? 'Saved' : 'Save About'}
                </Button>
              </div>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="appearance" class="space-y-4">
          <div class="grid gap-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-medium">Dark Mode</p>
                {#if settings.value.darkMode}
                  <p class="text-[11px] text-muted-foreground">It's good for your eyes!</p>
                {:else}
                  <p class="text-[11px] text-muted-foreground">
                    Trust me, it's good for your eyes!!! Turn me back on :)
                  </p>
                {/if}
              </div>
              <Switch bind:checked={settings.value.darkMode} />
            </div>
            <div class="items-center justify-between">
              <p class="text-xs font-medium">QuickCSS</p>
              <textarea
                bind:value={css}
                class="font-mono text-xs w-full min-h-[250px] rounded-md border bg-input/30 p-2"
                placeholder="whatever CSS you type here will update in real time! (e.g. paste whatever shadcn-ui theme's layout.css you like here :3c)"
              ></textarea>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-medium">Compact Mode</p>
                <p class="text-[11px] text-muted-foreground">Reduce spacing between messages</p>
              </div>
              <Switch bind:checked={settings.value.compactMode} disabled />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-medium">Show Member List</p>
                <p class="text-[11px] text-muted-foreground">Display member sidebar in channels</p>
              </div>
              <Switch bind:checked={settings.value.showMemberList} />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-medium">Circle icons</p>
                <p class="text-[11px] text-muted-foreground">
                  Replace default square icons with round ones
                </p>
              </div>
              <Switch bind:checked={settings.value.circleIcons} />
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="notifications" class="space-y-4">
          <div class="grid gap-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-medium">Push Notifications</p>
                <p class="text-[11px] text-muted-foreground">
                  Receive notifications for mentions and replies
                </p>
              </div>
              <Switch
                checked={settings.value.pushNotifications}
                onCheckedChange={setPushNotifications}
              />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-medium">Message Preview</p>
                <p class="text-[11px] text-muted-foreground">
                  Show message content in notifications
                </p>
              </div>
              <Switch bind:checked={settings.value.messagePreview} />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-medium">Mention Sound</p>
                <p class="text-[11px] text-muted-foreground">
                  Play a sound when someone mentions you
                </p>
              </div>
              <Switch bind:checked={mentionSound} />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-medium">Online Status</p>
                <p class="text-[11px] text-muted-foreground">Show when you're online to others</p>
              </div>
              <Switch bind:checked={showOnlineStatus} />
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="voice" class="space-y-4">
          <div class="grid gap-3">
            <div class="grid gap-1.5">
              <Label for="input-device">Input Device</Label>
              <select
                id="input-device"
                class="flex h-8 w-full rounded-none border border-border bg-background px-2 text-xs text-foreground"
                value={settings.value.voiceInputDeviceId}
                onchange={(event) => setAudioDevice('input', event.currentTarget.value)}
              >
                <option value="default">Default microphone</option>
                {#each audioDevices.input as device, index}
                  <option value={device.deviceId}>
                    {device.label || `Microphone ${index + 1}`}
                  </option>
                {/each}
              </select>
            </div>
            <div class="grid gap-1.5">
              <Label for="output-device">Output Device</Label>
              <select
                id="output-device"
                class="flex h-8 w-full rounded-none border border-border bg-background px-2 text-xs text-foreground"
                value={settings.value.voiceOutputDeviceId}
                onchange={(event) => setAudioDevice('output', event.currentTarget.value)}
              >
                <option value="default">Default output</option>
                {#each audioDevices.output as device, index}
                  <option value={device.deviceId}>
                    {device.label || `Output device ${index + 1}`}
                  </option>
                {/each}
              </select>
            </div>
            {#if audioDeviceError}
              <p class="text-[11px] text-destructive">{audioDeviceError}</p>
            {/if}
            <div class="grid gap-1.5">
              <Label for="input-volume">Input Volume</Label>
              <input
                id="input-volume"
                type="range"
                min="0"
                max="100"
                value="80"
                class="h-1.5 w-full cursor-pointer appearance-none rounded-none bg-border accent-primary"
              />
            </div>
            <div class="grid gap-1.5">
              <Label for="output-volume">Output Volume</Label>
              <input
                id="output-volume"
                type="range"
                min="0"
                max="100"
                value="100"
                class="h-1.5 w-full cursor-pointer appearance-none rounded-none bg-border accent-primary"
              />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-medium">Echo Cancellation</p>
                <p class="text-[11px] text-muted-foreground">
                  Turn off if it interferes with noise suppression.
                </p>
              </div>
              <Switch
                checked={settings.value.voiceEchoCancellation}
                onCheckedChange={(enabled) => voice.setEchoCancellation(enabled)}
              />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-medium">Automatic Gain Control</p>
                <p class="text-[11px] text-muted-foreground">
                  Automatically balances microphone volume.
                </p>
              </div>
              <Switch
                checked={settings.value.voiceAutoGainControl}
                onCheckedChange={(enabled) => voice.setAutoGainControl(enabled)}
              />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-medium">Noise Suppression</p>
                <p class="text-[11px] text-muted-foreground">Reduce background noise</p>
              </div>
              <Switch
                checked={settings.value.noiseCancellation}
                onCheckedChange={(enabled) => voice.setNoiseCancellation(enabled)}
              />
            </div>
          </div>
        </Tabs.Content>
      </div>
    </Tabs.Root>
  </Dialog.Content>
</Dialog.Root>

<AvatarCropDialog
  bind:open={cropOpen}
  file={cropFile}
  onCrop={(blob) => uploadMedia(blob, cropTarget)}
  title={cropTarget === 'banner' ? 'Crop Profile Banner' : 'Crop Avatar'}
  description={cropTarget === 'banner'
    ? 'Adjust the image to fit your profile banner.'
    : 'Adjust the image to fit your profile.'}
  actionLabel={cropTarget === 'banner' ? 'Use Banner' : 'Use Avatar'}
  outputWidth={cropTarget === 'banner' ? 960 : 512}
  outputHeight={cropTarget === 'banner' ? 320 : 512}
/>
