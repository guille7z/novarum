<script lang="ts">
  import './layout.css';
  import { browser } from '$app/environment';
  import favicon from '$lib/assets/favicon.svg';
  import { settings } from '$lib/settings.svelte';
  let { children } = $props();
  const desktop = browser && navigator.userAgent.includes('Electron');

  $effect(() => {
    const root = document.documentElement;
    root.classList.toggle('desktop', desktop);
    // commenting willysuna's logic here because i think the if statement fits better
    // i've also removed the `.light` class toggle to resemble a bit more the shadcn-ui way of thinking about light and dark mode toggles.
    // root.classList.toggle('dark', settings.value.darkMode);
    // root.classList.toggle('light', !settings.value.darkMode);
    if (settings.value.darkMode) {
      root.classList.toggle('dark', true);
    } else {
      root.classList.remove('dark');
    }
    root.dataset.rounded = String(settings.value.circleIcons);
  });
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if desktop}
  <header class="desktop-titlebar" aria-hidden="true">
    <img src={favicon} alt="" />
    <span>novarum</span>
  </header>
{/if}

{@render children()}
