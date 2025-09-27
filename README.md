# SSH Control

Manage SSH connections from VSCode

![screenshot](https://github.com/migueltarga/SSH-Control/blob/main/screenshots/image.png?raw=true)

## Features

- Sidebar tree view with hierarchical server groups
- **Nested groups with inheritance** - organize servers in unlimited hierarchy levels
- Double-click to connect via SSH
- Add/edit/delete servers and groups
- **Add child groups** - create nested organization structure
- JSON configuration file with inheritance support
- Multiple sessions per server

## Usage

1. Click the server icon in the activity bar
2. Add groups and servers using the toolbar buttons
3. **Add child groups** using the folder icon button on any group
4. Double-click a server to connect
5. Use the gear icon to edit the config file directly

### Working with Nested Groups

- **Add Child Group**: Click the folder icon (📁) next to any group to create a nested group
- **Add Server**: Click the plus icon (+) next to any group to add a server to that group  
- **Inheritance**: Child groups and servers automatically inherit SSH settings from parent groups
- **Override Settings**: More specific settings always override inherited ones

## Configuration

Creates `ssh-config.json` in your workspace or `~/.ssh-control/`:

```json
{
  "groups": [
    {
      "name": "Production",
      "user": "ubuntu",
      "port": 22,
      "keyPath": "~/.ssh/prod_key",
      "hosts": [
        {
          "name": "web-server",
          "hostName": "10.0.1.10"
        }
      ],
      "groups": [
        {
          "name": "Database",
          "port": 3306,
          "hosts": [
            {
              "name": "db-server",
              "hostName": "10.0.2.10",
              "user": "dbadmin"
            }
          ]
        }
      ]
    }
  ]
}
```

### Remote Hosts

Groups can fetch server lists from remote URLs, enabling dynamic server discovery and centralized management.

```json
{
  "name": "Database",
  "port": 3306,
  "remoteHosts": {
    "address": "https://api.example.com/servers.json?ts=[timestamp]",
    "basicAuth": {
      "username": "api_user", 
      "password": "api_password"
    }
  },
  "hosts": [
    // Local hosts are merged with remote hosts/groups
  ]
}
```

**Timestamp Placeholder:**
The `[timestamp]` placeholder in URLs gets replaced with the current timestamp (milliseconds since epoch) when the request is made. This is useful for bypassing server-side caching:

```
https://api.example.com/servers.json?ts=[timestamp]
↓ becomes ↓
https://api.example.com/servers.json?ts=1695691234567
```

**Remote JSON Format:**
```json
{
  "hosts": [
    {
      "name": "server-01",
      "hostName": "10.0.1.10",
      "user": "admin"
    }
  ],
  "groups": [
    {
      "name": "Nested Group",
      "defaultUser": "root",
      "hosts": [
        {
          "name": "nested-server",
          "hostName": "10.0.2.10"
        }
      ]
    }
  ]
}
```

**Remote Features:**
- **Automatic Fetching**: Remote data is loaded when the group is expanded
- **Caching**: Remote data is cached for 5 minutes to reduce network calls
- **Full Structure Support**: Supports both hosts and nested groups in remote responses
- **Format Support**: JSON structure or text format (hostname:name:user:port per line)
- **Basic Authentication**: Optional HTTP basic auth support
- **Timestamp Placeholder**: Use `[timestamp]` in URLs to bypass server-side caching
- **Local Merge**: Remote hosts/groups are added to local ones, not replaced
- **Error Handling**: Shows error messages if remote fetch fails, falls back to cache
- **Manual Refresh**: Use "Refresh" button to clear cache and reload

### Command Snippets

Define reusable command snippets at both group and host levels. When you right-click on a terminal window, you'll see available snippets for quick execution.

```json
{
  "groups": [
    {
      "name": "Production",
      "snippets": [
        {
          "name": "Check System Status",
          "command": "systemctl status nginx && df -h && free -m"
        },
        {
          "name": "View Logs",
          "command": "tail -f /var/log/nginx/access.log"
        }
      ],
      "hosts": [
        {
          "name": "web-server-01",
          "hostName": "10.0.1.10",
          "snippets": [
            {
              "name": "Restart Web Service",
              "command": "sudo systemctl restart nginx"
            },
            {
              "name": "Check SSL Certificate",
              "command": "openssl x509 -in /etc/ssl/certs/nginx.crt -text -noout | grep -A2 Validity"
            }
          ]
        }
      ]
    }
  ]
}
```

**Snippet Features:**
- **Hierarchical Inheritance**: Host snippets are combined with group snippets
- **Right-click Access**: Right-click on any SSH terminal to see available snippets
- **Quick Execution**: Select a snippet to run it immediately in the active terminal
- **Command Search**: Filter snippets by name or command content
- **No Duplicates**: Duplicate commands are automatically filtered out

