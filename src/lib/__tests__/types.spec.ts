import { describe, expect, it } from 'vitest'
import { asTicketInfo, SEVERITIES } from '../types'

/** 工厂：生成一份合法单据，测试里按需覆盖字段 */
function validTicket(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: '[登录] 验证码不刷新',
    severity: '一般',
    module: '登录',
    reproduceSteps: ['打开登录页', '点击获取验证码'],
    actual: '验证码不刷新',
    expected: '验证码刷新',
    suggestion: '检查图片缓存',
    tags: ['前端'],
    ...overrides,
  }
}

describe('asTicketInfo', () => {
  it('合法对象原样通过', () => {
    const t = asTicketInfo(validTicket())
    expect(t.title).toBe('[登录] 验证码不刷新')
    expect(t.severity).toBe('一般')
    expect(t.reproduceSteps).toHaveLength(2)
  })

  it('非对象输入直接抛错', () => {
    expect(() => asTicketInfo(null)).toThrow()
    expect(() => asTicketInfo('一段文本')).toThrow()
    expect(() => asTicketInfo(42)).toThrow()
  })

  it('未知严重级别兜底为「一般」', () => {
    const t = asTicketInfo(validTicket({ severity: '超级无敌严重' }))
    expect(t.severity).toBe('一般')
  })

  it('级别枚举白名单完整', () => {
    // 防止有人手滑改坏枚举定义
    expect(SEVERITIES).toEqual(['致命', '严重', '一般', '轻微', '建议'])
  })

  it('复现步骤过滤非字符串项，全空时给占位符', () => {
    const t = asTicketInfo(validTicket({ reproduceSteps: ['有效步骤', 123, null, ''] }))
    expect(t.reproduceSteps).toEqual(['有效步骤'])

    const t2 = asTicketInfo(validTicket({ reproduceSteps: '不是数组' }))
    expect(t2.reproduceSteps).toEqual(['（未识别复现步骤）'])
  })

  it('空字符串字段降级为占位符', () => {
    const t = asTicketInfo(validTicket({ title: '   ', actual: '' }))
    expect(t.title).toBe('（未识别标题）')
    expect(t.actual).toBe('（未识别）')
  })

  it('tags 过滤非字符串项', () => {
    const t = asTicketInfo(validTicket({ tags: ['前端', 1, true, '后端'] }))
    expect(t.tags).toEqual(['前端', '后端'])
  })
})
