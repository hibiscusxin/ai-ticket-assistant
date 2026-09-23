import { describe, expect, it } from 'vitest'
import { extractJson } from '../llm'

describe('extractJson', () => {
  it('纯 JSON 文本直接解析', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 })
  })

  it('容忍 ```json 代码块包裹', () => {
    const text = '以下是解析结果：\n```json\n{"title":"测试","severity":"严重"}\n```'
    expect(extractJson(text)).toEqual({ title: '测试', severity: '严重' })
  })

  it('容忍 JSON 前后的废话（模型不听话时的常见形态）', () => {
    const text = '好的，这是结构化结果：{"a":1} 希望对你有帮助！'
    expect(extractJson(text)).toEqual({ a: 1 })
  })

  it('嵌套大括号取最外层', () => {
    const text = '{"a":{"b":2}}'
    expect(extractJson(text)).toEqual({ a: { b: 2 } })
  })

  it('找不到大括号时抛错', () => {
    expect(() => extractJson('没有任何 JSON')).toThrow('未找到 JSON')
  })

  it('JSON 语法错误时抛错（交给重试逻辑处理）', () => {
    expect(() => extractJson('{"a":1,')).toThrow()
  })
})
