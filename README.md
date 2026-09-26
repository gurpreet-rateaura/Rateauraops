# RateAura OPS — Version 1

A lightweight, password-protected web application to manage **Operations, Profit, and Disputes**, backed by **Google Sheets** and hosted on **GitHub Pages**.

---

## What You Get

- **Original Entry** creation with all booking details
- **Revised Entry** with automatic Profit/Loss calculation
- **Masters** for Agents, Suppliers, Nature of Profit, and Final Conclusion
- **Dashboard** with stats, monthly chart, and condition breakdown
- **Full CRUD** — Create, Edit, Delete entries with real-time Google Sheet sync
- **Search & Filter** by Reference No., Agent Ref, Supplier Conf., Agent, Supplier, Status
- **Password protection** (changeable in the Apps Script)

---

## Architecture

```
GitHub Pages (Frontend HTML/JS/CSS)
         │
         ▼ POST/GET
Google Apps Script Web App
         │
         ▼ Read/Write
Google Sheets (Entries + Masters)
         │
         ▼ Connect
Power BI (for advanced analytics)
```

---

## Step-by-Step Setup Instructions

### 1. Create the Google Sheet

1. Go to [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
2. Name it **"RateAura OPS"**.
3. Create the following **sheet tabs** (exact names are required):
   - `Entries`
   - `Agents`
   - `Suppliers`
   - `NatureOfProfit`
   - `FinalConclusion`

> The script will auto-create headers on first use, but creating the tabs manually ensures everything is ready.

---

### 2. Add the Apps Script Backend

1. Inside your Google Sheet, click **Extensions → Apps Script**.
2. Delete any code in the default `Code.gs` file.
3. Copy the entire contents of **`apps-script/Code.gs`** from this repo and paste it into the Apps Script editor.
4. **Change the password** (optional but recommended):
   - Find the line `const APP_PASSWORD = 'rateaura123';` near the top.
   - Replace `rateaura123` with your own secure password.
5. Click **Save** (disk icon) and name the project **"RateAura OPS Backend"**.

---

### 3. Deploy the Web App

1. In the Apps Script editor, click **Deploy → New deployment**.
2. Click the gear icon ⚙️ next to **Type** and choose **Web app**.
3. Set the following:
   - **Description**: `RateAura OPS v1`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
4. Click **Deploy**.
5. You will be asked to authorize the script. Click through the permissions (click **Advanced → Go to … (unsafe)** if you see a warning, since this is your own script).
6. After deployment, copy the **Web App URL** (it looks like `https://script.google.com/macros/s/XXXXXXXX/exec`).

---

### 4. Connect the Frontend to the Backend

1. Open **`assets/config.js`** in this repo.
2. Replace `YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE` with the Web App URL you copied above.
   ```js
   const SCRIPT_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
   ```
3. Save the file.

---

### 5. Host on GitHub Pages

#### A. Create a GitHub Repository
1. Go to [GitHub](https://github.com) and create a **new public repository**.
2. Name it `rateaura-ops` (or any name you prefer).
3. Do **not** initialize with a README (we already have one).

#### B. Upload the Files
You can upload via the GitHub website or use Git commands:

**Option 1 — GitHub Web UI (easiest)**
1. Open your new repo on GitHub.
2. Click **"uploading an existing file"**.
3. Drag and drop all files from this folder:
   - `index.html`
   - `assets/` (folder with `style.css`, `app.js`, `config.js`, `logo.png`)
   - `apps-script/Code.gs` (optional, for reference)
   - `README.md`
4. Commit the changes.

**Option 2 — Git Command Line**
```bash
cd RateAura-OPS
git init
git add .
git commit -m "Initial commit - RateAura OPS v1"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/rateaura-ops.git
git push -u origin main
```

#### C. Enable GitHub Pages
1. In your GitHub repo, go to **Settings → Pages** (left sidebar).
2. Under **Source**, select **Deploy from a branch**.
3. Choose the **`main`** branch and **`/(root)`** folder.
4. Click **Save**.
5. After ~1 minute, GitHub will show you a live URL like:
   ```
   https://YOUR_USERNAME.github.io/rateaura-ops/
   ```

---

### 6. Use the System

1. Open your GitHub Pages URL in any browser.
2. Enter the password you set in the Apps Script.
3. Start using the app!

---

## How Profit / Loss is Calculated

| Condition | Formula | Example |
|-----------|---------|---------|
| **Agent Profit** | Original Selling − New Selling | 350 − 0 = **350 Profit** |
| **Supplier Profit** | Original Buying − New Buying | 20 − 10 = **10 Profit** |
| **Agent Loss** | Original Selling − New Selling | 350 − 0 = **350 Loss** |
| **Supplier Loss** | Original Buying − New Buying | 20 − 10 = **10 Loss** |

The system stores the **difference amount** and marks the type as **Profit** or **Loss**. The entry status changes to **Closed** after revision.

---

## Google Sheet Structure

### Entries Sheet Columns

| Column | Field |
|--------|-------|
| A | EntryID |
| B | Rateaura |
| C | ReferenceNo |
| D | AgentName |
| E | SupplierName |
| F | SupplierConfirmationNo |
| G | AgentReferenceNo |
| H | ServiceName |
| I | CheckIn |
| J | CheckOut |
| K | BuyingAmount |
| L | SellingAmount |
| M | Status |
| N | NewBuyingAmount |
| O | NewSellingAmount |
| P | CalcCondition |
| Q | NatureOfProfit |
| R | Remarks |
| S | FinalConclusion |
| T | ProfitLossAmount |
| U | ProfitLossType |
| V | CreatedAt |
| W | UpdatedAt |

### Master Sheets
Each master sheet (`Agents`, `Suppliers`, `NatureOfProfit`, `FinalConclusion`) has a single column header `Name`.

---

## Connecting to Power BI

1. Open **Power BI Desktop**.
2. Click **Get Data → More → Google Sheets**.
3. Sign in to your Google account and select the **"RateAura OPS"** spreadsheet.
4. Import the `Entries` sheet.
5. Build your reports using the fields: `ProfitLossAmount`, `ProfitLossType`, `Status`, `AgentName`, `SupplierName`, etc.

> Because the frontend writes directly to the sheet, Power BI will always reflect the latest data on next refresh.

---

## Important Notes

- **No duplicate entries**: Each entry has a unique `EntryID`. Edits update the same row; deletes remove the row entirely.
- **Synchronization**: The app always reads fresh data from the sheet on load and after every action. There is no local database that can go out of sync.
- **Security**: The password is stored in the Apps Script (server-side). The frontend only keeps it in browser memory/localStorage for convenience. For stronger security, restrict the Web App access to specific users instead of "Anyone" (this requires users to sign in with Google).
- **Backups**: Since all data lives in Google Sheets, Google automatically versions your spreadsheet. You can also use **File → Version history** in Sheets to restore older data.

---

## Support

If you need to reset the password, simply open the Apps Script editor, change `APP_PASSWORD`, and click **Deploy → Manage deployments → Edit → New version**.

---

**Built for RateAura — Version 1**
