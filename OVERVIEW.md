# Chatting

Chatting is a messaging product for friends, groups, teams and communities. The site has three parts:

- **Landing page** (`/`) — a polished, Apple-style public page. Its main button reads "Get Chatting" for visitors and "Open Chatting" for people who are already signed in.
- **The chat app** (`/app`) — behind email sign-in. It has direct messages and custom groups (with a name, emoji, description, admins and member management), threaded replies, communities with channels (public ones can be found in Discover, private ones are joined by invite link), reactions, message editing and deleting, photos and files, pin and mute, presence, read receipts, search, and a full profile and privacy settings page.
- **Legal pages** (`/privacy`, `/terms`) — written to match the data the app actually stores.

## Live delivery & communities (latest)
- Messages, reactions, read receipts and "typing…" arrive live: the app keeps a waiting connection open that answers the moment anything changes.
- Communities are deeply customisable from their settings page (`/app/community/:id`): icon, banner, accent colour, tagline, tags, custom invite link, quick reactions, categories and channel order, channel emoji/topic/slow mode/announcement/private-to-roles, custom roles with colours and 9 permissions, nicknames, join modes (open / approval / invite-only) with requests, kick/ban/unban, blocked words, link blocking, max message length, welcome messages, rules members must accept, ownership transfer and an audit log.

Recent additions: voice messages, GIFs, link previews, polls, send-later scheduling, disappearing messages, blocking, auto-clearing status, drafts synced across devices, mark-as-unread / jump-to-unread, chat export, more keyboard shortcuts, and community timeouts, events with RSVPs and an insights dashboard. Removed or banned members are ejected from the community in real time.

Latest round: a custom waveform voice-note player; personal appearance settings (accent colour, text size, compact mode, wallpapers, reduced motion), sound choices, Do Not Disturb and quiet hours; richer formatting (code blocks, spoilers, strikethrough, quotes, big emoji), stickers, slash commands with confetti, emoji shortcodes, @here, translate, copy message link; chat folders, sorting, per-chat colours, private renames and notes; profile banners, local time and things-in-common; community welcome screens, leaderboard with levels, activity-by-hour, event countdowns and calendar export; and moderation tools — message reports with a review queue, warnings, mod notes and spam protection.

## Customise everything (latest)
- Communities get a **Customise** settings tab: font, bubble style, wallpaper, accent-coloured UI, banner strip, announcement bar, custom placeholder/empty text/member name, guidelines link, on/off switches for GIFs, uploads, polls, reactions, threads and edits, extra auto-mod rules (min length, caps, mentions, emoji) and auto-responders.
- Personal settings add fonts (incl. easy-read), any accent colour, square bubbles, high contrast, 24h clock, hidden avatars, link-preview/blur/spell-check/character-counter toggles, sidebar previews, private notifications and new wallpapers.
- New slash commands, shortcodes, sticker packs, ==highlight== and __underline__, a getting-started checklist, a "Make it yours" landing section and a branded sign-in screen (Zite still handles the secure email link).

- **Official accounts** — verified Chatting (welcome DM + product updates, read-only) and Chatting Support (in-app support chat that opens on request and disappears when the ticket is closed).

## Support panel (/support)
The former ChattingModPanel app now lives inside this app at /support. It is staff-only: people must sign in and their email must be listed in the ZITE_SUPPORT_STAFF_EMAILS secret. Staff handle support tickets, user reports, user moderation, communities, announcements and saved replies there.
