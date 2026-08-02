#!/usr/bin/env bash

# ==============================================================================
# Spring Boot Microservices + Angular - Full Stack Startup Script (Bash)
# ==============================================================================

set -e

# Color definitions
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo -e "${CYAN}==============================================================${NC}"
echo -e "${CYAN}   Spring Boot 3 Microservices + Angular Full Stack Launcher  ${NC}"
echo -e "${CYAN}==============================================================${NC}"

# Check Java JDK location if JAVA_HOME is not set
JDK_DIR="C:/Users/Fahad/.gradle/jdks/eclipse_adoptium-17-amd64-windows.2/bin"
if [ -d "$JDK_DIR" ]; then
  export PATH="$JDK_DIR:$PATH"
fi

echo -e "\n${YELLOW}[1/7] Checking Prerequisites...${NC}"
if command -v java >/dev/null 2>&1; then
    echo -e "${GREEN}[✓] Java version:${NC}"
    java -version
else
    echo -e "${RED}[X] Java executable not found in PATH.${NC}"
fi

if command -v node >/dev/null 2>&1; then
    echo -e "${GREEN}[✓] Node version: $(node -v)${NC}"
else
    echo -e "${RED}[X] Node executable not found in PATH.${NC}"
fi

echo -e "\n${YELLOW}[2/7] Building Backend Microservices Maven Package...${NC}"
if command -v mvn >/dev/null 2>&1; then
    mvn clean package -DskipTests
else
    echo -e "${YELLOW}[!] 'mvn' CLI not found directly in PATH. Skipping pre-build step.${NC}"
fi

# Track background process PIDs for cleanup on interrupt
PIDS=()

cleanup() {
    echo -e "\n\n${YELLOW}[Shutdown] Terminating all microservice background processes...${NC}"
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
    done
    echo -e "${GREEN}[✓] All processes stopped successfully.${NC}"
    exit 0
}

trap cleanup INT TERM

echo -e "\n${YELLOW}[3/7] Starting Eureka Discovery Server (Port 8761)...${NC}"
if [ -f "discovery-server/target/discovery-server-1.0.0-SNAPSHOT.jar" ]; then
    java -jar discovery-server/target/discovery-server-1.0.0-SNAPSHOT.jar &
else
    (cd discovery-server && mvn spring-boot:run) &
fi
PIDS+=($!)
echo -e "${GREEN}[+] Discovery Server PID: ${PIDS[-1]}${NC}"

echo -e "${CYAN}Waiting 12 seconds for Eureka Discovery Server to initialize...${NC}"
sleep 12

echo -e "\n${YELLOW}[4/7] Starting Auth Service (Port 8081) & Product Service (Port 8082)...${NC}"
if [ -f "auth-service/target/auth-service-1.0.0-SNAPSHOT.jar" ]; then
    java -jar auth-service/target/auth-service-1.0.0-SNAPSHOT.jar &
else
    (cd auth-service && mvn spring-boot:run) &
fi
PIDS+=($!)

if [ -f "product-service/target/product-service-1.0.0-SNAPSHOT.jar" ]; then
    java -jar product-service/target/product-service-1.0.0-SNAPSHOT.jar &
else
    (cd product-service && mvn spring-boot:run) &
fi
PIDS+=($!)

echo -e "\n${YELLOW}[5/7] Starting Notification Service (Port 8083)...${NC}"
if [ -f "notification-service/target/notification-service-1.0.0-SNAPSHOT.jar" ]; then
    java -jar notification-service/target/notification-service-1.0.0-SNAPSHOT.jar &
else
    (cd notification-service && mvn spring-boot:run) &
fi
PIDS+=($!)

sleep 5

echo -e "\n${YELLOW}[6/7] Starting API Gateway (Port 8080)...${NC}"
if [ -f "api-gateway/target/api-gateway-1.0.0-SNAPSHOT.jar" ]; then
    java -jar api-gateway/target/api-gateway-1.0.0-SNAPSHOT.jar &
else
    (cd api-gateway && mvn spring-boot:run) &
fi
PIDS+=($!)

sleep 5

echo -e "\n${YELLOW}[7/7] Starting Angular Frontend (Port 4200)...${NC}"
cd angular-frontend
if [ ! -d "node_modules" ]; then
    echo -e "${CYAN}Installing Angular dependencies (npm install)...${NC}"
    npm install
fi

echo -e "\n${GREEN}==============================================================${NC}"
echo -e "${GREEN}  All Microservices & Gateway Launched Successfully!         ${NC}"
echo -e "${GREEN}  - Discovery Dashboard  : http://localhost:8761             ${NC}"
echo -e "${GREEN}  - API Gateway Base    : http://localhost:8080             ${NC}"
echo -e "${GREEN}  - Auth Microservice   : http://localhost:8081             ${NC}"
echo -e "${GREEN}  - Product Service     : http://localhost:8082             ${NC}"
echo -e "${GREEN}  - Notification Service: http://localhost:8083             ${NC}"
echo -e "${GREEN}  - Angular Frontend    : http://localhost:4200             ${NC}"
echo -e "${GREEN}==============================================================${NC}"
echo -e "${YELLOW}Press Ctrl+C to terminate all services.${NC}\n"

npm start
