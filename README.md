# 多语言课堂实时翻译

[打开在线网页](https://zeyajing-cpu.github.io/classroom-live-translation/) · 支持英语、日语、韩语和德语语音识别，并将识别片段翻译为简体中文。

这是一个面向课堂场景的轻量网页原型。网页使用麦克风采集语音，将 16 kHz 单声道 PCM 音频流发送至腾讯云实时语音识别；识别中的片段会在短暂停顿后尝试翻译，识别定稿后立即翻译并固定显示。短暂断线时客户端会重新获取签名并自动重连。

## 使用方式

- 使用最新版 Chrome 或 Edge 打开在线网页。
- 选择老师使用的语言，点击“开始聆听”，并允许麦克风访问。
- 保持网络连接。页面会显示识别原文和中文译文。

## 部署实时识别服务

GitHub Pages 只托管静态网页。实时识别需要单独部署腾讯云实时语音识别和 Cloudflare Worker 签名服务。腾讯云密钥只能放在 Worker Secrets 中。

### 1. 开通腾讯云实时语音识别

在腾讯云控制台开通实时语音识别，准备 AppID、SecretID 和 SecretKey。客户端支持的引擎为 `16k_en`、`16k_ja`、`16k_ko`、`16k_de`。实时识别按服务计费，使用前请查看[腾讯云实时语音识别计费说明](https://cloud.tencent.com/document/product/1093/35686)并设置用量提醒。

### 2. 部署 Cloudflare Worker

仓库的 `asr-worker/worker.js` 和 `asr-worker/wrangler.toml` 是签名服务。安装 Node.js 后，在仓库根目录打开终端：

```powershell
cd asr-worker
npx wrangler login
npx wrangler secret put TENCENT_APP_ID
npx wrangler secret put TENCENT_SECRET_ID
npx wrangler secret put TENCENT_SECRET_KEY
npx wrangler deploy
```

每条 `secret put` 命令会提示输入对应密钥。不要将密钥写进网页、仓库文件或聊天消息。部署成功后复制 Worker 域名，例如 `https://<worker-name>.<account>.workers.dev`。

### 3. 配置网页

编辑 `index.html`，搜索 `YOUR-WORKER`，将 `ASR_SIGN_ENDPOINT` 设置为 Worker 域名加上 `/sign`，例如：

```js
const ASR_SIGN_ENDPOINT = "https://<worker-name>.<account>.workers.dev/sign";
```

提交到 `main` 分支，等待 GitHub Pages 更新后刷新网页。Worker 默认只接受 `https://zeyajing-cpu.github.io` 的网页请求；若使用自定义域名，也要同步修改 Worker 的允许来源。

## 使用限制与隐私

- 浏览器通过麦克风采集音频；语音音频会发送给腾讯云实时识别服务，识别文本会发送给 MyMemory 在线翻译接口。
- 在线服务可能有延迟、识别错误、额度和可用性限制。课堂专有名词及重要信息请核对。
- Worker 自动重连最多尝试 8 次；浏览器或设备休眠、网络不可用、服务额度耗尽时仍可能停止。
- 课堂使用前请告知授课者和参与者，并取得同意。不要用于处理未经授权的录音或敏感内容。
- Worker 对允许来源做了限制，但这不是身份验证。公开使用前请在 Cloudflare 设置请求频率限制，并在腾讯云配置用量告警。

## 许可证

本项目按 MIT License 开源，详见 [LICENSE](LICENSE)。
