import moment from 'moment';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import request from 'superagent';
import { API_ROOT } from './const.js';

const settingsFile = '.cuely_prefs.json';
const settingsDefaults = {
  account: {},
  globalShortcut: 'Cmd+Backspace',
  showTrayIcon: true,
  showDockIcon: true
}

// ---- SETTINGS
export function getSettings(path) {
  const file = `${path}/${settingsFile}`;
  if (existsSync(file)) {
    let settings = JSON.parse(readFileSync(`${path}/${settingsFile}`, 'utf8'));
    for (let prop in settingsDefaults) {
      if (!(prop in settings)) {
        settings[prop] = settingsDefaults[prop];
      }
    }
    return settings;
  } else {
    saveSettings(path, settingsDefaults);
    return settingsDefaults;
  }
}

export function saveSettings(path, settings) {
  const file = `${path}/${settingsFile}`;
  writeFileSync(file, JSON.stringify(settings, null, 2), 'utf8'); 
}

// ---- API CALLS
export function getAlgoliaCredentials(csrfToken, sessionId) {
  return callApi('/home/algolia_key', csrfToken, sessionId);
}

export function getSyncStatus(csrfToken, sessionId) {
  return callApi('/home/sync_status', csrfToken, sessionId);
}

export function startSync(csrfToken, sessionId) {
  return callApi('/home/sync', csrfToken, sessionId, 'text/html');
}

function callApi(endpoint, csrfToken, sessionId, accept = 'application/json') {
  console.log("calling api: " + API_ROOT + endpoint);
  return request
    .post(API_ROOT + endpoint)
    .set('Accept', accept)
    .set('X-CSRFToken', csrfToken)
    .set('Cookie', `csrftoken=${csrfToken}; sessionid=${sessionId}`)
    .timeout(10000)
    .then(response => {
      return [response.body, null];
    }).catch(err => {
      console.log(err);
      return [null, err.response.error];
    });
}

// ---- DATE/TIME
export function fromIsoDateToElapsed(isoDate) {
  const {duration, formatted} = fromIsoDateToNow(isoDate);
  let elapsed = formatted + ' ago';
  if (duration.seconds > 0 || (duration.minutes > 0 && duration.minutes < 3)) {
    elapsed = 'Just now';
  }
  return elapsed;
}

export function fromIsoDateToNow(isoDate) {
  // Calcuate the difference between now and iso date (in the past), e.g. '2016-09-14T15:41:56.019Z',
  // and return the result in seconds, minutes, hours, days.
  let duration = { seconds: 0, minutes: 0, hours: 0, days: 0 }
  let formatted = '';

  const now = moment(Date.now());
  const iso = moment(isoDate);

  const seconds = now.diff(iso, 'seconds');
  if (seconds < 60) {
    duration.seconds = seconds;
    formatted = fromTimeUnit('second', seconds);
  } else {
    const minutes = now.diff(iso, 'minutes');
    if (minutes < 60) {
      duration.minutes = minutes;
      formatted = fromTimeUnit('minute', minutes);
    } else {
      const hours = now.diff(iso, 'hours');
      if (hours < 24) {
        duration.hours = hours;
        formatted = fromTimeUnit('hour', hours);
      } else {
        const days = now.diff(iso, 'days');
        duration.days = days;
        formatted = fromTimeUnit('day', days);
      }
    }
  }

  return {
    duration: duration,
    formatted: formatted
  }
}

function fromTimeUnit(unitName, unitValue) {
  return unitValue + ' ' + unitName + (unitValue !== 1 ? 's' : '');
}

// ---- STRINGS
export function substringCount(s, sub) {
  return (s.match(new RegExp(sub, 'ig')) || []).length;
}

/**
 * Cut a string to desired length and accounting for possible html tag.
 * For example: 'This is a <em>string</em' with maxLen param of 15 should produce 'This is a <em>strin…</em>'
 *
 * Note that this function doesn't account for more complicated structure, such as e.g. nested tags or broken/missing tags
 */
export function cutStringWithTags(s, maxLen, tagName, ellipsis='…') {
  if (!s || s.length < maxLen) {
    return s;
  }
  let count = 0;
  let rawCount = 0;
  let openTag = false;
  for(let c of s) {
    if(count >= maxLen) {
      break;
    }
    rawCount = rawCount + 1;
    if (c == '<') {
      openTag = true;
    }
    
    if (!openTag) {
      count = count + 1;
    }

    if (c == '>') {
      openTag = false;
    }
  }
  const tag = '<' + tagName + '>';
  const tagEnd = '</' + tagName + '>';
  let cut = s.substring(0, rawCount);
  const tagCount = substringCount(cut, tag);
  const tagEndCount = substringCount(cut, tagEnd);
  const appendEllipsis = ellipsis && cut.length < s.length;
  // assuming at most 1 difference in count. If there's more, then we probably have nested or broken/missing tags and we give up.
  const appendEndTag = tagCount === tagEndCount || Math.abs(tagCount - tagEndCount) > 1;

  return cut + (appendEllipsis ? ellipsis : '') + (appendEndTag ? tagEnd : '');
}
