@echo off
setlocal
cd /d "%~dp0.."

echo MEMS live migration 40: them session.department_id cho mems_schedule_db
echo.
set /p DBUSER=MySQL username: 
set /p DBPASS=MySQL password: 
set "MYSQL_PWD=%DBPASS%"

mysql -h 127.0.0.1 -P 3306 -u "%DBUSER%" --default-character-set=utf8mb4 < "40_schedule_department_scope_catchup.sql"
if errorlevel 1 (
  echo [FAIL] 40_schedule_department_scope_catchup.sql
  exit /b 1
)

echo.
echo [OK] Da chay migration 40. Khong can build lai service.
exit /b 0
