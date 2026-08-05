<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import Cropper from 'svelte-easy-crop';

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

  let imageUrl = $state<string | null>(null);
  let crop = $state({ x: 0, y: 0 });
  let zoom = $state(1);

  let croppedPixels = $state<{ x: number; y: number; width: number; height: number } | null>(null);

  $effect(() => {
    if (!file) {
      imageUrl = null;
      croppedPixels = null;
      return;
    }
    const url = URL.createObjectURL(file);
    imageUrl = url;
    crop = { x: 0, y: 0 };
    zoom = 1;
    croppedPixels = null;
    return () => URL.revokeObjectURL(url);
  });

  async function cropLoad() {
    if (!imageUrl || !croppedPixels) return;

    const source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageUrl!;
    });

    const output = document.createElement('canvas');
    output.width = outputWidth;
    output.height = outputHeight;
    const context = output.getContext('2d');
    if (!context) return;

    context.drawImage(
      source,
      croppedPixels.x,
      croppedPixels.y,
      croppedPixels.width,
      croppedPixels.height,
      0,
      0,
      outputWidth,
      outputHeight
    );

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
      {#if imageUrl}
        <Cropper
          image={imageUrl}
          bind:crop
          bind:zoom
          aspect={outputWidth / outputHeight}
          cropShape="rect"
          oncropcomplete={(e) => croppedPixels = e.pixels}
        />
      {/if}
    </div>

    <label class="grid gap-1 text-xs">
      <span class="text-muted-foreground">Zoom</span>
      <input type="range" min="1" max="3" step="0.01" bind:value={zoom} class="accent-primary" />
    </label>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
      <Button onclick={cropLoad} disabled={!croppedPixels}>{actionLabel}</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
