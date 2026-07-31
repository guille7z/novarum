<script lang="ts">
  import { fade } from 'svelte/transition';
  import Logo from '../assets/favicon.svg';
</script>

<main
  transition:fade={{ duration: 100 }}
  class="relative flex h-svh items-center justify-center overflow-hidden bg-background px-6 text-foreground"
>
  <div
    class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_30rem)]"
  ></div>

  <div class="relative flex w-full max-w-56 flex-col items-center text-center" role="status">
    <div class="grid size-12 place-items-center bg-primary shadow-lg shadow-primary/20">
      <img src={Logo} alt="" class="size-7" />
    </div>

    <div class="mt-5">
      <h1 class="text-lg font-semibold tracking-tight">novarum</h1>
    </div>

    <div class="mt-6 h-px w-24 overflow-hidden bg-border" aria-hidden="true">
      <div class="loader-bar h-full w-1/2 bg-primary"></div>
    </div>
  </div>
</main>

<style>
  .loader-bar {
    animation: load 1.25s ease-in-out infinite;
  }

  @keyframes load {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(200%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .loader-bar {
      animation: none;
      transform: translateX(50%);
    }
  }
</style>
