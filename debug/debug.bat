@echo off
setlocal EnableExtensions DisableDelayedExpansion

rem React Native Android diagnostic helper. It never changes the application or device state.
set "DEBUG_DIR=%~dp0"
for %%I in ("%DEBUG_DIR%..") do set "PROJECT_ROOT=%%~fI"
set "LOG_ROOT=%DEBUG_DIR%logs"
set "MODE=menu"
set "VERBOSE=0"
set "PACKAGE_OVERRIDE="
set "SELECTED_SERIAL="
set "PACKAGE="
set "ACTIVITY="
set "ADB="
set "SESSION_DIR="
set "CAPTURE_PID="

:parse_args
if "%~1"=="" goto arguments_done
if /i "%~1"=="--package" goto parse_package
if /i "%~1"=="--serial" goto parse_serial
if /i "%~1"=="--verbose" set "VERBOSE=1"
if /i "%~1"=="--crash" set "MODE=crash"
if /i "%~1"=="--device" set "MODE=device"
if /i "%~1"=="--clean" set "MODE=clean"
if /i "%~1"=="--help" set "MODE=help"
shift
goto parse_args

:parse_package
if "%~2"=="" (
  echo [ERRO] --package exige um nome de package.
  exit /b 1
)
set "PACKAGE_OVERRIDE=%~2"
shift
shift
goto parse_args

:parse_serial
if "%~2"=="" (
  echo [ERRO] --serial exige um serial ADB.
  exit /b 1
)
set "SELECTED_SERIAL=%~2"
shift
shift
goto parse_args

:arguments_done
if /i "%MODE%"=="help" goto help
if /i "%MODE%"=="clean" goto clean
call :find_adb || exit /b 1
call :select_device || exit /b 1
call :detect_package
if /i "%MODE%"=="device" goto device_only
if /i "%MODE%"=="crash" goto start_crash_session
goto menu

:help
echo.
echo Sistema de depuracao Android / React Native
echo.
echo Uso:
echo   debug.bat [--verbose] [--crash] [--device] [--clean]
echo             [--package nome.do.pacote] [--serial serial-do-adb]
echo.
echo --crash   inicia diretamente uma sessao de captura.
echo --device  mostra o inventario detalhado do dispositivo.
echo --clean   remove apenas sessoes em debug\logs.
echo --package informa o package manualmente quando a deteccao falhar.
echo --serial  escolhe um dispositivo quando houver mais de um.
exit /b 0

:find_adb
for /f "delims=" %%A in ('where adb 2^>nul') do if not defined ADB set "ADB=%%A"
if not defined ADB if defined ANDROID_SDK_ROOT if exist "%ANDROID_SDK_ROOT%\platform-tools\adb.exe" set "ADB=%ANDROID_SDK_ROOT%\platform-tools\adb.exe"
if not defined ADB if defined ANDROID_HOME if exist "%ANDROID_HOME%\platform-tools\adb.exe" set "ADB=%ANDROID_HOME%\platform-tools\adb.exe"
if not defined ADB if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
if not defined ADB (
  echo.
  echo [ERRO] ADB nao foi encontrado.
  echo Instale Android SDK Platform-Tools e adicione platform-tools ao PATH, ou defina
  echo ANDROID_SDK_ROOT/ANDROID_HOME. Local tambem verificado: %%LOCALAPPDATA%%\Android\Sdk.
  exit /b 1
)
if "%VERBOSE%"=="1" echo [verbose] ADB: "%ADB%"
"%ADB%" version >nul 2>&1
if errorlevel 1 (
  echo [ERRO] O ADB foi localizado, mas nao pode ser executado: "%ADB%"
  exit /b 1
)
exit /b 0

