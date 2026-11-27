-- =====================================================================
-- MEMS - Seed du lieu kiem thu E2E (P10) cho XEP LICH TU DONG
-- CHI chay tren cac schema mems_e2e_* (khong dung du lieu that).
-- Idempotent: chay lai nhieu lan khong loi, khong tao trung.
-- Id co dinh tien to "eeeeeeee-" de de nhan dien va don dep.
-- Ten thuc the dung ASCII (khong dau) de tranh loi encoding.
-- =====================================================================
-- Chay: mysql --default-character-set=utf8mb4 ... < seed-e2e.sql
-- =====================================================================
SET NAMES utf8mb4;

-- ---------- Hang so dinh danh ----------
SET @org1   := 'eeeeeeee-0000-4000-8000-000000000001'; -- "E2E Xep lich"
SET @org2   := 'eeeeeeee-0000-4000-8000-000000000002'; -- "E2E To chuc 2"
SET @owner  := 'eeeeeeee-aaaa-4aaa-8aaa-aaaaaaaaaa01';
SET @t1     := 'eeeeeeee-aaaa-4aaa-8aaa-aaaaaaaaaa11';
SET @t2     := 'eeeeeeee-aaaa-4aaa-8aaa-aaaaaaaaaa12';
SET @t3     := 'eeeeeeee-aaaa-4aaa-8aaa-aaaaaaaaaa13';
SET @t4     := 'eeeeeeee-aaaa-4aaa-8aaa-aaaaaaaaaa14';
SET @self   := 'eeeeeeee-aaaa-4aaa-8aaa-aaaaaaaaaa05'; -- hoc sinh e2e_student (id == account id)
SET @owner2 := 'eeeeeeee-aaaa-4aaa-8aaa-aaaaaaaaaa21'; -- chu to chuc 2

SET @dept1  := 'eeeeeeee-dddd-4ddd-8ddd-ddddddddddd1';

-- Phong (facility) org1
SET @r1 := 'eeeeeeee-6666-4666-8666-000000000001'; -- classroom cap 40
SET @r2 := 'eeeeeeee-6666-4666-8666-000000000002'; -- classroom cap 20
SET @r3 := 'eeeeeeee-6666-4666-8666-000000000003'; -- classroom cap 20
SET @r4 := 'eeeeeeee-6666-4666-8666-000000000004'; -- classroom cap 20
SET @r5 := 'eeeeeeee-6666-4666-8666-000000000005'; -- classroom cap 20
SET @r6 := 'eeeeeeee-6666-4666-8666-000000000006'; -- computer_room cap 40
SET @r7 := 'eeeeeeee-6666-4666-8666-000000000007'; -- computer_room cap 40

-- Lop (people) - dung lam id lop mirror o Schedule khi can
SET @cA := 'eeeeeeee-bbbb-4bbb-8bbb-000000000001'; -- 10A: 3 mon (T2/T3/T10)
SET @cB := 'eeeeeeee-bbbb-4bbb-8bbb-000000000002'; -- 10B: ANH khong co GV (T4)
SET @cC := 'eeeeeeee-bbbb-4bbb-8bbb-000000000003'; -- 10C: SU (T12/T7/T8/T9)
SET @cD := 'eeeeeeee-bbbb-4bbb-8bbb-000000000004'; -- 10D: da du buoi (T14)
SET @cE := 'eeeeeeee-bbbb-4bbb-8bbb-000000000005'; -- 10E: 30 HS, YC ANY, phong thuong kin (T13a)
SET @cF := 'eeeeeeee-bbbb-4bbb-8bbb-000000000006'; -- 10F: TIN COMPUTER, phong may bao tri (T5)
SET @cG := 'eeeeeeee-bbbb-4bbb-8bbb-000000000007'; -- 10G: 5 buoi/tuan 2, tao o mau (T11)
SET @cZ := 'eeeeeeee-bbbb-4bbb-8bbb-000000000008'; -- 10Z: 1 buoi giai doan 2, trung o mau 1 tuan (T11)
SET @cX := 'eeeeeeee-bbbb-4bbb-8bbb-000000000009'; -- 10X: 1 buoi de tao xung dot khi confirm (T6)
SET @cO := 'eeeeeeee-bbbb-4bbb-8bbb-000000000010'; -- 10O: lop chiem cho san (khong co mon)

