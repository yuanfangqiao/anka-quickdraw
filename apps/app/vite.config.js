/**
 * quickdraw-app 构建配置（作为本内核 page 类插件接入）。
 *
 * 关键：base: './' —— 产物用相对路径 ./assets/x.js。
 * 挂载到 /plugins/quickdraw/dist/index.html 后浏览器会按 HTML 位置解析，
 * 不需要任何服务端路径改写（对照 excalidraw dist 的绝对路径问题，
 * 见 CHANGELOG M11.1 坑 1）。
 *
 * 产物输出 ../../dist（= plugins/quickdraw/dist），符合 M11 page 类
 * 静态入口探测优先级（dist/index.html）。
 */
import path from 'node:path'

const CORE = path.resolve(import.meta.dirname, '../../packages/core/src')

export default {
  base: './',
  build: {
    outDir: path.resolve(import.meta.dirname, '../../dist'),
    emptyOutDir: true,
    // 单页小应用，关掉体积提示噪音
    chunkSizeWarningLimit: 1500,
  },
  resolve: {
    alias: [
      // 长的先匹配：CSS 子路径导出
      { find: '@quickdrawjs/core/quickdraw.css',
        replacement: path.join(CORE, 'quickdraw.css') },
      { find: '@quickdrawjs/core/styles.css',
        replacement: path.join(CORE, 'quickdraw.css') },
      // 主入口：直接用 monorepo 里的 workspace 源码，无需 npm install
      { find: '@quickdrawjs/core', replacement: path.join(CORE, 'index.js') },
    ],
  },
}
