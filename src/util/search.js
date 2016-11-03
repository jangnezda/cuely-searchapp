import AlgoliaSearch from 'algoliasearch';
import { cutStringWithTags, parseCsv } from '../util/util.js';
import { ALGOLIA_INDEX } from '../util/const.js';
import moment from 'moment';

const algoliaConf = {
  indexName: ALGOLIA_INDEX
}

let index;
let algoliaClient;
let settings = {
  hitsPerPage: 10,
  getRankingInfo: true
};
moment.locale('en-gb');

export function setAlgoliaCredentials(credentials) {
  algoliaClient = AlgoliaSearch(credentials.appId, credentials.searchKey);
  settings.filters = `user_id=${credentials.userid}`;
  index = algoliaClient.initIndex(algoliaConf.indexName);
  console.log("Updated Algolia credentials");
}

export function search(query) {
  return index.search(query, settings).then(content => {
    return content.hits.map(hit => {
      // detect item type
      const keywords = hit.primary_keywords.toLowerCase();
      if (keywords.indexOf('gdrive') > -1) {
        return gdrive(hit);
      } else if (keywords.indexOf('intercom') > -1) {
        return intercom(hit);
      } else {
        return null;
      }
    }).filter(x => x);
  }).catch(err => {
    console.log(err);
  });
}

function intercom(hit) {
  let content = {
    monthlySpend: hit.intercom_monthly_spend || 0,
    plan: hit.intercom_plan || '',
    segments: hit.intercom_segments || '',
    sessions: hit.intercom_session_count || 0
  }
  let { events, conversations } = JSON.parse(highlightedValue('intercom_content', hit));
  content.events = events.map(e => ({ name: e.name, time: moment(e.timestamp * 1000).fromNow() }));
  content.conversations = conversations.map(c => {
    return {
      subject: c.subject,
      open: c.open,
      items: c.items.filter(item => item.body).map(item => ({
        body: item.body,
        time: moment(item.timestamp * 1000).fromNow(),
        timestamp: item.timestamp,
        author: item.author,
        authorId: item.author_id
      }))
    };
  });
  content.conversations.sort((a, b) => {
    if (a.open && b.open) {
      return b.items.slice(-1)[0].timestamp - a.items.slice(-1)[0].timestamp;
    }
    return a.open ? -1 : 1;
  });
  content.conversationsCount = conversations.length;

  return {
    type: 'intercom',
    mime: 'intercom',
    title: highlightedValue('intercom_title', hit),
    titleRaw: hit.intercom_title,
    userId: hit.intercom_user_id,
    content: content,
    metaInfo: {
      time: moment(hit.last_updated).fromNow(),
      open: content.conversations.filter(x => x.open).length > 0,
    },
    displayIcon: hit.icon_link,
    webLink: hit.webview_link,
    thumbnailLink: null,
    modified: hit.last_updated,
    _algolia: hit._rankingInfo
  }
}

function gdrive(hit) {
  let users = [{
    name: hit.owner_display_name,
    nameHighlight: highlightedValue('owner_display_name', hit, true) !== '',
    type: 'Owner',
    avatar: hit.owner_photo_link
  }];
  if (hit.modifier_display_name && hit.modifier_display_name !== hit.owner_display_name) {
    users.push({
      name: hit.modifier_display_name,
      nameHighlight: highlightedValue('modifier_display_name', hit, true) !== '',
      type: 'Modifier',
      avatar: hit.modifier_photo_link
    });
  }

  let content = null;
  if (hit.content && hit.content.length > 0) {
    content = highlightedValue('content', hit).replace(/\n\s*\n/g, '\n\n').replace(/<em>/g, '<em class="algolia_highlight">');
  }
  if (['csv', 'tsv', 'comma', 'tab', 'google-apps.spreadsheet'].filter(x => hit.mime_type.indexOf(x) > -1).length > 0) {
    try {
      content = parseCsv(content);
    } catch (e) {
      console.log(`Could not parse: ${hit.title}`);
      console.log(e);
    }
  }

  let title = highlightedValue('title', hit);
  const isFolder = hit.secondary_keywords.indexOf('folders') > -1;
  if (isFolder) {
      let highlightedIndex = title.indexOf('<em>');
      if (highlightedIndex > 20 && title.length > 30) {
        title = '…' + title.substring(highlightedIndex - 20);
      }
  }
  let path = JSON.parse(highlightedValue('path', hit));
  if (path.length > 0) {
    let highlightedIndex = path.findIndex(x => x.indexOf('<em>') > -1);
    if (highlightedIndex < 0) {
      highlightedIndex = path.length - 1;
    }
    let folder = cutStringWithTags(path[highlightedIndex], 27, 'em', '…');
    path = (highlightedIndex > 0 ? '…/' : '') + folder + ((highlightedIndex < path.length - 1) ? '/…' : '');
  } else {
    path = '';
  }

  return {
    type: 'gdrive',
    mime: hit.mime_type,
    title: title,
    titleRaw: hit.title,
    content: content,
    metaInfo: {
      time: moment(hit.last_updated).fromNow(),
      users: users,
      path: path
    },
    displayIcon: hit.icon_link,
    webLink: hit.webview_link,
    thumbnailLink: hit.thumbnail_link,
    modified: hit.last_updated,
    _algolia: hit._rankingInfo
  }
}

function highlightedValue(attribute, hit, emptyIfNotHighlighted) {
  if(attribute in hit._highlightResult && hit._highlightResult[attribute].matchedWords.length > 0) {
    return hit._highlightResult[attribute].value;
  }
  return emptyIfNotHighlighted ? "" : hit[attribute];
}