import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import { ipcRenderer, shell, clipboard } from 'electron';
import { Scrollbars } from 'react-custom-scrollbars';
import SearchBar from './components/SearchBar';
import GdriveContent from './components/GdriveContent';
import IntercomContent from './components/IntercomContent';

const icons = [
  {
    type: 'application/vnd.google-apps.document',
    spriteOffset: 0
  },
  {
    type: 'application/vnd.google-apps.spreadsheet',
    spriteOffset: 3
  },
  {
    type: 'image',
    spriteOffset: 1
  },
  {
    type: 'application/vnd.google-apps.presentation',
    spriteOffset: 2
  },
  {
    type: 'application/vnd.google-apps.form',
    spriteOffset: 4
  },
  {
    type: 'application/vnd.google-apps.drawing',
    spriteOffset: 5
  },
  {
    type: 'application/vnd.google-apps.folder',
    spriteOffset: 6
  },
  {
    type: 'intercom',
    spriteOffset: 7
  },
  {
    type: 'salesforce',
    spriteOffset: 8
  },
  {
    type: 'trello',
    spriteOffset: 9
  },
  {
    type: 'github',
    spriteOffset: 10
  },
  {
    type: 'stripe',
    spriteOffset: 11
  },
  {
    type: 'application/pdf',
    spriteOffset: 12
  }
]

export default class App extends Component {
  constructor(props){
    super();
    this.openContentExternalLink = ::this.openContentExternalLink;
    this.handleInput = ::this.handleInput;
    this.handleKeyUp = ::this.handleKeyUp;
    this.handleKeyDown = ::this.handleKeyDown;
    this.renderItem = ::this.renderItem;
    this.handleClick = ::this.handleClick;
    this.handleDoubleClick = ::this.handleDoubleClick;
    this.handleContentKeyDown = ::this.handleContentKeyDown;
    this.hideHover = ::this.hideHover;
    this.showHover = ::this.showHover;
    this.handleMouseMove = ::this.handleMouseMove;
    this.handleExternalLink = ::this.handleExternalLink;
    this.handleActionIconLinkClick = ::this.handleActionIconLinkClick;
    this.handleMouseEnter = ::this.handleMouseEnter;
    this.openExternalLink = ::this.openExternalLink;
    this.state = {
      searchResults: [],
      selectedIndex: -1,
      clearInput: false,
      keyFocus: false
    }
    this.hoverDisabled = false;
    this.segmentTimer = null;
  }

  componentDidMount() {
    ipcRenderer.on('search-result', (event, arg) => {
      this.setState({ searchResults: arg, clearInput: false, selectedIndex: arg.length > 0 ? 0 : -1, keyFocus: false });
    });
    ipcRenderer.on('notification', (event, arg) => {
      // show desktop notification
      new Notification(arg.title, arg);
    });
    ipcRenderer.on('focus-element', (event, selector) => {
      //set focus on searchbar after window comes into foreground
      this.refs.searchBar.setFocus();
    });
    // start empty search (should return 10 most recent items by signed in user name)
    ipcRenderer.send('search', '');

  }

  componentDidUpdate() {
    const content = document.getElementById("searchSuggestionsContent");
    if (content) {
      // scroll the content to first highlight result (or to beginning if there's no highlighted result)
      const elms = document.getElementsByClassName("algolia_highlight");
      if (elms && elms.length > 0) {
        let elm = elms[0];
        if (elm.parentElement.nodeName === 'TD' || elm.parentElement.nodeName === 'TH') {
          elm = elm.parentElement;
        }
        content.scrollTop = elm.offsetTop - 150;
        content.scrollLeft = elm.offsetLeft - 50;
      } else {
        content.scrollTop = 0;
        content.scrollLeft = 0;
      }
    }

    // adjust the window height to the height of the list
    const winHeight = (this.state.searchResults.length > 0 ? 397 : 0) + this.getElementHeight("searchBar");
    console.log(winHeight);
    ipcRenderer.send('search-rendered', { height: winHeight });
     
    if (this.refs.scrollbars && this.state.selectedIndex > -1) {
      const node = ReactDOM.findDOMNode(this.refs[`searchItem_${this.state.selectedIndex}`]);
      if (node && node.children) {
        node.children[0].focus();
      }
    }
    this.refs.searchBar.setFocus();
  }

  getElementHeight(id) {
    const el = document.getElementById(id);
    if (!el) {
      return 0;
    }
    const styleHeight = window.getComputedStyle(el).getPropertyValue("height").slice(0, -2);
    return parseInt(styleHeight);
  }

  handleKeyDown(e) {
    if (this.isDown(e) || this.isUp(e)) {
      e.preventDefault();
    }
  }

  handleContentKeyDown(e) {
    // allow 'meta' actions (e.g. copy to clipboard), but pass the rest to input
    if ((e.ctrlKey || e.metaKey) && e.key !== 'a') {
      return;
    }
    // pass focus to search bar, so key up event will fire on input instead of content
    this.refs.searchBar.setFocus();
  }

