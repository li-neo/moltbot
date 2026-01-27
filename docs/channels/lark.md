# Clawdbot 飞书（Lark）集成指南

本教程将介绍如何在飞书中配置和使用 Clawdbot 机器人，实现基础的 AI 对话功能。

## 功能说明

当前版本支持以下功能：
- ✅ **单聊**：与机器人进行一对一对话
- ✅ **群聊**：在群组中 @提及机器人进行对话

## 目录

- [前提条件](#前提条件)
- [步骤一：Clawdbot 基本配置](#步骤一clawdbot-基本配置)
- [步骤二：创建飞书应用](#步骤二创建飞书应用)
- [步骤三：配置 Clawdbot 飞书插件](#步骤三配置-clawdbot-飞书插件)
- [步骤四：使用 ngrok 暴露本地服务并启动网关](#步骤四使用-ngrok-暴露本地服务并启动网关)
- [步骤五：配置飞书应用权限和 Webhook](#步骤五配置飞书应用权限和-webhook)
- [步骤六：测试机器人](#步骤六测试机器人)

## 前提条件

在开始之前，请确保你具备以下条件：

1. **飞书账号**：个人账号或企业账号均可
2. **Node.js 22+**：Clawdbot 需要 Node.js 22 或更高版本
3. **Clawdbot 项目**：已克隆并安装依赖的 Clawdbot 代码库
4. **有效的 AI 模型配置**：已配置好 OpenAI、Anthropic 或其他支持的模型提供商

## 步骤一：Clawdbot 基本配置

### 1.1 克隆并安装项目

```bash
# 克隆项目
git clone -b feishu https://github.com/BLUE-coconut/clawdbot.git
cd clawdbot
```

### 1.2 安装依赖&初步编译
前置条件 —— 安装好pnpm包管理工具
```
# npm 全局安装
npm install -g pnpm@10.23.0

# 或者 mac 用户可以用homebrew来安装
brew install pnpm
```

安装项目中的依赖，并初步编译本项目
```
pnpm install
pnpm ui:build
pnpm build
```


### 1.3 配置 AI 模型

在启动飞书集成之前，需要先配置好 AI 模型，以国内平台的 MiniMax-M2.1 模型为例。
可以直接打开 `~/.clawdbot/clawdbot.json` 文件进行如下配置，关键是需要对"models"和"agents"配置项中的内容进行修改：
```
{
  "models": {
    "mode": "merge",
    "providers": {
      "minimax": {
        "baseUrl": "https://api.minimaxi.com/anthropic", // Minimax国内平台，模型访问地址
        "apiKey": "sk-cp-xxx", // 你的 Minimax key
        "auth": "api-key",
        "api": "anthropic-messages",
        "models": [
          {
            "id": "MiniMax-M2.1",
            "name": "MiniMax M2.1",
            "reasoning": false,
            "input": [
              "text"
            ],
            "cost": {
              "input": 15,
              "output": 60,
              "cacheRead": 2,
              "cacheWrite": 10
            },
            "contextWindow": 200000,
            "maxTokens": 8192
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "minimax/MiniMax-M2.1" // 设置主模型
      },
      "models": { // 模型列表中如下添加
        "minimax/MiniMax-M2.1": {
          "alias": "Minimax"
        }
      },
      "compaction": {
        "mode": "safeguard"
      },
      "maxConcurrent": 4,
      "subagents": {
        "maxConcurrent": 8
      }
    }
  },
}
```

### 1.3 测试基本功能

在配置飞书之前，先验证 Clawdbot 的基本功能是否正常：

```bash
# 启动网关测试基本功能
pnpm clawdbot gateway run --bind 127.0.0.1 --port 18789
```

如果一切正常，你应该能看到网关成功启动的日志。可以在浏览器中访问 http://127.0.0.1:18789 打开ClawdBot的自带前端，进行简单对话来测试模型是否配置正确。


## 步骤二：创建飞书应用

### 2.1 访问飞书开放平台

1. 打开浏览器，访问 [飞书开放平台](https://open.feishu.cn/)
2. 使用飞书账号登录
3. 点击「创建企业自建应用」

### 2.2 创建新应用

1. 点击「创建自建应用」
2. 填写应用基本信息：
   - **应用名称**：Clawdbot
   - **应用描述**：AI 助手机器人
3. 点击「确定创建」

### 2.3 获取应用凭证

创建应用后，在应用概览页面获取以下凭证（在后面步骤三中配置到clawdbot中）：

```
应用 ID (App ID)：cli_xxxxxxxxxxxxx
应用密钥 (App Secret)：xxxxxxxxxxxxx
```

> ⚠️ **重要提示**：请妥善保管应用密钥，不要分享给他人或提交到代码仓库。

## 步骤三：配置 Clawdbot 飞书插件

### 3.1 设置应用凭证

在终端中执行以下命令：

```bash
# 设置飞书应用 ID
pnpm clawdbot config set channels.lark.appId "cli_xxxxxxxxxxxxx"

# 设置飞书应用密钥
pnpm clawdbot config set channels.lark.appSecret "your_app_secret_here"

# 启用飞书插件
pnpm clawdbot config set channels.lark.enabled true
```

### 3.2 查看当前配置

验证配置是否正确：

```bash
pnpm clawdbot config get channels.lark
```

输出示例：

```json
{
  "appId": "cli_a9fd17f5ea78dcbb",
  "appSecret": "****************",
  "enabled": true
}
```

## 步骤四：使用 ngrok 暴露本地服务并启动网关

### 4.1 安装 ngrok

ngrok 是一个内网穿透工具，可以在开发阶段快速暴露本地服务。

```bash
# macOS
brew install ngrok

# 或从官网下载：https://ngrok.com/download
```

### 4.2 启动 ngrok

```bash
ngrok http 3000
```

成功启动后，你将看到类似输出：

```
Forwarding   https://your-app.ngrok-free.app -> http://localhost:3000
```

记下这个 HTTPS 地址（格式如：`https://xxxx.ngrok-free.app`），这是你的公网 Webhook 地址。

> ⚠️ **安全提示**： ngrok 仅用于个人开发和调试，生产环境建议部署到正规云服务器。不要在公开渠道泄漏公网地址，且开发调试完成后记得及时关闭，避免长期暴露本地服务带来的安全风险。


### 4.3 启动 Clawdbot 网关

**重要**：在配置飞书 Webhook 之前，必须先启动 Clawdbot 网关。

在新的终端窗口中执行：

```bash
pnpm clawdbot gateway run --bind 0.0.0.0 --port 18789
```

成功启动后，你将看到类似输出：

```
🦞 Clawdbot 2026.1.25 — The only crab in your contacts you actually want to hear from.

03:07:18 [canvas] host mounted at http://127.0.0.1:18789/__clawdbot__/canvas/
03:07:19 [heartbeat] started
03:07:19 [gateway] listening on ws://127.0.0.1:18789
03:07:19 [gateway] log file: /tmp/clawdbot/clawdbot-2026-01-27.log
03:07:19 [lark] [default] starting Lark provider (port 3000)
03:07:19 [lark] provider listening on port 3000 at /lark/webhook
```

网关启动后，飞书插件会在本地 3000 端口监听 Webhook 请求。

## 步骤五：配置飞书应用权限和 Webhook

**重要说明**：此步骤必须在启动 Clawdbot 网关（步骤四）之后进行，因为飞书会验证你的 Webhook 地址是否可访问。

### 5.1 配置应用权限

在飞书开放平台的应用管理页面：

1. 点击左侧菜单的「权限管理」
2. 添加以下必需权限：

| 权限名称 | 用途 |
|---------|------|
| `im:message` | 发送和接收消息 |
| `im:message:send_as_bot` | 以机器人身份发送消息 |
| `im:message:read` | 读取消息 |

3. 勾选后点击「保存」

### 5.2 配置事件订阅

1. 在应用管理页面，点击左侧菜单的「事件订阅」
2. 在「请求 URL」中输入你的 Webhook 地址：

   ```
   https://your-ngrok-address.ngrok-free.app/lark/webhook
   ```

   例如：`https://a1b2c3d4.ngrok-free.app/lark/webhook`

3. 点击「保存」后，飞书会向你的 Webhook 发送验证请求

### 5.3 验证回调地址

保存后，飞书会自动验证回调地址是否可访问。由于你的网关已经启动且 ngrok 已经配置，验证应该会成功。

### 5.4 订阅事件

在「订阅事件」部分，添加以下事件：

| 事件名称 | 用途 |
|---------|------|
| `im.message.receive_v1` | 接收消息事件 |
| `im.message.message_sent_v1` | 消息已发送事件 |

添加后点击「保存」。

### 5.5 发布应用（可选）

开发测试完成后，可以点击「版本管理与发布」发布应用：

1. 点击「创建版本」
2. 填写版本信息
3. 选择发布范围（指定用户或全企业）
4. 点击「发布」

## 步骤六：测试机器人

### 6.1 添加机器人到飞书

根据应用发布范围：

- **个人测试**：在应用详情页点击「添加到工作台」
- **企业发布**：用户在工作台的应用列表中可以看到应用


### 6.2 单聊测试

1. 在飞书中，打开与机器人的对话窗口
2. 发送一条消息，例如：`你好`
3. 机器人应该会回复你的消息

### 6.3 群聊测试

1. 在飞书群组中添加机器人（需要群主或管理员权限）
2. 发送 `@机器人 你好`（需要 @提及机器人）
3. 机器人会在群聊中回复你

### 6.4 测试 AI 对话

尝试更复杂的对话：

```
用户：你能帮我写一段 Python 代码吗？
机器人：当然可以！请告诉我你需要什么功能的代码...

用户：解释一下什么是机器学习
机器人：机器学习是人工智能的一个分支...
```


## 相关文档

- [飞书开放平台文档](https://open.feishu.cn/document/)
- [Clawdbot 官方文档](https://docs.clawd.bot/)
- [ngrok 官方文档](https://ngrok.com/docs)
- [Clawdbot 配置指南](https://docs.clawd.bot/configuration)