-- Danh muc mon (subject_category)
SET @catMATH := 'eeeeeeee-cccc-4ccc-8ccc-000000000001';
SET @catLIT  := 'eeeeeeee-cccc-4ccc-8ccc-000000000002';
SET @catPHY  := 'eeeeeeee-cccc-4ccc-8ccc-000000000003';
SET @catENG  := 'eeeeeeee-cccc-4ccc-8ccc-000000000004';
SET @catINF  := 'eeeeeeee-cccc-4ccc-8ccc-000000000005';
SET @catHIS  := 'eeeeeeee-cccc-4ccc-8ccc-000000000006';

-- Mon hoc
SET @sTOAN := 'eeeeeeee-5555-4555-8555-000000000001';
SET @sVAN  := 'eeeeeeee-5555-4555-8555-000000000002';
SET @sLY   := 'eeeeeeee-5555-4555-8555-000000000003';
SET @sANH  := 'eeeeeeee-5555-4555-8555-000000000004'; -- khong co GV du dieu kien
SET @sTIN  := 'eeeeeeee-5555-4555-8555-000000000005'; -- room_requirement = COMPUTER
SET @sSU   := 'eeeeeeee-5555-4555-8555-000000000006';

-- Chuyen mon (specialty) - gan category de tinh D1
SET @spTOAN := 'eeeeeeee-7777-4777-8777-000000000001';
SET @spVAN  := 'eeeeeeee-7777-4777-8777-000000000002';
SET @spLY   := 'eeeeeeee-7777-4777-8777-000000000003';
SET @spTIN  := 'eeeeeeee-7777-4777-8777-000000000004';
SET @spSU   := 'eeeeeeee-7777-4777-8777-000000000005';

-- Mat khau: sao chep bcrypt tu tai khoan mau (cung mat khau Sample@123456)
SET @pwd := (SELECT password_hash FROM mems_identity_db.account WHERE username='sample_owner' LIMIT 1);

-- =====================================================================
-- 1) IDENTITY
-- =====================================================================
INSERT INTO mems_e2e_identity_db.module(code,name,is_active,is_core) VALUES
 ('CLASS_MANAGEMENT','Quan ly lop hoc',1,1),
 ('EQUIPMENT_MANAGEMENT','Quan ly thiet bi',1,0),
 ('FACILITY_MANAGEMENT','Quan ly co so vat chat',1,0),
 ('ROOM_MANAGEMENT','Quan ly phong hoc',1,0),
 ('SCHEDULE_MANAGEMENT','Quan ly lich hoc',1,1),
 ('STUDENT_MANAGEMENT','Quan ly hoc sinh',1,1),
 ('TEACHER_MANAGEMENT','Quan ly giao vien',1,1)
ON DUPLICATE KEY UPDATE name=VALUES(name), is_active=VALUES(is_active), is_core=VALUES(is_core);

INSERT INTO mems_e2e_identity_db.role(code,name,scope,description) VALUES
 ('SUPER_ADMIN','System administrator','platform','E2E'),
 ('OWNER','Owner','organization','E2E'),
 ('TEACHER','Teacher','organization','E2E'),
 ('STUDENT','Student','organization','E2E')
ON DUPLICATE KEY UPDATE name=VALUES(name), scope=VALUES(scope);

INSERT INTO mems_e2e_identity_db.organization(id,name,org_type,status,created_at,updated_at) VALUES
 (@org1,'E2E Xep lich','school','active',NOW(3),NOW(3)),
 (@org2,'E2E To chuc 2','school','active',NOW(3),NOW(3))
ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status), updated_at=NOW(3);

INSERT INTO mems_e2e_identity_db.organization_module(org_id,module_code,status) VALUES
 (@org1,'SCHEDULE_MANAGEMENT','active'),
 (@org2,'SCHEDULE_MANAGEMENT','active')
