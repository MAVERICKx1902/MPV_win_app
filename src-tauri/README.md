# `src-tauri/` — Tauri 2.0 host (not wired up yet)

This folder is the **landing pad** for the native shell. It currently ships only
`tauri.conf.json` (the piece that matters for the frameless look) plus the notes
below; the Rust crate itself is intentionally **not** checked in, because it is
generated and version-pinned by the Tauri CLI:

```bash
npm run tauri init          # desktop crate (Windows)
npm run tauri android init  # Android project (requires the Android SDK/NDK + JDK 17)
```

`tauri init` will offer to use the existing `tauri.conf.json` — keep it, it
already encodes the frameless window (no decorations, transparent, Mica
backdrop, 22 px rounded corners drawn by CSS).

## How the UI maps onto the native side

| Web prototype (this repo)                    | Tauri 2.0 implementation                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| `.glass` window shell + CSS rounded corners  | `WebviewWindowBuilder::decorations(false)`, `transparent(true)`, `window-vibrancy::apply_mica` |
| Traffic lights (`TrafficLights.tsx`)         | `getCurrentWindow().close() / .minimize() / .toggleMaximize()`                 |
| Title bar drag area (`-webkit-app-region`)   | `data-tauri-drag-region` attribute                                             |
| `<video src="…">` with the placeholder MP4   | `mpv --wid=<hwnd>` driven over the JSON IPC socket (or libmpv)                 |
| `resolveMediaUrl()` (mock, `src/lib`)        | Rust command spawning `yt-dlp -J --no-warnings <url>`                          |
| `onEnded` → Auto-Next (`usePlayer`)          | Rust task listening for the mpv `end-file` event, then resolving the next item |
| `useDownloader()` mock worker                | `tauri-plugin-shell` spawning `yt-dlp`, stdout streamed to the UI via events   |
| Web Notifications (toasts)                   | `tauri-plugin-notification` for the "download complete" banner                 |

## Scripts

| command           | what it does                                              |
| ----------------- | --------------------------------------------------------- |
| `npm run dev:win` | `tauri dev` — desktop dev loop (Vite is spawned for you)   |
| `npm run build:win` | `tauri build` — MSI/NSIS installer                      |
| `npm run dev:apk` | `tauri android dev` — run on device/emulator               |
| `npm run build:apk` | `tauri android build` — signed APK/AAB                  |

> Windows builds need the WebView2 runtime (bootstrapper configured above) and
> the MSVC build tools; Android builds need `JAVA_HOME` → JDK 17, `ANDROID_HOME`
> and `NDK_HOME`.
