import type { MoltbotConfig } from "clawdbot/plugin-sdk";
import { larkOutbound } from "./send.js";
import { getLarkRuntime } from "./runtime.js";
// @ts-ignore
import type { ReplyPayload } from "clawdbot/auto-reply/types.js";

export function createLarkReplyDispatcher(opts: {
  cfg: MoltbotConfig;
  channelId: string;
}) {
  const core = getLarkRuntime();
  const { dispatcher, replyOptions, markDispatchIdle } = core.channel.reply.createReplyDispatcherWithTyping({
    deliver: async (payload: ReplyPayload) => {
      const text = payload.text;

      if (!text) {
        console.log(`[Lark Reply] Skipping empty message to channel ${opts.channelId}`);
        return;
      }

      console.log(`[Lark Reply] Sending message to channel ${opts.channelId}, text length: ${text.length}`);

      try {
        console.log(`[Lark Reply] Calling larkOutbound.sendText...`);
        const result = await larkOutbound.sendText({
          cfg: opts.cfg,
          to: opts.channelId,
          text,
        });
        console.log(`[Lark Reply] sendText completed, result:`, result);

        console.log(`[Lark Reply] Success: message_id=${result.id}`);
      } catch (err) {
        console.error(`[Lark Reply] Failed to send message:`, err);
        console.error(`[Lark Reply] Error details - type: ${typeof err}, String: "${String(err)}"`);
        // 确保始终抛出标准 Error 对象
        if (err instanceof Error) {
          console.error(`[Lark Reply] Standard Error - name: ${err.name}, message: ${err.message}`);
        }
        throw err;
      }
    },
    onError: (err: unknown, info: unknown) => {
      // @ts-ignore
      console.error(`[Lark Reply] Dispatch error for ${info.kind}:`, err);
    },
  });

  return {
    dispatcher,
    replyOptions,
    markDispatchIdle,
  };
}
