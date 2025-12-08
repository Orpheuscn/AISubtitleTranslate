# 电影字幕翻译工具 - Vue3版

这是一个专为电影字幕翻译设计的Web应用，使用DeepSeek API进行智能翻译。采用Vue3、TypeScript、Pinia状态管理和Element Plus UI库构建。

## ✨ 核心特性

### 技术栈
- **Vue 3** + **TypeScript** - 现代化框架和类型安全
- **Pinia** - 状态管理
- **Element Plus** - UI组件库
- **Vite** - 快速构建工具
- **DeepSeek API** - AI翻译引擎

### 主要功能
1. **SRT文件支持**
   - 拖放或选择SRT文件导入
   - 自动解析字幕序号、时间轴和文本
   - **右侧支持导入已有译文进行校对** ✨
   - 导出翻译后的SRT文件

2. **智能翻译**
   - 批量翻译（30/50/100条可选）
   - 保留上下文关联性
   - 自动提取专有名词
   - 单条字幕重译功能

3. **交互体验**
   - 左右对齐显示原文和译文
   - 点击高亮联动显示
   - 自动滚动到对应字幕
   - 译文可直接编辑（点击即可）
   - 实时翻译进度显示

4. **专有名词管理** ✨
   - 自动识别和收录术语
   - 手动添加/删除术语
   - **术语在左右两侧高亮显示（金色标记）**
   - **修改术语时可选择全局替换译文**
   - 持久化存储

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
├── components/              # UI组件
│   ├── ApiSettings.vue      # API配置组件
│   ├── TextColumn.vue       # 字幕列显示组件
│   ├── SubtitleItem.vue     # 单条字幕组件
│   ├── ProperNounIndex.vue  # 专有名词索引
│   └── ThemeToggle.vue      # 主题切换
├── composables/             # 组合式函数
│   ├── useSrtProcessing.ts     # SRT文件解析和生成
│   └── useSubtitleTranslation.ts # 字幕翻译API调用
├── stores/                  # Pinia状态管理
│   └── translation.ts       # 翻译状态管理
├── types/                   # TypeScript类型定义
│   └── index.ts
├── views/                   # 页面组件
│   └── TranslationView.vue  # 主视图
├── App.vue                  # 根组件
└── main.ts                  # 应用入口
```

## 📖 使用指南

> 💡 **快速测试**：public/sample.srt 是一个示例字幕文件，可用于测试应用功能。

### 1. 配置API
- 点击"API 设置"展开配置面板
- 输入您的DeepSeek API Key
- 选择模型（deepseek-chat 或 deepseek-coder）
- 设置批量处理字幕数（30/50/100条）

### 2. 加载字幕文件

**原文字幕**：
- 方式一：拖放SRT文件到左侧窗口
- 方式二：点击"选择原文SRT"按钮
- 文件加载后会显示所有字幕条目

**译文字幕（可选，用于校对）**：
- 拖放已有的译文SRT文件到右侧窗口
- 或点击"导入译文SRT"按钮
- 译文会自动匹配到对应序号的字幕

### 3. 翻译或校对字幕
- 点击"翻译"按钮开始批量翻译
- 查看实时进度和已处理条数
- 翻译结果自动显示在右侧窗口

### 4. 编辑和调整
- 点击右侧译文文本框直接编辑（无需双击）
- 点击🔄按钮重新翻译单条字幕
- 左右两侧点击可高亮对应字幕
- 鼠标悬停时自动滚动到对应字幕

### 5. 专有名词管理 ✨
- **术语会在左右两侧用金色高亮显示**
- AI会自动识别并添加专有名词
- 修改术语译文时：
  - 选择"替换"：在所有译文中全局替换该术语
  - 选择"仅更新索引"：只更新术语库，不修改已有译文
- 删除不需要的术语
- 导出术语库为JSON文件

### 6. 保存结果
- 点击"保存SRT"按钮
- 文件名自动添加 `_translated` 后缀
- 下载包含翻译的SRT文件

## 🎯 核心优势

### 翻译功能
- ✅ **上下文保持** - 批量翻译保持剧情连贯性
- ✅ **Token优化** - 去除时间轴信息，只翻译文本内容
- ✅ **序号对齐** - 翻译结果按序号精确对应原文
- ✅ **口语化表达** - 针对字幕优化的翻译提示词
- ✅ **进度控制** - 可随时停止和继续

### 校对功能 ✨
- ✅ **导入已有译文** - 支持加载现有译文进行校对
- ✅ **术语高亮显示** - 左右两侧术语用金色标记，一目了然
- ✅ **术语全局替换** - 修改术语时可一键替换所有译文
- ✅ **直接编辑** - 点击即可编辑译文，无需切换模式
- ✅ **高亮联动** - 点击/悬停自动对应和滚动
- ✅ **专有名词管理** - 统一管理术语翻译，确保一致性

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
