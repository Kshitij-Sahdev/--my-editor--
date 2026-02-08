#!/usr/bin/env bash

echo "🚀 Starting full system..."

#####################################
# Detect OS (Termux / Linux / Mac)
#####################################
OS="$(uname -s)"

if [[ "$OS" == *"Android"* ]]; then
  echo "📱 Running on Termux"
fi

#####################################
# Kill old ports (avoid chaos)
#####################################
kill_port () {
  PORT=$1
  PID=$(lsof -t -i:$PORT 2>/dev/null)
  if [ ! -z "$PID" ]; then
    echo "🧹 Killing process on port $PORT"
    kill -9 $PID
  fi
}

kill_port 8080
kill_port 5173

#####################################
# Start BACKEND
#####################################
echo "⚙️ Starting backend..."
(cd backend && go run main.go &) 

sleep 2

#####################################
# Start FRONTEND
#####################################
echo "🎨 Starting frontend..."
(cd frontend && npm run dev &) 

sleep 5

#####################################
# Start CLOUDFLARED (single tunnel)
#####################################
echo "🌍 Starting Cloudflare tunnel..."

cloudflared tunnel --protocol http2 2>&1 | while read -r line
do
  echo "$line"

  # Auto extract public link
  if [[ "$line" == *"trycloudflare.com"* ]]; then
      URL=$(echo "$line" | grep -o 'https://[^ ]*trycloudflare.com')
      echo ""
      echo "🔥 PUBLIC LINK READY:"
      echo "$URL"
      echo ""
      echo "📲 Copy this and send to anyone."
  fi
done
