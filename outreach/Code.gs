/**
 * Email Library - outreach mail merge.
 *
 * Runs inside Google Apps Script, bound to a Google Sheet. Works with the
 * Gmail account that owns the script, so there are no API keys and no
 * credentials anywhere in this repository.
 *
 * Read outreach/README.md for setup. Edit the copy in Templates.gs, not here.
 *
 * By default nothing is ever sent automatically: the script writes each email
 * into your Gmail drafts, personalised and addressed, and you press Send. The
 * row then waits until it sees the message in your sent mail before the
 * follow-up clock starts - so a draft you sit on for three days, or decide not
 * to send at all, never produces a mistimed or unwanted follow-up.
 */

const CONFIG = {
  SHEET_NAME: 'Contacts',
  DM_SHEET_NAME: 'DMs',

  /**
   * 'draft' - write each email to Gmail drafts for you to send by hand.
   * 'send'  - send immediately, no drafts. Only switch to this once the
   *           wording has settled and you trust it.
   * 'off'   - practice mode: work out what would happen, touch nothing.
   */
  MODE: 'draft',

  // Rows handled per run. In 'send' mode this also stays under Gmail's ~100
  // recipients/day ceiling for a consumer account.
  DAILY_CAP: 40,

  // Days after you actually send before a single follow-up is prepared.
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
  'Drafted at',
  'Sent at',
  'Follow-up at',
  'Replied at',
  'Notes',
];

const DM_HEADERS = [
  'Handle',
  'Platform',
  'Name',
  'What they posted',
  'Message',
  'Follow-up',
  'Status',
  'Sent on',
  'Notes',
];

// Statuses that mean "this row is finished" - never contacted again.
const TERMINAL = ['Replied', 'Submitted', 'Do not contact', 'Bounced'];

// Statuses that mean "no email has been prepared for this row yet".
const UNSENT = ['', 'Queued'];

/** Menu shown in the Sheet, so you never have to open the script editor. */
function onOpen() {
  const drafting = CONFIG.MODE !== 'send';
  const verb = drafting ? 'Draft' : 'Send';

  const menu = SpreadsheetApp.getUi()
    .createMenu('Outreach')
    .addItem('Set up sheet', 'setUpSheet')
    .addItem('Preview next email', 'previewNext')
    .addSeparator()
    .addItem(verb + ' queued emails', 'sendOutreach')
    .addItem(verb + ' follow-ups', 'sendFollowUps');

  if (drafting) menu.addItem('Check what I have sent', 'checkSent');

  menu.addSeparator()
    .addItem('Set up DM sheet', 'setUpDmSheet')
    .addItem('Build DM messages', 'buildDmMessages')
    .addSeparator();

  menu.addItem('Check for replies', 'checkReplies')
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
  applyDropdown_(sheet, 'Type', ['student', 'org', 'creator'], lastRow);
  applyDropdown_(sheet, 'Status', ['Queued', 'Drafted', 'Sent'].concat(TERMINAL), lastRow);

  sheet.autoResizeColumns(1, HEADERS.length);
  SpreadsheetApp.getUi().alert(
    'Sheet ready.\n\nAdd contacts, leave Status blank (or "Queued"), then use ' +
    'Outreach > Preview next email.'
  );
}

/** Renders the next email that would be prepared, without preparing it. */
function previewNext() {
  const table = readTable_();
  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i];
    if (!isSendable_(row) || !isDue_(row, 'initial')) continue;
    const mail = compose_(row, 'initial');
    SpreadsheetApp.getUi().alert(
      'Row ' + row.__rowNumber + ' -> ' + row['Email'] + '\n\n' +
      'Subject: ' + mail.subject + '\n\n' + mail.body
    );
    return;
  }
  SpreadsheetApp.getUi().alert('Nothing queued.');
}

/** Prepares the first email for every queued row, up to the daily cap. */
function sendOutreach() {
  report_(CONFIG.MODE === 'send' ? 'Emails sent' : 'Drafts created', processRows_('initial'));
}

/** Prepares one follow-up per contact who has gone quiet since you sent. */
function sendFollowUps() {
  report_(CONFIG.MODE === 'send' ? 'Follow-ups sent' : 'Follow-up drafts created',
    processRows_('followup'));
}

/**
 * Moves Drafted rows to Sent once the message shows up in your sent mail.
 *
 * This is what keeps the follow-up clock honest in draft mode: it starts when
 * you actually press Send, not when the draft was written. A draft you never
 * send simply stays Drafted and is never followed up.
 */
