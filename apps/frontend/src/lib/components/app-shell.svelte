<script lang="ts">
  import {
    servers, channelsByServer, messagesByChannel,
    members, voiceUsers,
  } from "$lib/data/mock";
  import ServerSidebar from "./server-sidebar.svelte";
  import ChannelSidebar from "./channel-sidebar.svelte";
  import ChatArea from "./chat-area.svelte";
  import MemberSidebar from "./member-sidebar.svelte";

  let activeServer = $state("home");
  let activeChannel = $state("ch-general");

  const currentServer = $derived(
    servers.find((s) => s.id === activeServer)!
  );
  const currentCategories = $derived(
    channelsByServer[activeServer] || []
  );
  const currentChannel = $derived(
    (() => {
      for (const cat of currentCategories) {
        const found = cat.channels.find((ch) => ch.id === activeChannel);
        if (found) return found;
      }
      return currentCategories[0]?.channels[0] ?? null;
    })()
  );
  const currentMessages = $derived(
    currentChannel ? (messagesByChannel[currentChannel.id] || []) : []
  );

  function selectServer(id: string) {
    activeServer = id;
    const cats = channelsByServer[id];
    if (cats && cats.length > 0 && cats[0].channels.length > 0) {
      activeChannel = cats[0].channels[0].id;
    }
  }

  function selectChannel(id: string) {
    activeChannel = id;
  }
</script>

<div class="dark flex h-svh overflow-hidden bg-background">
  <ServerSidebar
    {servers}
    activeId={activeServer}
    onSelect={selectServer}
  />
  <ChannelSidebar
    server={currentServer}
    categories={currentCategories}
    activeChannel={activeChannel}
    onSelectChannel={selectChannel}
  />
  {#if currentChannel}
    <ChatArea
      channel={currentChannel}
      messages={currentMessages}
    />
  {/if}
  <MemberSidebar {members} {voiceUsers} />
</div>
