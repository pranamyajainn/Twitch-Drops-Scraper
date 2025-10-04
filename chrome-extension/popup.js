// Popup script for Chrome Extension

document.addEventListener('DOMContentLoaded', () => {
  loadStatus();
  loadConfig();
  
  // Event listeners
  document.getElementById('scrapeNow').addEventListener('click', scrapeNow);
  document.getElementById('openDropsPage').addEventListener('click', openDropsPage);
  document.getElementById('saveConfig').addEventListener('click', saveConfig);
});

// Load current status
function loadStatus() {
  chrome.storage.local.get(['status', 'lastScrape', 'scrapeCount'], (result) => {
    document.getElementById('status').textContent = result.status || 'Idle';
    
    if (result.lastScrape) {
      const date = new Date(result.lastScrape);
      document.getElementById('lastScrape').textContent = formatDate(date);
    }
    
    document.getElementById('scrapeCount').textContent = result.scrapeCount || 0;
  });
  
  // Update status every 5 seconds
  setInterval(loadStatus, 5000);
}

// Load configuration
function loadConfig() {
  chrome.storage.local.get(['appsScriptUrl', 'scrapeInterval'], (result) => {
    if (result.appsScriptUrl) {
      document.getElementById('appsScriptUrl').value = result.appsScriptUrl;
    }
    if (result.scrapeInterval) {
      document.getElementById('scrapeInterval').value = result.scrapeInterval;
    }
  });
}

// Trigger scrape now
function scrapeNow() {
  const button = document.getElementById('scrapeNow');
  button.textContent = '🔄 Scraping...';
  button.disabled = true;
  
  chrome.runtime.sendMessage({ action: 'scrapeNow' }, (response) => {
    if (response && response.success) {
      showMessage('Scraping completed successfully!', 'success');
    } else {
      showMessage('Scraping failed: ' + (response?.error || 'Unknown error'), 'error');
    }
    
    button.textContent = 'Scrape Now';
    button.disabled = false;
    loadStatus();
  });
}

// Open Twitch Drops page
function openDropsPage() {
  chrome.tabs.create({ url: 'https://www.twitch.tv/drops/campaigns' });
}

// Save configuration
function saveConfig() {
  const appsScriptUrl = document.getElementById('appsScriptUrl').value;
  const scrapeInterval = parseInt(document.getElementById('scrapeInterval').value);
  
  if (!appsScriptUrl) {
    showMessage('Please enter Apps Script URL', 'error');
    return;
  }
  
  if (scrapeInterval < 15) {
    showMessage('Interval must be at least 15 minutes', 'error');
    return;
  }
  
  chrome.runtime.sendMessage({
    action: 'updateConfig',
    config: {
      appsScriptUrl,
      scrapeInterval
    }
  }, (response) => {
    if (response && response.success) {
      showMessage('Configuration saved successfully!', 'success');
    } else {
      showMessage('Failed to save configuration', 'error');
    }
  });
}

// Show message
function showMessage(text, type) {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  
  setTimeout(() => {
    messageEl.className = 'message';
  }, 3000);
}

// Format date
function formatDate(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}