function checkSent() {
  const table = readTable_();
  let found = 0;

  table.rows.forEach(function (row) {
    if (String(row['Status']).trim() !== 'Drafted') return;

    const email = String(row['Email']).trim().toLowerCase();
    if (!isEmail_(email)) return;

    const since = row['Drafted at'] instanceof Date ? row['Drafted at'] : null;
    const message = findMessage_('in:sent to:' + email, since);
    if (!message) return;

    setCell_(table, row, 'Status', 'Sent');
    setCell_(table, row, 'Sent at', message.getDate());
    found++;
  });

  report_('Newly sent', { count: found, errors: [] });
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

    if (!findMessage_('from:' + email, sentAt)) return;

    setCell_(table, row, 'Status', 'Replied');
    setCell_(table, row, 'Replied at', new Date());
    found++;
  });

  report_('Replies found', { count: found, errors: [] });
}

/** One pass, in the order that keeps rows from being nudged wrongly. */
function runDaily() {
  if (CONFIG.MODE !== 'send') checkSent();
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


// ---------------------------------------------------------------- DMs
//
// Instagram and TikTok cannot be automated: neither offers an API for
// messaging people who have not messaged you first, and the tools that claim
// otherwise drive a logged-in session in breach of both platforms' terms,
// which gets accounts restricted. So the script does the half that can be
// done - writing each message, personalised - and you send them by hand.

/** Creates the DMs sheet. Safe to re-run. */
function setUpDmSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.DM_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.DM_SHEET_NAME);

  sheet.getRange(1, 1, 1, DM_HEADERS.length).setValues([DM_HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);

  const lastRow = Math.max(sheet.getMaxRows(), 500);
  applyDropdownTo_(sheet, DM_HEADERS, 'Platform', ['instagram', 'tiktok'], lastRow);
  applyDropdownTo_(sheet, DM_HEADERS, 'Status',
    ['Queued', 'Sent', 'Replied', 'Ignored', 'Do not contact'], lastRow);

  // Messages are long; let them wrap rather than spill across the sheet.
  ['Message', 'Follow-up'].forEach(function (name) {
    const col = DM_HEADERS.indexOf(name) + 1;
    sheet.setColumnWidth(col, 380);
    sheet.getRange(2, col, lastRow - 1, 1).setWrap(true);
  });

  SpreadsheetApp.getUi().alert(
    'DM sheet ready.\n\nAdd handles and one line each in "What they posted", ' +
    'then use Outreach > Build DM messages.'
  );
}

/**
 * Fills the Message column for queued rows, and Follow-up for rows already
 * sent. Nothing is transmitted - you copy the cell and send it yourself.
 */
function buildDmMessages() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.DM_SHEET_NAME);
  if (!sheet) throw new Error('No DM sheet yet. Run Outreach > Set up DM sheet.');

  const values = sheet.getDataRange().getValues();
  const header = values[0].map(function (h) { return String(h).trim(); });
  const at = function (row, name) { return row[header.indexOf(name)]; };

  let built = 0;
  let missing = 0;

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const handle = String(at(row, 'Handle')).trim();
    if (!handle) continue;

    const status = String(at(row, 'Status')).trim();
    if (status === 'Do not contact' || status === 'Replied') continue;

    const note = String(at(row, 'What they posted')).trim();
    const platform = String(at(row, 'Platform')).trim().toLowerCase();

    const values_ = {
      FirstName: firstName_(String(at(row, 'Name')).trim() || handle.replace(/^@/, '')),
      Handle: handle,
      Note: note,
      FromName: CONFIG.FROM_NAME,
      SiteUrl: CONFIG.SITE_URL,
      SubmitUrl: CONFIG.SITE_URL + '/submit',
    };

    if (status === 'Sent') {
      if (!String(at(row, 'Follow-up')).trim()) {
        setAt_(sheet, header, r + 1, 'Follow-up', render_(DM_TEMPLATES.followUp, values_));
        built++;
      }
      continue;
    }

    // The note is the whole message. Without it there is nothing to send.
    if (!note) { missing++; continue; }

    const template = DM_TEMPLATES[platform] || DM_TEMPLATES.instagram;
    setAt_(sheet, header, r + 1, 'Message', render_(template, values_));
    if (!status) setAt_(sheet, header, r + 1, 'Status', 'Queued');
    built++;
  }

  const lines = ['Messages built: ' + built];
  if (missing) {
    lines.push(missing + ' row(s) skipped with no "What they posted" line. ' +
      'That sentence is the message - without it there is nothing worth sending.');
  }
  lines.push('Copy a Message cell, send it yourself, then set Status to Sent.');
  SpreadsheetApp.getUi().alert(lines.join('\n\n'));
}

function setAt_(sheet, header, rowNumber, column, value) {
  const col = header.indexOf(column) + 1;
  if (col === 0) return;
  sheet.getRange(rowNumber, col).setValue(value);
}

// ---------------------------------------------------------------- internals

/**
 * Walks the sheet preparing one kind of email. Returns a count plus any
 * per-row errors, so a single bad address never aborts the whole run.
 */
