// Mock Google Apps Script Environment

const mockSheet = {
  appendRow: jest.fn(),
  getRange: jest.fn(() => ({
    setFontWeight: jest.fn(),
    setBackground: jest.fn(),
    setFontColor: jest.fn(),
  })),
  setFrozenRows: jest.fn(),
  autoResizeColumns: jest.fn(),
  getLastRow: jest.fn(() => 1),
};

const mockSpreadsheet = {
  getSheetByName: jest.fn(() => mockSheet),
  insertSheet: jest.fn(() => mockSheet),
};

const mockUi = {
  createMenu: jest.fn(() => ({
    addItem: jest.fn(() => mockUi.createMenu()),
    addSeparator: jest.fn(() => mockUi.createMenu()),
    addToUi: jest.fn(),
  })),
  alert: jest.fn(),
};

global.SpreadsheetApp = {
  getActiveSpreadsheet: jest.fn(() => mockSpreadsheet),
  getUi: jest.fn(() => mockUi),
};

global.ContentService = {
  createTextOutput: jest.fn(text => ({
    setMimeType: jest.fn(() => text),
  })),
  MimeType: {
    JSON: 'application/json',
  },
};

global.Logger = {
  log: jest.fn(),
};

global.PropertiesService = {
    getScriptProperties: jest.fn(() => ({
        getProperty: jest.fn(),
        setProperty: jest.fn(),
    })),
};

global.ScriptApp = {
    getProjectTriggers: jest.fn(() => []),
    newTrigger: jest.fn(() => ({
        timeBased: jest.fn(() => ({
            everyHours: jest.fn(() => ({
                create: jest.fn(),
            })),
            atHour: jest.fn(() => ({
                everyDays: jest.fn(() => ({
                    create: jest.fn(),
                })),
            })),
            onWeekDay: jest.fn(() => ({
                atHour: jest.fn(() => ({
                    create: jest.fn(),
                })),
            })),
        })),
    })),
    deleteTrigger: jest.fn(),
};

// Import the script to be tested
const { doPost, storeCampaigns } = require('../GoogleAppsScript.js');

describe('Google Apps Script Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test('doPost should handle valid data', () => {
    const mockEvent = {
      postData: {
        contents: JSON.stringify({
          campaigns: [{ id: '1', name: 'Test Campaign' }],
        }),
      },
    };

    const response = doPost(mockEvent);
    const parsedResponse = JSON.parse(response);

    expect(SpreadsheetApp.getActiveSpreadsheet).toHaveBeenCalled();
    expect(JSON.parse(response).campaignsProcessed).toBe(1);
    expect(parsedResponse.success).toBe(true);
  });

  test('storeCampaigns should append rows to the sheet', () => {
    const campaigns = [
      { id: '1', name: 'Campaign 1', game: 'Game A', endDate: '2025-12-31', status: 'Active', description: 'Desc 1', imageUrl: 'url1', drops: [], scrapedAt: new Date().toISOString() },
      { id: '2', name: 'Campaign 2', game: 'Game B', endDate: '2025-12-31', status: 'Ended', description: 'Desc 2', imageUrl: 'url2', drops: [{ name: 'Drop 1' }], scrapedAt: new Date().toISOString() },
    ];

    const result = storeCampaigns(campaigns);

    expect(mockSheet.appendRow).toHaveBeenCalledTimes(2);
    expect(mockSheet.appendRow).toHaveBeenCalledWith(expect.arrayContaining(['Campaign 1', 'Game A']));
    expect(mockSheet.appendRow).toHaveBeenCalledWith(expect.arrayContaining(['Campaign 2', 'Game B']));
    expect(result.count).toBe(2);
  });
});