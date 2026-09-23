/**
 * LLM 客户端：OpenAI 兼容协议（/chat/completions），SSE 流式读取。
 * 兼容 DeepSeek / 智谱 / Kimi / OpenAI 等主流服务，纯前端直连。
 *
 * 设计要点：
 * 1. 流式输出：fetch + ReadableStream 逐块解析 SSE，配合 onDelta 做打字机效果
 * 2. 可取消：透传 AbortSignal，用户随时中断
 * 3. 结构化输出：prompt 约束 JSON schema，运行时校验兜底（见 types.ts）
 * 4. 失败重试：把解析错误喂回给模型，让它自我修正（一次）
 * 5. API Key 仅存浏览器 localStorage，不经任何服务器
 */

import { asTicketInfo, type TicketInfo } from './types'

export interface LlmConfig {
  /** 如 https://api.deepseek.com（不带 /chat/completions 后缀） */
  baseURL: string
  apiKey: string
  /** 如 deepseek-chat / glm-4-flash */
  model: string
}

const STORAGE_KEY = 'ai-ticket-assistant:config'

export function loadConfig(): LlmConfig {
  const fallback: LlmConfig = {
    baseURL: 'https://api.deepseek.com',
    apiKey: '',
    model: 'deepseek-chat',
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<LlmConfig>) } : fallback
  } catch {
    return fallback
  }
}

export function saveConfig(config: LlmConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

/** System Prompt：角色 + 输出契约 + 规则。约束越具体，结构化成功率越高 */
const SYSTEM_PROMPT = `你是资历深厚的缺陷单整理助手。用户会给你一段缺陷描述（可能杂乱、口语化），你的任务是把它整理为结构化 JSON。

只输出一个 JSON 对象，不要输出任何解释、markdown 代码块标记或其他文字。字段定义：
{
  "title": "缺陷标题，格式：[模块] 现象描述，50 字内",
  "severity": "致命|严重|一般|轻微|建议 五选一",
  "module": "影响模块名",
  "reproduceSteps": ["步骤1", "步骤2"],
  "actual": "实际结果",
  "expected": "预期结果",
  "suggestion": "修复建议，一两句话",
  "tags": ["前端", "后端", "网络", "配置", "兼容性", "数据", "UI 中合理的标签"]
}

规则：
- 描述里没写的信息就推断出最合理的值，不要留空，不要编造具体数据之外的情节
- severity 判断标准：崩溃/数据丢失/安全漏洞=致命或严重；功能不可用=严重；功能异常有替代方案=一般；体验问题=轻微；优化建议=建议
- JSON 字符串内的换行用 \\n 转义`

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatOptions {
  signal?: AbortSignal
  /** 每收到一段增量文本就回调一次（打字机效果） */
  onDelta?: (delta: string) => void
}

/**
 * 调用 chat/completions（stream: true），SSE 逐块解析，返回完整回复文本。
 *
 * SSE 协议要点：响应体是一行行 "data: {...}"，网络块与行的边界不一定对齐，
 * 所以必须维护跨块缓冲区（buffer），按行切分后最后一段留到下一轮拼接。
 */
async function chat(config: LlmConfig, messages: ChatMessage[], options: ChatOptions): Promise<string> {
  const resp = await fetch(`${config.baseURL.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.1, // 整理类任务要稳定，不要发散
      stream: true,
    }),
    signal: options.signal,
  })

  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    // 常见错误给出明确指引，避免对着状态码干瞪眼
    const friendly: Record<number, string> = {
      401: '认证失败：请检查 ① API Key 是否复制完整 ② Key 与 Base URL 是否同一家服务商（智谱的 Key 不能配 DeepSeek 的地址）',
      402: '余额不足：请到服务商控制台充值，或换用免费模型（如智谱 glm-4-flash）',
      403: '无权限：该 Key 可能未开通此模型，或账号未完成实名认证',
      404: '接口地址不对：请检查 Base URL（不要带 /chat/completions 后缀）',
      429: '请求太频繁：稍等几秒再试',
    }
    const hint = friendly[resp.status] ? `：${friendly[resp.status]}` : `：${body.slice(0, 200)}`
    throw new Error(`LLM 接口返回 ${resp.status}${hint}`)
  }

  if (!resp.body) throw new Error('响应没有内容流')

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // 按行切分，最后一段可能是半行，留到下一轮拼接
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const data = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> }
        const delta = data.choices?.[0]?.delta?.content
        if (delta) {
          full += delta
          options.onDelta?.(delta)
        }
      } catch {
        // 服务端偶尔混入心跳/非标准行，忽略即可
      }
    }
  }

  if (!full) throw new Error('LLM 返回内容为空')
  return full
}

/** 从回复中提取 JSON：容忍 ```json 包裹和前后废话。失败抛错，由调用方决定是否重试 */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('回复中未找到 JSON 对象')
  return JSON.parse(candidate.slice(start, end + 1))
}

export interface ParseOptions {
  signal?: AbortSignal
  onDelta?: (delta: string) => void
}

/** 主入口：把原始缺陷描述解析为结构化 TicketInfo（流式回调 + 一次自修复重试） */
export async function parseTicket(raw: string, config: LlmConfig, options: ParseOptions = {}): Promise<TicketInfo> {
  if (!config.apiKey) throw new Error('请先在「设置」中填写 API Key')
  if (!raw.trim()) throw new Error('请先粘贴缺陷描述')

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: raw },
  ]

  let lastError = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await chat(config, messages, options)
    try {
      return asTicketInfo(extractJson(text))
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err
      // 自修复重试：把解析错误喂回去，让模型修正输出
      lastError = err instanceof Error ? err.message : String(err)
      messages.push({ role: 'assistant', content: text })
      messages.push({
        role: 'user',
        content: `你的输出无法解析：${lastError}。请重新输出，只输出一个合法的 JSON 对象，不要任何多余文字。`,
      })
    }
  }
  throw new Error(`解析失败（已重试）：${lastError}`)
}
