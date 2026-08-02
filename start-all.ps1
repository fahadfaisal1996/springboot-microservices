# PowerShell helper to build and run Spring Boot Microservices + Angular
param(
    [switch]$BuildOnly
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Spring Boot Microservices + Angular Learning Suite   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Locate Java JDK
$jdkPath = "C:\Users\Fahad\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2\bin"
if (Test-Path "$jdkPath\java.exe") {
    $env:Path = "$jdkPath;$env:Path"
    $env:JAVA_HOME = "C:\Users\Fahad\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2"
    Write-Host "[✓] Found Java JDK 17 at: $jdkPath" -ForegroundColor Green
} else {
    Write-Host "[!] Using default Java from system PATH..." -ForegroundColor Yellow
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
Write-Host "`nOpening service terminals..." -ForegroundColor Green
