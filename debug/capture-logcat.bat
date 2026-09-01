@echo off
rem This private helper is launched by debug.bat and receives values via inherited environment.
if not defined DEBUG_CAPTURE_ADB exit /b 1
if not defined DEBUG_CAPTURE_SERIAL exit /b 1
if not defined DEBUG_CAPTURE_FILE exit /b 1
"%DEBUG_CAPTURE_ADB%" -s "%DEBUG_CAPTURE_SERIAL%" logcat -v threadtime *:V > "%DEBUG_CAPTURE_FILE%" 2>&1