ON DUPLICATE KEY UPDATE status='active', disabled_at=NULL;

INSERT INTO mems_e2e_identity_db.account(id,org_id,username,email,password_hash,status,created_at,updated_at) VALUES
 (@owner ,@org1,'e2e_owner'   ,'e2e_owner@e2e.local'   ,@pwd,'active',NOW(3),NOW(3)),
 (@t1    ,@org1,'e2e_teacher1','e2e_teacher1@e2e.local',@pwd,'active',NOW(3),NOW(3)),
 (@t2    ,@org1,'e2e_teacher2','e2e_teacher2@e2e.local',@pwd,'active',NOW(3),NOW(3)),
 (@t3    ,@org1,'e2e_teacher3','e2e_teacher3@e2e.local',@pwd,'active',NOW(3),NOW(3)),
 (@t4    ,@org1,'e2e_teacher4','e2e_teacher4@e2e.local',@pwd,'active',NOW(3),NOW(3)),
 (@self  ,@org1,'e2e_student' ,'e2e_student@e2e.local' ,@pwd,'active',NOW(3),NOW(3)),
 (@owner2,@org2,'e2e_owner2'  ,'e2e_owner2@e2e.local'  ,@pwd,'active',NOW(3),NOW(3))
ON DUPLICATE KEY UPDATE org_id=VALUES(org_id), email=VALUES(email), password_hash=VALUES(password_hash),
 status='active', updated_at=NOW(3);

INSERT IGNORE INTO mems_e2e_identity_db.account_role(account_id,role_id)
SELECT a.id, r.id FROM mems_e2e_identity_db.account a JOIN mems_e2e_identity_db.role r ON r.code='OWNER'
 WHERE a.username IN ('e2e_owner','e2e_owner2');
INSERT IGNORE INTO mems_e2e_identity_db.account_role(account_id,role_id)
SELECT a.id, r.id FROM mems_e2e_identity_db.account a JOIN mems_e2e_identity_db.role r ON r.code='TEACHER'
 WHERE a.username IN ('e2e_teacher1','e2e_teacher2','e2e_teacher3','e2e_teacher4');
INSERT IGNORE INTO mems_e2e_identity_db.account_role(account_id,role_id)
SELECT a.id, r.id FROM mems_e2e_identity_db.account a JOIN mems_e2e_identity_db.role r ON r.code='STUDENT'
 WHERE a.username='e2e_student';

-- =====================================================================
-- 2) PEOPLE (org1)
-- =====================================================================
INSERT INTO mems_e2e_people_db.department(id,org_id,name,description,created_at) VALUES
 (@dept1,@org1,'To Hoc vu E2E','To phu trach xep lich E2E',NOW(3))
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO mems_e2e_people_db.department_member(user_id,org_id,department_id,role,appointed_by,appointed_at,username,status) VALUES
 (@t1,@org1,@dept1,'STAFF',@owner,NOW(3),'e2e_teacher1','ACTIVE'),
 (@t2,@org1,@dept1,'STAFF',@owner,NOW(3),'e2e_teacher2','ACTIVE'),
 (@t3,@org1,@dept1,'STAFF',@owner,NOW(3),'e2e_teacher3','ACTIVE'),
 (@t4,@org1,@dept1,'STAFF',@owner,NOW(3),'e2e_teacher4','ACTIVE')
ON DUPLICATE KEY UPDATE department_id=VALUES(department_id), role=VALUES(role), status='ACTIVE';

INSERT INTO mems_e2e_people_db.staff_profile(user_id,org_id,staff_code,full_name,full_name_unaccented,phone,email,version,created_by,created_at) VALUES
 (@t1,@org1,'E2E-T1','Giao vien 1','Giao vien 1',NULL,'e2e_teacher1@e2e.local',0,@owner,NOW(3)),
 (@t2,@org1,'E2E-T2','Giao vien 2','Giao vien 2',NULL,'e2e_teacher2@e2e.local',0,@owner,NOW(3)),
 (@t3,@org1,'E2E-T3','Giao vien 3','Giao vien 3',NULL,'e2e_teacher3@e2e.local',0,@owner,NOW(3)),
 (@t4,@org1,'E2E-T4','Giao vien 4','Giao vien 4',NULL,'e2e_teacher4@e2e.local',0,@owner,NOW(3))
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), full_name_unaccented=VALUES(full_name_unaccented), email=VALUES(email);

