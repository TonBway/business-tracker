# Business Tracker

A self-hosted income & expense tracking web app.
Stack: React + Vite → Nginx | Node/Express + SQLite | Docker Compose

---

## Prerequisites

- [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) installed and running

---

## Quick Start

### 1. Clone / extract this folder

Place the `business-tracker` folder anywhere on your machine, e.g.:
```
C:\Projects\business-tracker
```

### 2. Open PowerShell or Command Prompt in that folder

```powershell
cd C:\Projects\business-tracker
```

### 3. Build and start the app

```powershell
docker compose up -d --build
```

First run takes 2–4 minutes to build both images.

### 4. Open the app

On your own machine:
```
http://localhost
```

From any other device on your local network:
```
http://<your-windows-ip>
```

To find your Windows IP:
```powershell
ipconfig
# Look for IPv4 Address under your active adapter e.g. 192.168.1.50
```

---

## Useful Commands

| Action | Command |
|--------|---------|
| Start app | `docker compose up -d` |
| Stop app | `docker compose down` |
| View logs | `docker compose logs -f` |
| Rebuild after code change | `docker compose up -d --build` |
| Check running containers | `docker compose ps` |

---

## Data Persistence

Transaction data is stored in a Docker named volume called `business-tracker-data`.
It survives container restarts and rebuilds. To back it up:

```powershell
# Copy the SQLite file out of the volume
docker run --rm -v business-tracker-data:/data -v ${PWD}:/backup alpine cp /data/tracker.db /backup/tracker-backup.db
```

---

## Firewall Note (Windows)

If other devices on your network can't reach the app, allow port 80 through Windows Firewall:

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Business Tracker" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
```

---

## Stopping & Cleanup

```powershell
# Stop containers (keeps data)
docker compose down

# Stop AND delete all data (irreversible)
docker compose down -v
```
