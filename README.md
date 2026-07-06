# X Following Exporter

Exports all accounts from an X/Twitter following list as `tracked.json`.

---

## Requirements

- [Node.js](https://nodejs.org) (LTS version)
- Google Chrome installed
- [Cookie-Editor](https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm) browser extension

---

## Setup

### 1. Configure

Copy `.env.example` to `.env` and fill in your settings:

```
X_USERNAME=yourUsername
CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
OUTPUT_FILE=tracked.json
```

All available options are documented in `.env.example`.

### 2. Export cookies

1. Open Chrome and **log in to x.com**
2. Click the Cookie-Editor icon in your toolbar
3. Click **Export** at the bottom -> **"Export as JSON"**
4. Paste the copied text into a text editor
5. Save as **`cookies.json`** in the same folder as `start.bat`

```
x-following-export/
  .env
  cookies.json    <-- here
  export.js
  start.bat
  ...
```

### 3. Run

Double-click **`start.bat`**

---

## How it works

1. Reads configuration from `.env`
2. Loads cookies from `cookies.json`
3. Opens Chrome and navigates to the following page
4. Automatically scrolls through the entire list
5. Saves the result as `tracked.json`

---

## Output

The `tracked.json` is directly compatible with the X Downloader:

```json
{
  "bookmarks": true,
  "accounts": [
    "username1",
    "username2"
  ]
}
```

Copy it to the X Downloader config folder:

```
/mnt/main/media/x-dl/config/tracked.json
```

---

## Options (.env)

| Variable         | Description                          | Default                                                       |
|------------------|--------------------------------------|---------------------------------------------------------------|
| X_USERNAME       | Your X username (without @)          | -                                                             |
| CHROME_PATH      | Path to chrome.exe                   | C:\Program Files\Google\Chrome\Application\chrome.exe         |
| OUTPUT_FILE      | Output file path                     | tracked.json                                                  |
| SCROLL_DELAY     | Delay between scrolls in ms          | 2000                                                          |
| STOP_AFTER_EMPTY | Empty rounds before stopping         | 8                                                             |

---

## Troubleshooting

**"cookies.json not found"**
Follow step 2 of the setup.

**"Not logged in / cookies expired"**
Cookies are valid for ~30 days. Export a fresh `cookies.json` from Chrome and replace the old one.

**"Chrome not found"**
Update `CHROME_PATH` in your `.env` file to point to your Chrome installation.

**"Node.js not found"**
Install Node.js from https://nodejs.org (LTS version).

**0 accounts found**
Make sure you were logged in to x.com when you exported the cookies.
Delete `cookies.json`, export a fresh one and try again.

---

## Note

`cookies.json` contains your login session. Do not share it with anyone.
