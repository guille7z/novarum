<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { Button } from '$lib/components/ui/button/index.js';

  let {
    open = $bindable(false),
    file,
    onCrop,
    title = 'Crop Avatar',
    description = 'Adjust the image to fit your profile.',
    actionLabel = 'Use Avatar',
    outputWidth = 512,
    outputHeight = 512,
  }: {
    open: boolean;
    file: File | null;
    onCrop: (avatar: Blob) => void;
    title?: string;
    description?: string;
    actionLabel?: string;
    outputWidth?: number;
    outputHeight?: number;
  } = $props();

  let image = $state<HTMLImageElement | null>(null);
  let preview = $state<HTMLCanvasElement | null>(null);
  let zoom = $state(1);
  let horizontal = $state(0);
  let vertical = $state(0);

  $effect(() => {
    if (!file) {
      image = null;
      return;
    }

    const url = URL.createObjectURL(file);
    const nextImage = new Image();
    nextImage.onload = () => (image = nextImage);
    nextImage.src = url;
    zoom = 1;
    horizontal = 0;
    vertical = 0;

    return () => URL.revokeObjectURL(url);
  });

  function drawCrop(
    target: HTMLCanvasElement,
    source: HTMLImageElement,
    scaleMultiplier: number,
    xPosition: number,
    yPosition: number
  ) {
    const context = target.getContext('2d');
    if (!context) return;

    const scale =
      Math.min(target.width / source.naturalWidth, target.height / source.naturalHeight) *
      scaleMultiplier;
    const width = source.naturalWidth * scale;
    const height = source.naturalHeight * scale;
    const x =
      (target.width - width) / 2 + (xPosition / 100) * Math.max(0, (width - target.width) / 2);
    const y =
      (target.height - height) / 2 + (yPosition / 100) * Math.max(0, (height - target.height) / 2);

    context.clearRect(0, 0, target.width, target.height);
    context.drawImage(source, x, y, width, height);
  }

  $effect(() => {
    if (preview && image) drawCrop(preview, image, zoom, horizontal, vertical);
  });

  async function crop() {
    if (!image) return;

    const output = document.createElement('canvas');
    output.width = outputWidth;
    output.height = outputHeight;
    drawCrop(output, image, zoom, horizontal, vertical);
    const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, 'image/png'));
    if (!blob) return;

    onCrop(blob);
    open = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-sm">
    <Dialog.Header>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Description>{description}</Dialog.Description>
    </Dialog.Header>

    <div
      class="relative mx-auto w-full max-w-[420px] overflow-hidden bg-muted"
      style:aspect-ratio={`${outputWidth} / ${outputHeight}`}
    >
      <canvas
        bind:this={preview}
        width={outputWidth}
        height={outputHeight}
        class="size-full"
        aria-label="Image crop preview"
      ></canvas>
    </div>

    <div class="grid gap-3">
      <label class="grid gap-1 text-xs">
        <span class="text-muted-foreground">Zoom</span>
        <input type="range" min="1" max="3" step="0.01" bind:value={zoom} class="accent-primary" />
      </label>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="grid gap-1 text-xs">
          <span class="text-muted-foreground">Horizontal</span>
          <input type="range" min="-100" max="100" bind:value={horizontal} class="accent-primary" />
        </label>
        <label class="grid gap-1 text-xs">
          <span class="text-muted-foreground">Vertical</span>
          <input type="range" min="-100" max="100" bind:value={vertical} class="accent-primary" />
        </label>
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
      <Button onclick={crop} disabled={!image}>{actionLabel}</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
