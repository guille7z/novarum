<script lang="ts">
  let {
    src,
    name,
    class: className = '',
  }: {
    src?: string | null;
    name: string;
    class?: string;
  } = $props();

  let failed = $state(false);

  $effect(() => {
    src;
    failed = false;
  });
</script>

<div
  class="flex shrink-0 items-center justify-center overflow-hidden bg-primary/20 font-bold text-primary {className}"
>
  {#if src && !failed}
    <img
      {src}
      alt=""
      class="size-full object-cover"
      referrerpolicy="no-referrer"
      onerror={() => (failed = true)}
    />
  {:else}
    {name.charAt(0).toUpperCase() || '?'}
  {/if}
</div>
