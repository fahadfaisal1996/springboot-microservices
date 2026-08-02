@echo off
TITLE Spring Boot Microservices + Kafka + Angular Full Stack Launcher
CLS

echo ==============================================================
echo   Spring Boot 3 Microservices + Kafka + Angular Launcher  
echo ==============================================================

set JDK_DIR=C:\Users\Fahad\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2\bin
if exist "%JDK_DIR%\java.exe" (
    set PATH=%JDK_DIR%;%PATH%
    echo [✓] Java 17 configured.
)

echo.
echo [1/6] Starting Eureka Discovery Server (Port 8761)...
start "Discovery Server (8761)" cmd /k "cd /d %~dp0discovery-server && mvn spring-boot:run"
timeout /t 10 /nobreak

echo.
echo [2/6] Starting Auth Service (Port 8081)...
start "Auth Service (8081)" cmd /k "cd /d %~dp0auth-service && mvn spring-boot:run"

echo.
echo [3/6] Starting Product Service (Port 8082)...
start "Product Service (8082)" cmd /k "cd /d %~dp0product-service && mvn spring-boot:run"

echo.
echo [4/6] Starting Notification Service (Port 8083)...
start "Notification Service (8083)" cmd /k "cd /d %~dp0notification-service && mvn spring-boot:run"
timeout /t 5 /nobreak

echo.
echo [5/6] Starting API Gateway (Port 8080)...
start "API Gateway (8080)" cmd /k "cd /d %~dp0api-gateway && mvn spring-boot:run"
timeout /t 5 /nobreak

echo.
echo [6/6] Starting Angular Frontend (Port 4200)...
start "Angular Frontend (4200)" cmd /k "cd /d %~dp0angular-frontend && npm install && npm start"

echo.
echo ==============================================================
echo   All Services Launched in Separate Terminal Windows!
echo   - Discovery Dashboard  : http://localhost:8761
echo   - API Gateway          : http://localhost:8080
echo   - Notification Service : http://localhost:8083
echo   - Angular Web App      : http://localhost:4200
echo ==============================================================
pause
