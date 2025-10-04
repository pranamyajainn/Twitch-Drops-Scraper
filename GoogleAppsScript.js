// Google Apps Script - Complete Backend System
// Deploy this as a Web App (Deploy > New deployment > Web app)
// Set "Execute as" to "Me" and "Who has access" to "Anyone"

// ============================================
// MAIN ENDPOINTS
// ============================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Store the campaigns
    const result = storeCampaigns(data.campaigns || []);
    
    // Log the activity
    logActivity('POST', 'Received campaigns', data.campaigns?.length || 0);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Data stored successfully',
      campaignsProcessed: result.count,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logActivity('ERROR', error.toString(), 0);

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getHealthCheck() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const campaignsSheet = ss.getSheetByName('Campaigns');
  
  let lastScrapeTime = null;
  let hoursSinceLastScrape = null;
  
  if (campaignsSheet && campaignsSheet.getLastRow() > 1) {
    const lastRow = campaignsSheet.getLastRow();
    lastScrapeTime = campaignsSheet.getRange(lastRow, 1).getValue();
    
    const now = new Date();
    const diff = now - new Date(lastScrapeTime);
    hoursSinceLastScrape = (diff / (1000 * 60 * 60)).toFixed(2);
  }
  
  const isHealthy = hoursSinceLastScrape === null || hoursSinceLastScrape < 2;
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    healthy: isHealthy,
    lastScrape: lastScrapeTime,
    hoursSinceLastScrape: hoursSinceLastScrape,
    message: isHealthy ? 'System is healthy' : 'Warning: No recent scrapes'
  })).setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// LOGGING & MONITORING
// ============================================

function logActivity(type, message, count) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('ActivityLog');
    
    if (!sheet) {
      sheet = ss.insertSheet('ActivityLog');
      sheet.appendRow(['Timestamp', 'Type', 'Message', 'Count']);
      sheet.getRange('A1:D1').setFontWeight('bold').setBackground('#34a853').setFontColor('white');
      sheet.setFrozenRows(1);
    }
    
    sheet.appendRow([
      new Date(),
      type,
      message,
      count
    ]);
    
    // Keep only last 1000 entries
    if (sheet.getLastRow() > 1001) {
      sheet.deleteRows(2, sheet.getLastRow() - 1001);
    }
    
  } catch (err) {
    Logger.log('Error logging activity: ' + err);
  }
}

// ============================================
// AUTOMATED MONITORING & ALERTS
// ============================================

function checkDataFreshness() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Campaigns');
  
  if (!sheet || sheet.getLastRow() < 2) {
    sendAlert('No Data', 'The Campaigns sheet is empty. Please check the scraper.');
    return;
  }
  
  const lastRow = sheet.getLastRow();
  const lastTimestamp = sheet.getRange(lastRow, 1).getValue();
  const now = new Date();
  const hoursSinceUpdate = (now - new Date(lastTimestamp)) / (1000 * 60 * 60);
  
  if (hoursSinceUpdate > 2) {
    sendAlert(
      'Stale Data Warning',
      `Data hasn't been updated in ${hoursSinceUpdate.toFixed(1)} hours. Last update: ${lastTimestamp}`
    );
  }
  
  logActivity('MONITOR', 'Data freshness check completed', hoursSinceUpdate);
}

function sendAlert(subject, message) {
  try {
    // Get email from script properties (set this up first)
    const props = PropertiesService.getScriptProperties();
    const alertEmail = props.getProperty('ALERT_EMAIL');
    
    if (!alertEmail) {
      Logger.log('No alert email configured. Set ALERT_EMAIL in Script Properties.');
      return;
    }
    
    MailApp.sendEmail({
      to: alertEmail,
      subject: `Twitch Drops Scraper: ${subject}`,
      body: `${message}\n\nTimestamp: ${new Date()}\n\nCheck your spreadsheet: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}`
    });
    
    logActivity('ALERT', subject, 0);
    
  } catch (err) {
    Logger.log('Error sending alert: ' + err);
  }
}

// ============================================
// DATA ANALYSIS & REPORTING
// ============================================

function generateDailyReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Campaigns');
  
  if (!sheet || sheet.getLastRow() < 2) {
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Filter campaigns from last 24 hours
  const recentCampaigns = data.slice(1).filter(row => {
    const timestamp = new Date(row[0]);
    return timestamp > yesterday;
  });
  
  const uniqueGames = [...new Set(recentCampaigns.map(row => row[3]))];
  const activeCampaigns = recentCampaigns.filter(row => row[5] === 'Active' || row[5] === 'ACTIVE');
  
  const report = `
Daily Twitch Drops Report
========================

Date: ${new Date().toLocaleDateString()}

Summary:
- Total scrapes in last 24h: ${recentCampaigns.length}
- Unique games: ${uniqueGames.length}
- Active campaigns: ${activeCampaigns.length}

Top Games:
${uniqueGames.slice(0, 5).join('\n')}

View full data: ${ss.getUrl()}
  `;
  
  // Send report email
  const props = PropertiesService.getScriptProperties();
  const alertEmail = props.getProperty('ALERT_EMAIL');
  
  if (alertEmail) {
    MailApp.sendEmail({
      to: alertEmail,
      subject: 'Twitch Drops - Daily Report',
      body: report
    });
  }
  
  logActivity('REPORT', 'Daily report generated', recentCampaigns.length);
}

// ============================================
// UTILITIES & CLEANUP
// ============================================

function cleanupOldData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Campaigns');
  
  if (!sheet || sheet.getLastRow() < 2) return;
  
  const data = sheet.getDataRange().getValues();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  let rowsDeleted = 0;
  
  // Delete rows older than 30 days (working backwards to avoid index issues)
  for (let i = sheet.getLastRow(); i >= 2; i--) {
    const timestamp = sheet.getRange(i, 1).getValue();
    if (new Date(timestamp) < thirtyDaysAgo) {
      sheet.deleteRow(i);
      rowsDeleted++;
    }
  }
  
  logActivity('CLEANUP', 'Old data removed', rowsDeleted);
  
  return rowsDeleted;
}

function exportToJSON() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Campaigns');
  
  if (!sheet || sheet.getLastRow() < 2) {
    return JSON.stringify({ campaigns: [] });
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const campaigns = rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
  
  return JSON.stringify({ campaigns: campaigns }, null, 2);
}

// ============================================
// SETUP FUNCTIONS
// ============================================

function setupTriggers() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Create new triggers
  
  // Check data freshness every 2 hours
  ScriptApp.newTrigger('checkDataFreshness')
    .timeBased()
    .everyHours(2)
    .create();
  
  // Generate daily report at 9 AM
  ScriptApp.newTrigger('generateDailyReport')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();
  
  // Cleanup old data weekly
  ScriptApp.newTrigger('cleanupOldData')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(2)
    .create();
  
  Logger.log('Triggers created successfully');
  logActivity('SETUP', 'Triggers configured', 3);
}

function setupScriptProperties() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('Setup Alert Email', 'Enter email for alerts:', ui.ButtonSet.OK_CANCEL);
  
  if (response.getSelectedButton() == ui.Button.OK) {
    const email = response.getResponseText();
    PropertiesService.getScriptProperties().setProperty('ALERT_EMAIL', email);
    ui.alert('Success', `Alert email set to: ${email}`, ui.ButtonSet.OK);
    logActivity('SETUP', 'Alert email configured', 0);
  }
}

// ============================================
// MENU FUNCTIONS
// ============================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎮 Twitch Drops')
    .addItem('📊 View Stats', 'showStats')
    .addItem('🔄 Check Data Freshness', 'checkDataFreshness')
    .addItem('📧 Setup Alert Email', 'setupScriptProperties')
    .addItem('⚙️ Setup Triggers', 'setupTriggers')
    .addSeparator()
    .addItem('🧹 Cleanup Old Data', 'cleanupOldData')
    .addItem('📤 Export to JSON', 'exportToJSONMenu')
    .addToUi();
}

function showStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Campaigns');
  
  if (!sheet || sheet.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert('No data available yet.');
    return;
  }
  
  const totalCampaigns = sheet.getLastRow() - 1;
  const lastUpdate = sheet.getRange(sheet.getLastRow(), 1).getValue();
  
  const data = sheet.getDataRange().getValues();
  const uniqueGames = [...new Set(data.slice(1).map(row => row[3]))];
  
  const message = `
📊 Statistics:
━━━━━━━━━━━━━━━━
Total Campaigns: ${totalCampaigns}
Unique Games: ${uniqueGames.length}
Last Update: ${lastUpdate}

Spreadsheet: ${ss.getUrl()}
  `;
  
  SpreadsheetApp.getUi().alert('Twitch Drops Stats', message, SpreadsheetApp.getUi().ButtonSet.OK);
}

function exportToJSONMenu() {
  const json = exportToJSON();
  const ui = SpreadsheetApp.getUi();
  
  // Create a temporary sheet with JSON
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let jsonSheet = ss.getSheetByName('JSON_Export');
  
  if (jsonSheet) {
    ss.deleteSheet(jsonSheet);
  }
  
  jsonSheet = ss.insertSheet('JSON_Export');
  jsonSheet.getRange('A1').setValue(json);
  
  ui.alert('Export Complete', 'JSON data has been exported to the "JSON_Export" sheet. You can copy it from there.', ui.ButtonSet.OK);
}

function doGet(e) {
  try {
    const action = e.parameter.action || 'getCampaigns';
    
    switch(action) {
      case 'getCampaigns':
        return getCampaignsAPI(e.parameter.limit);
      case 'getStats':
        return getStatsAPI();
      case 'health':
        return getHealthCheck();
      default:
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Unknown action'
        })).setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// DATA STORAGE FUNCTIONS
// ============================================

function storeCampaigns(campaigns) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Campaigns');
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet('Campaigns');
    sheet.appendRow([
      'Timestamp',
      'Campaign ID',
      'Name',
      'Game',
      'End Date',
      'Status',
      'Description',
      'Image URL',
      'Drops Count',
      'Drops Details',
      'Scraped At'
    ]);
    sheet.getRange('A1:K1').setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
    sheet.setFrozenRows(1);
  }
  
  let count = 0;
  
  campaigns.forEach(campaign => {
    try {
      sheet.appendRow([
        new Date(),
        campaign.id || '',
        campaign.name || '',
        campaign.game || '',
        campaign.endDate || '',
        campaign.status || '',
        campaign.description || '',
        campaign.imageUrl || '',
        campaign.drops?.length || 0,
        JSON.stringify(campaign.drops || []),
        campaign.scrapedAt || new Date().toISOString()
      ]);
      count++;
    } catch (err) {
      Logger.log('Error storing campaign: ' + err);
    }
  });
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, 11);
  
  return { count };
}

// ============================================
// API FUNCTIONS
// ============================================

function getCampaignsAPI(limit) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Campaigns');
  
  if (!sheet || sheet.getLastRow() < 2) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      campaigns: [],
      message: 'No campaigns found'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  // Get latest entries (limit to specified number or 50 by default)
  const limitNum = parseInt(limit) || 50;
  const latestRows = rows.slice(-limitNum);
  
  const campaigns = latestRows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    campaigns: campaigns.reverse(), // Most recent first
    count: campaigns.length
  })).setMimeType(ContentService.MimeType.JSON);
}

function getStatsAPI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const campaignsSheet = ss.getSheetByName('Campaigns');
  const activitySheet = ss.getSheetByName('ActivityLog');
  
  const stats = {
    totalCampaigns: campaignsSheet ? campaignsSheet.getLastRow() - 1 : 0,
    totalActivities: activitySheet ? activitySheet.getLastRow() - 1 : 0,
    lastUpdate: null
  };
  
  if (campaignsSheet && campaignsSheet.getLastRow() > 1) {
    const lastRow = campaignsSheet.getLastRow();
    stats.lastUpdate = campaignsSheet.getRange(lastRow, 1).getValue();
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    stats: stats
  })).setMimeType(ContentService.MimeType.JSON);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    doPost,
    doGet,
    storeCampaigns,
    getCampaignsAPI,
    getStatsAPI,
    getHealthCheck,
    logActivity,
    checkDataFreshness,
    sendAlert,
    generateDailyReport,
    cleanupOldData,
    exportToJSON,
    setupTriggers,
    setupScriptProperties,
    onOpen,
    showStats,
    exportToJSONMenu
  };
}
