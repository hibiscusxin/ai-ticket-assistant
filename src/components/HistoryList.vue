<script setup lang="ts">
  /**
   * 解析历史列表：纯展示组件。
   * 数据与增删逻辑都在 App.vue，这里只负责渲染与回传事件。
   */
  import type { HistoryEntry } from '../lib/history'

  defineProps<{ entries: HistoryEntry[] }>()
  const emit = defineEmits<{
    select: [entry: HistoryEntry]
    remove: [id: string]
    clear: []
  }>()

  function formatTime(ts: number): string {
    const d = new Date(ts)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
</script>

<template>
  <div class="history">
    <div class="history-head">
      <h2>解析历史 <small>（本地保存最近 20 条）</small></h2>
      <button v-if="entries.length" class="link danger" @click="emit('clear')">清空</button>
    </div>

    <ul v-if="entries.length">
      <li v-for="entry in entries" :key="entry.id">
        <button class="item" :title="entry.input" @click="emit('select', entry)">
          <span class="title">{{ entry.ticket.title }}</span>
          <span class="meta">{{ formatTime(entry.ts) }} · {{ entry.ticket.severity }}</span>
        </button>
        <button class="del" title="删除这条" @click.stop="emit('remove', entry.id)">✕</button>
      </li>
    </ul>
    <p v-else class="empty">还没有解析记录</p>
  </div>
</template>

<style scoped>
  .history {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
  }
  .history-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  h2 {
    font-size: 13px;
    color: var(--text-2);
  }
  h2 small {
    font-weight: 400;
  }
  .link {
    background: none;
    font-size: 12px;
    padding: 0;
  }
  .danger {
    color: var(--danger);
  }
  ul {
    list-style: none;
    max-height: 180px;
    overflow: auto;
  }
  li {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }
  .item {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    background: var(--bg);
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 5px 10px;
    text-align: left;
  }
  .item:hover {
    border-color: var(--accent);
  }
  .title {
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta {
    font-size: 12px;
    color: var(--text-2);
    flex-shrink: 0;
  }
  .del {
    background: none;
    color: var(--text-2);
    font-size: 12px;
    padding: 2px 4px;
  }
  .del:hover {
    color: var(--danger);
  }
  .empty {
    color: var(--text-2);
    font-size: 12px;
  }
</style>
