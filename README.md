# SSH Control

Manage SSH connections from VSCode

## Features

- Sidebar tree view with server groups
- Double-click to connect via SSH
- Add/edit/delete servers and groups
- JSON configuration file
- Multiple sessions per server

## Usage

1. Click the server icon in the activity bar
2. Add groups and servers using the toolbar buttons
3. Double-click a server to connect
4. Use the gear icon to edit the config file directly

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

