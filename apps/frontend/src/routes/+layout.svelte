<script lang="ts">
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';
  import { settings } from '$lib/settings.svelte';

  let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<div class="dark" data-rounded={settings.value.circleIcons}>
  {@render children()}
</div>
