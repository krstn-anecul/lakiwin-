# LakiWin Gaming Photobooth

A branded LakiWin event photobooth that runs entirely in the browser.
Guests take 4 photos with a 3-2-1 countdown, pick a filter, customize a LakiWin photo strip, and download it as a PNG.

- No backend, no database, no API keys, no npm.
- Pure HTML, CSS and JavaScript.
- Works on GitHub Pages as a static site.

---

## What's inside

```
(your repository)
├── index.html              ← main page (entry point)
├── style.css               ← all styling
├── script.js               ← camera, filters, countdown, strip generator, download
├── logo-data.js            ← backup copy of the two logos (keeps the logo working if /assets goes missing)
├── README.md               ← this file
└── assets/
    ├── lakiwin-logo.png        ← official LakiWin logo (outlined version)
    └── lakiwin-logo-flat.png   ← official LakiWin logo (flat version, used on the white strip)
```

## Features

- **Flow:** Welcome → Camera → Countdown → Photo 1–4 → Review → Customize → Generate → Download → Start again
- **Camera:** live webcam preview (mirrored), photo counter, large Capture button. Press **Space** to start too.
- **Countdown:** 3, 2, 1, GO! before every photo, a flash, then a "PHOTO CAPTURED!" confirmation.
- **7 real filters** processed pixel-by-pixel on Canvas: Original, Bright, Warm, Cool, Grayscale, Gaming, High Contrast. The preview shows exactly what gets saved.
- **Strip colors:** Yellow, Black, White, each with its own LakiWin decoration set (crown, coins, 777 reel, clover, bell, stars, sparkles, marquee lights).
- **Custom text** (optional, up to 22 characters) and **optional badge** (GG, LEVEL UP, WINNER, +XP).
- **Automatic date** in the footer with a calendar icon. It's never hard-coded.
- **Download** a full-resolution PNG (1200 px wide) named like `lakiwin-photobooth-2026-10-02.png`.
- **Camera cleanup:** the webcam turns off as soon as the 4th photo is taken, when you leave the camera screen, or when the page closes. It opens again for the next session.
- Responsive for laptop, desktop, tablet and phone. Keyboard and screen-reader friendly, and it respects "reduce motion" settings.

---

## Step-by-step setup (beginner friendly)

### 1. Create the folder

On your computer, create a new folder named:

```
lakiwin-photobooth
```

Inside it, create another folder named:

```
assets
```

### 2. Put the files inside

Put these five files directly inside `lakiwin-photobooth`:

- `index.html`
- `style.css`
- `script.js`
- `logo-data.js`
- `README.md`

> Tip: Make sure your computer did not secretly rename a file to something like `index.html.txt`.
> On Windows, turn on **View → File name extensions** in File Explorer to check.

### 3. Put the LakiWin logo inside /assets/

Put these files inside the `assets` folder:

- `lakiwin-logo.png`
- `lakiwin-logo-flat.png`

The folder should now look exactly like the tree in **What's inside** above.

> If you ever replace the logo PNGs with a new version, also delete `logo-data.js` and the
> `<script src="logo-data.js"></script>` line in `index.html` (otherwise the old backup copy may
> be used). After that, test with a local server (step 4, option B) instead of double-clicking.

### 4. Test it locally

**Option A: Double-click (quickest)**

1. Double-click `index.html`. It opens in your browser.
2. Click **START PHOTOBOOTH** and allow camera access when the browser asks.
3. Take your 4 photos, customize the strip, and click **DOWNLOAD PHOTO**.

Use **Google Chrome** or **Microsoft Edge** for this option.

**Option B: Local server (most reliable, works in every browser)**

If you use **VS Code**:
1. Install the **Live Server** extension.
2. Right-click `index.html` → **Open with Live Server**.

If you have **Python** installed, open a terminal in the `lakiwin-photobooth` folder and run:

```
python -m http.server 8000
```

Then open **http://localhost:8000** in your browser.

> Browsers only allow the camera on `https://` sites, on `http://localhost`, or from a file
> you opened directly. A normal `http://` address on your network will not get camera access.

### 5. Upload the complete folder to GitHub

1. Go to **https://github.com** and sign in (or create a free account).
2. Click the **+** in the top-right corner → **New repository**.
3. Repository name: `lakiwin-photobooth`. Set it to **Public**. Click **Create repository**.
4. On the new repository page, click the link **uploading an existing file**.
5. Open your `lakiwin-photobooth` folder on your computer, select **everything inside it**
   (`index.html`, `style.css`, `script.js`, `logo-data.js`, `README.md` and the `assets` folder), and drag it all into the GitHub page.
   - Drag the files that are *inside* the folder, not the outer folder itself. `index.html` must end up at the top level of the repository.
6. Wait for all files to upload, then click **Commit changes**.
7. Check the repository: you should see `index.html` at the top level and an `assets` folder containing the logo files.

### 6. Enable GitHub Pages

1. In your repository, click **Settings** (top menu).
2. In the left sidebar, click **Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Under **Branch**, choose **main** and folder **/ (root)**. Click **Save**.
5. Wait 1–2 minutes and refresh the page. A link appears at the top, for example:

```
https://YOUR-USERNAME.github.io/lakiwin-photobooth/
```

6. Open that link, allow camera access, and run the photobooth.

GitHub Pages uses `https://`, so the camera works there on laptops, tablets and phones.

---

## Running it at an event

- Use the laptop in full screen: press **F11** (Windows) or **Ctrl + Cmd + F** (Mac).
- Chrome or Edge gives the smoothest camera preview.
- Good, even light on faces makes a big difference to the photos.
- After someone downloads their strip, press **TAKE ANOTHER**. The next guest starts with a fresh session.
- Click the LakiWin logo in the top bar any time to go back to the welcome screen.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| "Camera access is blocked" | Click the camera icon in the address bar, choose **Allow**, then press **Try again**. |
| "Camera is busy" | Close Zoom, Teams, OBS or any other app using the camera, then press **Try again**. |
| "Camera not available here" | Open the site with `https://` (GitHub Pages) or `http://localhost`. |
| Logo doesn't appear | Check that the files are named exactly `lakiwin-logo.png` and `lakiwin-logo-flat.png` and are inside `assets`. File names are case-sensitive on GitHub. |
| GitHub Pages shows a 404 | Make sure `index.html` is at the top level of the repository (not inside another folder), and wait a couple of minutes after saving. |
| Fonts look plain | The display fonts (Bungee and Rubik) load from Google Fonts, so they need an internet connection. Offline, the site falls back to system fonts and still works. |

## Privacy

Photos never leave the device. Everything — capture, filters, strip design and PNG creation — happens locally in the browser. Nothing is uploaded or stored.
