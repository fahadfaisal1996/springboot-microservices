@echo off
TITLE Spring Boot Microservices + Kafka + Angular Full Stack Launcher
CLS

echo ==============================================================
echo   Spring Boot 3 Microservices + Kafka + Angular Launcher  
echo ==============================================================

set JDK_DIR=C:\Users\Fahad\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2
set MAVEN_DIR=C:\Program Files\JetBrains\IntelliJ IDEA Community Edition 2025.2.6.1\plugins\maven\lib\maven3\bin

if exist "%JDK_DIR%\bin\java.exe" (
    set JAVA_HOME=%JDK_DIR%
    set PATH=%JDK_DIR%\bin;%PATH%
    echo [OK] Java 17 configured.
)

if exist "%MAVEN_DIR%\mvn.cmd" (
    set PATH=%MAVEN_DIR%;%PATH%
    echo [OK] Maven configured.
)

set ENV_CMD=set JAVA_HOME=C:\Users\Fahad\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2^&^& set PATH=C:\Users\Fahad\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2\bin;C:\Program Files\JetBrains\IntelliJ IDEA Community Edition 2025.2.6.1\plugins\maven\lib\maven3\bin;%%PATH%%

echo.
where wt >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Opening all 6 microservices in a single Windows Terminal window with tabs...
    echo.
    wt -d "%~dp0discovery-server" --title "Discovery Server (8761)" cmd /k "%ENV_CMD%&& mvn spring-boot:run" ";" new-tab -d "%~dp0auth-service" --title "Auth Service (8081)" cmd /k "%ENV_CMD%&& mvn spring-boot:run" ";" new-tab -d "%~dp0product-service" --title "Product Service (8082)" cmd /k "%ENV_CMD%&& mvn spring-boot:run" ";" new-tab -d "%~dp0notification-service" --title "Notification Service (8083)" cmd /k "%ENV_CMD%&& mvn spring-boot:run" ";" new-tab -d "%~dp0api-gateway" --title "API Gateway (8080)" cmd /k "%ENV_CMD%&& mvn spring-boot:run" ";" new-tab -d "%~dp0angular-frontend" --title "Angular Frontend (4200)" cmd /k "npm install && npm start"
) else (
    echo Opening services in separate terminal windows...
    start "Discovery Server (8761)" cmd /k "%ENV_CMD%&& cd /d %~dp0discovery-server && mvn spring-boot:run"
    timeout /t 5 /nobreak
    start "Auth Service (8081)" cmd /k "%ENV_CMD%&& cd /d %~dp0auth-service && mvn spring-boot:run"
    start "Product Service (8082)" cmd /k "%ENV_CMD%&& cd /d %~dp0product-service && mvn spring-boot:run"
    start "Notification Service (8083)" cmd /k "%ENV_CMD%&& cd /d %~dp0notification-service && mvn spring-boot:run"
    timeout /t 5 /nobreak
    start "API Gateway (8080)" cmd /k "%ENV_CMD%&& cd /d %~dp0api-gateway && mvn spring-boot:run"
    timeout /t 5 /nobreak
    start "Angular Frontend (4200)" cmd /k "cd /d %~dp0angular-frontend && npm install && npm start"
)

echo.
echo ==============================================================
echo   All Services Launched in Windows Terminal!
echo   - Discovery Dashboard  : http://localhost:8761
echo   - API Gateway          : http://localhost:8080
echo   - Notification Service : http://localhost:8083
echo   - Angular Web App      : http://localhost:4200
echo ==============================================================
pause