function processRows_(kind) {
  const table = readTable_();
  const sending = CONFIG.MODE === 'send';

  // Drafts cost no send quota, so only real sends are checked against it.
  let budget = sending
    ? Math.min(CONFIG.DAILY_CAP, MailApp.getRemainingDailyQuota())
    : CONFIG.DAILY_CAP;

  const result = { count: 0, errors: [] };

  for (let i = 0; i < table.rows.length; i++) {
    if (budget <= 0) break;
    const row = table.rows[i];
    if (!isSendable_(row) || !isDue_(row, kind)) continue;

    const mail = compose_(row, kind);

    if (CONFIG.MODE === 'off') {
      Logger.log('[practice] %s | %s', row['Email'], mail.subject);
      result.count++;
      budget--;
      continue;
    }

    try {
      const options = { name: CONFIG.FROM_NAME, replyTo: CONFIG.REPLY_TO };
      if (sending) {
        GmailApp.sendEmail(row['Email'], mail.subject, mail.body, options);
      } else {
        GmailApp.createDraft(row['Email'], mail.subject, mail.body, options);
      }
    } catch (err) {
      result.errors.push(row['Email'] + ': ' + err.message);
      setCell_(table, row, 'Notes', 'Failed: ' + err.message);
      continue;
    }

    stamp_(table, row, kind, sending);
    result.count++;
    budget--;
  }

  return result;
}

/** Records what just happened to a row, which is what stops it repeating. */
function stamp_(table, row, kind, sending) {
  const now = new Date();

  if (kind === 'followup') {
    setCell_(table, row, 'Follow-up at', now);
    return;
  }

  if (sending) {
    setCell_(table, row, 'Status', 'Sent');
    setCell_(table, row, 'Sent at', now);
  } else {
    setCell_(table, row, 'Status', 'Drafted');
    setCell_(table, row, 'Drafted at', now);
  }
}

/** A row is workable if it has a usable address and is not finished. */
function isSendable_(row) {
  if (TERMINAL.indexOf(String(row['Status']).trim()) !== -1) return false;
  return isEmail_(String(row['Email']).trim());
}

/** Whether this row is due for the given kind of email right now. */
function isDue_(row, kind) {
  const status = String(row['Status']).trim();

  // Drafted rows are waiting on you, not on the script.
  if (kind === 'initial') return UNSENT.indexOf(status) !== -1;

  // A follow-up needs a real send to count from, so Drafted rows are skipped.
  if (status !== 'Sent') return false;
  if (row['Follow-up at']) return false;

  const sentAt = row['Sent at'];
  if (!(sentAt instanceof Date)) return false;

  return (Date.now() - sentAt.getTime()) / (24 * 60 * 60 * 1000) >= CONFIG.FOLLOWUP_AFTER_DAYS;
}

/**
 * First Gmail message matching a query that is strictly newer than `since`.
 * Gmail's after: filter is day-granular, so it is used to narrow the search
 * and the exact comparison is done on the message itself.
 */
function findMessage_(query, since) {
  let scoped = query;
  if (since instanceof Date) {
    const from = new Date(since.getTime() - 24 * 60 * 60 * 1000);
    scoped += ' after:' + Utilities.formatDate(from, Session.getScriptTimeZone(), 'yyyy/MM/dd');
  }

  const threads = GmailApp.search(scoped, 0, 10);
  for (let t = 0; t < threads.length; t++) {
    const messages = threads[t].getMessages();
    for (let m = 0; m < messages.length; m++) {
      if (!(since instanceof Date) || messages[m].getDate().getTime() > since.getTime()) {
        return messages[m];
      }
    }
  }
  return null;
}

/** Picks the template for this row and fills its placeholders. */
function compose_(row, kind) {
  // Any Type that names a template in Templates.gs is used as-is, so adding
  // a template there is all it takes to add an audience. Anything else falls
  // back to the student wording rather than failing the row.
  const raw = String(row['Type']).trim().toLowerCase();
  const type = TEMPLATES[raw] ? raw : 'student';
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
      throw new Error('Sheet is missing the "' + required + '" column. Run Outreach > Set up sheet.');
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
  applyDropdownTo_(sheet, HEADERS, column, options, lastRow);
}

function applyDropdownTo_(sheet, headers, column, options, lastRow) {
  const col = headers.indexOf(column) + 1;
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(options, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, col, lastRow - 1, 1).setDataValidation(rule);
}

function report_(label, result) {
  const lines = [label + ': ' + result.count + (CONFIG.MODE === 'off' ? ' (practice mode)' : '')];
  if (CONFIG.MODE === 'draft' && result.count > 0) {
    lines.push('They are in your Gmail drafts. Read each one, then press Send.');
  }
  if (result.errors && result.errors.length) lines.push('Errors:\n' + result.errors.join('\n'));

  Logger.log(lines.join('\n'));
  try {
    SpreadsheetApp.getUi().alert(lines.join('\n\n'));
  } catch (err) {
    // No UI when running from a trigger; the log is the record.
  }
}
