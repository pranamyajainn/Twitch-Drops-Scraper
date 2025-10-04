// Background Service Worker for Chrome Extension

// Configuration
const CONFIG = {
  APPS_SCRIPT_URL: '', // Will be set from popup
  SCRAPE_INTERVAL: 60 // minutes
};

// Load config from storage
chrome.storage.local.get(['appsScriptUrl', 'scrapeInterval'], (result) => {
  if (result.appsScriptUrl) CONFIG.APPS_SCRIPT_URL = result.appsScriptUrl;
  if (result.scrapeInterval) CONFIG.SCRAPE_INTERVAL = result.scrapeInterval;
});

// Set up hourly alarm when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Twitch Drops Scraper installed');
  
  // Create alarm for hourly scraping
  chrome.alarms.create('scrapeTwitchDrops', {
    periodInMinutes: CONFIG.SCRAPE_INTERVAL
  });
  
  // Initialize storage
  chrome.storage.local.set({
    lastScrape: null,
    scrapeCount: 0,
    status: 'idle'
  });
});

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'scrapeTwitchDrops') {
    console.log('Alarm triggered: Starting scrape');
    startScrapeProcess();
  }
});

// Start the scraping process
async function startScrapeProcess() {
  try {
    // Update status
    chrome.storage.local.set({ status: 'scraping' });
    
    // Check if Twitch drops page is already open
    const tabs = await chrome.tabs.query({ url: 'https://www.twitch.tv/drops/campaigns*' });
    
    let targetTab;
    
    if (tabs.length > 0) {
      // Use existing tab
      targetTab = tabs[0];
      await chrome.tabs.update(targetTab.id, { active: true });
    } else {
      // Open new tab
      targetTab = await chrome.tabs.create({ 
        url: 'https://www.twitch.tv/drops/campaigns',
        active: false 
      });
      
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Inject and execute scraping script
    const results = await chrome.scripting.executeScript({
      target: { tabId: targetTab.id },
      func: scrapePage
    });
    
    if (results && results[0] && results[0].result) {
      const campaigns = results[0].result;
      console.log(`Scraped ${campaigns.length} campaigns`);
      
      // Send to Google Apps Script
      await sendToAppsScript(campaigns);
      
      // Update storage
      const scrapeCount = (await chrome.storage.local.get('scrapeCount')).scrapeCount || 0;
      chrome.storage.local.set({
        lastScrape: new Date().toISOString(),
        scrapeCount: scrapeCount + 1,
        lastCampaigns: campaigns,
        status: 'success'
      });
      
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Twitch Drops Scraper',
        message: `Successfully scraped ${campaigns.length} campaigns`
      });
    }
    
  } catch (error) {
    console.error('Scraping error:', error);
    chrome.storage.local.set({ 
      status: 'error',
      lastError: error.message 
    });
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'Twitch Drops Scraper - Error',
      message: `Error: ${error.message}`
    });
  }
}

// The actual scraping function (injected into page)
function scrapePage() {
  return new Promise(async (resolve) => {
    const campaigns = [];
    
    // Wait for initial load
    await new Promise(r => setTimeout(r, 3000));
    
    // Find campaign cards - trying multiple selectors
    const selectors = [
      '[data-a-target="drops-campaign-card"]',
      '[data-test-selector="drops-campaign-card"]',
      '.drops-campaign-card',
      '[class*="CampaignCard"]',
      '[class*="campaign-card"]'
    ];
    
    let campaignCards = [];
    for (const selector of selectors) {
      campaignCards = document.querySelectorAll(selector);
      if (campaignCards.length > 0) break;
    }
    
    console.log(`Found ${campaignCards.length} campaign cards`);
    
    for (let i = 0; i < campaignCards.length; i++) {
      const card = campaignCards[i];
      
      // Scroll into view
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 800));
      
      // Click to expand
      const expandButton = card.querySelector('button') || 
                          card.querySelector('[role="button"]') ||
                          card;
      
      if (expandButton && !card.classList.contains('expanded')) {
        expandButton.click();
        await new Promise(r => setTimeout(r, 1500));
      }
      
      // Extract data
      try {
        const campaign = {
          id: card.getAttribute('data-campaign-id') || `campaign_${i}`,
          name: extractText(card, [
            '[data-a-target="campaign-name"]',
            '[class*="campaign-name"]',
            '[class*="CampaignName"]',
            'h3', 'h4'
          ]),
          game: extractText(card, [
            '[data-a-target="campaign-game"]',
            '[class*="game-name"]',
            '[class*="GameName"]'
          ]),
          endDate: extractText(card, [
            '[data-a-target="campaign-end-date"]',
            '[class*="end-date"]',
            '[class*="EndDate"]',
            'time'
          ]),
          status: extractText(card, [
            '[data-a-target="campaign-status"]',
            '[class*="status"]'
          ]),
          description: extractText(card, [
            '[data-a-target="campaign-description"]',
            '[class*="description"]',
            'p'
          ]),
          imageUrl: card.querySelector('img')?.src || '',
          drops: [],
          scrapedAt: new Date().toISOString()
        };
        
        // Get drops
        const dropElements = card.querySelectorAll('[data-a-target="drop-card"]') ||
                            card.querySelectorAll('[class*="drop-card"]') ||
                            card.querySelectorAll('[class*="DropCard"]');
        
        dropElements.forEach(drop => {
          campaign.drops.push({
            name: extractText(drop, ['[class*="drop-name"]', 'h5', 'h6']),
            reward: extractText(drop, ['[class*="reward"]']),
            requirement: extractText(drop, ['[class*="requirement"]', '[class*="progress"]'])
          });
        });
        
        campaigns.push(campaign);
        
      } catch (error) {
        console.error(`Error extracting campaign ${i}:`, error);
      }
    }
    
    // Helper function to extract text from multiple possible selectors
    function extractText(element, selectors) {
      for (const selector of selectors) {
        const el = element.querySelector(selector);
        if (el && el.textContent.trim()) {
          return el.textContent.trim();
        }
      }
      return '';
    }
    
    resolve(campaigns);
  });
}

// Send data to Google Apps Script
async function sendToAppsScript(campaigns) {
  const config = await chrome.storage.local.get('appsScriptUrl');
  
  if (!config.appsScriptUrl) {
    throw new Error('Apps Script URL not configured');
  }
  
  try {
    const response = await fetch(config.appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain' // Use text/plain to avoid CORS preflight
      },
      body: JSON.stringify({ 
        campaigns,
        timestamp: new Date().toISOString(),
        source: 'chrome_extension'
      })
    });
    
    console.log('Data sent to Google Apps Script');
    return true;
    
  } catch (error) {
    console.error('Error sending to Apps Script:', error);
    throw error;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeNow') {
    startScrapeProcess().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'updateConfig') {
    chrome.storage.local.set(request.config, () => {
      // Update alarm interval if changed
      if (request.config.scrapeInterval) {
        chrome.alarms.clear('scrapeTwitchDrops', () => {
          chrome.alarms.create('scrapeTwitchDrops', {
            periodInMinutes: request.config.scrapeInterval
          });
        });
      }
      sendResponse({ success: true });
    });
    return true;
  }
});
