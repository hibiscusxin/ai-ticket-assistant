/**
 * Markdown 导出：把 TicketInfo 生成「走单文件」和「验证报告」两种草稿。
 * 导出即 Blob 下载，全程本地，不落任何服务器。
 */

import type { TicketInfo } from './types'

/** 缺陷描述中的换行转成 Markdown 列表行 */
function lines(text: string): string {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `- ${s}`)
    .join('\n')
}

/** 走单文件草稿（提单用） */
export function toTicketMarkdown(t: TicketInfo): string {
  const steps = t.reproduceSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')
  return [
    `# ${t.title}`,
    '',
    `**严重级别**：${t.severity}　|　**影响模块**：${t.module}　|　**标签**：${t.tags.join(' / ') || '无'}`,
    '',
    '## 复现步骤',
    '',
    steps,
    '',
    '## 实际结果',
    '',
    t.actual,
    '',
    '## 预期结果',
    '',
    t.expected,
    '',
    '## 修复建议（AI 生成，仅供参考）',
    '',
    t.suggestion,
    '',
    '---',
    '',
    '> 本走单文件由 AI 缺陷单助手生成草稿，提交前请人工核对。',
  ].join('\n')
}

/** 验证报告草稿（修复后回归验证用） */
export function toVerifyReportMarkdown(t: TicketInfo): string {
  return [
    `# 缺陷验证报告：${t.title}`,
    '',
    `**原缺陷级别**：${t.severity}　|　**模块**：${t.module}`,
    '',
    '## 一、问题回顾',
    '',
    lines(`原缺陷现象：${t.actual}\n预期应为：${t.expected}`),
    '',
    '## 二、验证环境',
    '',
    '- 版本：（填写验证版本号）',
    '- 环境：（填写验证环境）',
    '- 验证人：（填写姓名）',
    '- 验证时间：（填写时间）',
    '',
    '## 三、验证步骤与结果',
    '',
    t.reproduceSteps.map((s, i) => `${i + 1}. ${s}\n   - 验证结果：☐ 通过 ☐ 不通过`).join('\n'),
    '',
    '## 四、验证结论',
    '',
    '☐ 已修复，回归通过　　☐ 未修复，重新打开　　☐ 部分修复，说明：',
    '',
    '---',
    '',
    '> 本报告由 AI 缺陷单助手生成草稿，提交前请人工核对并补全环境信息。',
  ].join('\n')
}

/**
 * 文件名消毒：LLM 生成的模块名可能包含 / : ? 等字符，
 * 浏览器会把它们当路径分隔符处理，导致文件名被截断甚至丢失后缀。
 * 替换非法字符、限制长度，并保证以 .md 结尾。
 */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|\r\n]+/g, '_')
    .trim()
    .slice(0, 60)
  return cleaned.endsWith('.md') ? cleaned : `${cleaned}.md`
}

/** Blob 下载触发器 */
export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = sanitizeFilename(filename)
  a.click()
  URL.revokeObjectURL(url)
}