:select_device
echo.
echo Dispositivos ADB:
"%ADB%" devices -l
setlocal EnableDelayedExpansion
set "DEVICE_COUNT=0"
for /f "skip=1 tokens=1,2" %%A in ('"%ADB%" devices 2^>nul') do (
  if /i "%%B"=="device" (
    set /a DEVICE_COUNT+=1
    set "DEVICE_!DEVICE_COUNT!=%%A"
  )
)
if defined SELECTED_SERIAL (
  "%ADB%" -s "!SELECTED_SERIAL!" get-state 2>nul | findstr /i /x "device" >nul
  if errorlevel 1 (
    echo [ERRO] O serial informado nao esta pronto: !SELECTED_SERIAL!
    endlocal & exit /b 1
  )
  endlocal & exit /b 0
)
if "!DEVICE_COUNT!"=="0" (
  echo.
  echo [ERRO] Nenhum dispositivo autorizado foi encontrado.
  echo Ative Depuracao USB ou Depuracao sem fio e confirme a chave RSA no Android.
  echo Para Wi-Fi, conecte com: adb connect IP_DO_DISPOSITIVO:PORTA
  echo Depois execute este script novamente.
  endlocal & exit /b 1
)
if "!DEVICE_COUNT!"=="1" (
  set "SELECTED_SERIAL=!DEVICE_1!"
  echo Dispositivo selecionado: !SELECTED_SERIAL!
  for /f "delims=" %%A in ("!SELECTED_SERIAL!") do endlocal & set "SELECTED_SERIAL=%%A"
  exit /b 0
)
echo.
echo Mais de um dispositivo esta disponivel.
for /l %%N in (1,1,!DEVICE_COUNT!) do echo   %%N - !DEVICE_%%N!
set /p "DEVICE_CHOICE=Escolha o numero do dispositivo: "
for /f "delims=0123456789" %%A in ("!DEVICE_CHOICE!") do set "DEVICE_CHOICE="
if not defined DEVICE_CHOICE endlocal & echo [ERRO] Escolha invalida. & exit /b 1
if !DEVICE_CHOICE! LSS 1 endlocal & echo [ERRO] Escolha invalida. & exit /b 1
if !DEVICE_CHOICE! GTR !DEVICE_COUNT! endlocal & echo [ERRO] Escolha invalida. & exit /b 1
for %%N in (!DEVICE_CHOICE!) do set "SELECTED_SERIAL=!DEVICE_%%N!"
for /f "delims=" %%A in ("!SELECTED_SERIAL!") do endlocal & set "SELECTED_SERIAL=%%A"
echo Dispositivo selecionado: %SELECTED_SERIAL%
exit /b 0

:detect_package
if defined PACKAGE_OVERRIDE goto package_override
for %%F in ("%PROJECT_ROOT%\android\app\build.gradle" "%PROJECT_ROOT%\android\app\build.gradle.kts") do (
  if not defined PACKAGE if exist "%%~fF" (
    for /f "tokens=1,2,3" %%A in ('findstr /i /r /c:"applicationId[ =]" "%%~fF"') do (
      if /i "%%A"=="applicationId" if not defined PACKAGE (
        if "%%B"=="=" (set "PACKAGE=%%~C") else set "PACKAGE=%%~B"
      )
    )
  )
)
if not defined PACKAGE if exist "%PROJECT_ROOT%\android\app\src\main\AndroidManifest.xml" (
  for /f "tokens=2 delims==" %%P in ('findstr /i /c:"package=" "%PROJECT_ROOT%\android\app\src\main\AndroidManifest.xml"') do if not defined PACKAGE set "PACKAGE=%%~P"
)
if defined PACKAGE (
  echo Package detectado: %PACKAGE%
) else (
  echo [AVISO] Nao foi possivel detectar applicationId/package com seguranca.
  echo Use --package nome.do.pacote para habilitar coleta por aplicativo e abertura.
)
exit /b 0

:package_override
set "PACKAGE=%PACKAGE_OVERRIDE%"
echo Package informado: %PACKAGE%
exit /b 0

