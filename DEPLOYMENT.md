# 部署说明

## ✅ 代码已推送到GitHub

仓库地址：https://github.com/Orpheuscn/AISubtitleTranslate

## 🚀 启用GitHub Pages部署

### 步骤1：启用GitHub Pages

1. 打开你的GitHub仓库：https://github.com/Orpheuscn/AISubtitleTranslate
2. 点击 **Settings** (设置)
3. 在左侧菜单中找到 **Pages**
4. 在 **Source** 部分：
   - 选择 **GitHub Actions** 作为部署源

### 步骤2：触发自动部署

代码推送后会自动触发GitHub Actions部署流程：
- 在仓库页面点击 **Actions** 标签页
- 你应该能看到 "Deploy to GitHub Pages" 工作流正在运行
- 等待部署完成（通常需要2-5分钟）

### 步骤3：访问应用

部署完成后，你的应用将可以通过以下地址访问：

**https://orpheuscn.github.io/AISubtitleTranslate/**

## 📝 注意事项

### GitHub Pages配置
- 已创建 `.github/workflows/deploy.yml` 用于自动部署
- 已配置 `vite.config.ts` 的 base 路径为 `/AISubtitleTranslate/`
- 每次推送到 `main` 分支都会自动触发重新部署

### 本地开发
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 更新部署
只需要提交更改并推送：
```bash
git add .
git commit -m "更新说明"
git push
```

## 🎯 功能特性

- ✅ SRT文件拖放/选择导入
- ✅ 自动解析字幕序号和时间轴
- ✅ 批量翻译（30/50/100条）
- ✅ 左右对齐显示和高亮联动
- ✅ 右侧译文直接可编辑
- ✅ 单条重译（带上下文）
- ✅ 专有名词自动识别和管理
- ✅ 保存翻译后的SRT文件
- ✅ 深色/浅色主题切换

## 🔑 使用前准备

使用应用前需要：
1. 获取DeepSeek API Key：https://platform.deepseek.com/
2. 在应用的"API设置"中输入你的API Key
3. 选择模型和批次大小
4. 开始翻译！

## 📧 反馈

如有问题或建议，请在GitHub仓库中提交Issue。










