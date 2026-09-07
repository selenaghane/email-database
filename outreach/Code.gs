/**
 * Email Library - outreach mail merge.
 *
 * Runs inside Google Apps Script, bound to a Google Sheet. Sends from the
 * Gmail account that owns the script, so there are no API keys and no
 * credentials anywhere in this repository.
 *
 * Read outreach/README.md for setup. Edit the copy in Templates.gs, not here.
 *
 * Safety properties this file is built around:
 *   - DRY_RUN is on by default; nothing sends until you turn it off.
 *   - A row is only ever sent an initial email once (Status guards it).
 *   - Replies are detected before follow-ups go out, so nobody who already
 *     answered gets nudged.
 *   - "Do not contact" is terminal and checked on every pass.
 */

const CONFIG = {
  SHEET_NAME: 'Contacts',

  // Leave true until a previewNext() run looks right. Nothing sends while true.
  DRY_RUN: true,

  // Gmail's own ceiling is ~100 recipients/day on a consumer account. Staying
  // well under it leaves room for your normal mail and keeps volume looking
  // human rather than like a blast.
  DAILY_CAP: 40,

  // Days to wait after the initial email before a single follow-up.
  FOLLOWUP_AFTER_DAYS: 7,

  FROM_NAME: '[your name]',
  REPLY_TO: 'emailguideproject@gmail.com',
  SITE_URL: 'https://selenaghane.github.io/email-database',
};

const HEADERS = [
  'Name',
  'Email',
  'Type',
  'Org',
  'Personal note',
  'Status',
  'Sent at',
  'Follow-up sent at',
  'Replied at',
  'Notes',
];

// Statuses that mean "this row is finished" - never contacted again.
const TERMINAL = ['Replied', 'Submitted', 'Do not contact', 'Bounced'];

// Statuses that mean "this row has not been emailed yet".
const UNSENT = ['', 'Queued'];

/** Menu shown in the Sheet, so you never have to open the script editor. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Outreach')
    .addItem('Set up sheet', 'setUpSheet')
    .addItem('Preview next email', 'previewNext')
    .addSeparator()
    .addItem('Send queued emails', 'sendOutreach')
    .addItem('Check for replies', 'checkReplies')
    .addItem('Send follow-ups', 'sendFollowUps')
    .addSeparator()
    .addItem('Run daily pass now', 'runDaily')
    .addItem('Install daily trigger', 'installTrigger')
    .addItem('Remove daily trigger', 'removeTrigger')
    .addToUi();
}

/** Creates the Contacts sheet with headers and dropdowns. Safe to re-run. */
function setUpSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEET_NAME);

  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);

  const lastRow = Math.max(sheet.getMaxRows(), 500);
  applyDropdown_(sheet, 'Type', ['student', 'org'], lastRow);
  applyDropdown_(sheet, 'Status', ['Queued'].concat(TERMINAL).concat(['Sent']), lastRow);

  sheet.autoResizeColumns(1, HEADERS.length);
  SpreadsheetApp.getUi().alert(
    'Sheet ready.\n\nAdd contacts, leave Status blank (or "Queued"), then use ' +
    'Outreach > Preview next email.'
  );
}

/** Renders the next email that would go out, without sending it. */
function previewNext() {
  const table = readTable_();
  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i];
    if (!isSendable_(row) || UNSENT.indexOf(String(row['Status']).trim()) === -1) continue;
    const mail = compose_(row, 'initial');
    SpreadsheetApp.getUi().alert(
      'Row ' + row.__rowNumber + ' -> ' + row['Email'] + '\n\n' +
      'Subject: ' + mail.subject + '\n\n' + mail.body
    );
    return;
  }
  SpreadsheetApp.getUi().alert('Nothing queued to send.');
}

/** Sends the initial email to every unsent, sendable row, up to the daily cap. */
function sendOutreach() {
  const result = processRows_('initial');
  report_('Initial emails', result);
}

