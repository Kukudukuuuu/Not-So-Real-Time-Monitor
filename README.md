# Kuku Monitor

A sleek, terminal-aesthetic system monitoring dashboard built with Node.js and vanilla HTML/CSS/JS.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Kuku+Monitor+Preview)

## Features

- **Real-time CPU Usage** - Live CPU percentage with visual bar
- **Memory Monitoring** - Used/Free RAM with percentage
- **Load Average** - System load (1m, 5m, 15m)
- **Network I/O** - Upload/Download speed in KB/s
- **Process List** - Top running processes by memory usage
- **System Logs** - Simulated live log output
- **CRT Effects** - Scanlines, flicker, and terminal glow

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Open **http://localhost:3001** in your browser.

## Project Structure

```
terminal-monitor/
├── index.html      # Frontend (terminal UI)
├── server.js       # Backend (API + static files)
├── package.json   # Dependencies
├── .gitignore     # Git ignore rules
└── README.md      # This file
```

## How It Works

- **Backend (Node.js)**: Uses `os` module to read real system metrics
  - CPU usage via `os.cpus()` times
  - Memory via `os.totalmem()` / `os.freemem()`
  - Network via PowerShell (Windows) or `/proc/net/dev` (Linux)
  - Processes via `Get-Process` (Windows) or `ps aux` (Linux)

- **Frontend (HTML/JS)**: Fetches from `/api/metrics` every 2 seconds
  - Fallback demo mode if server not running
  - Terminal-style CSS with scanline effects

## Supported Platforms

- **Windows** - Full support with PowerShell commands
- **Linux/macOS** - Full support via native commands (`ps aux`, `/proc/net/dev`, `os.loadavg`)

## License

MIT