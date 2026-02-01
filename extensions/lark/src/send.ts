import type { ChannelOutbound, MoltbotConfig } from "clawdbot/plugin-sdk";
import { getTenantAccessToken, resolveLarkCredentials } from "./token.js";
import type { LarkConfig } from "./types.js";

type LarkApiResponse = {
  code: number;
  msg: string;
  data?: {
    message_id?: string;
  };
};

function detectReceiveIdType(to: string): string {
  if (to.startsWith("oc_")) return "chat_id";
  if (to.startsWith("ou_")) return "open_id";
  if (to.startsWith("on_")) return "union_id";
  if (to.includes("@")) return "email";
  return "open_id";
}

export const larkOutbound: ChannelOutbound = {
  sendText: async ({ cfg, to, text }) => {
    console.log(`[Lark Send] sendText called - to: ${to}, text length: ${text.length}`);

    const larkCfg = (cfg as MoltbotConfig).channels?.lark as LarkConfig | undefined;
    const creds = resolveLarkCredentials(larkCfg);
    if (!creds) {
      throw new Error("Lark credentials not configured (appId and appSecret required)");
    }

    if (!to?.trim()) {
      throw new Error("Lark target (to) is required");
    }

    console.log(`[Lark Send] Getting tenant access token...`);
    const token = await getTenantAccessToken(creds);
    console.log(`[Lark Send] Token obtained: ${token.substring(0, 10)}...`);

    const receiveIdType = detectReceiveIdType(to);
    const url = `${creds.baseUrl.replace(/\/$/, "")}/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`;
    console.log(`[Lark Send] Sending to URL: ${url}`);

    const body = JSON.stringify({
      receive_id: to,
      msg_type: "text",
      content: JSON.stringify({ text }),
    });
    console.log(`[Lark Send] Request body: ${body.substring(0, 100)}...`);

    console.log(`[Lark Send] Making API request...`);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body,
    });

    console.log(`[Lark Send] Response status: ${res.status} ${res.statusText}`);
    if (!res.ok) {
      const resBody = await res.text();
      console.error(`[Lark Send] API error response: ${resBody}`);
      throw new Error(`Lark API error: ${res.status} ${resBody}`);
    }

    const resData: unknown = await res.json();
    console.log(`[Lark Send] Response data:`, resData);

    if (!resData || typeof resData !== "object") {
      throw new Error("Lark API returned invalid response");
    }

    const response = resData as LarkApiResponse;
    if (response.code !== 0) {
      throw new Error(`Lark send error (code ${response.code}): ${response.msg}`);
    }

    console.log(`[Lark Send] Success - message_id: ${response.data?.message_id}`);
    return {
      id: response.data?.message_id ?? "",
      ts: Date.now(),
    };
  },
};
