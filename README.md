# Nova Chat

A lightweight global chat running on a Cloudflare Worker and a Durable Object.

## Develop and verify

```sh
npm install
npm run dev
npm test
npx wrangler deploy --dry-run
```

The root and `global-chat/` entry points share `src/index.js` and `src/ui.js`.
Keep the existing migration configuration for the deployment you already use;
the root is configured for the original Durable Object class and the nested
project for its SQLite variant. No migration change is required by this update.

## Chat behavior

- First-time visitors must choose a nonblank name (up to 20 characters) before
  sending. It is remembered in local storage when available. The top-right
  Settings button changes the name for future messages.
- Seven accepted messages in a rolling four-second window trigger a five-second
  cooldown. The seventh is delivered; subsequent messages are rejected until
  the cooldown ends. Rejected attempts do not extend the timeout.
- The server enforces the limit, and the UI disables sending with a countdown.
  An HttpOnly browser cookie groups tabs and reconnects without penalizing
  everyone on a shared school IP. Changing names or refreshing does not reset
  the limit. Rate records survive Worker hibernation and are cleaned up by an alarm.
- This anonymous room has no authenticated accounts: clearing cookies or using
  another browser creates a new identity. This is a chat spam limit, not bot protection.
- Messages are limited to 2,000 characters and rendered as text. The live feed
  retains only the newest 150 messages per open tab and does not store history.

## Performance and accessibility

The liquid-glass appearance uses static gradients, translucent fills, bright
edges and inset highlights. No external fonts, UI framework, images, animated
backgrounds, SVG filters or per-message backdrop blurs are loaded. No continuous
animation runs; the short countdown timer runs only during a cooldown.

The layout adapts to mobile widths and dynamic viewport height. The name modal
traps focus, requires a name on first use, and supports Escape/cancel in settings.
Inputs and buttons are labeled, updates use live regions, and forced colors and
reduced transparency have fallbacks. Hardware-specific Chromebook performance
should still be checked on a target device.
