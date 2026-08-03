# PowerShell helper to build and run Spring Boot Microservices + Angular
param(
    [switch]$BuildOnly
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Spring Boot Microservices + Angular Learning Suite   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Locate Java JDK & Maven
$jdkPath = "C:\Users\Fahad\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2\bin"
$mavenPath = "C:\Program Files\JetBrains\IntelliJ IDEA Community Edition 2025.2.6.1\plugins\maven\lib\maven3\bin"

if (Test-Path "$jdkPath\java.exe") {
    $env:Path = "$jdkPath;$env:Path"
    $env:JAVA_HOME = "C:\Users\Fahad\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2"
    Write-Host "[OK] Found Java JDK 17 at: $jdkPath" -ForegroundColor Green
} else {
    Write-Host "[!] Using default Java from system PATH..." -ForegroundColor Yellow
}

if (Test-Path "$mavenPath\mvn.cmd") {
    $env:Path = "$mavenPath;$env:Path"
    Write-Host "[OK] Found Maven at: $mavenPath" -ForegroundColor Green
}

java -version

Write-Host "`n[1/5] Building Maven Multi-module Backend Services..." -ForegroundColor Yellow
cmd /c "mvn clean package -DskipTests"

if ($LASTEXITCODE -ne 0 -and -not (Get-Command mvn -ErrorAction SilentlyContinue)) {
    Write-Host "[!] Note: 'mvn' CLI not found directly in system PATH." -ForegroundColor Red
    Write-Host "    You can run each microservice directly in IntelliJ IDEA or VS Code by opening c:\SpringBoot" -ForegroundColor Yellow
}

if ($BuildOnly) {
    Write-Host "`nBuild complete!" -ForegroundColor Green
    exit
}

Write-Host "`n[Service Ports]" -ForegroundColor Cyan
Write-Host " - Discovery Server : http://localhost:8761"
Write-Host " - API Gateway      : http://localhost:8080"
Write-Host " - Auth Service     : http://localhost:8081"
Write-Host " - Product Service  : http://localhost:8082"
Write-Host " - Angular Frontend : http://localhost:4200"
Write-Host "`nOpening all 6 services in a single Windows Terminal window with tabs..." -ForegroundColor Green
if (Get-Command wt -ErrorAction SilentlyContinue) {
    $jdkDir = "C:\Users\Fahad\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2"
    $mvnDir = "C:\Program Files\JetBrains\IntelliJ IDEA Community Edition 2025.2.6.1\plugins\maven\lib\maven3\bin"
    $envSetup = "set JAVA_HOME=$jdkDir&& set PATH=$jdkDir\bin;$mvnDir;%PATH%"

    wt -d "$PSScriptRoot\discovery-server" --title "Discovery Server (8761)" cmd /k "$envSetup&& mvn spring-boot:run" `
       `; new-tab -d "$PSScriptRoot\auth-service" --title "Auth Service (8081)" cmd /k "$envSetup&& mvn spring-boot:run" `
       `; new-tab -d "$PSScriptRoot\product-service" --title "Product Service (8082)" cmd /k "$envSetup&& mvn spring-boot:run" `
       `; new-tab -d "$PSScriptRoot\notification-service" --title "Notification Service (8083)" cmd /k "$envSetup&& mvn spring-boot:run" `
       `; new-tab -d "$PSScriptRoot\api-gateway" --title "API Gateway (8080)" cmd /k "$envSetup&& mvn spring-boot:run" `
       `; new-tab -d "$PSScriptRoot\angular-frontend" --title "Angular Frontend (4200)" cmd /k "npm install && npm start"
} else {
    cmd /c "$PSScriptRoot\start-all.bat"
}
