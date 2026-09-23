/**
 * 缺陷单结构化 schema
 * 这是整个工具的「契约」：LLM 的输出必须符合它，导出功能也基于它生成。
 * 面试可聊点：用 TS 接口约束 LLM 的非结构化输出，再做运行时校验兜底。
 */

/** 缺陷严重级别（按常见 Bugzilla/内部走单惯例分五级） */
export type Severity = '致命' | '严重' | '一般' | '轻微' | '建议'

export const SEVERITIES: readonly Severity[] = ['致命', '严重', '一般', '轻微', '建议'] as const

/** LLM 解析后的结构化缺陷信息 */
export interface TicketInfo {
  /** 缺陷标题（一句话概括现象 + 场景） */
  title: string
  /** 严重级别 */
  severity: Severity
  /** 影响模块（如：登录、资产台账、弱口令检测） */
  module: string
  /** 复现步骤（有序） */
  reproduceSteps: string[]
  /** 实际结果 */
  actual: string
  /** 预期结果 */
  expected: string
  /** 修复建议（LLM 生成，仅作参考） */
  suggestion: string
  /** 标签：如 前端 / 后端 / 网络 / 配置 / 兼容性 */
  tags: string[]
}

/**
 * 运行时校验：LLM 返回的是"不可信输入"，
 * 必须逐字段校验/兜底，避免 UI 渲染时才炸。
 */
export function asTicketInfo(data: unknown): TicketInfo {
  if (typeof data !== 'object' || data === null) {
    throw new Error('LLM 返回的不是对象')
  }
  const o = data as Record<string, unknown>

  const severity = SEVERITIES.includes(o.severity as Severity)
    ? (o.severity as Severity)
    : '一般' // 未知级别兜底为「一般」

  const isNotBlank = (s: unknown): s is string => typeof s === 'string' && s.trim() !== ''

  const steps = Array.isArray(o.reproduceSteps) ? o.reproduceSteps.filter(isNotBlank) : []

  const tags = Array.isArray(o.tags) ? o.tags.filter(isNotBlank) : []

  const str = (v: unknown, fallback: string): string => (typeof v === 'string' && v.trim() ? v : fallback)

  return {
    title: str(o.title, '（未识别标题）'),
    severity,
    module: str(o.module, '（未识别模块）'),
    reproduceSteps: steps.length ? steps : ['（未识别复现步骤）'],
    actual: str(o.actual, '（未识别）'),
    expected: str(o.expected, '（未识别）'),
    suggestion: str(o.suggestion, '暂无'),
    tags,
  }
}