INSERT INTO mems_e2e_people_db.teacher_profile(user_id,org_id,contract_type,teaching_status,version,created_by,created_at) VALUES
 (@t1,@org1,'CO_HUU','DANG_DAY',0,@owner,NOW(3)),
 (@t2,@org1,'CO_HUU','DANG_DAY',0,@owner,NOW(3)),
 (@t3,@org1,'CO_HUU','DANG_DAY',0,@owner,NOW(3)),
 (@t4,@org1,'CO_HUU','DANG_DAY',0,@owner,NOW(3))
ON DUPLICATE KEY UPDATE teaching_status='DANG_DAY', contract_type='CO_HUU';

INSERT INTO mems_e2e_people_db.subject_category(id,org_id,name,name_unaccented,is_active,created_by,created_at) VALUES
 (@catMATH,@org1,'Toan','Toan',1,@owner,NOW(3)),
 (@catLIT ,@org1,'Ngu van','Ngu van',1,@owner,NOW(3)),
 (@catPHY ,@org1,'Vat ly','Vat ly',1,@owner,NOW(3)),
 (@catENG ,@org1,'Tieng Anh','Tieng Anh',1,@owner,NOW(3)),
 (@catINF ,@org1,'Tin hoc','Tin hoc',1,@owner,NOW(3)),
 (@catHIS ,@org1,'Lich su','Lich su',1,@owner,NOW(3))
ON DUPLICATE KEY UPDATE name=VALUES(name), name_unaccented=VALUES(name_unaccented), is_active=1;

INSERT INTO mems_e2e_people_db.subject(id,org_id,code,name,name_unaccented,description,is_active,created_by,created_at,category_id,room_requirement) VALUES
 (@sTOAN,@org1,'TOAN','Toan' ,'Toan' ,NULL,1,@owner,NOW(3),@catMATH,'ANY'),
 (@sVAN ,@org1,'VAN' ,'Van'  ,'Van'  ,NULL,1,@owner,NOW(3),@catLIT ,'ANY'),
 (@sLY  ,@org1,'LY'  ,'Ly'   ,'Ly'   ,NULL,1,@owner,NOW(3),@catPHY ,'ANY'),
 (@sANH ,@org1,'ANH' ,'Anh'  ,'Anh'  ,NULL,1,@owner,NOW(3),@catENG ,'ANY'),
 (@sTIN ,@org1,'TIN' ,'Tin'  ,'Tin'  ,NULL,1,@owner,NOW(3),@catINF ,'COMPUTER'),
 (@sSU  ,@org1,'SU'  ,'Su'   ,'Su'   ,NULL,1,@owner,NOW(3),@catHIS ,'ANY')
ON DUPLICATE KEY UPDATE name=VALUES(name), category_id=VALUES(category_id),
 room_requirement=VALUES(room_requirement), is_active=1;

INSERT INTO mems_e2e_people_db.specialty(id,org_id,name,name_unaccented,is_active,created_by,created_at,category_id) VALUES
 (@spTOAN,@org1,'Chuyen Toan','Chuyen Toan',1,@owner,NOW(3),@catMATH),
 (@spVAN ,@org1,'Chuyen Van' ,'Chuyen Van' ,1,@owner,NOW(3),@catLIT ),
 (@spLY  ,@org1,'Chuyen Ly'  ,'Chuyen Ly'  ,1,@owner,NOW(3),@catPHY ),
 (@spTIN ,@org1,'Chuyen Tin' ,'Chuyen Tin' ,1,@owner,NOW(3),@catINF ),
 (@spSU  ,@org1,'Chuyen Su'  ,'Chuyen Su'  ,1,@owner,NOW(3),@catHIS )
