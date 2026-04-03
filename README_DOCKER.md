# Solara Docker Deployment (Debian ARM)

This project can run on Debian ARM hosts (for example arm64 VPS or Raspberry Pi) with Docker Compose.

## Requirements

- Docker Engine
- Docker Compose plugin (`docker compose`)

## Quick Start

```bash
docker compose up -d --build
```

Open: `http://<server-ip>:8080`

## Current Docker Setup

- Base image: `node:20-bookworm-slim` (Debian-based, ARM-friendly)
- Compose platform: `linux/arm64`
- Container port: `8080`
- Host bind mount: `./downloads:/app/downloads`

## Useful Commands

```bash
# Start / rebuild
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down
```

## Notes

- The app uses `https://music-api.gdstudio.xyz/api.php` as upstream API.
- Downloaded files are saved in the host `downloads` directory.
