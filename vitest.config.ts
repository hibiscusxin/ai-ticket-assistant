import { defineConfig } from 'vitest/config'

// 单测只覆盖纯函数（不依赖 DOM），node 环境足够、跑得最快
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
})
