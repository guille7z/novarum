<script lang="ts">
  import { Plus, AtSign, Smile, Paperclip, Send } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button/index.js";

  let content = $state("");
  let { placeholder = "Message #general" }: { placeholder?: string } = $props();

  function handleSend() {
    if (!content.trim()) return;
    content = "";
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }
</script>

<div class="border-t border-border px-4 pb-6 pt-3">
  <div class="flex items-end gap-2 rounded-none border border-border bg-background px-3 py-2 focus-within:border-primary/50">
    <button class="shrink-0 text-muted-foreground transition-colors hover:text-foreground" aria-label="Add attachment">
      <Plus class="size-5" />
    </button>
    <textarea
      bind:value={content}
      onkeydown={handleKeydown}
      placeholder={placeholder}
      rows="1"
      class="min-h-[22px] flex-1 resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
    ></textarea>
    <div class="flex shrink-0 items-center gap-1">
      <button class="text-muted-foreground transition-colors hover:text-foreground" aria-label="Mention">
        <AtSign class="size-4" />
      </button>
      <button class="text-muted-foreground transition-colors hover:text-foreground" aria-label="Emoji">
        <Smile class="size-4" />
      </button>
      <button class="text-muted-foreground transition-colors hover:text-foreground" aria-label="Attach file">
        <Paperclip class="size-4" />
      </button>
    </div>
  </div>
  <p class="mt-1 px-1 text-[10px] text-muted-foreground/60">
    Messages are federated — users on connected servers will see them in real time.
  </p>
</div>