ON DUPLICATE KEY UPDATE category_id=VALUES(category_id), is_active=1;

INSERT INTO mems_e2e_people_db.teacher_specialty(user_id,specialty_id,org_id) VALUES
 (@t1,@spTOAN,@org1),
 (@t2,@spVAN ,@org1),
 (@t3,@spLY  ,@org1),
 (@t3,@spTIN ,@org1),
 (@t4,@spSU  ,@org1)
ON DUPLICATE KEY UPDATE org_id=VALUES(org_id);

-- Hoc sinh thuong 1..94 (chi trong 1 lop; class_student UNIQUE(student_id))
INSERT IGNORE INTO mems_e2e_people_db.student(id,org_id,student_code,full_name,date_of_birth,status,created_by,created_at)
SELECT CONCAT('eeeeeeee-9999-4999-8999-',LPAD(n,12,'0')), @org1,
       CONCAT('E2E',LPAD(n,3,'0')), CONCAT('Hoc sinh ',n), '2010-01-01','active',@owner,NOW(3)
FROM (WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n<94) SELECT n FROM seq) s;

-- Hoc sinh tu phuc vu e2e_student (id = account id) - trong lop 10A
INSERT INTO mems_e2e_people_db.student(id,org_id,student_code,full_name,date_of_birth,status,created_by,created_at,account_username,account_created_at) VALUES
 (@self,@org1,'E2E-SELF','Hoc sinh E2E','2010-01-01','active',@owner,NOW(3),'e2e_student',NOW(3))
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), account_username='e2e_student';

INSERT INTO mems_e2e_people_db.school_class
 (id,org_id,class_code,name,academic_year,status,created_by,created_at,start_date,end_date,subject_id,version,close_state,cancel_state,needs_reassignment)
VALUES
 (@cA,@org1,'10A','Lop 10A','2026-2027','DANG_DIEN_RA',@owner,NOW(3),'2026-11-30','2027-01-31',@sTOAN,0,'NONE','NONE',0),
 (@cB,@org1,'10B','Lop 10B','2026-2027','DANG_DIEN_RA',@owner,NOW(3),'2026-11-30','2027-01-31',@sTOAN,0,'NONE','NONE',0),
 (@cC,@org1,'10C','Lop 10C','2026-2027','DANG_DIEN_RA',@owner,NOW(3),'2026-11-30','2027-01-31',@sSU  ,0,'NONE','NONE',0),
 (@cD,@org1,'10D','Lop 10D','2026-2027','DANG_DIEN_RA',@owner,NOW(3),'2026-11-30','2027-01-31',@sSU  ,0,'NONE','NONE',0),
 (@cE,@org1,'10E','Lop 10E','2026-2027','DANG_DIEN_RA',@owner,NOW(3),'2026-12-03','2027-01-31',@sSU  ,0,'NONE','NONE',0),
 (@cF,@org1,'10F','Lop 10F','2026-2027','DANG_DIEN_RA',@owner,NOW(3),'2026-12-04','2027-01-31',@sTIN ,0,'NONE','NONE',0),
 (@cG,@org1,'10G','Lop 10G','2026-2027','DANG_DIEN_RA',@owner,NOW(3),'2026-12-14','2027-01-31',@sVAN ,0,'NONE','NONE',0),
 (@cZ,@org1,'10Z','Lop 10Z','2026-2027','DANG_DIEN_RA',@owner,NOW(3),'2026-12-28','2027-01-31',@sSU  ,0,'NONE','NONE',0),
 (@cX,@org1,'10X','Lop 10X','2026-2027','DANG_DIEN_RA',@owner,NOW(3),'2026-12-09','2027-01-31',@sSU  ,0,'NONE','NONE',0),
 (@cO,@org1,'10O','Lop 10O','2026-2027','DANG_DIEN_RA',@owner,NOW(3),'2026-11-24','2027-01-31',NULL   ,0,'NONE','NONE',0)
ON DUPLICATE KEY UPDATE status='DANG_DIEN_RA', start_date=VALUES(start_date), end_date=VALUES(end_date),
 subject_id=VALUES(subject_id), close_state='NONE', cancel_state='NONE';

