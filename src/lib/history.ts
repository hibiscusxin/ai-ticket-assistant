/**
 * 解析历史：localStorage 持久化，上限 20 条，新的在前。
 * 单据是用户自己粘贴的内容 + AI 生成的结构化结果，留在本机，不外传。
 */

import type { TicketInfo } from './types'

export interface HistoryEntry {
  id: string
  /** 解析时间戳（ms） */
  ts: number
  /** 原始描述（回看时能还原输入） */
  input: string
  /** 结构化结果 */
  ticket: TicketInfo
}

const STORAGE_KEY = 'ai-ticket-assistant:history'
const MAX_ENTRIES = 20

function genId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch {
    return []
  }
}

function persist(list: HistoryEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

/** 新增一条（置顶），超限裁剪最旧的，返回新列表 */
export function addHistoryEntry(input: string, ticket: TicketInfo): HistoryEntry[] {
  const list = [{ id: genId(), ts: Date.now(), input, ticket }, ...loadHistory()].slice(0, MAX_ENTRIES)
  persist(list)
  return list
}

/** 删除单条，返回新列表 */
export function removeHistoryEntry(id: string): HistoryEntry[] {
  const list = loadHistory().filter((e) => e.id !== id)
  persist(list)
  return list
}

/** 清空全部，返回新列表 */
export function clearHistory(): HistoryEntry[] {
  persist([])
  return []
}
