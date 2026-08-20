/**
 * Smart Sorter — Firestore to Google Sheets Sync
 *
 * Setup:
 * 1. Create a Google Sheet named "Smart Sorter Data"
 * 2. Extensions → Apps Script → paste this file
 * 3. Project Settings → Script Properties → add:
 *      FIREBASE_PROJECT_ID  = your Firebase project ID
 *      FIREBASE_WEB_API_KEY = your Firebase Web API key
 * 4. Run setupSheet() once to create headers
 * 5. Run setupTrigger() once to schedule sync every 5 minutes
 * 6. Run syncFirestoreToSheet() manually to test
 */

var SHEET_NAME = 'Smart Sorter Data';
var COLLECTION = 'smart_sorter_logs';
var HEADERS = ['document_id', 'classification', 'timestamp', 'confidence', 'user_id'];

function getConfig_() {
  var props = PropertiesService.getScriptProperties();
  var projectId = props.getProperty('FIREBASE_PROJECT_ID');
  var apiKey = props.getProperty('FIREBASE_WEB_API_KEY');

  if (!projectId || !apiKey) {
    throw new Error(
      'Missing Script Properties. Set FIREBASE_PROJECT_ID and FIREBASE_WEB_API_KEY ' +
      'under Project Settings → Script Properties.'
    );
  }

  return {
    projectId: projectId,
    apiKey: apiKey,
    baseUrl: 'https://firestore.googleapis.com/v1/projects/' + projectId +
             '/databases/(default)/documents/' + COLLECTION
  };
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  return sheet;
}

/**
 * One-time: create header row.
 */
function setupSheet() {
  var sheet = getSheet_();
  sheet.clearContents();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  Logger.log('Sheet headers created.');
}

/**
 * One-time: schedule sync every 5 minutes.
 */
function setupTrigger() {
  // Remove existing sync triggers to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'syncFirestoreToSheet') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('syncFirestoreToSheet')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('Trigger created: syncFirestoreToSheet every 5 minutes.');
}

/**
 * Main sync: fetch all Firestore documents and rewrite sheet data.
 */
function syncFirestoreToSheet() {
  var config = getConfig_();
  var sheet = getSheet_();

  // Ensure headers exist
  var firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (firstRow[0] !== HEADERS[0]) {
    setupSheet();
  }

  var documents = fetchAllDocuments_(config);
  var rows = documents.map(function (doc) {
    return [
      doc.id,
      doc.classification,
      doc.timestamp,
      doc.confidence,
      doc.userId
    ];
  });

  // Sort by timestamp ascending (oldest first) for time-series charts
  rows.sort(function (a, b) {
    var ta = a[2] ? new Date(a[2]).getTime() : 0;
    var tb = b[2] ? new Date(b[2]).getTime() : 0;
    return ta - tb;
  });

  // Clear old data (keep header)
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, HEADERS.length).clearContent();
  }

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
  }

  Logger.log('Synced ' + rows.length + ' row(s) from Firestore.');
}

/**
 * Fetch all documents from Firestore REST API with pagination.
 */
function fetchAllDocuments_(config) {
  var allDocs = [];
  var pageToken = null;

  do {
    var url = config.baseUrl + '?key=' + encodeURIComponent(config.apiKey) +
              '&pageSize=300';
    if (pageToken) {
      url += '&pageToken=' + encodeURIComponent(pageToken);
    }

    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var code = response.getResponseCode();
    var body = response.getContentText();

    if (code !== 200) {
      throw new Error('Firestore GET failed (' + code + '): ' + body);
    }

    var json = JSON.parse(body);

    if (json.documents) {
      json.documents.forEach(function (doc) {
        allDocs.push(parseDocument_(doc));
      });
    }

    pageToken = json.nextPageToken || null;
  } while (pageToken);

  return allDocs;
}

/**
 * Parse a Firestore REST document into flat fields.
 */
function parseDocument_(doc) {
  var name = doc.name || '';
  var id = name.split('/').pop();
  var fields = doc.fields || {};

  return {
    id: id,
    classification: getStringValue_(fields, 'classification'),
    confidence: getDoubleValue_(fields, 'confidence'),
    timestamp: getTimestampValue_(fields, 'timestamp'),
    userId: getStringValue_(fields, 'user_id')
  };
}

function getStringValue_(fields, key) {
  return (fields[key] && fields[key].stringValue) ? fields[key].stringValue : '';
}

function getDoubleValue_(fields, key) {
  if (fields[key] && fields[key].doubleValue !== undefined) {
    return Number(fields[key].doubleValue);
  }
  if (fields[key] && fields[key].integerValue !== undefined) {
    return Number(fields[key].integerValue);
  }
  return '';
}

function getTimestampValue_(fields, key) {
  return (fields[key] && fields[key].timestampValue) ? fields[key].timestampValue : '';
}