-- Chuong trinh mon cua lop (session_minutes=90 khop chuoi tiet)
INSERT INTO mems_e2e_people_db.class_subject
 (class_id,subject_id,source,planned_sessions,session_minutes,sessions_per_week,stage_no,teacher_id,is_primary,status,created_at)
VALUES
 (@cA,@sTOAN,'MANUAL',2,90,1,1,@t1 ,1,'PLANNED',NOW(3)),
 (@cA,@sVAN ,'MANUAL',2,90,1,1,NULL,0,'PLANNED',NOW(3)),  -- khong gan GV -> chon tu dong (t2)
 (@cA,@sLY  ,'MANUAL',2,90,1,1,@t3 ,0,'PLANNED',NOW(3)),
 (@cB,@sTOAN,'MANUAL',2,90,1,1,@t1 ,1,'PLANNED',NOW(3)),
 (@cB,@sANH ,'MANUAL',1,90,1,1,NULL,0,'PLANNED',NOW(3)),  -- khong co GV du dieu kien (T4)
 (@cC,@sSU  ,'MANUAL',1,90,1,1,@t2 ,1,'PLANNED',NOW(3)),
 (@cD,@sSU  ,'MANUAL',2,90,1,1,@t4 ,1,'PLANNED',NOW(3)),  -- da du 2 buoi that (T14)
 (@cE,@sSU  ,'MANUAL',1,90,1,1,@t1 ,1,'PLANNED',NOW(3)),
 (@cF,@sTIN ,'MANUAL',1,90,1,1,@t3 ,1,'PLANNED',NOW(3)),  -- TIN bat buoc phong may
 (@cG,@sVAN ,'MANUAL',5,90,2,1,@t2 ,1,'PLANNED',NOW(3)),  -- 5 buoi/2 tuan -> tao o mau (T11)
 (@cZ,@sSU  ,'MANUAL',1,90,1,2,@t4 ,1,'PLANNED',NOW(3)),  -- giai doan 2, 1 tuan (T11)
 (@cX,@sSU  ,'MANUAL',1,90,1,1,@t1 ,1,'PLANNED',NOW(3))   -- 1 buoi de tao xung dot (T6)
ON DUPLICATE KEY UPDATE planned_sessions=VALUES(planned_sessions), session_minutes=VALUES(session_minutes),
 sessions_per_week=VALUES(sessions_per_week), stage_no=VALUES(stage_no), teacher_id=VALUES(teacher_id),
 is_primary=VALUES(is_primary), status='PLANNED';

-- Ghi danh hoc sinh (1..94) theo lop
INSERT IGNORE INTO mems_e2e_people_db.class_student(class_id,student_id,org_id,enrolled_at)
SELECT r.cls, CONCAT('eeeeeeee-9999-4999-8999-',LPAD(s.n,12,'0')), @org1, NOW(3)
FROM (WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n<94) SELECT n FROM seq) s
JOIN (
  SELECT 1 AS a, 4  AS b, @cA AS cls UNION ALL
  SELECT 5     , 9      , @cB        UNION ALL
  SELECT 10    , 14     , @cC        UNION ALL
  SELECT 15    , 19     , @cD        UNION ALL
  SELECT 20    , 49     , @cE        UNION ALL
  SELECT 50    , 79     , @cF        UNION ALL
  SELECT 80    , 84     , @cG        UNION ALL
  SELECT 85    , 89     , @cX        UNION ALL
  SELECT 90    , 94     , @cZ
) r ON s.n BETWEEN r.a AND r.b;

INSERT IGNORE INTO mems_e2e_people_db.class_student(class_id,student_id,org_id,enrolled_at)
VALUES (@cA,@self,@org1,NOW(3));

