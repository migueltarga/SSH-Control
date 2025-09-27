# SSH Control Configuration Examples

This folder contains comprehensive examples showcasing all features of the SSH Control extension.

## Example Files

### 1. Simple Connections (`01-simple-connections.json`)
- Basic configuration with flat group structure
- Demonstrates group-level defaults and host overrides
- Shows different authentication methods (publickey vs password)

**Features demonstrated:**
- Single-level groups with hosts
- Default user, port, and authentication settings
- Host-level overrides for specific settings

### 2. Nested Groups (`02-nested-groups.json`)
- Multi-level nested group structure
- Complex organizational hierarchy
- Groups within groups for better organization

**Features demonstrated:**
- Nested group structures (groups containing other groups)
- Deep hierarchy organization (Production > Backend Services > Database Cluster)
- Mixed host and group nesting

### 3. Inheritance Settings (`03-inheritance-settings.json`)
- Comprehensive inheritance demonstration
- Shows how settings cascade from parent to child
- Multiple inheritance levels

**Features demonstrated:**
- Settings inheritance from root to leaf nodes
- Override patterns at different levels
- Different authentication methods and keys per region/environment

### 4. Remote Configuration (`04-remote-config.json`)
- Remote host fetching from HTTP endpoints
- Basic authentication for secured endpoints
- Timestamp placeholders for cache busting

**Features demonstrated:**
- `remoteHosts` configuration with HTTP endpoints
- Basic authentication (`username`/`password`)
- Dynamic URLs with `[timestamp]` placeholder
- Mixing local and remote configurations

### 5. Host-Level Snippets (`05-host-level-snippets.json`)
- Command snippets defined at the host level
- Server-specific automation commands
- Real-world operational snippets

**Features demonstrated:**
- Host-specific command snippets
- Practical examples for different server types (frontend, API, database)
- Operational automation commands

### 6. Group-Level Snippets (`06-group-level-snippets.json`)
- Command snippets defined at group levels
- Snippet inheritance from parent to child
- Hierarchical snippet organization

**Features demonstrated:**
- Group-level snippet definitions
- Snippet inheritance (child hosts get parent group snippets)
- Multiple levels of snippet inheritance
- Mix of group and host-level snippets

### 7. Complete Example (`07-complete-example.json`)
- Comprehensive configuration using all features
- Production-ready example with real-world scenarios
- Combines all extension capabilities

**Features demonstrated:**
- Nested groups with inheritance
- Multi-level snippet inheritance
- Remote configuration integration
- Mixed authentication methods
- Real-world operational commands
- Complex organizational structure

## Usage Instructions

1. **Copy any example file** to your SSH Control configuration location:
   - Default: `~/.ssh-control/ssh-config.json`
   - Or use the "Open Config" button in the SSH Control sidebar

2. **Modify the examples** to match your infrastructure:
   - Replace example hostnames with your actual servers
   - Update usernames, ports, and authentication methods
   - Customize snippets for your specific use cases

3. **Test the configuration**:
   - Use the "Refresh" button in SSH Control sidebar
   - Expand groups to see the hierarchical structure
   - Right-click on hosts to connect
   - Right-click in SSH terminals to access snippets

## Configuration Tips

### Inheritance Order
Settings are inherited in this order (most specific wins):
1. Host-level settings
2. Direct parent group settings  
3. Grandparent group settings
4. Root group settings

### Snippet Inheritance
Snippets are aggregated from all parent groups:
- Child hosts inherit ALL snippets from parent groups
- Host-level snippets are added to inherited snippets
- Duplicate commands (same `command` text) are deduplicated

### Remote Configuration
- Remote endpoints should return JSON in the same format
- Use `[timestamp]` in URLs to prevent caching
- Remote data is cached for 5 minutes by default
- Remote data is additive (merged with local configuration)

### Best Practices
- Use descriptive names for groups and hosts
- Organize by environment, function, or location
- Define common settings at higher group levels
- Use snippets for frequently executed commands
- Test remote endpoints before deploying
- Use meaningful snippet names and commands

## Authentication Methods

### Public Key Authentication
```json
{
  "defaultPreferredAuthentication": "publickey",
  "defaultIdentityFile": "~/.ssh/your_key"
}
```

### Password Authentication
```json
{
  "defaultPreferredAuthentication": "password"
}
```

### Mixed Authentication
Different groups can use different authentication methods, and hosts can override group defaults.

## Remote Configuration Format

Remote endpoints should return JSON matching this structure:
```json
{
  "hosts": [
    {
      "name": "Remote Server",
      "hostName": "remote.example.com"
    }
  ],
  "groups": [
    {
      "name": "Remote Group",
      "hosts": [...]
    }
  ]
}
```

## Troubleshooting

1. **Configuration not loading**: Check JSON syntax with a validator
2. **Hosts not appearing**: Verify remote endpoints are accessible
3. **Snippets not showing**: Ensure you're right-clicking in an SSH terminal
4. **Inheritance not working**: Check group nesting and property names
5. **Authentication failing**: Verify key paths and permissions

For more information, see the main SSH Control extension documentation.