:menu
echo.
echo ========================================
echo       SISTEMA DE DEPURACAO ANDROID
echo ========================================
echo 1 - Capturar logs
echo 2 - Abrir aplicativo e capturar logs
echo 3 - Diagnostico completo
echo 4 - Sair
choice /c 1234 /n /m "Opcao"
if errorlevel 4 exit /b 0
if errorlevel 3 goto full_diagnosis
if errorlevel 2 goto open_and_capture
if errorlevel 1 goto start_crash_session

:device_only
call :create_session
call :write_device_info
echo.
echo Inventario salvo em: "%SESSION_DIR%\device-info.txt"
type "%SESSION_DIR%\device-info.txt"
exit /b 0

:full_diagnosis
call :create_session
call :write_device_info
call :write_pre_capture_diagnostics
echo.
echo Diagnostico inicial salvo em "%SESSION_DIR%".
goto capture_existing_session

:open_and_capture
if not defined PACKAGE (
  echo.
  echo [ERRO] Nao e seguro abrir o app sem package detectado.
  echo Execute: debug.bat --package nome.do.pacote
  exit /b 1
)
call :create_session
call :detect_activity
if not defined ACTIVITY (
  echo.
  echo [ERRO] A Activity inicial nao foi determinada com seguranca.
  echo A captura pode ser iniciada pela opcao 1; abra o app manualmente no Android.
  exit /b 1
)
call :write_device_info
call :begin_capture || exit /b 1
echo Abrindo %PACKAGE% / %ACTIVITY%...
"%ADB%" -s "%SELECTED_SERIAL%" shell am start -n "%PACKAGE%/%ACTIVITY%" >> "%SESSION_DIR%\adb-commands.log" 2>&1
goto monitor_capture

:start_crash_session
call :create_session
call :write_device_info
:capture_existing_session
call :begin_capture || exit /b 1
:monitor_capture
echo.
echo Captura ativa. Use o aplicativo e pressione Q para encerrar e gerar o relatorio.
echo A cada dois segundos o script procura novos sinais de crash sem parar a captura.
set "LAST_ALERT_LINE=0"
:monitor_loop
choice /c QS /n /t 2 /d S >nul
if errorlevel 2 goto stop_capture
call :check_new_crash
goto monitor_loop

:stop_capture
echo.
echo Encerrando captura e organizando evidencias...
if defined CAPTURE_PID taskkill /pid %CAPTURE_PID% /t /f >nul 2>&1
timeout /t 2 /nobreak >nul
call :collect_post_capture
call :analyze_logs
call :write_report
echo.
echo Sessao concluida: "%SESSION_DIR%"
echo Relatorio: "%SESSION_DIR%\report.txt"
exit /b 0

:create_session
if defined SESSION_DIR exit /b 0
set "STAMP="
for /f %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss" 2^>nul') do if not defined STAMP set "STAMP=%%T"
if not defined STAMP set "STAMP=session_%RANDOM%_%RANDOM%"
set "SESSION_DIR=%LOG_ROOT%\%STAMP%"
mkdir "%SESSION_DIR%" >nul 2>&1
> "%SESSION_DIR%\session.txt" (
  echo Session started: %DATE% %TIME%
  echo Serial: %SELECTED_SERIAL%
  echo Package: %PACKAGE%
  echo Project root: %PROJECT_ROOT%
)
exit /b 0