/** Sends one follow-up to rows that were emailed FOLLOWUP_AFTER_DAYS ago and never replied. */
function sendFollowUps() {
  const result = processRows_('followup');
  report_('Follow-ups', result);
}

/**
 * Marks rows Replied when the contact has emailed you since you emailed them.
 * Searching by sender is more robust than storing thread ids, which change if
 * the recipient forwards or re-subjects the conversation.
 */
function checkReplies() {
  const table = readTable_();
  let found = 0;

  table.rows.forEach(function (row) {
    if (String(row['Status']).trim() !== 'Sent') return;
    const sentAt = row['Sent at'];
    if (!(sentAt instanceof Date)) return;

    const email = String(row['Email']).trim().toLowerCase();
    if (!isEmail_(email)) return;

    // after: is day-granular, so step back one day and compare exactly below.
    const after = Utilities.formatDate(
      new Date(sentAt.getTime() - 24 * 60 * 60 * 1000),
      Session.getScriptTimeZone(),
      'yyyy/MM/dd'
    );

    const threads = GmailApp.search('from:' + email + ' after:' + after, 0, 10);
    const replied = threads.some(function (thread) {
      return thread.getMessages().some(function (message) {
        return message.getDate().getTime() > sentAt.getTime() &&
          message.getFrom().toLowerCase().indexOf(email) !== -1;
      });
    });

    if (replied) {
      setCell_(table, row, 'Status', 'Replied');
      setCell_(table, row, 'Replied at', new Date());
      found++;
    }
  });

  report_('Replies found', { sent: found, skipped: 0, errors: [] });
}

/** One pass in the right order: replies first, so nobody who answered gets nudged. */
function runDaily() {
  checkReplies();
  sendFollowUps();
  sendOutreach();
}

function installTrigger() {
  removeTrigger();
  ScriptApp.newTrigger('runDaily').timeBased().everyDays(1).atHour(9).create();
  SpreadsheetApp.getUi().alert('Daily trigger installed for ~9am.');
}

function removeTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'runDaily') ScriptApp.deleteTrigger(trigger);
  });
}

// ---------------------------------------------------------------- internals

/**
 * Walks the sheet sending one kind of email. Returns counts plus any per-row
 * errors, so a single bad address never aborts the whole run.
 */
function processRows_(kind) {
  const table = readTable_();
  const quota = MailApp.getRemainingDailyQuota();
  let budget = Math.min(CONFIG.DAILY_CAP, quota);
  const result = { sent: 0, skipped: 0, errors: [] };

  for (let i = 0; i < table.rows.length; i++) {
    if (budget <= 0) break;
    const row = table.rows[i];
    if (!isSendable_(row)) { result.skipped++; continue; }
    if (!isDue_(row, kind)) { result.skipped++; continue; }

    const mail = compose_(row, kind);

    if (CONFIG.DRY_RUN) {
      Logger.log('[DRY RUN] -> %s | %s', row['Email'], mail.subject);
      result.sent++;
      budget--;
      continue;
    }

    try {
      GmailApp.sendEmail(row['Email'], mail.subject, mail.body, {
        name: CONFIG.FROM_NAME,
        replyTo: CONFIG.REPLY_TO,
      });
    } catch (err) {
      result.errors.push(row['Email'] + ': ' + err.message);
      setCell_(table, row, 'Notes', 'Send failed: ' + err.message);
      continue;
    }

    if (kind === 'initial') {
      setCell_(table, row, 'Status', 'Sent');
      setCell_(table, row, 'Sent at', new Date());
    } else {
      setCell_(table, row, 'Follow-up sent at', new Date());
    }

    result.sent++;
    budget--;
  }

  return result;
}

/** A row is sendable if it has a usable address and is not finished or opted out. */
function isSendable_(row) {
  const status = String(row['Status']).trim();
  if (TERMINAL.indexOf(status) !== -1) return false;
  return isEmail_(String(row['Email']).trim());
}

