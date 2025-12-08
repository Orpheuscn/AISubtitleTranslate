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
   - 导出翻译后的SRT文件

2. **智能翻译**
   - 批量翻译（30/50/100条可选）
   - 保留上下文关联性
   - 自动提取专有名词
   - 单条字幕重译功能

3. **交互体验**
   - 左右对齐显示原文和译文
   - 点击高亮联动显示
   - 译文可编辑（双击编辑）
   - 实时翻译进度显示

4. **专有名词管理**
   - 自动识别和收录术语
   - 手动添加/删除术语
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
- 方式一：拖放SRT文件到左侧窗口
- 方式二：点击"选择SRT文件"按钮选择文件
- 文件加载后会显示所有字幕条目

### 3. 翻译字幕
- 点击"翻译"按钮开始批量翻译
- 查看实时进度和已处理条数
- 翻译结果自动显示在右侧窗口

### 4. 编辑和调整
- 双击右侧译文进行编辑
- 点击🔄按钮重新翻译单条字幕
- 左右两侧点击可高亮对应字幕

### 5. 专有名词管理
- AI会自动识别并添加专有名词
- 手动添加：输入原文和译文，点击"添加"
- 删除不需要的术语

### 6. 保存结果
- 点击"保存SRT"按钮
- 文件名自动添加 `_translated` 后缀
- 下载包含翻译的SRT文件

## 🎯 翻译优势

- ✅ **上下文保持** - 批量翻译保持剧情连贯性
- ✅ **Token优化** - 去除时间轴信息，只翻译文本内容
- ✅ **序号对齐** - 翻译结果按序号精确对应原文
- ✅ **口语化表达** - 针对字幕优化的翻译提示词
- ✅ **专有名词一致** - 自动管理术语翻译
- ✅ **可编辑结果** - 翻译后可手动调整
- ✅ **进度控制** - 可随时停止和继续

