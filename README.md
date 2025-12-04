# 多语言翻译助手 - Vue3重构版

这是原始HTML/JS翻译工具的现代化Vue3重构版本，采用TypeScript、Pinia状态管理和Element Plus UI库。

## ✨ 重构改进

### 技术栈升级
- **Vue 3** + **TypeScript** - 现代化框架和类型安全
- **Pinia** - 现代状态管理，替代Vuex
- **Element Plus** - 现代化UI组件库
- **Vite** - 快速构建工具
- **组合式API** - 更好的逻辑复用和代码组织

### 代码优化
1. **消除重复代码**
   - 提取共用的API调用逻辑
   - 统一进度更新函数
   - 复用词汇表生成逻辑

2. **组件化架构**
   - `ApiSettings` - API配置组件
   - `TranslationControls` - 翻译控制按钮
   - `TextColumn` - 文本显示列
   - `SentenceItem` - 句子项组件
   - `ProperNounIndex` - 专有名词索引
   - `TranslationProgress` - 进度显示

3. **组合式函数**
   - `useTextProcessing` - 文本处理和NLP分割
   - `useTranslationAPI` - API调用和翻译逻辑

4. **状态管理**
   - 集中的Pinia store管理所有状态
   - 响应式数据和计算属性
   - 本地存储持久化

## 🚀 启动项目

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 📁 项目结构

```
src/
├── components/           # UI组件
│   ├── ApiSettings.vue
│   ├── TranslationControls.vue
│   ├── TextColumn.vue
│   ├── SentenceItem.vue
│   ├── ProperNounIndex.vue
│   └── TranslationProgress.vue
├── composables/          # 组合式函数
│   ├── useTextProcessing.ts
│   └── useTranslationAPI.ts
├── stores/               # Pinia状态管理
│   └── translation.ts
├── types/                # TypeScript类型定义
│   └── index.ts
├── views/                # 页面组件
│   └── TranslationView.vue
├── router/               # 路由配置
│   └── index.ts
├── App.vue              # 根组件
└── main.ts              # 应用入口
```

## 🎯 主要功能

- ✅ **智能文本分割** - 使用NLP库进行句子分割
- ✅ **批量翻译** - 支持10-50句批量处理
- ✅ **专有名词管理** - 自动识别和手动管理术语
- ✅ **诗歌格式支持** - 自动检测并适配诗歌排版
- ✅ **句子级操作** - 重译、编辑、高亮定位
- ✅ **进度控制** - 实时进度、停止、重试功能
- ✅ **响应式设计** - 适配桌面和移动设备

## 🔧 代码优化亮点

1. **减少重复代码**：从原来的1762行JavaScript减少到约600行TypeScript
2. **模块化设计**：功能按组件和composables分离，便于维护
3. **类型安全**：TypeScript提供编译时类型检查
4. **现代化UI**：Element Plus提供一致的设计语言
5. **性能优化**：Vue3的响应式系统和组合式API提供更好的性能

## 🔄 与原版对比

| 方面 | 原版 | 重构版 |
|------|------|--------|
| 代码量 | 1762行JS | ~600行TS |
| 重复代码 | 大量重复逻辑 | 提取复用函数 |
| 类型安全 | 无 | TypeScript |
| 状态管理 | 分散的全局变量 | 集中的Pinia store |
| UI框架 | 原生CSS | Element Plus |
| 组件化 | 单一文件 | 模块化组件 |
| 可维护性 | 低 | 高 |

项目已完成核心功能重构，提供了更现代、更易维护的代码架构。

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```
