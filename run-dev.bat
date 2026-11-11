@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo ============================================
echo   FinTrack - Khoi dong Backend + Frontend
echo ============================================
echo.

rem --- Cong cu portable (neu co) ---
if exist "D:\tools\jdk-21\bin\java.exe" set "JAVA_HOME=D:\tools\jdk-21"
if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"
if exist "D:\tools\maven\bin\mvn.cmd" set "PATH=D:\tools\maven\bin;%PATH%"

where java >nul 2>&1 || (echo [LOI] Khong tim thay java. Cai JDK 21 hoac sua JAVA_HOME trong file bat. & pause & exit /b 1)
where mvn  >nul 2>&1 || (echo [LOI] Khong tim thay mvn. Cai Maven hoac sua duong dan trong file bat. & pause & exit /b 1)
where npm  >nul 2>&1 || (echo [LOI] Khong tim thay npm. Cai Node.js 22 LTS. & pause & exit /b 1)

rem --- Nap bien moi truong tu .env ---
if not exist "%ROOT%\.env" if exist "%ROOT%\.env.example" (
    copy /y "%ROOT%\.env.example" "%ROOT%\.env" >nul
    echo [CANH BAO] Da tao .env tu .env.example - kiem tra thong tin MySQL truoc khi chay.
)
if exist "%ROOT%\.env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%ROOT%\.env") do set "%%A=%%B"
    echo [OK] Da nap bien moi truong tu .env
) else (
    echo [CANH BAO] Khong tim thay .env - backend se dung gia tri mac dinh.
)
if not defined BACKEND_PORT set "BACKEND_PORT=8080"

rem --- Cai dependency frontend neu chua co ---
if not exist "%ROOT%\apps\desktop\node_modules" (
    echo [INFO] Chua co node_modules, dang chay npm ci...
    pushd "%ROOT%\apps\desktop"
    call npm ci
    popd
)

echo.
echo [1/2] Khoi dong Spring Boot (cua so rieng)...
start "FinTrack Backend" /D "%ROOT%\backend" cmd /k "mvn spring-boot:run"

echo [2/2] Khoi dong Vite dev server (cua so rieng)...
start "FinTrack Frontend" /D "%ROOT%\apps\desktop" cmd /k "npm run dev"

echo.
echo Backend : http://127.0.0.1:%BACKEND_PORT%/api/v1/health
echo Swagger : http://127.0.0.1:%BACKEND_PORT%/swagger-ui.html
echo Frontend: http://localhost:1420
echo.
echo Luu y: MySQL (Laragon) phai dang chay. Backend can 20-40 giay de san sang.
echo Dung Ctrl+C trong tung cua so de tat.
echo.

timeout /t 6 /nobreak >nul
start "" "http://localhost:1420"

endlocal
