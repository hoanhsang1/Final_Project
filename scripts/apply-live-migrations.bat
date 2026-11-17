@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0.."

echo MEMS live migration: 12 file, thu tu co dinh (People -> Identity -> 39 -> Facility)
echo.
set /p DBUSER=MySQL username: 
set /p DBPASS=MySQL password: 
set "MYSQL_PWD=%DBPASS%"

set "FILES=34_people_core_schema_catchup.sql 31_people_workflow_tables_and_class_requester.sql 32_people_workflow_constraint_alignment.sql 33_people_org_admin_remove_approve_close.sql 36_people_permission_backfill.sql 28_identity_module_core_flag.sql 29_identity_module_owner_toggle.sql 35_identity_permission_bundle_tables.sql 30_identity_remove_approve_close_from_academic.sql 38_identity_permission_allowed_scopes.sql 39_identity_self_permissions_and_department_class_scope.sql 37_facility_department_scope_catchup.sql"

for %%f in (%FILES%) do (
  if not exist "%%f" (
    echo [MISSING] %%f
    exit /b 2
  )
  echo.
  echo === Running %%f
  mysql -h 127.0.0.1 -P 3306 -u "%DBUSER%" --default-character-set=utf8mb4 < "%%f"
  if errorlevel 1 (
    echo [FAIL] %%f - dung tai day, khong chay tiep.
    exit /b 1
  )
)

echo.
echo [OK] Da chay xong 12 migration.
exit /b 0