/** Whether this row is due for the given kind of email right now. */
function isDue_(row, kind) {
  const status = String(row['Status']).trim();

  if (kind === 'initial') return UNSENT.indexOf(status) !== -1;

  // Follow-up: sent, never followed up, and enough days have passed.
  if (status !== 'Sent') return false;
  if (row['Follow-up sent at']) return false;

  const sentAt = row['Sent at'];
  if (!(sentAt instanceof Date)) return false;

  const daysSince = (Date.now() - sentAt.getTime()) / (24 * 60 * 60 * 1000);
  return daysSince >= CONFIG.FOLLOWUP_AFTER_DAYS;
}

/** Picks the template for this row and fills its placeholders. */
function compose_(row, kind) {
  const type = String(row['Type']).trim().toLowerCase() === 'org' ? 'org' : 'student';
  const key = kind === 'followup' ? type + 'Followup' : type;
  const template = TEMPLATES[key];
  if (!template) throw new Error('No template named ' + key + ' in Templates.gs');

  const name = String(row['Name']).trim();
  const values = {
    Name: name,
    FirstName: firstName_(name),
    Org: String(row['Org']).trim(),
    Note: String(row['Personal note']).trim(),
    FromName: CONFIG.FROM_NAME,
    SiteUrl: CONFIG.SITE_URL,
    SubmitUrl: CONFIG.SITE_URL + '/submit',
  };

  return {
    subject: render_(template.subject, values),
    // Collapse the blank gap left when a row has no personal note.
    body: render_(template.body, values).replace(/\n{3,}/g, '\n\n'),
  };
}

/**
 * First word of a name, minus a leading honorific - "Dr. Ana Reyes" greets as
 * "Ana", not "Dr.". Falls back to "there" so a blank Name never sends "Hi ,".
 */
function firstName_(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  while (parts.length > 1 && /^(dr|prof|professor|mr|mrs|ms|mx)\.?$/i.test(parts[0])) {
    parts.shift();
  }
  return parts[0] || 'there';
}

function render_(text, values) {
  return text.replace(/\{\{(\w+)\}\}/g, function (match, key) {
    return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match;
  });
}

function isEmail_(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

/** Reads the sheet into objects, remembering each row's real sheet position. */
function readTable_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error('No sheet named "' + CONFIG.SHEET_NAME + '". Run Outreach > Set up sheet.');

  const values = sheet.getDataRange().getValues();
  const header = values[0].map(function (h) { return String(h).trim(); });

  HEADERS.forEach(function (required) {
    if (header.indexOf(required) === -1) {
      throw new Error('Sheet is missing the "' + required + '" column.');
    }
  });

  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const row = { __rowNumber: r + 1 };
    header.forEach(function (name, c) { row[name] = values[r][c]; });
    if (String(row['Email']).trim() === '') continue;
    rows.push(row);
  }

  return { sheet: sheet, header: header, rows: rows };
}

function setCell_(table, row, column, value) {
  const col = table.header.indexOf(column) + 1;
  if (col === 0) return;
  table.sheet.getRange(row.__rowNumber, col).setValue(value);
  row[column] = value;
}

function applyDropdown_(sheet, column, options, lastRow) {
  const col = HEADERS.indexOf(column) + 1;
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(options, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, col, lastRow - 1, 1).setDataValidation(rule);
}

function report_(label, result) {
  const lines = [label + ': ' + result.sent + (CONFIG.DRY_RUN ? ' (dry run, nothing sent)' : ' sent')];
  if (result.errors.length) lines.push('Errors:\n' + result.errors.join('\n'));
  Logger.log(lines.join('\n'));
  try {
    SpreadsheetApp.getUi().alert(lines.join('\n\n'));
  } catch (err) {
    // No UI when running from a trigger; the log is the record.
  }
}