-- =====================================================================
-- 3) FACILITY (org1) - phong hoc
-- =====================================================================
INSERT INTO mems_e2e_facility_db.classroom(id,org_id,code,name,building,floor,capacity,room_type,status,department_id) VALUES
 (@r1,@org1,'R1','Phong R1','A','1',40,'classroom'    ,'active',@dept1),
 (@r2,@org1,'R2','Phong R2','A','1',20,'classroom'    ,'active',@dept1),
 (@r3,@org1,'R3','Phong R3','A','1',20,'classroom'    ,'active',@dept1),
 (@r4,@org1,'R4','Phong R4','A','1',20,'classroom'    ,'active',@dept1),
 (@r5,@org1,'R5','Phong R5','A','1',20,'classroom'    ,'active',@dept1),
 (@r6,@org1,'R6','Phong may R6','B','2',40,'computer_room','active',@dept1),
 (@r7,@org1,'R7','Phong may R7','B','2',40,'computer_room','active',@dept1)
ON DUPLICATE KEY UPDATE capacity=VALUES(capacity), room_type=VALUES(room_type), status='active', code=VALUES(code);

INSERT INTO mems_e2e_facility_db.computer_room(classroom_id,machine_count,spec_description,installed_software) VALUES
 (@r6,40,'E2E lab 1','Eclipse, MySQL'),
 (@r7,40,'E2E lab 2','Eclipse, MySQL')
ON DUPLICATE KEY UPDATE machine_count=VALUES(machine_count);

-- =====================================================================
-- 4) SCHEDULE - tiet hoc, lop mirror, buoi hoc co san
-- =====================================================================
INSERT INTO mems_e2e_schedule_db.time_slot(id,org_id,period_no,name,start_time,end_time,joins_next,is_active) VALUES
 ('eeeeeeee-8888-4888-8888-000000000001',@org1,1,'Tiet 1','07:30:00','08:15:00',1,1),
 ('eeeeeeee-8888-4888-8888-000000000002',@org1,2,'Tiet 2','08:15:00','09:00:00',0,1),
 ('eeeeeeee-8888-4888-8888-000000000003',@org1,3,'Tiet 3','09:15:00','10:00:00',1,1),
 ('eeeeeeee-8888-4888-8888-000000000004',@org1,4,'Tiet 4','10:00:00','10:45:00',0,1),
 ('eeeeeeee-8888-4888-8888-000000000005',@org1,5,'Tiet 5','10:55:00','11:40:00',1,1),
 ('eeeeeeee-8888-4888-8888-000000000006',@org1,6,'Tiet 6','11:40:00','12:25:00',0,1),
 ('eeeeeeee-8888-4888-8888-000000000101',@org2,1,'Tiet 1','07:30:00','08:15:00',1,1),
 ('eeeeeeee-8888-4888-8888-000000000102',@org2,2,'Tiet 2','08:15:00','09:00:00',0,1),
 ('eeeeeeee-8888-4888-8888-000000000103',@org2,3,'Tiet 3','09:15:00','10:00:00',1,1),
 ('eeeeeeee-8888-4888-8888-000000000104',@org2,4,'Tiet 4','10:00:00','10:45:00',0,1),
 ('eeeeeeee-8888-4888-8888-000000000105',@org2,5,'Tiet 5','10:55:00','11:40:00',1,1),
 ('eeeeeeee-8888-4888-8888-000000000106',@org2,6,'Tiet 6','11:40:00','12:25:00',0,1)
ON DUPLICATE KEY UPDATE start_time=VALUES(start_time), end_time=VALUES(end_time),
 joins_next=VALUES(joins_next), is_active=1;

-- Lop mirror (Schedule) cho cac lop co buoi hoc that truoc khi dung API
INSERT INTO mems_e2e_schedule_db.class(id,org_id,code,name,subject,max_size,start_date,end_date,status) VALUES
 (@cD,@org1,'10D','Lop 10D','Su',40,'2026-11-30','2027-01-31','ongoing'),
 (@cO,@org1,'10O','Lop 10O',NULL,40,'2026-11-24','2027-01-31','ongoing')
ON DUPLICATE KEY UPDATE name=VALUES(name), status='ongoing';

