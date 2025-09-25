# SSH Control

Manage SSH connections with a sidebar tree view. Connect to servers in new terminal tabs directly from VSCode.

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
      "name": "Development",
      "defaultUser": "root",
      "defaultPort": 22,
      "hosts": [
        {
          "hostName": "server.example.com",
          "name": "My Server",
          "user": "ubuntu",
          "port": 2222,
          "identityFile": "~/.ssh/key.pem",
          "preferredAuthentication": "publickey"
        }
      ]
    }
  ]
}
```