:write_device_info
set "DEVICE_MODEL="
set "ANDROID_RELEASE="
set "ANDROID_SDK="
set "DEVICE_ABI="
call :read_property ro.product.model DEVICE_MODEL
call :read_property ro.build.version.release ANDROID_RELEASE
call :read_property ro.build.version.sdk ANDROID_SDK
call :read_property ro.product.cpu.abi DEVICE_ABI
> "%SESSION_DIR%\device-info.txt" (
  echo === Debug session ===
  echo Started: %DATE% %TIME%
  echo ADB serial: %SELECTED_SERIAL%
  echo.
  echo === Device ===
  echo Model:
  "%ADB%" -s "%SELECTED_SERIAL%" shell getprop ro.product.manufacturer
  "%ADB%" -s "%SELECTED_SERIAL%" shell getprop ro.product.model
  echo Android release:
  "%ADB%" -s "%SELECTED_SERIAL%" shell getprop ro.build.version.release
  echo Android SDK:
  "%ADB%" -s "%SELECTED_SERIAL%" shell getprop ro.build.version.sdk
  echo ABI:
  "%ADB%" -s "%SELECTED_SERIAL%" shell getprop ro.product.cpu.abi
  echo ABI list:
  "%ADB%" -s "%SELECTED_SERIAL%" shell getprop ro.product.cpu.abilist
  echo Build fingerprint:
  "%ADB%" -s "%SELECTED_SERIAL%" shell getprop ro.build.fingerprint
  echo.
  echo === ADB ===
  "%ADB%" -s "%SELECTED_SERIAL%" get-state
  "%ADB%" -s "%SELECTED_SERIAL%" shell getprop ro.debuggable
  echo.
  echo === Application ===
  echo Package: %PACKAGE%
)
if defined PACKAGE (
  "%ADB%" -s "%SELECTED_SERIAL%" shell dumpsys package "%PACKAGE%" >> "%SESSION_DIR%\device-info.txt" 2>&1
  "%ADB%" -s "%SELECTED_SERIAL%" shell pidof "%PACKAGE%" > "%SESSION_DIR%\pid-at-start.txt" 2>&1
)
del /q "%SESSION_DIR%\property.tmp" >nul 2>&1
exit /b 0

:read_property
set "%~2="
"%ADB%" -s "%SELECTED_SERIAL%" shell getprop "%~1" > "%SESSION_DIR%\property.tmp" 2>nul
for /f "usebackq delims=" %%G in ("%SESSION_DIR%\property.tmp") do if not defined %~2 set "%~2=%%G"
exit /b 0

:write_pre_capture_diagnostics
if not defined PACKAGE exit /b 0
"%ADB%" -s "%SELECTED_SERIAL%" shell dumpsys meminfo "%PACKAGE%" > "%SESSION_DIR%\meminfo-before.txt" 2>&1
"%ADB%" -s "%SELECTED_SERIAL%" shell dumpsys activity processes "%PACKAGE%" > "%SESSION_DIR%\process-before.txt" 2>&1
exit /b 0

:begin_capture
echo Limpando buffers do logcat...
"%ADB%" -s "%SELECTED_SERIAL%" logcat -c > "%SESSION_DIR%\adb-clear.log" 2>&1
rem The helper inherits these variables, avoiding fragile command-line quoting for paths with spaces.
set "DEBUG_CAPTURE_ADB=%ADB%"
set "DEBUG_CAPTURE_SERIAL=%SELECTED_SERIAL%"
set "DEBUG_CAPTURE_FILE=%SESSION_DIR%\raw.log"
for /f %%P in ('powershell -NoProfile -Command "$p=Start-Process -FilePath '%DEBUG_DIR%capture-logcat.bat' -PassThru; $p.Id"') do set "CAPTURE_PID=%%P"
if not defined CAPTURE_PID (
  echo [ERRO] Nao foi possivel iniciar a captura do logcat.
  exit /b 1
)
if "%VERBOSE%"=="1" echo [verbose] PID da captura: %CAPTURE_PID%
exit /b 0

