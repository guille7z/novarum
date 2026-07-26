<script lang="ts">
  let {
    src,
    alt = '',
    class: className = '',
    focused = true,
    onerror,
  }: {
    src: string;
    alt?: string;
    class?: string;
    focused?: boolean;
    onerror?: () => void;
  } = $props();

  let playGif = $state(false);
  let image = $state<HTMLImageElement | null>(null);
  let frozenFrame = $state<HTMLCanvasElement | null>(null);
  let frozenReady = $state(false);
  const isGif = $derived(/(\.gif(?:$|[?#])|[?&]format=gif(?:&|$))/i.test(src));

  $effect(() => {
    src;
    frozenReady = false;
    playGif = focused;
  });

  $effect(() => {
    if (playGif) {
      frozenReady = false;
    } else if (isGif && image?.complete && frozenFrame) {
      freezeGif();
    }
  });

  function freezeGif() {
    if (playGif || !isGif || !image || !frozenFrame) return;

    const scale = Math.min(1, 512 / image.naturalWidth);
    frozenFrame.width = image.naturalWidth * scale;
    frozenFrame.height = image.naturalHeight * scale;
    frozenFrame.getContext('2d')?.drawImage(image, 0, 0, frozenFrame.width, frozenFrame.height);
    frozenReady = true;
  }
</script>

<div
  class="overflow-hidden {className}"
  role="presentation"
  onmouseenter={() => {
    if (isGif && !focused) playGif = true;
  }}
  onmouseleave={() => {
    if (isGif && !focused) playGif = false;
  }}
>
  {#if isGif}
    <canvas
      bind:this={frozenFrame}
      class="size-full object-cover"
      class:hidden={playGif || !frozenReady}
      aria-hidden="true"
    ></canvas>
  {/if}
  {#if !isGif || playGif || !frozenReady}
    <img
      {src}
      {alt}
      class="size-full object-cover"
      class:hidden={isGif && !playGif}
      referrerpolicy="no-referrer"
      {onerror}
      onload={freezeGif}
      bind:this={image}
    />
  {/if}
</div>