  handleKeyUp(e) {
    let index = this.state.selectedIndex;
    if (e.key === 'Escape') {
      ipcRenderer.send('hide-search');
    } else if (this.isDown(e)) {
      e.preventDefault();
      let index = this.state.selectedIndex;
      index = (index >= this.state.searchResults.length - 1) ? index : index + 1;
      this.setState({ selectedIndex: index, keyFocus: true });
    } else if (this.isUp(e)) {
      e.preventDefault();
      index = (index < 1) ? index : index - 1;
      this.setState({ selectedIndex: index, keyFocus: true });
    } else if (e.key === 'Enter') {
      this.openExternalLink(this.state.searchResults[index].webLink, 'enter');
    }

    this.hideHover();
  }
  
  isUp(e) {
    return (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p'));
  }

  isDown(e) {
    return (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n'));
  }

  handleInput(e) {
    const q = e.target.value;
    ipcRenderer.send('search', q);
    if (this.segmentTimer) {
      clearTimeout(this.segmentTimer);
    }
    if (q.length > 0) {
      this.segmentTimer = setTimeout(() => {
        ipcRenderer.send('track', { name: 'Search', props: { query: q } });
      }, 1000);
    }
  }

  handleClick(e) {
    e.preventDefault();
    const index = this.getIndex(e.target.id);
    if (index > -1) {
      this.setState({ selectedIndex: index, keyFocus: false });
      this.hideHover();
    }
  }

  handleDoubleClick(e) {
    e.preventDefault();
    this.openExternalLink(this.state.searchResults[this.getIndex(e.target.id)].webLink, 'double click');
  }

  handleExternalLink(e) {
    e.preventDefault();
    this.openExternalLink(this.state.searchResults[this.state.selectedIndex].webLink, 'view in app button');
  }

  openContentExternalLink(e) {
    e.preventDefault();
    this.openExternalLink(e.srcElement.href, 'clicked link in content text');
  }

  openExternalLink(link, triggerType) {
    shell.openExternal(link);
    ipcRenderer.send('hide-search');
    ipcRenderer.send('track', { name: 'Open link', props: { type: triggerType } });
  }

  handleActionIconLinkClick(e) {
    e.preventDefault();

    let index = this.getIndex(e.target.id);
    if (index > -1) {
      clipboard.writeText(this.state.searchResults[index].webLink);
      const docName = this.state.searchResults[index].titleRaw;
      ipcRenderer.send('send-notification', { title: 'Copied link to clipboard ✓', body: `Cuely has copied link for document '${docName}' to clipboard` });
      ipcRenderer.send('track', { name: 'Copy link', props: {} });
    }
    index = this.state.selectedIndex;
    const link = document.getElementById("searchItemLink_" + index);
    if (link) {
      link.focus();
    }
  }

  handleMouseMove(e) {
    const index = this.getIndex(e.target.id);
    if (index === this.state.selectedIndex) {
      this.hideHover();
      return;
    }
    if (!this.hoverDisabled) {
      this.showHover();
    }
    this.hoverDisabled = false;
  }

  handleMouseEnter(e) {
    const index = this.getIndex(e.target.id);
    if (index > -1) {
      const link = document.getElementById("searchItemLink_" + index);
      link.className = "search_suggestions_card_link_action_hover";
    }
  }

  hideHover() {
    this.hoverDisabled = true;
    this.applyClassToSuggestions('search_suggestion_card_link_no_hover');
  }

  showHover() {
    this.hoverDisabled = false;
    this.applyClassToSuggestions('search_suggestion_card_link');
  }

  applyClassToSuggestions(klas) {
    const itemList = document.getElementById("searchSuggestionsList");
    if (itemList) {
      const items = [].slice.call(itemList.getElementsByTagName('a')).filter(tag => tag.id.indexOf('searchItemLink') > -1);
      for (let item of items) {
        item.className = klas;
      }
    }
  }

  getIndex(elementId) {
    return elementId ? parseInt(elementId.split('_').slice(-1)[0]) : -1;
  }

  initials(username) {
    return username.split(' ').map(x => x[0]).slice(0, 2).join('');
  }

  renderItem(item, i) {
    const liClass = (i === this.state.selectedIndex) ? 'search_suggestions_card_highlight' : 'search_suggestions_card';
    // const icon = item.displayIcon ? item.displayIcon : (item.type === 'intra' ? CuelyLogo : GoogleLogo);
    const icon = this.getIcon(item);

    return (
      <li key={i} className={liClass} ref={`searchItem_${i}`}>
        <a href="#" onClick={this.handleClick} onDoubleClick={this.handleDoubleClick} onKeyDown={this.handleKeyDown} onMouseMove={this.handleMouseMove} className="search_suggestion_card_link" id={`searchItemLink_${i}`}>
          <div style={icon.inlineStyle} className={icon.style} />
          <div className="search_suggestions_data">
            <div className="heading">
              <div className="title" dangerouslySetInnerHTML={{ __html: item.title }} />
              {this.renderAvatar(item)}
            </div>
            {this.renderBody(item)}
          </div>
        </a>
        {this.renderActionItems(item,i)}
      </li>
    )
  }

  getIcon(item){
    let displayIcon = {
      'inlineStyle': {backgroundImage: 'url(' + item.displayIcon + ')'},
      'style': 'search_suggestions_logo'
    };
    
    for (let itemIcons of icons){
      if (itemIcons.type == item.mime){
        const verticalOffset = itemIcons.spriteOffset*(-25) + 'px';

        displayIcon.inlineStyle = { 'backgroundPosition': '0 ' + verticalOffset };
        displayIcon.style = displayIcon.style + ' ' + 'search_suggestions_logo_sprite';
        return (displayIcon);
      }
    }

    return (displayIcon);
  }

  renderAvatar(item) {
    if (item.metaInfo.users){
      return (
        <div className="avatars">
          {item.metaInfo.users[0].avatar
              ? <div style={{ backgroundImage: 'url(' + item.metaInfo.users[0].avatar + ')' }} className={item.metaInfo.users[0].nameHighlight ? "avatar active" : "avatar"} />
              : <div className={item.metaInfo.users[0].nameHighlight ? "avatar no_avatar active" : "avatar no_avatar"}>{this.initials(item.metaInfo.users[0].name)}</div>}
        </div>
      );
    }
  }

  renderBody(item) {
    if (item.metaInfo){
      return (
        <div className="body">
          <span className="meta_icon glyphicons glyphicons-clock"></span>
          <span className="meta_data">{item.metaInfo.time}</span>
          {item.metaInfo.path && item.metaInfo.path.length > 0
              ? <span><span className="meta_icon glyphicons glyphicons-folder-open"></span><span className="meta_data" dangerouslySetInnerHTML={{ __html: item.metaInfo.path }} /></span>
              : null}
        </div>
      );
    }
  }

  renderActionItems(item,i) {
    if (item.metaInfo){
      return (
        <span id={`actionIcon_${i}`} className="action_icon glyphicons glyphicons-link" onClick={this.handleActionIconLinkClick} onMouseEnter={this.handleMouseEnter}></span>
      );
    }
  }

  handleContentScroll(e) {
    const transitionDiv = document.getElementById("contentBottomTransition");
    if ((e.target.scrollHeight - e.target.clientHeight - e.target.scrollTop) < 15 || (e.target.scrollLeft > 0)) {
      transitionDiv.style.display = 'none';
    } else {
      transitionDiv.style.display = 'block';
    }
  }

  renderSearchResults() {
    const selectedItem = this.state.selectedIndex > -1 ? this.state.searchResults[this.state.selectedIndex] : null;
    let contentComponent = null;
    if (selectedItem) {
      if (selectedItem.type === 'gdrive') {
        contentComponent = (<GdriveContent openExternalLink={this.openExternalLink} item={selectedItem} />);
      } else if (selectedItem.type === 'intercom') {
        contentComponent = (<IntercomContent item={selectedItem} />);
      }
    }
    return (
      <div className="search_suggestions" id="searchSuggestions" onKeyUp={this.handleKeyUp} onKeyDown={this.handleContentKeyDown}>
        <div className="search_suggestions_list" id="searchSuggestionsList">
          <Scrollbars autoHeight autoHeightMin={0} autoHeightMax={397} style={{ border: 'none' }} ref="scrollbars">
            <ul id="searchSuggestionsList">
              {this.state.searchResults.map(this.renderItem)}
            </ul>
          </Scrollbars>
        </div>
        <div className="search_suggestions_content" id="searchSuggestionsContent" onKeyDown={this.handleContentKeyDown} onScroll={this.handleContentScroll} tabIndex="0">
          {contentComponent}
          <div className="content_bottom_view_link" onClick={this.handleExternalLink}>View in App<span className="glyphicons glyphicons-new-window"></span></div>
        </div>
      </div>
    );
  }

  renderEmptyResults() {
    return (
      <div className="search_suggestions" id="searchSuggestions" onKeyUp={this.handleKeyUp} onKeyDown={this.handleContentKeyDown}>
        <div className="search_suggestions_list" id="searchSuggestionsList">
          <div className="empty_results_set">Sorry, your search did not match any items.</div>
        </div>
        <div className="search_suggestions_content" id="searchSuggestionsContent" tabIndex="0">
        </div>
      </div>
    );
  }

  render() {
    const open = this.state.searchResults.length > 0;
    return (
      <div className="search_root">
        <SearchBar
          onKeyUp={this.handleKeyUp}
          onKeyDown={this.handleKeyDown}
          onInput={this.handleInput}
          className={"search_bar_open"}
          id="searchBar"
          ref="searchBar"
          selectedIndex={this.state.selectedIndex}
          clearInput={this.state.clearInput}
        />
        {open ? this.renderSearchResults() : this.renderEmptyResults()}
      </div>
    );
  }
}
