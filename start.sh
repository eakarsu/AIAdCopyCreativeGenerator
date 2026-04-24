#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║   AI Ad Copy & Creative Generator            ║${NC}"
echo -e "${PURPLE}║   Starting Application...                    ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════╝${NC}"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Load env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Kill processes on used ports
echo -e "\n${YELLOW}[1/6] Cleaning up ports $BACKEND_PORT and $FRONTEND_PORT...${NC}"
kill_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "${RED}  Killing processes on port $port: $pids${NC}"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  else
    echo -e "${GREEN}  Port $port is free${NC}"
  fi
}
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

# Check PostgreSQL
echo -e "\n${YELLOW}[2/6] Checking PostgreSQL...${NC}"
if command -v pg_isready &>/dev/null; then
  if pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} &>/dev/null; then
    echo -e "${GREEN}  PostgreSQL is running${NC}"
  else
    echo -e "${RED}  PostgreSQL is not running. Attempting to start...${NC}"
    if command -v brew &>/dev/null; then
      brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
      sleep 2
    fi
  fi
fi

# Create database if not exists
echo -e "\n${YELLOW}[3/6] Setting up database...${NC}"
DB_NAME=${DB_NAME:-adcopy_generator}
DB_USER=${DB_USER:-postgres}
if psql -U "$DB_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo -e "${GREEN}  Database '$DB_NAME' exists${NC}"
else
  echo -e "${BLUE}  Creating database '$DB_NAME'...${NC}"
  createdb -U "$DB_USER" "$DB_NAME" 2>/dev/null || psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo -e "${YELLOW}  Could not create DB - it may already exist${NC}"
fi

# Install dependencies
echo -e "\n${YELLOW}[4/6] Installing dependencies...${NC}"
cd "$PROJECT_DIR/backend"
if [ ! -d node_modules ]; then
  npm install
else
  echo -e "${GREEN}  Backend dependencies already installed${NC}"
fi

cd "$PROJECT_DIR/frontend"
if [ ! -d node_modules ]; then
  npm install
else
  echo -e "${GREEN}  Frontend dependencies already installed${NC}"
fi

# Seed database
echo -e "\n${YELLOW}[5/6] Seeding database...${NC}"
cd "$PROJECT_DIR/backend"
node src/seed.js

# Start services with hot reload
echo -e "\n${YELLOW}[6/6] Starting services with hot reload...${NC}"
cd "$PROJECT_DIR/backend"
npx nodemon src/server.js &
BACKEND_PID=$!
echo -e "${GREEN}  Backend starting on port $BACKEND_PORT (PID: $BACKEND_PID) with nodemon hot reload${NC}"

cd "$PROJECT_DIR/frontend"
npx vite --port $FRONTEND_PORT &
FRONTEND_PID=$!
echo -e "${GREEN}  Frontend starting on port $FRONTEND_PORT (PID: $FRONTEND_PID) with Vite HMR${NC}"

echo -e "\n${PURPLE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║   Application Ready!                         ║${NC}"
echo -e "${PURPLE}║                                              ║${NC}"
echo -e "${PURPLE}║   Frontend: http://localhost:$FRONTEND_PORT          ║${NC}"
echo -e "${PURPLE}║   Backend:  http://localhost:$BACKEND_PORT          ║${NC}"
echo -e "${PURPLE}║                                              ║${NC}"
echo -e "${PURPLE}║   Demo Login:                                ║${NC}"
echo -e "${PURPLE}║   Email: admin@adcopy.ai                     ║${NC}"
echo -e "${PURPLE}║   Password: admin123                         ║${NC}"
echo -e "${PURPLE}║                                              ║${NC}"
echo -e "${PURPLE}║   Press Ctrl+C to stop all services          ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════╝${NC}"

# Cleanup on exit
cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  # Also kill any remaining nodemon/vite processes
  pkill -f "nodemon src/server.js" 2>/dev/null || true
  pkill -f "vite --port $FRONTEND_PORT" 2>/dev/null || true
  echo -e "${GREEN}All services stopped.${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

wait
