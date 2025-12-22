# WriteTex Obsidian 插件使用指南

本插件用于将 **WriteTex** 应用与 Obsidian 配合使用。WriteTex 是一款 AI 驱动的 OCR 应用（可在 iOS 上使用），能将数学公式和图表的图像转换为 LaTeX、TikZ 或 Markdown。本插件作为连接桥梁，使 WriteTex 应用能够将识别出的代码直接插入到您的 Obsidian 笔记中。

## 主要功能

*   **WriteTex 应用伴侣**: 将手机端的 WriteTex 应用与桌面的 Obsidian 编辑器无缝连接。
*   **本地代理服务器**: 在 Obsidian 内部运行轻量级服务器（端口 50905）以接收来自 App 的数据。
*   **上下文感知**: 自动读取光标周围的文本并发送给 AI，通过理解当前文档的风格和变量定义来提高识别准确率。
*   **自动发现**: 使用 mDNS (Bonjour) 技术，使 WriteTex iOS 应用能自动发现局域网内的电脑。
*   **直接插入**: 生成的代码会直接插入到您的编辑器光标处。
*   **流式传输**: 实时显示生成的文本内容。

## 安装步骤

1.  下载最新版本的发布包。
2.  将 `main.js` 和 `manifest.json` 放到你的Vault的插件文件夹中： `<VAULT>/.obsidian/writetex-obsidian/` 
3.  打开 Obsidian 设置 > **第三方插件 (Community Plugins)**，启用 **WriteTex for Obsidian**。

## 配置说明

1.  进入 **设置 (Settings)** > **WriteTex**。
2.  **API Endpoint**: 默认为 `https://api.openai.com/v1`。如果您使用兼容的第三方服务（如 OpenRouter, LocalAI），请在此修改。
3.  **API Key**: 输入您的 OpenAI API 密钥 (以 sk- 开头)。
4.  **Model**: 默认为 `gpt-4o`。您可以更改为 `gpt-4-turbo` 或其他支持视觉的模型。
5.  **Custom Prompt**: (可选) 添加自定义指令，例如：“数学公式中的粗体请始终使用 `\bm`”。

## 使用方法

1.  **启动服务器**:
    *   插件加载时会自动启动服务器。
    *   检查右下角的状态栏：应显示 **"WriteTex: On"**。
    *   如果显示 "Off"，请打开命令面板 (`Cmd/Ctrl + P`) 并运行 **"WriteTex: Start Server"**。

2.  **连接客户端 (如 iOS App)**:
    *   在手机上打开 WriteTex 应用。
    *   确保您的手机和电脑连接在**同一个 Wi-Fi 网络**下。
    *   应用应能自动发现名为 "WriteTex Obsidian @ [您的主机名]" 的服务。
    *   如果自动发现失败，请手动输入您电脑的 IP 地址和端口 `50905`。

3.  **扫描并插入**:
    *   在 Obsidian 笔记中，将光标放置在您希望插入代码的位置。
    *   使用手机 App 拍摄数学公式或图表。
    *   插件将接收图像，结合当前笔记的上下文进行分析，并将生成的 LaTeX/Markdown 结果实时流式传输到您的编辑器中。

## 常见问题排查

*   **服务器无法启动**: 请检查端口 `50905` 是否被其他应用程序占用。
*   **手机 App 无法连接**:
    *   确保两台设备在同一 Wi-Fi 网络下。
    *   检查电脑的防火墙设置，确保允许端口 `50905` 的传入连接。
*   **"Unauthorized" 错误**: 确保客户端应用发送了 `Bearer writetex` 的授权头 (Authorization header)。
