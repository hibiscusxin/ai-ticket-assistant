<script setup lang="ts">
  /**
   * App：编排层——输入、流式调用 LLM、展示结果、导出、历史管理。
   * 状态都在这里，子组件只做展示与回传（单向数据流）。
   */
  import { ref } from 'vue'
  import ResultCard from './components/ResultCard.vue'
  import SettingsModal from './components/SettingsModal.vue'
  import HistoryList from './components/HistoryList.vue'
  import { loadConfig, parseTicket, saveConfig, type LlmConfig } from './lib/llm'
  import { downloadMarkdown, toTicketMarkdown, toVerifyReportMarkdown } from './lib/markdown'
  import { DEMO_TICKET } from './lib/demo'
  import { addHistoryEntry, clearHistory, loadHistory, removeHistoryEntry, type HistoryEntry } from './lib/history'
  import type { TicketInfo } from './lib/types'

  const config = ref<LlmConfig>(loadConfig())
  const showSettings = ref(false)

  const input = ref('')
  const loading = ref(false)
  const error = ref('')
  const result = ref<TicketInfo | null>(null)

  // 流式：LLM 的原始输出逐块累加，展示「打字机」过程
  const rawOutput = ref('')
  // 取消：每次解析持有一个控制器
  let abortController: AbortController | null = null

  // 历史
  const history = ref<HistoryEntry[]>(loadHistory())

  // 复制反馈：哪个按钮刚复制成功（1.5 秒后还原）
  const copied = ref<string | null>(null)
  let copiedTimer: ReturnType<typeof setTimeout> | undefined

  /** 解析：流式调 LLM → 结构化结果 → 存历史 */
  async function handleParse() {
    loading.value = true
    error.value = ''
    result.value = null
    rawOutput.value = ''
    abortController = new AbortController()
    try {
      result.value = await parseTicket(input.value, config.value, {
        signal: abortController.signal,
        onDelta: (delta) => {
          rawOutput.value += delta
        },
      })
      history.value = addHistoryEntry(input.value, result.value)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        error.value = '已取消本次解析'
      } else {
        error.value = err instanceof Error ? err.message : String(err)
      }
    } finally {
      loading.value = false
      abortController = null
    }
  }

  /** 取消进行中的解析 */
  function handleCancel() {
    abortController?.abort()
  }

  function handleSaveConfig(newConfig: LlmConfig) {
    config.value = newConfig
    saveConfig(newConfig)
    showSettings.value = false
  }

  // —— 导出与复制（都基于同一份 Markdown 生成结果）——

  function exportFile(kind: 'ticket' | 'report') {
    if (!result.value) return
    const name =
      kind === 'ticket'
        ? `走单文件_${result.value.module}_${result.value.severity}.md`
        : `验证报告_${result.value.module}.md`
    downloadMarkdown(name, kind === 'ticket' ? toTicketMarkdown(result.value) : toVerifyReportMarkdown(result.value))
  }

  async function copyMarkdown(kind: 'ticket' | 'report') {
    const text = kind === 'ticket' ? toTicketMarkdown(result.value!) : toVerifyReportMarkdown(result.value!)
    if (!text) return
    await navigator.clipboard.writeText(text)
    copied.value = kind
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => (copied.value = null), 1500)
  }

  function loadDemo() {
    input.value = DEMO_TICKET
  }

  // —— 历史 ——

  function handleSelectHistory(entry: HistoryEntry) {
    result.value = entry.ticket
    input.value = entry.input
    error.value = ''
  }

  function handleRemoveHistory(id: string) {
    history.value = removeHistoryEntry(id)
  }

  function handleClearHistory() {
    history.value = clearHistory()
  }
</script>

