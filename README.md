# Nova Chat

A lightweight global chat running on a Cloudflare Worker and a Durable Object.

## Develop and verify

```sh
npm install
npm run dev
npm test
npx wrangler deploy --dry-run
```

Optional browser integration checks require Playwright (`npm install --no-save
playwright` and `npx playwright install chromium`). With the local server running,
run `node test/browser.cjs`. Set `NOVA_BASE_URL` to change the localhost port,
`NOVA_BROWSER_CHANNEL=chrome` to use installed Chrome, or `NOVA_SCREENSHOT_DIR`
to save previews. The test refuses non-local servers.

The root and `global-chat/` entry points share `src/index.js` and `src/ui.js`.
Keep the existing migration configuration for the deployment you already use;
the root is configured for the original Durable Object class and the nested
project for its SQLite variant. No migration change is required by this update.

## Chat behavior

- First-time visitors must choose a nonblank name (up to 20 characters) before
  sending. It is remembered in local storage when available. The top-right
  Settings button changes the name for future messages.
- The app fills the entire viewport on desktop, tablet, and mobile with no outer
  rounded frame, margin, maximum width, or decorative page background.
- Open **People & messages** or click someone's name on a message to start a DM.
  DMs have their own conversations, drafts, and unread indicators. Choose
  **Global lounge** to return to the public room. Recent DMs also appear in the
  desktop sidebar. Offline recipients cannot receive new messages; their drafts
  remain available when they reconnect.
- DMs are routed only to the two participants' connected tabs, never broadcast
  to the room. Server-issued public routing IDs are derived separately from the
  HttpOnly identity cookie; public IDs cannot be used as identity cookies. Names
  are labels, not recipient identifiers, so duplicate names and name changes
  do not reroute a conversation. Short IDs help distinguish matching names.
- Seven accepted messages in a rolling four-second window trigger a five-second
  cooldown. The seventh is delivered; subsequent messages are rejected until
  the cooldown ends. Public messages and DMs share this limit; switching
  conversations cannot reset it. Rejected attempts do not extend the timeout.
- The server enforces the limit, and the UI disables sending with a countdown.
  An HttpOnly browser cookie groups tabs and reconnects without penalizing
  everyone on a shared school IP. Changing names or refreshing does not reset
  the limit. Rate records survive Worker hibernation and are cleaned up by an alarm.
- This anonymous room has no authenticated accounts: clearing cookies or using
  another browser creates a new identity. This is a chat spam limit, not bot protection.
- Messages are limited to 2,000 characters and rendered as text. The live feed
  retains only the newest 150 messages total across all conversations per tab.
  Messages and drafts are kept in memory, not stored on the server or browser
  disk; refreshing clears them. DMs are not end-to-end encrypted and there is
  no offline delivery or authenticated account system.

## DM notifications

- New incoming DMs show a clickable message preview, an unread badge, and an
  unread count in the tab title. An active conversation is marked read only
  while the chat is visible and focused. Your own messages and public messages
  do not produce DM alerts.
- Choose **Enable notifications** for optional system notifications on supported
  desktop browsers. Permission is requested only after that click. In-app
  alerts continue working when permission is denied or the API is unavailable.
- The Nova desktop embeds chat with `?novaEmbed=1` and attaches a private
  `MessageChannel` directly to its iframe at the expected chat origin. DM previews
  are never posted to a wildcard origin. The desktop displays its own alert and
  unread badge, and opens the matching conversation when clicked.
- Open Nova Chat once from the desktop and choose your name to connect. Closing
  its window minimizes it so it can still receive DMs while you play. The desktop
  owns system alerts for this embedded connection to avoid duplicate alerts.
- These are live notifications while the page is connected, not offline Web
  Push. Closing the browser or reloading clears the existing in-memory messages.
  Browser permissions cannot be requested inside the cross-origin cloak; in-app
  alerts work there. Use a direct HTTPS tab for system notifications.

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