-- Buoi hoc that co san cua 10O: chiem R1 ca thu 5 (12-03) -> T13a phai dung phong may
INSERT INTO mems_e2e_schedule_db.session(id,class_id,department_id,teacher_id,room_id,start_time,end_time,status,teacher_name,room_code,subject_name,subject_id) VALUES
 ('eeeeeeee-1234-4abc-9def-000000000001',@cO,@dept1,@t4,@r1,'2026-12-03 07:30:00','2026-12-03 09:00:00','scheduled','Giao vien 4','R1',NULL,NULL),
 ('eeeeeeee-1234-4abc-9def-000000000002',@cO,@dept1,@t4,@r1,'2026-12-03 09:15:00','2026-12-03 10:45:00','scheduled','Giao vien 4','R1',NULL,NULL),
 ('eeeeeeee-1234-4abc-9def-000000000003',@cO,@dept1,@t4,@r1,'2026-12-03 10:55:00','2026-12-03 12:25:00','scheduled','Giao vien 4','R1',NULL,NULL)
ON DUPLICATE KEY UPDATE start_time=VALUES(start_time), end_time=VALUES(end_time), status='scheduled';

-- Buoi hoc that co san cua 10D (mon Su): du 2/2 -> T14 khong sinh yeu cau moi
INSERT INTO mems_e2e_schedule_db.session(id,class_id,department_id,teacher_id,room_id,start_time,end_time,status,teacher_name,room_code,subject_name,subject_id) VALUES
 ('eeeeeeee-1234-4abc-9def-000000000004',@cD,@dept1,@t4,@r3,'2026-11-30 07:30:00','2026-11-30 09:00:00','scheduled','Giao vien 4','R3','Su',@sSU),
 ('eeeeeeee-1234-4abc-9def-000000000005',@cD,@dept1,@t4,@r3,'2026-12-07 07:30:00','2026-12-07 09:00:00','scheduled','Giao vien 4','R3','Su',@sSU)
ON DUPLICATE KEY UPDATE start_time=VALUES(start_time), end_time=VALUES(end_time), subject_id=VALUES(subject_id), status='scheduled';

-- =====================================================================
-- 5) Kiem tra nhanh (T1) - in so luong de doi chieu
-- =====================================================================
SELECT 'identity.org'       AS entity, COUNT(*) AS n FROM mems_e2e_identity_db.organization  WHERE id LIKE 'eeeeeeee-0000-4000-8000-%'
UNION ALL SELECT 'identity.account',     COUNT(*) FROM mems_e2e_identity_db.account       WHERE username LIKE 'e2e\_%'
UNION ALL SELECT 'people.teacher',       COUNT(*) FROM mems_e2e_people_db.teacher_profile  WHERE org_id='eeeeeeee-0000-4000-8000-000000000001'
UNION ALL SELECT 'people.student',       COUNT(*) FROM mems_e2e_people_db.student          WHERE org_id='eeeeeeee-0000-4000-8000-000000000001'
UNION ALL SELECT 'people.class',         COUNT(*) FROM mems_e2e_people_db.school_class     WHERE org_id='eeeeeeee-0000-4000-8000-000000000001'
UNION ALL SELECT 'people.class_subject', COUNT(*) FROM mems_e2e_people_db.class_subject    WHERE class_id LIKE 'eeeeeeee-bbbb-4bbb-8bbb-%'
UNION ALL SELECT 'people.class_student', COUNT(*) FROM mems_e2e_people_db.class_student    WHERE org_id='eeeeeeee-0000-4000-8000-000000000001'
UNION ALL SELECT 'facility.classroom',   COUNT(*) FROM mems_e2e_facility_db.classroom      WHERE org_id='eeeeeeee-0000-4000-8000-000000000001'
UNION ALL SELECT 'schedule.time_slot',   COUNT(*) FROM mems_e2e_schedule_db.time_slot      WHERE org_id='eeeeeeee-0000-4000-8000-000000000001'
UNION ALL SELECT 'schedule.session',     COUNT(*) FROM mems_e2e_schedule_db.session        WHERE class_id LIKE 'eeeeeeee-bbbb-4bbb-8bbb-%';
