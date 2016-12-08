import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
require('../css/style-settings.scss');

export default class Settings extends Component {
  constructor(props){
    super();
    this.handleSave = ::this.handleSave;
    this.handleKeyDown = ::this.handleKeyDown;
    this.handleKeyUp = ::this.handleKeyUp;
    this.handleChange = ::this.handleChange;
    this.state = {
      settings: {
        account: {},
        globalShortcut: 'Cmd+Backspace',
        showTrayIcon: true,
        showDockIcon: true
      },
      newShortcut: '',
      newTrayIcon: false,
      newDockIcon: false,
      errorMessage: ''
    }
    this.keyCombo = [];
  }

  componentDidMount() {
    ipcRenderer.on('settings-result', (event, arg) => {
      this.setState({
        settings: arg,
        newTrayIcon: arg.showTrayIcon,
        newDockIcon: arg.showDockIcon
      });
    });
    ipcRenderer.on('settings-save-failed', (event, msg) => {
      this.setState({ errorMessage: msg });
    });
    ipcRenderer.send('settings-load');
  }

  handleClose(e) {
    e.preventDefault();
    ipcRenderer.send('close-settings');
  }

  handleLogout(e) {
    e.preventDefault();
    ipcRenderer.send('logout');
  }

  handleAccount(e) {
    e.preventDefault();
    ipcRenderer.send('account');
  }

  handleSave(e) {
    e.preventDefault();
    let settings = Object.assign({}, this.state.settings);
    settings.showTrayIcon = this.state.newTrayIcon;
    settings.showDockIcon = this.state.newDockIcon;
    if (this.state.newShortcut) {
      settings.globalShortcut = this.state.newShortcut;
    }
    ipcRenderer.send('settings-save', settings);
  }

  handleKeyUp(e) {
    this.keyCombo = [];
  }

  handleChange(e) {
    if (e.target.id === 'checkTray') {
      this.setState({ newTrayIcon: e.target.checked });
    } else if (e.target.id === 'checkDock') {
      this.setState({ newDockIcon: e.target.checked });
    }
  }

  handleKeyDown(e) {
    e.preventDefault();
    let key = e.key;
    if (e.keyCode === 32) {
      key = 'Space';
    }
    if (key === 'Meta') {
      key = 'Cmd';
    }
    if (key === 'Alt') {
      key = 'Option';
    }
    if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) {
      this.keyCombo.push(key);
      this.setState({ newShortcut: this.keyCombo.join('+') });
      return;
    }
    if (key === 'Backspace') {
      this.keyCombo = [];
      this.setState({ newShortcut: '' });
    }
  }

  render() {
    return (
      <div>
        <div className="settings_body">
          <div>
            <div className="title">Account</div>
            <div className="options">
              <div className="row">
                <div className="left">
                  Username:
                </div>
                <div className="right">
                  {this.state.settings.account.username}
                </div>
              </div>
              <div className="row">
                <div className="left">
                  Email:
                </div>
                <div className="right">
                  {this.state.settings.account.email}
                </div>
              </div>
              <div className="both">
                <div className="actions">
                  <a href="#" onClick={this.handleAccount}>Integrations</a>
                  <a href="#" onClick={this.handleLogout}>Logout</a>
                </div>
              </div>
            </div>
          </div>
          <hr />
          <div>
            <div className="title">Set Global Shortcut</div>
            <div className="options">
              <div className="row">
                <div className="left">
                  Currently:
                </div>
                <div className="right">
                  {this.state.settings.globalShortcut}
                </div>
              </div>
              <div className="row">
                <div className="left">
                  Change to:
                </div>
                <div className="right">
                  <input
                    type="text"
                    placeholder="Press a key combination"
                    onKeyUp={this.handleKeyUp}
                    onKeyDown={this.handleKeyDown}
                    value={this.state.newShortcut} />
                </div>
              </div>
              {this.state.errorMessage ? (
                <div className="row">
                  <div className="left" />
                  <div className="error">
                    {this.state.errorMessage}
                  </div>
                </div>
                ) : null}
            </div>
          </div>
          <hr />
          <div>
            <div className="title">Miscellaneous</div>
            <div className="options">
              <div className="both">
                <label><input type="checkbox" id="checkTray" value="showTrayIcon" onChange={this.handleChange} checked={this.state.newTrayIcon} /><span>Show Cuely icon in tray</span></label>
              </div>
              <div className="both">
                <label><input type="checkbox" id="checkDock" value="showDockIcon" onChange={this.handleChange} checked={this.state.newDockIcon} /><span>Show Cuely icon in dock</span></label>
              </div>
            </div>            
          </div>
        </div>
        <div className="login_actions">
          <a href="#" onClick={this.handleSave}>Save</a>
          <a href="#" className="cancel" onClick={this.handleClose}>Cancel</a>
        </div>
      </div>
    );
  }
}
