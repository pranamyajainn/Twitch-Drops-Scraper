# 🎮 Twitch Drops Scraper - Complete Setup Guide

## Overview
This system automatically scrapes Twitch Drops campaigns every hour and stores the data in Google Sheets. Perfect for tracking drops across multiple games!

---

## 📋 What You'll Need
- Google Account
- Chrome Browser
- Twitch Account (logged in)

---

## 🚀 Part 1: Google Apps Script Setup (Backend)

### Step 1: Create Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it **"Twitch Drops Tracker"**

### Step 2: Open Apps Script Editor
1. In your Google Sheet, click **Extensions** → **Apps Script**
2. Delete any existing code in the editor
3. Copy and paste the **entire Google Apps Script code** (provided separately)
4. Click the **Save** icon (💾) and name it "Twitch Drops Backend"

### Step 3: Deploy as Web App
1. Click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ → Select **Web app**
3. Fill in the details:
   - **Description:** "Twitch Drops API"
   - **Execute as:** Me (your email)
   - **Who has access:** Anyone
4. Click **Deploy**
5. **IMPORTANT:** Copy the **Web app URL** (it looks like: `https://script.google.com/macros/s/...`)
6. You'll need this URL for the Chrome extension!

### Step 4: Setup Menu & Triggers
1. Go back to your Google Sheet
2. Refresh the page (F5)
3. You should see a new menu: **🎮 Twitch Drops**
4. Click **🎮 Twitch Drops** → **Setup Alert Email**
5. Enter your email for notifications
6. Click **🎮 Twitch Drops** → **Setup Triggers**
7. Authorize the script when prompted

✅ **Backend is now ready!**

---

## 🔌 Part 2: Chrome Extension Setup (Frontend)

### Step 1: Download Extension Files
You'll need these 6 files in a folder:
- `manifest.json`
- `background.js`
- `content.js`
- `popup.html`
- `popup.js`
- Icons (create or download simple icons)

### Step 2: Create Icons (Simple Method)
Create 3 simple icon images or use placeholders:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

**Quick tip:** You can use any Twitch/gaming related icon or just use colored squares for testing.

### Step 3: Load Extension in Chrome
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the folder containing your extension files
6. The extension should now appear in your extensions list!

### Step 4: Configure Extension
1. Click the **puzzle piece icon** 🧩 in Chrome toolbar
2. Find **Twitch Drops Scraper** and pin it
3. Click the extension icon
4. Paste your **Google Apps Script Web App URL** (from Part 1, Step 3)
5. Set scrape interval (default: 60 minutes)
6. Click **Save Configuration**

✅ **Extension is now configured!**

---

## 🎯 Part 3: First Test Run

### Test the System
1. Make sure you're **logged into Twitch** in Chrome
2. Click the extension icon
3. Click **Open Twitch Drops** button
4. The Twitch Drops page will open
5. Click **Scrape Now** in the extension popup
6. Wait 20-30 seconds
7. Check your Google Sheet - you should see data appearing!

### What You Should See in Google Sheet:
- **Campaigns sheet:** All scraped campaign data
- **ActivityLog sheet:** Logs of all scraping activities

---

## ⚙️ Part 4: Automation Setup

### The extension will now automatically:
- ✅ Scrape Twitch Drops every 60 minutes (or your custom interval)
- ✅ Send data to Google Sheets
- ✅ Monitor for stale data
- ✅ Send email alerts if scraping fails

### Google Apps Script will automatically:
- ✅ Check data freshness every 2 hours
- ✅ Send daily reports at 9 AM
- ✅ Clean up old data (>30 days) weekly

---

## 📊 Using Your Data

### View Stats
In your Google Sheet, click:
**🎮 Twitch Drops** → **📊 View Stats**

### Export Data
**🎮 Twitch Drops** → **📤 Export to JSON**

### Access via API
Get data programmatically:
```
GET: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=getCampaigns&limit=50
GET: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=getStats
GET: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=health
```

---

## 🐛 Troubleshooting

### Extension not scraping?
1. Make sure you're logged into Twitch
2. Check if the Apps Script URL is correct in extension settings
3. Open `chrome://extensions/` and check for errors

### No data in Google Sheets?
1. Check the ActivityLog sheet for errors
2. Verify the Web App is deployed as "Anyone can access"
3. Try manually clicking "Scrape Now" in extension

### Alerts not working?
1. Make sure you set up alert email: **🎮 Twitch Drops** → **📧 Setup Alert Email**
2. Check Gmail spam folder

---

## 💡 Pro Tips

1. **Pin the extension** to your toolbar for quick access
2. **Set up email filters** for Twitch Drops alerts
3. **Share the Google Sheet** with your team (view-only)
4. **Create charts** in Google Sheets to visualize drop trends
5. **Adjust scrape interval** based on your needs (minimum 15 minutes recommended)

---

## 🎨 Customization Ideas

### For Google Sheets:
- Add conditional formatting for active/ended campaigns
- Create pivot tables to analyze games
- Set up charts for drop tracking

### For Chrome Extension:
- Modify the scrape interval
- Add custom filters for specific games
- Export data directly from extension

---

## 📞 Need Help?

If you encounter issues:
1. Check the **ActivityLog** sheet in Google Sheets
2. Check Chrome extension errors in `chrome://extensions/`
3. Verify you're logged into Twitch
4. Make sure the Apps Script URL is correct

---

## 🎉 Success Checklist

- [ ] Google Sheet created
- [ ] Apps Script deployed as Web App
- [ ] Web App URL copied
- [ ] Chrome Extension loaded
- [ ] Extension configured with Apps Script URL
- [ ] First successful scrape completed
- [ ] Data visible in Google Sheet
- [ ] Alert email configured
- [ ] Triggers set up
- [ ] Extension pinned to toolbar

**You're all set! The system will now automatically track Twitch Drops for you! 🚀**

---

*Built with ❤️ for the Twitch community*
