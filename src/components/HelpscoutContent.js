import React, {Component} from 'react';
import ReactDOM from 'react-dom';

export default class HelpscoutContent extends Component {
  constructor(props) {
    super();
    this.handleClick = ::this.handleClick;
  }

  componentDidMount() {
    // force didUpdate on initial rendering
    this.componentDidUpdate();
  }

  componentDidUpdate() {
    let cItems = document.getElementsByClassName("conversation_item");
    if (cItems) {
      for (let cItem of cItems) {
        let links = cItem.getElementsByTagName('a');
        if (links) {
          for (let link of links) {
            link.addEventListener("click", this.handleClick, false);
            link.className = 'content_link';
          }
        }
      }
    }
  }

  handleClick(e) {
    e.preventDefault();
    // get actual <a> tag
    let el = e.target;
    while(el.nodeName !== 'A') {
      el = el.parentElement;
      if (el.className === 'content_section_text' || el.nodeName === 'BODY') {
        // oops, no anchor tag found
        return;
      }
    }
    this.props.openExternalLink(el.href, 'Helpscout content link', 'helpscout');
  }

  renderUsers(item, title, groupIndex) {
    if (!item.metaInfo || !item.metaInfo.users || item.metaInfo.users.length == 0) {
      return null;
    }
    return (
      <div className='content_section'>
        <div className="content_section_title">{title}</div>
        <div className="avatars">
            {item.metaInfo.users.map((user, i) => (
                    user.avatar ? <div key={`avatar_${i}_${user.name}`} style={{ backgroundImage: 'url(' + user.avatar + ')' }} className={user.nameHighlight ? "avatar active" : "avatar"} />
                                : <div key={`avatar_${i}_${user.name}`} className={user.nameHighlight ? "avatar no_avatar active" : "avatar no_avatar"}>{this.initials(user.name)}</div>))}
        </div>
      </div>
    )
  }

  renderConversations(userId, conversations) {
    if (!conversations || conversations.length == 0) {
      return null;
    }
    return (
      <div className='content_section'>
        <div className="content_section_title">Conversations</div>
        <div className="content_section_text content_section_conversation">
          {conversations.map((c, i) => (
            <div className="conversation_group" key={`conversation_${userId}_${i}`}>
              <div className="status">
                <a className="content_link" href={`https://secure.helpscout.net/conversation/${c.id}`} onClick={this.handleClick}>
                  <span dangerouslySetInnerHTML={{ __html: `${c.number}: ${c.subject}` }} />
                </a>
                <span className="sub_status" dangerouslySetInnerHTML={{ __html: `${c.mailbox}:&nbsp;${this.renderAssigned(c.assigned, c.status)}${c.status}` }} />
              </div>
              <div className="conversation_items">
                {c.items.map((item, k) => (
                  <div className="conversation_item" key={`conversationItem_${userId}_${k}`}>
                    <div className={userId == item.authorId ? "message_customer" : "message_user"}>
                      <div className="message_body" dangerouslySetInnerHTML={{ __html: item.body }} />
                      <div className="conversation_meta">
                        <span dangerouslySetInnerHTML={{ __html: item.author }} />&nbsp;—&nbsp;{item.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  render() {
    const item = this.props.item;
    if (!item) {
      return null;
    }
    return (
      <div>
        {this.renderUsers(item, 'Collaborators', 1)}
        <div className='content_section'>
          <div className="content_section_title">User info</div>
          <div className="content_section_text">
            <div className="content_row">
              <div className="content_attribute_name">Name</div>
              <div className="content_attribute_value" dangerouslySetInnerHTML={{ __html: item.content.name || '/' }} />
            </div>
            <div className="content_row">
              <div className="content_attribute_name">Email</div>
              <div className="content_attribute_value no_capitalize" dangerouslySetInnerHTML={{ __html: item.content.emails || '/' }} />
            </div>
            <div className="content_row">
              <div className="content_attribute_name">Organization</div>
              <div className="content_attribute_value" dangerouslySetInnerHTML={{ __html: item.content.company || '/' }} />
            </div>
            <div className="content_row">
              <div className="content_attribute_name">Last Mailbox</div>
              <div className="content_attribute_value">
                { item.content.mailbox ? (
                  <a className="content_link" href={`https://secure.helpscout.net/mailbox/${item.content.mailboxId}`} onClick={this.handleClick}>
                    <span dangerouslySetInnerHTML={{ __html: item.content.mailbox }} />
                  </a>) : '/' }
              </div>
            </div>
            <div className="content_row">
              <div className="content_attribute_name">Last Status</div>
              <div className="content_attribute_value">{item.content.status || '/'}</div>
            </div>
          </div>
        </div>
        {this.renderConversations(item.userId, item.content.conversations)}
      </div>
    )
  }

  // ---- UTILITIES
  initials(username) {
    return username.split(' ').map(x => x[0]).slice(0, 2).join('');
  }

  renderAssigned(assigned, status) {
    let s = status.toLowerCase();
    if (s == 'active' || s == 'pending'){
      return assigned + '&nbsp;/&nbsp;';
    }
    return '';
  }
}
