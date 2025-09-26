# SSH Control

Manage SSH connections from VSCode

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

