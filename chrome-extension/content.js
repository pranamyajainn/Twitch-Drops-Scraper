// Content script - runs on Twitch Drops page
// This handles manual scraping when user is on the page

console.log('Twitch Drops Scraper content script loaded');

// Add visual indicator that extension is active
function addIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'twitch-scraper-indicator';
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #9147ff;
    color: white;
    padding: 10px 15px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 12px;
    z-index: 10000;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    cursor: pointer;
  `;
  indicator.innerHTML = '🎮 Drops Scraper Active';
  
  indicator.addEventListener('click', () => {
    indicator.innerHTML = '🔄 Scraping...';
    chrome.runtime.sendMessage({ action: 'scrapeNow' }, (response) => {
      if (response.success) {
        indicator.innerHTML = '✅ Scrape Complete!';
        setTimeout(() => {
          indicator.innerHTML = '🎮 Drops Scraper Active';
        }, 3000);
      } else {
        indicator.innerHTML = '❌ Error!';
        setTimeout(() => {
          indicator.innerHTML = '🎮 Drops Scraper Active';
        }, 3000);
      }
    });
  });
  
  document.body.appendChild(indicator);
}

// Wait for page to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addIndicator);
} else {
  addIndicator();
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ status: 'ready' });
  }
});
