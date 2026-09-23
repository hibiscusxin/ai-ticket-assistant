<script setup lang="ts">
  /**
   * 设置弹窗：配置 LLM 服务（OpenAI 兼容协议）。
   * 配置只存浏览器 localStorage——本工具没有后端，Key 不出本机。
   */
  import { reactive } from 'vue'
  import type { LlmConfig } from '../lib/llm'

  const props = defineProps<{ config: LlmConfig }>()
  const emit = defineEmits<{ save: [config: LlmConfig]; close: [] }>()

  // 用副本编辑，点保存才落库（避免改一半直接污染全局配置）
  const draft = reactive({ ...props.config })

  const PRESETS = [
    { label: 'DeepSeek', baseURL: 'https://api.deepseek.com', model: 'deepseek-chat' },
    { label: '智谱', baseURL: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
    { label: 'Kimi', baseURL: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  ]

  function applyPreset(preset: (typeof PRESETS)[number]) {
    draft.baseURL = preset.baseURL
    draft.model = preset.model
  }
</script>

<template>
  <div class="mask" @click.self="emit('close')">
    <div class="modal">
      <h2>LLM 设置</h2>
      <p class="hint">兼容 OpenAI 协议的服务均可。API Key 只保存在你浏览器本地，本工具无后端、不收集任何数据。</p>

      <div class="presets">
        <button v-for="p in PRESETS" :key="p.label" class="preset" @click="applyPreset(p)">
          {{ p.label }}
        </button>
      </div>

      <label>
        Base URL
        <input v-model.trim="draft.baseURL" placeholder="https://api.deepseek.com" />
      </label>
      <label>
        模型
        <input v-model.trim="draft.model" placeholder="deepseek-chat" />
      </label>
      <label>
        API Key
        <input v-model.trim="draft.apiKey" type="password" placeholder="sk-..." autocomplete="off" />
      </label>

      <div class="actions">
        <button class="ghost" @click="emit('close')">取消</button>
        <button class="primary" :disabled="!draft.baseURL || !draft.model || !draft.apiKey" @click="emit('save', { ...draft })">
          保存
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .mask {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
  .modal {
    background: var(--panel);
    border-radius: 12px;
    padding: 24px;
    width: 420px;
    max-width: calc(100vw - 32px);
  }
  h2 { font-size: 16px; margin-bottom: 6px; }
  .hint {
    font-size: 12px;
    color: var(--text-2);
    margin-bottom: 14px;
  }
  .presets {
    display: flex;
    gap: 8px;
    margin-bottom: 14px;
  }
  .preset {
    background: var(--accent-weak);
    color: var(--accent);
    padding: 4px 12px;
    font-size: 13px;
  }
  label {
    display: block;
    font-size: 13px;
    color: var(--text-2);
    margin-bottom: 12px;
  }
  input {
    display: block;
    width: 100%;
    margin-top: 4px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    outline: none;
  }
  input:focus { border-color: var(--accent); }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 16px;
  }
  .ghost {
    background: transparent;
    border: 1px solid var(--border);
    padding: 8px 16px;
  }
  .primary {
    background: var(--accent);
    color: #fff;
    padding: 8px 20px;
  }
</style>
