<script setup lang="ts">
  /**
   * 结果卡片：展示解析后的结构化缺陷信息。
   * 纯展示组件——所有状态由父组件管理，自己只接收 props（单向数据流）。
   */
  import { computed } from 'vue'
  import type { TicketInfo } from '../lib/types'

  const props = defineProps<{ ticket: TicketInfo }>()

  // 严重级别 → 颜色映射，一眼看出轻重
  const severityClass = computed(() => {
    const map: Record<string, string> = {
      致命: 'sev-fatal',
      严重: 'sev-major',
      一般: 'sev-normal',
      轻微: 'sev-minor',
      建议: 'sev-advice',
    }
    return map[props.ticket.severity] ?? 'sev-normal'
  })
</script>

<template>
  <div class="card">
    <div class="card-head">
      <h2>{{ ticket.title }}</h2>
      <div class="head-meta">
        <span class="badge" :class="severityClass">{{ ticket.severity }}</span>
        <span class="module">{{ ticket.module }}</span>
      </div>
    </div>

    <section>
      <h3>复现步骤</h3>
      <ol>
        <li v-for="(step, i) in ticket.reproduceSteps" :key="i">{{ step }}</li>
      </ol>
    </section>

    <div class="pair">
      <section>
        <h3>实际结果</h3>
        <p>{{ ticket.actual }}</p>
      </section>
      <section>
        <h3>预期结果</h3>
        <p>{{ ticket.expected }}</p>
      </section>
    </div>

    <section>
      <h3>修复建议 <small>（AI 生成，仅供参考）</small></h3>
      <p>{{ ticket.suggestion }}</p>
    </section>

    <footer v-if="ticket.tags.length">
      <span v-for="tag in ticket.tags" :key="tag" class="tag">{{ tag }}</span>
    </footer>
  </div>
</template>

<style scoped>
  .card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px 24px;
  }
  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 14px;
  }
  h2 {
    font-size: 16px;
    line-height: 1.5;
  }
  .head-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .badge {
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
  }
  .sev-fatal { background: #b71c1c; }
  .sev-major { background: #d83931; }
  .sev-normal { background: #d97706; }
  .sev-minor { background: #64748b; }
  .sev-advice { background: #94a3b8; }
  .module {
    color: var(--text-2);
    font-size: 13px;
  }
  section { margin-bottom: 14px; }
  h3 {
    font-size: 13px;
    color: var(--text-2);
    font-weight: 600;
    margin-bottom: 4px;
  }
  h3 small { font-weight: 400; }
  ol,
  p {
    padding-left: 4px;
    white-space: pre-wrap;
    word-break: break-all;
  }
  ol { padding-left: 22px; }
  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  footer {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    padding-top: 10px;
    border-top: 1px dashed var(--border);
  }
  .tag {
    background: var(--accent-weak);
    color: var(--accent);
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 4px;
  }
</style>
