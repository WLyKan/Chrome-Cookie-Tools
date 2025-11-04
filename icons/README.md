# 图标转换说明

## 方法 1：使用在线工具（推荐）

1. 访问 https://convertio.co/zh/svg-png/ 或 https://cloudconvert.com/svg-to-png
2. 上传 `icon.svg` 文件
3. 分别转换为以下尺寸：
   - 16x16 像素 → 保存为 `icon16.png`
   - 48x48 像素 → 保存为 `icon48.png`
   - 128x128 像素 → 保存为 `icon128.png`

## 方法 2：使用 ImageMagick（命令行）

如果已安装 ImageMagick，在项目根目录运行：

```bash
cd icons
magick icon.svg -resize 16x16 icon16.png
magick icon.svg -resize 48x48 icon48.png
magick icon.svg -resize 128x128 icon128.png
```

## 方法 3：使用 Inkscape（命令行）

如果已安装 Inkscape：

```bash
cd icons
inkscape icon.svg --export-type=png --export-filename=icon16.png -w 16 -h 16
inkscape icon.svg --export-type=png --export-filename=icon48.png -w 48 -h 48
inkscape icon.svg --export-type=png --export-filename=icon128.png -w 128 -h 128
```

## 图标设计说明

- 主色调：绿色背景，黄色 Cookie
- 巧克力豆：表示 Cookie 数据
- 蓝色箭头：表示 Cookie 传输功能

