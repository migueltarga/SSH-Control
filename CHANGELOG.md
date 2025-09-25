# Change Log

All notable changes to the "ssh-control" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.1.0] - 2025-01-27

### Added
- **Nested Groups with Inheritance**: Support for hierarchical group organization
  - Groups can contain other groups for better organization
  - Full SSH configuration inheritance from parent to child groups
  - Settings cascade down the hierarchy (host > child group > parent group)
  - Automatic resolution of effective SSH settings for connections

### Changed
- Updated tree view to display nested group structures
- Enhanced SSH connection logic to use inherited configurations
- Improved dialogs to work with nested group paths

### Technical
- Refactored data structures to support nested groups
- Added inheritance utility for resolving effective SSH settings
- Updated all CRUD operations to work with group paths instead of simple indexes

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