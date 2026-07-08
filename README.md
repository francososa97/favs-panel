# Favs Panel

A bookmarks manager for Chrome with an iOS/iCloud-inspired design: it replaces the native popup with a full panel — bookmarks grouped by folder, instant search, and every detail at a glance.

![Favs Panel](docs/screenshot.png)

## ✨ Features

- **Sectioned by folder** — bookmarks are automatically grouped by folder (and subfolder), not one endless flat list.
- **List and grid view** — switch to a grid of large, clickable icon cards, launcher-style.
- **Folder tree** in the sidebar, with a bookmark count per folder.
- **Instant search** by title or URL (shortcut: `/`).
- **Sort** by date, alphabetically, or by domain.
- **Create bookmarks** directly from the panel — title, URL, and target folder.
- **Compact view** to fit more bookmarks on screen.
- **Quick actions**: open, copy URL, or delete without leaving the panel.
- **Light and dark mode**, following your system preference or a manual toggle.
- **English and Spanish**, switchable anytime (English by default).
- **iOS/iCloud-style design** — system typography, frosted glass, grouped lists, and a blue accent.
- 100% local: uses the `chrome.bookmarks` API, no data is ever sent anywhere.

## 🚀 Installation

Not yet published on the Chrome Web Store. To try it:

1. Clone this repo or download it as a ZIP.
2. Open `chrome://extensions` in Chrome (or any Chromium-based browser).
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select this folder.
5. Open the panel from the extension icon or the `Alt+B` shortcut.

## 🛠️ Stack

Vanilla JS + HTML + CSS, no frameworks, no build step. Manifest V3.

## 📄 Permissions

- `bookmarks` — read and manage your bookmarks.
- `favicon` — display each site's icon.

No data ever leaves your browser.

## ☕ Support

If this is useful to you, you can [buy me a coffee](https://cafecito.app/francososa13).
