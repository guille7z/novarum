<script lang="ts">
  import { settings } from '$lib/settings.svelte';
  import AnimatedImage from './animated-image.svelte';

  let {
    src,
    name,
    class: className = '',
    focused = false,
    fallback,
  }: {
    src?: string | null;
    name: string;
    class?: string;
    focused?: boolean;
    fallback?: string;
  } = $props();

  let failed = $state(false);

  $effect(() => {
    src;
    failed = false;
  });
</script>

<div
  class="flex shrink-0 items-center justify-center overflow-hidden bg-primary/20 font-bold text-primary {className}"
  class:rounded-full={settings.value.circleIcons}
  role="img"
  aria-label={name}
>
  {#if src && !failed}
    <AnimatedImage {src} alt="" class="size-full" {focused} onerror={() => (failed = true)} />
  {:else}
    {fallback || name.charAt(0).toUpperCase() || '?'}
  {/if}
</div>
