# Change Log

All notable changes to the "ssh-control" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.1] - 2025-09-25

### Added
- **Dedicated Sidebar**: Custom activity bar icon with "SSH Control" view container
- **Tree View Interface**: Hierarchical display of SSH server groups and hosts
- **JSON Configuration**: File-based configuration system (`ssh-config.json`)
- **Connection Management**: 
  - Double-click to connect to SSH servers
  - Connect button in inline actions
  - Opens SSH connections in new editor tabs (not terminal panel)
  - Support for multiple simultaneous sessions to the same server
- **Server Management**:
  - Add/edit/delete SSH server groups
  - Add/edit/delete individual SSH servers
  - Interactive dialogs for server configuration
- **SSH Config Compliance**:
  - Uses `hostName` property (aligned with SSH config standards)
  - Support for `preferredAuthentication` (publickey/password)
  - Group-level defaults with host-level overrides
  - Identity file support with path expansion
- **User Interface**:
  - Refresh button to reload configuration
  - Open config file button for direct editing
  - Context menus for server and group actions
  - Tooltips showing connection details and authentication method
- **Fallback Logic**: Host-level settings override group defaults for user, port, identity file, and authentication method

### Features
- **Supported Authentication**: SSH key (publickey) and password authentication
- **Configuration Flexibility**: Group defaults reduce configuration duplication
- **Multiple Sessions**: Each connection opens in a separate editor tab
- **Path Expansion**: Automatic tilde (~) expansion for identity file paths