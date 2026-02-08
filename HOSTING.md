# Hosting Guide

Complete guide to deploying your code editor to the internet.

---

## Quick Start (Local + Tunnel)

The easiest way to share your editor:

```bash
# Make script executable (first time only)
chmod +x start.sh

# Start with public tunnel
./start.sh tunnel
```

This will:
1. Build and start the Go backend
2. Build and serve the React frontend
3. Create a Cloudflare Quick Tunnel with a public URL

The tunnel URL looks like: `https://random-words.trycloudflare.com`

---

## Deployment Options

### Option 1: Cloudflare Tunnel (Recommended)

**Best for:** Personal hosting, no server costs, works behind NAT

#### Quick Tunnel (No account needed)
```bash
./start.sh tunnel
```
- Pros: Instant, no signup
- Cons: Random URL changes each restart

#### Persistent Tunnel (Free account)
1. Create a [Cloudflare account](https://dash.cloudflare.com/sign-up)
2. Install cloudflared and login:
   ```bash
   cloudflared login
   ```
3. Create a tunnel:
   ```bash
   cloudflared tunnel create my-editor
   ```
4. Configure the tunnel (create `~/.cloudflared/config.yml`):
   ```yaml
   tunnel: your-tunnel-id
   credentials-file: /home/youruser/.cloudflared/your-tunnel-id.json
   
   ingress:
     - hostname: editor.yourdomain.com
       service: http://localhost:5173
     - hostname: api.yourdomain.com
       service: http://localhost:8080
     - service: http_status:404
   ```
5. Add DNS records in Cloudflare dashboard:
   - `editor.yourdomain.com` → CNAME → `your-tunnel-id.cfargotunnel.com`
   - `api.yourdomain.com` → CNAME → `your-tunnel-id.cfargotunnel.com`

6. Run the tunnel:
   ```bash
   cloudflared tunnel run my-editor
   ```

7. Update frontend to use API domain:
   ```typescript
   // frontend/src/components/XTerminal.tsx
   const WS_URL = "wss://api.yourdomain.com/ws";
   ```

---

### Option 2: VPS/EC2 Deployment

**Best for:** Production, full control, reliability

#### Prerequisites
- Ubuntu 22.04+ VPS (DigitalOcean, Linode, AWS EC2, etc.)
- Domain name pointing to server IP
- Docker installed

#### Setup Steps

1. **SSH into your server:**
   ```bash
   ssh root@your-server-ip
   ```

2. **Install dependencies:**
   ```bash
   # Update system
   apt update && apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com | sh
   
   # Install Go
   wget https://go.dev/dl/go1.22.0.linux-amd64.tar.gz
   tar -C /usr/local -xzf go1.22.0.linux-amd64.tar.gz
   echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
   source ~/.bashrc
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt install -y nodejs
   
   # Install Caddy (reverse proxy with auto-HTTPS)
   apt install -y debian-keyring debian-archive-keyring apt-transport-https
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy.list
   apt update && apt install caddy
   ```

3. **Clone and build:**
   ```bash
   git clone https://github.com/yourusername/my-editor.git /opt/editor
   cd /opt/editor
   
   # Build backend
   cd backend
   go build -o server .
   
   # Build frontend
   cd ../frontend
   npm install
   npm run build
   ```

4. **Build Docker runners:**
   ```bash
   cd /opt/editor/backend/runners
   docker build -t runner-python python/
   docker build -t runner-javascript js/
   docker build -t runner-go go/
   docker build -t runner-cpp cpp/
   docker build -t runner-java java/
   ```

5. **Create systemd services:**

   `/etc/systemd/system/editor-backend.service`:
   ```ini
   [Unit]
   Description=Code Editor Backend
   After=network.target docker.service
   
   [Service]
   Type=simple
   User=root
   WorkingDirectory=/opt/editor/backend
   ExecStart=/opt/editor/backend/server
   Restart=always
   RestartSec=5
   Environment=JUDGE0_API_KEY=your-api-key
   
   [Install]
   WantedBy=multi-user.target
   ```

   `/etc/systemd/system/editor-frontend.service`:
   ```ini
   [Unit]
   Description=Code Editor Frontend
   After=network.target
   
   [Service]
   Type=simple
   User=root
   WorkingDirectory=/opt/editor/frontend
   ExecStart=/usr/bin/npx serve -s dist -l 5173
   Restart=always
   RestartSec=5
   
   [Install]
   WantedBy=multi-user.target
   ```

6. **Configure Caddy (auto-HTTPS):**

   `/etc/caddy/Caddyfile`:
   ```
   editor.yourdomain.com {
       reverse_proxy localhost:5173
   }
   
   api.yourdomain.com {
       reverse_proxy localhost:8080
   }
   ```

7. **Start everything:**
   ```bash
   systemctl daemon-reload
   systemctl enable editor-backend editor-frontend caddy
   systemctl start editor-backend editor-frontend caddy
   ```

8. **Update frontend API URL:**
   Edit `frontend/src/components/XTerminal.tsx`:
   ```typescript
   const WS_URL = "wss://api.yourdomain.com/ws";
   ```
   Then rebuild: `cd frontend && npm run build`

---

### Option 3: Docker Compose (Recommended for Production)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    restart: always
    environment:
      - JUDGE0_API_KEY=${JUDGE0_API_KEY}

  frontend:
    build: ./frontend
    ports:
      - "5173:80"
    restart: always
    depends_on:
      - backend

  caddy:
    image: caddy:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    restart: always

volumes:
  caddy_data:
```

Create `backend/Dockerfile`:
```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o server .

FROM alpine:latest
RUN apk add --no-cache docker-cli
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]
```

Create `frontend/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