:check_new_crash
if not exist "%SESSION_DIR%\raw.log" exit /b 0
set "CURRENT_ALERT_LINE=0"
for /f %%L in ('find /v /c "" ^< "%SESSION_DIR%\raw.log"') do set "CURRENT_ALERT_LINE=%%L"
if "%CURRENT_ALERT_LINE%"=="%LAST_ALERT_LINE%" exit /b 0
findstr /i /c:"FATAL EXCEPTION" /c:"Fatal signal" /c:"AndroidRuntime" /c:"ANR in" /c:"has died" "%SESSION_DIR%\raw.log" > "%SESSION_DIR%\crash-watch.tmp"
for %%Z in ("%SESSION_DIR%\crash-watch.tmp") do if %%~zZ GTR 0 (
  if not exist "%SESSION_DIR%\crash-detected.flag" (
    > "%SESSION_DIR%\crash-detected.flag" echo detected
    echo.
    echo ========================================
    echo        POSSIVEL CRASH DETECTADO
    echo ========================================
    type "%SESSION_DIR%\crash-watch.tmp"
    echo A captura continuara para preservar o stack trace.
  )
)
set "LAST_ALERT_LINE=%CURRENT_ALERT_LINE%"
exit /b 0

:collect_post_capture
"%ADB%" -s "%SELECTED_SERIAL%" logcat -b crash -d -v threadtime > "%SESSION_DIR%\native-crash-buffer.log" 2>&1
"%ADB%" -s "%SELECTED_SERIAL%" shell dumpsys dropbox --print > "%SESSION_DIR%\dropbox.txt" 2>&1
"%ADB%" -s "%SELECTED_SERIAL%" shell ls -lt /data/tombstones > "%SESSION_DIR%\tombstones-list.txt" 2>&1
if defined PACKAGE (
  "%ADB%" -s "%SELECTED_SERIAL%" shell pidof "%PACKAGE%" > "%SESSION_DIR%\pid-at-end.txt" 2>&1
  "%ADB%" -s "%SELECTED_SERIAL%" shell dumpsys meminfo "%PACKAGE%" > "%SESSION_DIR%\meminfo-after.txt" 2>&1
  "%ADB%" -s "%SELECTED_SERIAL%" shell dumpsys activity processes "%PACKAGE%" > "%SESSION_DIR%\process-after.txt" 2>&1
  "%ADB%" -s "%SELECTED_SERIAL%" shell dumpsys package "%PACKAGE%" > "%SESSION_DIR%\package-info-after.txt" 2>&1
)
exit /b 0

:analyze_logs
if not exist "%SESSION_DIR%\raw.log" > "%SESSION_DIR%\raw.log" type nul
findstr /n /i /c:"AndroidRuntime" /c:"FATAL EXCEPTION" /c:"Caused by:" /c:"RuntimeException" /c:"NullPointerException" /c:"IllegalStateException" /c:"SecurityException" /c:"ClassNotFoundException" /c:"NoSuchMethodError" /c:"UnsatisfiedLinkError" /c:"OutOfMemoryError" /c:"ReactNativeJS" /c:"ReactNative" /c:"Invariant Violation" /c:"TypeError" /c:"ReferenceError" /c:"Unable to resolve module" /c:"TurboModule" /c:"NativeModule" /c:"Hermes" /c:"JSI" /c:"Fatal signal" /c:"SIGSEGV" /c:"SIGABRT" /c:"libc" /c:"backtrace" /c:"tombstone" /c:"ANR" /c:"ActivityManager" /c:"System.err" "%SESSION_DIR%\raw.log" > "%SESSION_DIR%\errors.log"
findstr /n /i /c:"FATAL EXCEPTION" /c:"AndroidRuntime" /c:"Caused by:" /c:"Fatal signal" /c:"SIGSEGV" /c:"SIGABRT" /c:"ANR" /c:"has died" "%SESSION_DIR%\raw.log" > "%SESSION_DIR%\crash.log"
findstr /n /i /c:"ReactNativeJS" /c:"ReactNative" /c:"Invariant Violation" /c:"TypeError" /c:"ReferenceError" /c:"Unable to resolve module" /c:"TurboModule" /c:"NativeModule" /c:"Bridge" /c:"Hermes" /c:"HermesRuntime" /c:"JSI" "%SESSION_DIR%\raw.log" > "%SESSION_DIR%\react-native.log"
findstr /n /i /c:"AndroidRuntime" /c:"FATAL EXCEPTION" /c:"RuntimeException" /c:"Exception" /c:"Error:" /c:"Caused by:" /c:"System.err" "%SESSION_DIR%\raw.log" > "%SESSION_DIR%\java-kotlin.log"
findstr /n /i /c:"Fatal signal" /c:"SIGSEGV" /c:"SIGABRT" /c:"libc" /c:"DEBUG" /c:"backtrace" /c:"tombstone" /c:"SoLoader" /c:"UnsatisfiedLinkError" "%SESSION_DIR%\raw.log" > "%SESSION_DIR%\native.log"
findstr /n /i /c:"ANR" /c:"Input dispatching timed out" /c:"am_anr" "%SESSION_DIR%\raw.log" > "%SESSION_DIR%\anr.log"
call :extract_context
exit /b 0

