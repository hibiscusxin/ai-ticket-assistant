import { describe, expect, it } from 'vitest'
import { sanitizeFilename, toTicketMarkdown, toVerifyReportMarkdown } from '../markdown'
import type { TicketInfo } from '../types'

const ticket: TicketInfo = {
  title: '[用户管理] 列表加载缓慢',
  severity: '严重',
  module: '用户管理',
  reproduceSteps: ['管理员登录', '打开用户管理', '观察加载时间'],
  actual: '加载超过十秒，偶发白屏',
  expected: '几秒内加载完成',
  suggestion: '优化查询与渲染',
  tags: ['前端', '性能'],
}

describe('toTicketMarkdown', () => {
  const md = toTicketMarkdown(ticket)

  it('包含标题、级别、模块等关键信息', () => {
    expect(md).toContain('# [用户管理] 列表加载缓慢')
    expect(md).toContain('**严重级别**：严重')
    expect(md).toContain('**影响模块**：用户管理')
  })

  it('复现步骤带序号', () => {
    expect(md).toContain('1. 管理员登录')
    expect(md).toContain('3. 观察加载时间')
  })

  it('带人工核对提示（AI 起草、人负责）', () => {
    expect(md).toContain('提交前请人工核对')
  })
})

describe('toVerifyReportMarkdown', () => {
  it('包含验证环境与结论勾选区', () => {
    const md = toVerifyReportMarkdown(ticket)
    expect(md).toContain('# 缺陷验证报告')
    expect(md).toContain('## 二、验证环境')
    expect(md).toContain('☐ 已修复，回归通过')
  })

  it('复现步骤转为验证检查项', () => {
    const md = toVerifyReportMarkdown(ticket)
    expect(md).toContain('1. 管理员登录')
    expect(md).toContain('验证结果：☐ 通过 ☐ 不通过')
  })
})

describe('sanitizeFilename', () => {
  it('替换路径类非法字符，防止文件名被浏览器截断', () => {
    expect(sanitizeFilename('走单文件_用户/权限:管理.md')).toBe('走单文件_用户_权限_管理.md')
    expect(sanitizeFilename('a<b>c*d?e"f|g.md')).toBe('a_b_c_d_e_f_g.md')
  })

  it('无后缀时自动补 .md', () => {
    expect(sanitizeFilename('走单文件')).toBe('走单文件.md')
  })

  it('已有 .md 后缀不重复追加', () => {
    expect(sanitizeFilename('报告.md')).toBe('报告.md')
  })

  it('超长名称截断且仍保留后缀', () => {
    const long = 'x'.repeat(100)
    const out = sanitizeFilename(long)
    expect(out.length).toBeLessThanOrEqual(63)
    expect(out.endsWith('.md')).toBe(true)
  })
})