Run:
```bash
docker-compose up -d
```

---

### Option 4: Termux (Android)

**Best for:** Mobile hosting, testing

```bash
# Install packages
pkg update && pkg upgrade -y
pkg install golang nodejs proot-distro

# Install Ubuntu (for Docker)
proot-distro install ubuntu
proot-distro login ubuntu

# Inside Ubuntu
apt update && apt install docker.io -y

# Clone and run
git clone https://github.com/yourusername/my-editor.git
cd my-editor
./start.sh

# For public access, use ngrok or cloudflared
```

**Note:** Docker in Termux requires proot-distro with Ubuntu. Performance will be limited.

---

## Domain Setup

### Using Cloudflare (Recommended)

1. Buy a domain from any registrar (Namecheap, Google Domains, etc.)
2. Add the domain to Cloudflare (free plan works)
3. Update nameservers at your registrar to Cloudflare's
4. Add DNS records:
   - If using tunnel: CNAME records pointing to tunnel
   - If using VPS: A records pointing to server IP

### SSL/HTTPS

- **Cloudflare Tunnel:** Automatic HTTPS
- **Caddy:** Automatic HTTPS via Let's Encrypt
- **nginx:** Use Certbot for free certificates

---

## Environment Variables

Create `.env` file:
```bash
# Optional: Judge0 API key for fallback
JUDGE0_API_KEY=your-api-key

# Backend port
PORT=8080
```

---

## Security Checklist

- [ ] Backend runs as non-root user
- [ ] Docker socket permissions restricted
- [ ] Rate limiting enabled
- [ ] CORS configured for your domain
- [ ] HTTPS enabled
- [ ] Firewall configured (only 80, 443 open)
- [ ] Docker containers have resource limits
- [ ] Regular security updates

---

## Monitoring

### Health Check
```bash
curl http://localhost:8080/health
```

### Logs
```bash
# systemd
journalctl -u editor-backend -f
journalctl -u editor-frontend -f

# Docker
docker-compose logs -f
```

---

## Troubleshooting

### Backend won't start
- Check Docker is running: `systemctl status docker`
- Check port not in use: `lsof -i :8080`
- Check logs: `./server 2>&1 | head -100`

### Frontend build fails
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node version: `node --version` (need 18+)

### Tunnel not working
- Check cloudflared is installed: `cloudflared --version`
- Try quick tunnel first: `cloudflared tunnel --url http://localhost:5173`

### Docker permission denied
- Add user to docker group: `sudo usermod -aG docker $USER`
- Re-login or run: `newgrp docker`

---

## Cost Estimate

| Option | Cost |
|--------|------|
| Cloudflare Tunnel | Free |
| DigitalOcean Droplet | $4-12/mo |
| AWS EC2 t3.micro | ~$8/mo |
| Linode Nanode | $5/mo |
| Domain | $10-15/year |

---

Happy hosting! 🚀