<template>
  <div class="layout">
    <header>
      <h1>AI 缺陷单助手</h1>
      <span class="sub">粘贴缺陷描述 → 结构化走单 / 验证报告草稿 · 数据只在本地</span>
      <button class="settings" @click="showSettings = true">⚙ 设置</button>
    </header>

    <main>
      <!-- 左：输入区 + 历史 -->
      <section class="panel">
        <div class="panel-head">
          <h2>缺陷描述</h2>
          <button class="link" @click="loadDemo">填入虚构示例</button>
        </div>
        <textarea
          v-model="input"
          rows="12"
          placeholder="把测试提的缺陷描述、聊天记录里的 bug 反馈原样贴进来，口语化没关系…"
        ></textarea>
        <div class="actions">
          <button v-if="!loading" class="primary" :disabled="!input.trim()" @click="handleParse">AI 解析</button>
          <button v-else class="primary cancel" @click="handleCancel">■ 取消</button>
          <button class="ghost" :disabled="!result" @click="exportFile('ticket')">导出走单</button>
          <button class="ghost" :disabled="!result" @click="exportFile('report')">导出报告</button>
        </div>
        <div class="actions">
          <button class="ghost small" :disabled="!result" @click="copyMarkdown('ticket')">
            {{ copied === 'ticket' ? '✓ 已复制' : '复制走单文本' }}
          </button>
          <button class="ghost small" :disabled="!result" @click="copyMarkdown('report')">
            {{ copied === 'report' ? '✓ 已复制' : '复制报告文本' }}
          </button>
        </div>
        <p v-if="error" class="error" :class="{ neutral: error === '已取消本次解析' }">✕ {{ error }}</p>

        <HistoryList
          :entries="history"
          @select="handleSelectHistory"
          @remove="handleRemoveHistory"
          @clear="handleClearHistory"
        />
      </section>

      <!-- 右：结果区 -->
      <section class="panel result-panel">
        <!-- 流式阶段：实时展示原始输出 -->
        <div v-if="loading" class="streaming">
          <p class="streaming-hint">AI 正在整理…（可点「取消」中断）</p>
          <pre class="raw">{{ rawOutput || '（等待首包…）' }}</pre>
        </div>
        <ResultCard v-else-if="result" :ticket="result" />
        <div v-else class="empty">解析结果会显示在这里</div>
      </section>
    </main>

    <SettingsModal v-if="showSettings" :config="config" @save="handleSaveConfig" @close="showSettings = false" />
  </div>
</template>

<style scoped>
  .layout {
    height: 100%;
    display: flex;
    flex-direction: column;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }
  header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 18px 0 14px;
  }
  h1 {
    font-size: 18px;
  }
  .sub {
    color: var(--text-2);
    font-size: 12px;
    flex: 1;
  }
  .settings {
    background: var(--panel);
    border: 1px solid var(--border);
    padding: 6px 14px;
  }
  main {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    padding-bottom: 20px;
    min-height: 0;
  }
  .panel {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    overflow: auto;
  }
  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  h2 {
    font-size: 14px;
  }
  .link {
    background: none;
    color: var(--accent);
    font-size: 13px;
    padding: 0;
  }
  textarea {
    flex: 1;
    min-height: 160px;
    resize: vertical;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px;
    outline: none;
    line-height: 1.7;
  }
  textarea:focus {
    border-color: var(--accent);
  }
  .actions {
    display: flex;
    gap: 10px;
    margin-top: 12px;
  }
  .actions + .actions {
    margin-top: 8px;
  }
  .primary {
    background: var(--accent);
    color: #fff;
    padding: 9px 24px;
  }
  .primary.cancel {
    background: var(--danger);
  }
  .ghost {
    background: var(--panel);
    border: 1px solid var(--border);
    padding: 9px 16px;
  }
  .ghost.small {
    padding: 5px 12px;
    font-size: 12px;
    color: var(--text-2);
  }
  .error {
    margin-top: 10px;
    color: var(--danger);
    font-size: 13px;
  }
  .error.neutral {
    color: var(--text-2);
  }
  .streaming {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .streaming-hint {
    color: var(--accent);
    font-size: 13px;
    margin-bottom: 8px;
  }
  .raw {
    flex: 1;
    background: #0d1117;
    color: #8bd5ca;
    border-radius: 8px;
    padding: 12px;
    font-size: 12px;
    line-height: 1.6;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }
  .result-panel {
    align-items: stretch;
  }
  .empty {
    margin: auto;
    color: var(--text-2);
  }
  @media (max-width: 900px) {
    main {
      grid-template-columns: 1fr;
    }
  }
</style>