:extract_context
rem Extracting surrounding lines needs a standard Windows component (PowerShell); raw.log always remains the complete source.
powershell -NoProfile -Command "$p='%SESSION_DIR%\raw.log'; $o='%SESSION_DIR%\stack-context.log'; $lines=Get-Content -LiteralPath $p; $hits=Select-String -LiteralPath $p -Pattern 'FATAL EXCEPTION','Fatal signal','Caused by:','ANR in','SIGSEGV','SIGABRT'; $ranges=@(); foreach($h in $hits){$ranges += ,@([Math]::Max(0,$h.LineNumber-6),[Math]::Min($lines.Count-1,$h.LineNumber+35))}; $last=-1; foreach($r in $ranges | Sort-Object { $_[0] }){for($i=$r[0];$i -le $r[1];$i++){if($i -gt $last){$lines[$i];$last=$i}};''}" > "%SESSION_DIR%\stack-context.log" 2>nul
exit /b 0

:write_report
set "CLASSIFICATION=[UNKNOWN]"
findstr /i /c:"Input dispatching timed out" /c:"am_anr" /c:"ANR in" "%SESSION_DIR%\raw.log" >nul && set "CLASSIFICATION=[ANR]"
findstr /i /c:"OutOfMemoryError" /c:"low memory" /c:"oom" "%SESSION_DIR%\raw.log" >nul && set "CLASSIFICATION=[MEMORY]"
findstr /i /c:"Fatal signal" /c:"SIGSEGV" /c:"SIGABRT" /c:"tombstone" "%SESSION_DIR%\raw.log" >nul && set "CLASSIFICATION=[NATIVE C/C++]"
findstr /i /c:"Hermes" /c:"HermesRuntime" "%SESSION_DIR%\raw.log" >nul && set "CLASSIFICATION=[HERMES]"
findstr /i /c:"ReactNativeJS" /c:"Invariant Violation" /c:"Unable to resolve module" "%SESSION_DIR%\raw.log" >nul && set "CLASSIFICATION=[JS]"
findstr /i /c:"Permission Denial" /c:"Unable to start activity" /c:"INSTALL_FAILED" /c:"INSTALL_PARSE_FAILED" /c:"ActivityNotFoundException" "%SESSION_DIR%\raw.log" >nul && set "CLASSIFICATION=[ANDROID]"
findstr /i /c:"FATAL EXCEPTION" /c:"AndroidRuntime" /c:"RuntimeException" /c:"Caused by:" "%SESSION_DIR%\raw.log" >nul && set "CLASSIFICATION=[NATIVE JAVA/KOTLIN]"
> "%SESSION_DIR%\report.txt" echo ========================================
>> "%SESSION_DIR%\report.txt" echo      RELATORIO DE DEPURACAO ANDROID
>> "%SESSION_DIR%\report.txt" echo ========================================
>> "%SESSION_DIR%\report.txt" echo Sessao: %STAMP%
>> "%SESSION_DIR%\report.txt" echo Dispositivo: %SELECTED_SERIAL%
>> "%SESSION_DIR%\report.txt" echo Modelo: %DEVICE_MODEL%
>> "%SESSION_DIR%\report.txt" echo Android: %ANDROID_RELEASE% ^(SDK %ANDROID_SDK%^)
>> "%SESSION_DIR%\report.txt" echo ABI: %DEVICE_ABI%
>> "%SESSION_DIR%\report.txt" echo Package: %PACKAGE%
>> "%SESSION_DIR%\report.txt" echo Classificacao baseada em evidencias: %CLASSIFICATION%
if exist "%SESSION_DIR%\crash-detected.flag" (>> "%SESSION_DIR%\report.txt" echo Possivel crash durante a captura: SIM) else (>> "%SESSION_DIR%\report.txt" echo Possivel crash durante a captura: NAO DETECTADO)
>> "%SESSION_DIR%\report.txt" echo.
>> "%SESSION_DIR%\report.txt" echo Arquivos de evidencia:
>> "%SESSION_DIR%\report.txt" echo - raw.log: logcat integral, fonte principal
>> "%SESSION_DIR%\report.txt" echo - errors.log: ocorrencias relevantes com numero de linha
>> "%SESSION_DIR%\report.txt" echo - stack-context.log: trechos com contexto de stack trace
>> "%SESSION_DIR%\report.txt" echo - crash.log, react-native.log, java-kotlin.log, native.log, anr.log
>> "%SESSION_DIR%\report.txt" echo.
>> "%SESSION_DIR%\report.txt" echo === Principais ocorrencias ===
if exist "%SESSION_DIR%\pid-at-start.txt" (
  >> "%SESSION_DIR%\report.txt" echo PID no inicio:
  type "%SESSION_DIR%\pid-at-start.txt" >> "%SESSION_DIR%\report.txt"
)
if exist "%SESSION_DIR%\pid-at-end.txt" (
  >> "%SESSION_DIR%\report.txt" echo PID no encerramento:
  type "%SESSION_DIR%\pid-at-end.txt" >> "%SESSION_DIR%\report.txt"
)
if exist "%SESSION_DIR%\errors.log" type "%SESSION_DIR%\errors.log" >> "%SESSION_DIR%\report.txt"
>> "%SESSION_DIR%\report.txt" echo.
>> "%SESSION_DIR%\report.txt" echo === Contexto de crash/stack trace ===
if exist "%SESSION_DIR%\stack-context.log" type "%SESSION_DIR%\stack-context.log" >> "%SESSION_DIR%\report.txt"
exit /b 0

:detect_activity
set "ACTIVITY="
"%ADB%" -s "%SELECTED_SERIAL%" shell cmd package resolve-activity --brief "%PACKAGE%" > "%SESSION_DIR%\activity-resolve.txt" 2>&1
for /f "usebackq tokens=2 delims=/" %%A in ("%SESSION_DIR%\activity-resolve.txt") do if not defined ACTIVITY set "ACTIVITY=%%A"
if defined ACTIVITY echo Activity inicial detectada: %ACTIVITY%
exit /b 0

:clean
if not exist "%LOG_ROOT%" (
  echo Nenhuma sessao anterior em "%LOG_ROOT%".
  exit /b 0
)
echo.
echo Isso remove somente as sessoes de diagnostico em:
echo "%LOG_ROOT%"
choice /c SN /n /m "Continuar"
if errorlevel 2 exit /b 0
rmdir /s /q "%LOG_ROOT%"
if exist "%LOG_ROOT%" (
  echo [ERRO] Nao foi possivel limpar todas as sessoes. Feche arquivos de log abertos e tente novamente.
  exit /b 1
)
echo Sessoes removidas.
exit /b 0
