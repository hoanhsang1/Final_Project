-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: mems_people_db
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `account_compensation`
--

DROP TABLE IF EXISTS `account_compensation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `account_compensation` (
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL,
  `attempts` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `account_compensation`
--

LOCK TABLES `account_compensation` WRITE;
/*!40000 ALTER TABLE `account_compensation` DISABLE KEYS */;
/*!40000 ALTER TABLE `account_compensation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `class_close_event`
--

DROP TABLE IF EXISTS `class_close_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `class_close_event` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `class_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requested_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `acted_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `actor_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_class_close_event_class` (`class_id`,`created_at`),
  CONSTRAINT `fk_class_close_event_class` FOREIGN KEY (`class_id`) REFERENCES `school_class` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_class_close_event_action` CHECK ((`action` in (_utf8mb4'REQUESTED',_utf8mb4'APPROVED',_utf8mb4'REJECTED',_utf8mb4'REOPENED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `class_close_event`
--

LOCK TABLES `class_close_event` WRITE;
/*!40000 ALTER TABLE `class_close_event` DISABLE KEYS */;
INSERT INTO `class_close_event` VALUES ('2b2fea94-f928-432a-bdfd-7513b8bef610','55555555-5555-4555-8555-555555555001','11111111-1111-4111-8111-111111111111','REQUESTED',NULL,NULL,NULL,'2026-11-13 05:00:46.514','22222222-2222-4222-8222-222222222001'),('5d360058-db34-4a84-845b-a6a2af0884a2','55555555-5555-4555-8555-555555555001','11111111-1111-4111-8111-111111111111','REJECTED',NULL,NULL,'cleanup test probe','2026-11-13 05:00:52.340','22222222-2222-4222-8222-222222222001'),('77777777-7777-4777-8777-777777777001','55555555-5555-4555-8555-555555555005','11111111-1111-4111-8111-111111111111','REQUESTED',NULL,NULL,'Đã hết khoá học','2026-11-06 19:20:52.873','22222222-2222-4222-8222-222222222003'),('77777777-7777-4777-8777-777777777002','55555555-5555-4555-8555-555555555005','11111111-1111-4111-8111-111111111111','APPROVED',NULL,NULL,NULL,'2026-11-06 19:20:52.873','22222222-2222-4222-8222-222222222004');
/*!40000 ALTER TABLE `class_close_event` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `class_status_log`
--

DROP TABLE IF EXISTS `class_status_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `class_status_log` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `class_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `from_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changed_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changed_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_class_status_log_class` (`class_id`,`changed_at`),
  CONSTRAINT `fk_class_status_log_class` FOREIGN KEY (`class_id`) REFERENCES `school_class` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_class_status_log_from` CHECK (((`from_status` is null) or (`from_status` in (_utf8mb4'CHUA_BAT_DAU',_utf8mb4'DANG_DIEN_RA',_utf8mb4'DA_KET_THUC',_utf8mb4'DA_HUY')))),
  CONSTRAINT `chk_class_status_log_to` CHECK ((`to_status` in (_utf8mb4'CHUA_BAT_DAU',_utf8mb4'DANG_DIEN_RA',_utf8mb4'DA_KET_THUC',_utf8mb4'DA_HUY')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `class_status_log`
--

LOCK TABLES `class_status_log` WRITE;
/*!40000 ALTER TABLE `class_status_log` DISABLE KEYS */;
INSERT INTO `class_status_log` VALUES ('66666666-6666-4666-8666-666666666001','55555555-5555-4555-8555-555555555003','11111111-1111-4111-8111-111111111111','DANG_DIEN_RA','DA_KET_THUC','AUTO_END',NULL,'2026-11-06 19:20:52.871'),('66666666-6666-4666-8666-666666666002','55555555-5555-4555-8555-555555555004','11111111-1111-4111-8111-111111111111','CHUA_BAT_DAU','DA_HUY','Trùng lịch khai giảng','22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.871'),('6d9220b8-b41e-43ca-afc2-813579c9c1bd','f5aff886-cfa1-4e7f-863d-5cf5855ecd58','eff0ce1e-1234-4892-a9f7-031383a681a5','CHUA_BAT_DAU','DANG_DIEN_RA','AUTO_START',NULL,'2026-11-13 09:44:56.249');
/*!40000 ALTER TABLE `class_status_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `class_student`
--

DROP TABLE IF EXISTS `class_student`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `class_student` (
  `class_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enrolled_at` datetime(3) NOT NULL,
  PRIMARY KEY (`class_id`,`student_id`),
  UNIQUE KEY `uq_class_student_student` (`student_id`),
  KEY `idx_class_student_org` (`org_id`),
  CONSTRAINT `class_student_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `student` (`id`) ON DELETE CASCADE,
  CONSTRAINT `class_student_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `school_class` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `class_student`
--

LOCK TABLES `class_student` WRITE;
/*!40000 ALTER TABLE `class_student` DISABLE KEYS */;
INSERT INTO `class_student` VALUES ('55555555-5555-4555-8555-555555555001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa005','11111111-1111-4111-8111-111111111111','2026-11-13 17:07:41.064'),('55555555-5555-4555-8555-555555555002','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001','11111111-1111-4111-8111-111111111111','2026-11-13 17:07:47.969'),('55555555-5555-4555-8555-555555555002','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002','11111111-1111-4111-8111-111111111111','2026-11-13 17:07:41.064'),('55555555-5555-4555-8555-555555555005','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa003','11111111-1111-4111-8111-111111111111','2026-11-13 17:07:41.064'),('f5aff886-cfa1-4e7f-863d-5cf5855ecd58','ab000001-0000-4000-8000-000000000001','eff0ce1e-1234-4892-a9f7-031383a681a5','2026-11-13 17:02:08.814'),('f5aff886-cfa1-4e7f-863d-5cf5855ecd58','ab000001-0000-4000-8000-000000000002','eff0ce1e-1234-4892-a9f7-031383a681a5','2026-11-13 17:02:08.814');
/*!40000 ALTER TABLE `class_student` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `department`
--

DROP TABLE IF EXISTS `department`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `department` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_department_org_name` (`org_id`,`name`),
  UNIQUE KEY `uq_department_id_org` (`id`,`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `department`
--

LOCK TABLES `department` WRITE;
/*!40000 ALTER TABLE `department` DISABLE KEYS */;
INSERT INTO `department` VALUES ('44444444-4444-4444-8444-444444444001','11111111-1111-4111-8111-111111111111','Tổ Toán – Tin','Phòng ban mẫu cho Sprint 4','2026-11-06 19:20:52.855'),('965f9d17-8c11-4191-8579-0e617875100e','eff0ce1e-1234-4892-a9f7-031383a681a5','CNTT',NULL,'2026-11-13 08:37:48.280');
/*!40000 ALTER TABLE `department` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `department_member`
--

DROP TABLE IF EXISTS `department_member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `department_member` (
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('OWNER','MANAGER','STAFF') COLLATE utf8mb4_unicode_ci NOT NULL,
  `appointed_by` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `appointed_at` datetime(3) NOT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_member_user_org` (`user_id`,`org_id`),
  KEY `department_id` (`department_id`,`org_id`),
  CONSTRAINT `department_member_ibfk_1` FOREIGN KEY (`department_id`, `org_id`) REFERENCES `department` (`id`, `org_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `department_member`
--

LOCK TABLES `department_member` WRITE;
/*!40000 ALTER TABLE `department_member` DISABLE KEYS */;
INSERT INTO `department_member` VALUES ('22222222-2222-4222-8222-222222222001','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444001','OWNER','22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.857','sample_owner'),('22222222-2222-4222-8222-222222222002','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444001','MANAGER','22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.857','sample_hr'),('22222222-2222-4222-8222-222222222003','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444001','STAFF','22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.857','sample_academic'),('22222222-2222-4222-8222-222222222004','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444001','STAFF','22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.857','sample_head'),('22222222-2222-4222-8222-222222222005','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444001','STAFF','22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.857','sample_teacher'),('22222222-2222-4222-8222-222222222006','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444001','STAFF','22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.857','sample_teacher2'),('2937090b-28db-4878-95c7-13c911b31a29','eff0ce1e-1234-4892-a9f7-031383a681a5','965f9d17-8c11-4191-8579-0e617875100e','STAFF','f7f282ff-c021-48b6-92d9-a10ea0546e6e','2026-11-13 09:45:57.747','vyvy'),('6e19d5f9-fe91-440b-b4c9-6727473c6fb6','eff0ce1e-1234-4892-a9f7-031383a681a5','965f9d17-8c11-4191-8579-0e617875100e','STAFF','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','2026-11-13 09:49:51.181','bao'),('f7f282ff-c021-48b6-92d9-a10ea0546e6e','eff0ce1e-1234-4892-a9f7-031383a681a5','965f9d17-8c11-4191-8579-0e617875100e','MANAGER','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','2026-11-13 08:41:44.970','Sang');
/*!40000 ALTER TABLE `department_member` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `department_module`
--

DROP TABLE IF EXISTS `department_module`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `department_module` (
  `department_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module_code` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`department_id`,`module_code`),
  KEY `idx_department_module_org` (`org_id`),
  KEY `department_id` (`department_id`,`org_id`),
  CONSTRAINT `department_module_ibfk_1` FOREIGN KEY (`department_id`, `org_id`) REFERENCES `department` (`id`, `org_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `department_module`
--

LOCK TABLES `department_module` WRITE;
/*!40000 ALTER TABLE `department_module` DISABLE KEYS */;
INSERT INTO `department_module` VALUES ('44444444-4444-4444-8444-444444444001','11111111-1111-4111-8111-111111111111','STUDENT_MANAGEMENT'),('965f9d17-8c11-4191-8579-0e617875100e','eff0ce1e-1234-4892-a9f7-031383a681a5','STUDENT_MANAGEMENT');
/*!40000 ALTER TABLE `department_module` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `member_position`
--

DROP TABLE IF EXISTS `member_position`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `member_position` (
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`user_id`,`position_id`),
  KEY `user_id` (`user_id`,`org_id`),
  KEY `position_id` (`position_id`,`org_id`),
  CONSTRAINT `member_position_ibfk_1` FOREIGN KEY (`user_id`, `org_id`) REFERENCES `department_member` (`user_id`, `org_id`) ON DELETE CASCADE,
  CONSTRAINT `member_position_ibfk_2` FOREIGN KEY (`position_id`, `org_id`) REFERENCES `position` (`id`, `org_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `member_position`
--

LOCK TABLES `member_position` WRITE;
/*!40000 ALTER TABLE `member_position` DISABLE KEYS */;
INSERT INTO `member_position` VALUES ('22222222-2222-4222-8222-222222222001','33333333-3333-4333-8333-333333333001','11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222002','33333333-3333-4333-8333-333333333005','11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222003','33333333-3333-4333-8333-333333333002','11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222004','33333333-3333-4333-8333-333333333004','11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222005','33333333-3333-4333-8333-333333333003','11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222006','33333333-3333-4333-8333-333333333003','11111111-1111-4111-8111-111111111111'),('2937090b-28db-4878-95c7-13c911b31a29','4d4cb69e-0d6b-438f-890f-08aede208b49','eff0ce1e-1234-4892-a9f7-031383a681a5'),('2937090b-28db-4878-95c7-13c911b31a29','7a9cbe64-5cdb-4807-99c6-f0754ff85290','eff0ce1e-1234-4892-a9f7-031383a681a5'),('6e19d5f9-fe91-440b-b4c9-6727473c6fb6','4d4cb69e-0d6b-438f-890f-08aede208b49','eff0ce1e-1234-4892-a9f7-031383a681a5'),('6e19d5f9-fe91-440b-b4c9-6727473c6fb6','8a0c7099-25c1-439b-b07c-4cd8b31bdcdc','eff0ce1e-1234-4892-a9f7-031383a681a5'),('f7f282ff-c021-48b6-92d9-a10ea0546e6e','09abe78d-a8ba-431b-bcb9-43c22334cae1','eff0ce1e-1234-4892-a9f7-031383a681a5'),('f7f282ff-c021-48b6-92d9-a10ea0546e6e','1badbc89-38f0-4b44-9f1f-f112f56828d2','eff0ce1e-1234-4892-a9f7-031383a681a5'),('f7f282ff-c021-48b6-92d9-a10ea0546e6e','4d4cb69e-0d6b-438f-890f-08aede208b49','eff0ce1e-1234-4892-a9f7-031383a681a5'),('f7f282ff-c021-48b6-92d9-a10ea0546e6e','8a0c7099-25c1-439b-b07c-4cd8b31bdcdc','eff0ce1e-1234-4892-a9f7-031383a681a5');
/*!40000 ALTER TABLE `member_position` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `people_audit_log`
--

DROP TABLE IF EXISTS `people_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `people_audit_log` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_people_audit_org_time` (`org_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `people_audit_log`
--

LOCK TABLES `people_audit_log` WRITE;
/*!40000 ALTER TABLE `people_audit_log` DISABLE KEYS */;
INSERT INTO `people_audit_log` VALUES ('0361a8f0-72a7-442f-a516-19af81420f93','050f1426-a066-4afe-b85d-2e4c4962aea4','02043f1a-c507-472e-bad8-531dbe4659a6','CLASS_CREATED','60368458-8b4d-4200-9cec-82d25ed4d04b','{\"id\":\"60368458-8b4d-4200-9cec-82d25ed4d04b\",\"orgId\":\"050f1426-a066-4afe-b85d-2e4c4962aea4\",\"classCode\":\"SMOKE-1793965341\",\"name\":\"Smoke Class\",\"academicYear\":\"2026\",\"startDate\":null,\"endDate\":null,\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"02043f1a-c507-472e-bad8-531dbe4659a6\",\"createdAt\":\"2026-11-06T11:42:21.863Z\",\"updatedAt\":null}','2026-11-06 11:42:21.879'),('06644a80-1320-4d46-b749-f5558f512838','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222003','CLASS_CREATED','af3f4c01-860f-4101-bbd2-751579e23a38','{\"id\":\"af3f4c01-860f-4101-bbd2-751579e23a38\",\"orgId\":\"11111111-1111-4111-8111-111111111111\",\"classCode\":\"S4A-192338\",\"name\":\"Lớp demo gán giáo viên\",\"academicYear\":\"2026-2027\",\"startDate\":\"2026-09-05\",\"endDate\":\"2027-05-30\",\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"22222222-2222-4222-8222-222222222003\",\"createdAt\":\"2026-11-06T12:23:39.518Z\",\"updatedAt\":null}','2026-11-06 12:23:39.522'),('07db7bd5-3aba-479f-8c04-9ebc94f50aa3','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222003','CLASS_TEACHER_ASSIGNED','de87607d-265f-4588-a550-e52bea9e7b5c','{\"before\":null,\"after\":{\"id\":\"f94a90d4-7535-456a-ada1-1e9da09abeb1\",\"code\":\"GV004\",\"fullName\":\"Đỗ Thị Giáo\"}}','2026-11-06 12:24:12.929'),('07f17f7d-a271-47de-b148-25a0a2452206','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','DEPARTMENT_MODULES_CHANGED','a4157b2c-7fcc-4c7c-b85a-376a4ecd4b8e','{\"before\":[],\"after\":[\"STUDENT_MANAGEMENT\"]}','2026-11-13 07:29:56.360'),('0add7737-bcac-4191-adc6-f3cda55f6cbc','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_REMOVED','227f4fa5-c2aa-4724-b79f-b872ac5d72f7','{\"userId\":\"227f4fa5-c2aa-4724-b79f-b872ac5d72f7\",\"username\":\"e2e_staff_401611\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T07:20:04.805Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}','2026-11-13 07:20:06.850'),('0b75f06b-908c-4197-87c8-f251264adf53','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222002','MEMBER_REMOVED','75ac094f-d05c-456e-8627-1b20a9a63b02','{\"userId\":\"75ac094f-d05c-456e-8627-1b20a9a63b02\",\"username\":\"verify_academic_staff2\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222003\",\"appointedAt\":\"2026-11-13T10:40:08.565Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333007\"],\"permissions\":[]}','2026-11-13 10:40:37.529'),('0ba56eb9-7f34-4fa1-8e65-7ba6fe8b9364','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222003','CLASS_TEACHER_ASSIGNED','f263bce5-04a5-4910-ae81-9b2051f9a676','{\"before\":null,\"after\":{\"id\":\"f94a90d4-7535-456a-ada1-1e9da09abeb1\",\"code\":\"GV004\",\"fullName\":\"Đỗ Thị Giáo\"}}','2026-11-06 12:30:18.171'),('0bd27b23-b4c4-461b-9136-a6738ae66724','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222003','CLASS_CREATED','b0296dc4-89c9-40bd-90b2-a5d73d510b9b','{\"id\":\"b0296dc4-89c9-40bd-90b2-a5d73d510b9b\",\"orgId\":\"11111111-1111-4111-8111-111111111111\",\"classCode\":\"S4A-192428\",\"name\":\"Lớp demo gán giáo viên\",\"academicYear\":\"2026-2027\",\"startDate\":\"2026-12-06\",\"endDate\":\"2027-09-02\",\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"22222222-2222-4222-8222-222222222003\",\"createdAt\":\"2026-11-06T12:24:28.896Z\",\"updatedAt\":null}','2026-11-06 12:24:28.900'),('18af1cc0-cb7f-4c2e-b0a4-758ee210c098','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','POSITION_CREATED','f6762c94-c213-4f7d-a7cd-756d44fd1617','{\"name\":\"CVe2e 104490\",\"description\":\"Tạo bởi E2E live\",\"permissions\":[\"PEOPLE_VIEW\"]}','2026-11-13 07:31:58.248'),('1f474c71-9655-45dc-866b-9d8689546799','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','POSITION_CREATED','9798fa07-4dc0-4f71-ab10-3e5c3bcecbe4','{\"name\":\"CVe2e 993170\",\"description\":\"Tạo bởi E2E live\",\"permissions\":[\"PEOPLE_VIEW\"]}','2026-11-13 08:20:07.719'),('1f92dc8a-a79f-4864-b0fa-23293d5b28c4','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_APPOINTED','227f4fa5-c2aa-4724-b79f-b872ac5d72f7','{\"userId\":\"227f4fa5-c2aa-4724-b79f-b872ac5d72f7\",\"username\":\"e2e_staff_401611\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T07:20:04.805Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}','2026-11-13 07:20:04.842'),('2475bd9a-4fb0-40be-b635-d234906dfc48','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','POSITION_DELETED','517bf1af-dbb0-4614-9e28-0f9cafa8771f','{\"id\":\"517bf1af-dbb0-4614-9e28-0f9cafa8771f\",\"name\":\"CVe2e 989112 sửa\",\"description\":\"Tạo bởi E2E live\",\"createdAt\":\"2026-11-13T07:30:02.050Z\",\"permissions\":[\"PEOPLE_VIEW\"],\"profileType\":\"GENERAL\"}','2026-11-13 07:30:04.602'),('294abef3-7da5-487e-9f65-074425a3ddce','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222003','CLASS_CREATED','ea695bb2-9279-450a-b305-ec80be289e12','{\"id\":\"ea695bb2-9279-450a-b305-ec80be289e12\",\"orgId\":\"11111111-1111-4111-8111-111111111111\",\"classCode\":\"S4B-192428\",\"name\":\"Lớp demo hủy\",\"academicYear\":\"2026-2027\",\"startDate\":\"2026-12-06\",\"endDate\":\"2027-09-02\",\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"22222222-2222-4222-8222-222222222003\",\"createdAt\":\"2026-11-06T12:24:28.961Z\",\"updatedAt\":null}','2026-11-06 12:24:28.964'),('2bd8b88f-658a-414f-9da1-0040613d5575','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222002','TEACHER_CREATED','f94a90d4-7535-456a-ada1-1e9da09abeb1','{\"staffCode\":\"GV004\",\"fullName\":\"Đỗ Thị Giáo\",\"email\":\"teacher3@sample-mems.example\",\"phone\":\"0900000007\",\"contractType\":\"CO_HUU\",\"specialtyIds\":[\"f230a2b6-09a2-4b30-8d7b-aa44c48fad5b\"]}','2026-11-06 12:23:39.276'),('2d633166-50b0-4cd7-a27c-37a1b021cf85','eff0ce1e-1234-4892-a9f7-031383a681a5','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','DEPARTMENT_MODULES_CHANGED','965f9d17-8c11-4191-8579-0e617875100e','{\"before\":[\"STUDENT_MANAGEMENT\"],\"after\":[\"STUDENT_MANAGEMENT\"]}','2026-11-13 08:37:51.889'),('2ecfbac7-6a3e-4681-9487-33088118a848','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222003','CLASS_TEACHER_ASSIGNED','b0296dc4-89c9-40bd-90b2-a5d73d510b9b','{\"before\":null,\"after\":{\"id\":\"f94a90d4-7535-456a-ada1-1e9da09abeb1\",\"code\":\"GV004\",\"fullName\":\"Đỗ Thị Giáo\"}}','2026-11-06 12:24:28.936'),('30ec271b-1cca-439d-8010-e694fba361ec','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','STUDENT_CREATED','b3f53d80-4527-4b0a-89c9-41ee12867c73','{\"id\":\"b3f53d80-4527-4b0a-89c9-41ee12867c73\",\"orgId\":\"11111111-1111-4111-8111-111111111111\",\"studentCode\":\"SV001\",\"fullName\":\"Ki?m Th? T? Sinh\",\"dateOfBirth\":\"2008-05-05\",\"email\":null,\"phone\":null,\"status\":\"active\",\"classId\":null,\"classCode\":null,\"className\":null,\"createdBy\":\"22222222-2222-4222-8222-222222222001\",\"createdAt\":\"2026-11-13T10:07:33.044Z\",\"updatedAt\":null}','2026-11-13 10:07:33.059'),('3227e134-4734-433c-85eb-49af216e2897','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','STUDENT_CREATED','90d00119-093c-442d-b974-ee201f06f788','{\"id\":\"90d00119-093c-442d-b974-ee201f06f788\",\"orgId\":\"11111111-1111-4111-8111-111111111111\",\"studentCode\":\"SV009\",\"fullName\":\"D\",\"dateOfBirth\":null,\"email\":null,\"phone\":null,\"status\":\"active\",\"classId\":null,\"classCode\":null,\"className\":null,\"createdBy\":\"22222222-2222-4222-8222-222222222001\",\"createdAt\":\"2026-11-13T10:08:12.427Z\",\"updatedAt\":null}','2026-11-13 10:08:12.430'),('3237d58b-7e72-41ac-9c33-dcafd0baf7ba','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222002','MEMBER_APPOINTED','066c952f-8a14-4cd6-827e-e20c34599cfa','{\"userId\":\"066c952f-8a14-4cd6-827e-e20c34599cfa\",\"username\":\"verify_hr_staff\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222002\",\"appointedAt\":\"2026-11-13T10:40:07.668Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333007\"],\"permissions\":[]}','2026-11-13 10:40:07.700'),('337bd6ea-ec69-4350-8ff3-a714589e3ae0','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','TEACHER_UPDATED','22222222-2222-4222-8222-222222222005','{\"phone\":{\"before\":\"0912345678\",\"after\":\"0900000005\"}}','2026-11-13 07:32:11.389'),('33bf0954-ebe8-483a-b67a-8d6399f3576c','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_POSITIONS_CHANGED','227f4fa5-c2aa-4724-b79f-b872ac5d72f7','{\"before\":{\"userId\":\"227f4fa5-c2aa-4724-b79f-b872ac5d72f7\",\"username\":\"e2e_staff_401611\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T07:20:04.805Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]},\"after\":{\"userId\":\"227f4fa5-c2aa-4724-b79f-b872ac5d72f7\",\"username\":\"e2e_staff_401611\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T07:20:04.805Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}}','2026-11-13 07:20:06.073'),('358df1d0-1fc3-4bf0-85b8-6774e0ef172b','050f1426-a066-4afe-b85d-2e4c4962aea4','02043f1a-c507-472e-bad8-531dbe4659a6','CLASS_UPDATED','7aac22cf-c5fd-4aa9-be9b-4cedd295c4af','{\"before\":{\"id\":\"7aac22cf-c5fd-4aa9-be9b-4cedd295c4af\",\"orgId\":\"050f1426-a066-4afe-b85d-2e4c4962aea4\",\"classCode\":\"SMOKE-1793965108\",\"name\":\"Smoke Class\",\"academicYear\":\"2026\",\"startDate\":null,\"endDate\":null,\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"02043f1a-c507-472e-bad8-531dbe4659a6\",\"createdAt\":\"2026-11-06T11:38:29.048Z\",\"updatedAt\":null},\"after\":{\"id\":\"7aac22cf-c5fd-4aa9-be9b-4cedd295c4af\",\"orgId\":\"050f1426-a066-4afe-b85d-2e4c4962aea4\",\"classCode\":\"SMOKE-1793965108\",\"name\":\"Smoke Class 2\",\"academicYear\":null,\"startDate\":null,\"endDate\":null,\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":1,\"studentCount\":0,\"createdBy\":\"02043f1a-c507-472e-bad8-531dbe4659a6\",\"createdAt\":\"2026-11-06T11:38:29.048Z\",\"updatedAt\":\"2026-11-06T11:38:29.107Z\"}}','2026-11-06 11:38:29.112'),('36fcdba5-7f9c-459a-a386-382f283e6ece','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','TEACHER_UPDATED','22222222-2222-4222-8222-222222222005','{\"phone\":{\"before\":\"0900000005\",\"after\":\"0912345678\"}}','2026-11-13 07:32:11.031'),('376ff14e-9f4a-4219-a387-fa67fc83befa','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222003','CLASS_CREATED','de87607d-265f-4588-a550-e52bea9e7b5c','{\"id\":\"de87607d-265f-4588-a550-e52bea9e7b5c\",\"orgId\":\"11111111-1111-4111-8111-111111111111\",\"classCode\":\"S4A-192412\",\"name\":\"Lớp demo gán giáo viên\",\"academicYear\":\"2026-2027\",\"startDate\":\"2026-12-06\",\"endDate\":\"2027-09-02\",\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"22222222-2222-4222-8222-222222222003\",\"createdAt\":\"2026-11-06T12:24:12.881Z\",\"updatedAt\":null}','2026-11-06 12:24:12.886'),('39ca6c4b-422e-4738-853c-dabc1de9abd9','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','TEACHER_UPDATED','22222222-2222-4222-8222-222222222005','{\"phone\":{\"before\":\"0900000005\",\"after\":\"0912345678\"}}','2026-11-13 07:23:26.154'),('3ad4632a-6493-487c-ac6a-3ed0ca2d08ee','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222002','POSITION_CREATED','2014c82a-2d62-4418-89be-c70ce5208a7e','{\"name\":\"Verify HR Position\",\"description\":\"tmp verify\",\"permissions\":[\"PEOPLE_VIEW\"]}','2026-11-13 10:40:07.924'),('4297bdff-83ec-4b27-b24e-8dfab5bc89a0','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','TEACHER_UPDATED','22222222-2222-4222-8222-222222222005','{\"phone\":{\"before\":\"0912345678\",\"after\":\"0900000005\"}}','2026-11-13 07:30:13.800'),('4523c66f-f0f6-4714-a65b-d17577deacc9','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','TEACHER_UPDATED','22222222-2222-4222-8222-222222222005','{\"phone\":{\"before\":\"0900000005\",\"after\":\"0912345678\"}}','2026-11-13 07:30:13.473'),('48578165-bd1e-424c-a620-670684b197dd','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','TEACHER_UPDATED','22222222-2222-4222-8222-222222222005','{\"phone\":{\"before\":\"0900000005\",\"after\":\"0912345678\"}}','2026-11-13 07:22:29.423'),('4a27acb1-fb01-4384-aa82-8367f48b57ad','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','TEACHER_UPDATED','22222222-2222-4222-8222-222222222005','{\"phone\":{\"before\":\"0912345678\",\"after\":\"0900000005\"}}','2026-11-13 07:23:26.438'),('4d3d6ef0-7b75-4b10-9824-12065730b1e2','050f1426-a066-4afe-b85d-2e4c4962aea4','02043f1a-c507-472e-bad8-531dbe4659a6','CLASS_DELETED','66564365-1f0e-46a3-af52-d286ac13f1ba','{\"id\":\"66564365-1f0e-46a3-af52-d286ac13f1ba\",\"orgId\":\"050f1426-a066-4afe-b85d-2e4c4962aea4\",\"classCode\":\"SMOKE-1793965057\",\"name\":\"Smoke Class 2\",\"academicYear\":null,\"startDate\":null,\"endDate\":null,\"status\":\"DA_HUY\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":2,\"studentCount\":0,\"createdBy\":\"02043f1a-c507-472e-bad8-531dbe4659a6\",\"createdAt\":\"2026-11-06T11:37:37.635Z\",\"updatedAt\":\"2026-11-06T11:37:37.842Z\"}','2026-11-06 11:37:37.947'),('50aba003-6c85-4747-99ec-15fb45fdc7b7','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_APPOINTED','ae03df74-b39e-4372-997c-d90baf52ca5f','{\"userId\":\"ae03df74-b39e-4372-997c-d90baf52ca5f\",\"username\":\"demo_staff_auto\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T10:07:55.970Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333007\"],\"permissions\":[]}','2026-11-13 10:07:55.986'),('5459eb1e-3469-4fba-b7bc-122eb7b252c5','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222003','CLASS_CREATED','8fe8bd42-cc8d-4ea8-ba10-9bd6abf0063e','{\"id\":\"8fe8bd42-cc8d-4ea8-ba10-9bd6abf0063e\",\"orgId\":\"11111111-1111-4111-8111-111111111111\",\"classCode\":\"S4B-193649\",\"name\":\"Lớp demo hủy\",\"academicYear\":\"2026-2027\",\"startDate\":\"2026-12-06\",\"endDate\":\"2027-09-02\",\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"22222222-2222-4222-8222-222222222003\",\"createdAt\":\"2026-11-06T12:36:50.949Z\",\"updatedAt\":null}','2026-11-06 12:36:50.954'),('552c8565-0b95-4852-8a40-07b5fc0785fb','eff0ce1e-1234-4892-a9f7-031383a681a5','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','MEMBER_APPOINTED','6e19d5f9-fe91-440b-b4c9-6727473c6fb6','{\"userId\":\"6e19d5f9-fe91-440b-b4c9-6727473c6fb6\",\"username\":\"bao\",\"departmentId\":\"965f9d17-8c11-4191-8579-0e617875100e\",\"role\":\"STAFF\",\"appointedBy\":\"b3bd1fe9-b739-42c2-9b04-86bd35ab1846\",\"appointedAt\":\"2026-11-13T09:49:51.181Z\",\"positionIds\":[\"4d4cb69e-0d6b-438f-890f-08aede208b49\",\"8a0c7099-25c1-439b-b07c-4cd8b31bdcdc\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}','2026-11-13 09:49:51.210'),('5591030e-3c0f-465b-9749-7ecbfd04812b','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','POSITION_CREATED','517bf1af-dbb0-4614-9e28-0f9cafa8771f','{\"name\":\"CVe2e 989112\",\"description\":\"Tạo bởi E2E live\",\"permissions\":[\"PEOPLE_VIEW\"]}','2026-11-13 07:30:02.057'),('571491dc-71b0-4c23-ad6d-af45041471cd','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','POSITION_UPDATED','4b35aaf4-d228-47f8-8ceb-cc8a376e7c08','{\"before\":{\"id\":\"4b35aaf4-d228-47f8-8ceb-cc8a376e7c08\",\"name\":\"CVe2e 261134\",\"description\":\"Tạo bởi E2E live\",\"createdAt\":\"2026-11-13T07:17:44.597Z\",\"permissions\":[\"PEOPLE_VIEW\"],\"profileType\":\"GENERAL\"},\"after\":{\"id\":\"4b35aaf4-d228-47f8-8ceb-cc8a376e7c08\",\"name\":\"CVe2e 261134 sửa\",\"description\":\"Tạo bởi E2E live\",\"createdAt\":\"2026-11-13T07:17:44.597Z\",\"permissions\":[\"PEOPLE_VIEW\"],\"profileType\":\"GENERAL\"}}','2026-11-13 07:17:46.328'),('593fd53b-421d-4bbd-b5d4-2810ff204504','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','POSITION_CREATED','083b9601-977c-4f02-acfd-9e0708a26c54','{\"name\":\"CVe2e 160182\",\"description\":\"Tạo bởi E2E live\",\"permissions\":[\"PEOPLE_VIEW\"]}','2026-11-13 07:16:03.791'),('5975cbd7-684f-496e-9006-72552104578b','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222003','CLASS_CREATED','f263bce5-04a5-4910-ae81-9b2051f9a676','{\"id\":\"f263bce5-04a5-4910-ae81-9b2051f9a676\",\"orgId\":\"11111111-1111-4111-8111-111111111111\",\"classCode\":\"S4A-193017\",\"name\":\"Lớp demo gán giáo viên\",\"academicYear\":\"2026-2027\",\"startDate\":\"2026-12-06\",\"endDate\":\"2027-09-02\",\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"22222222-2222-4222-8222-222222222003\",\"createdAt\":\"2026-11-06T12:30:18.094Z\",\"updatedAt\":null}','2026-11-06 12:30:18.104'),('5a287736-5789-4a34-b33c-89ce257a32ff','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','POSITION_UPDATED','517bf1af-dbb0-4614-9e28-0f9cafa8771f','{\"before\":{\"id\":\"517bf1af-dbb0-4614-9e28-0f9cafa8771f\",\"name\":\"CVe2e 989112\",\"description\":\"Tạo bởi E2E live\",\"createdAt\":\"2026-11-13T07:30:02.050Z\",\"permissions\":[\"PEOPLE_VIEW\"],\"profileType\":\"GENERAL\"},\"after\":{\"id\":\"517bf1af-dbb0-4614-9e28-0f9cafa8771f\",\"name\":\"CVe2e 989112 sửa\",\"description\":\"Tạo bởi E2E live\",\"createdAt\":\"2026-11-13T07:30:02.050Z\",\"permissions\":[\"PEOPLE_VIEW\"],\"profileType\":\"GENERAL\"}}','2026-11-13 07:30:03.087'),('5c326fb1-b2fb-4952-ad65-19b9fc944d9f','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','TEACHER_UPDATED','22222222-2222-4222-8222-222222222005','{\"phone\":{\"before\":\"0912345678\",\"after\":\"0900000005\"}}','2026-11-13 07:22:29.720'),('5d78e227-da58-49f7-8c9c-3cbaee181b84','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_POSITIONS_CHANGED','19da3990-467a-4154-8423-d4d8317c6b3c','{\"before\":{\"userId\":\"19da3990-467a-4154-8423-d4d8317c6b3c\",\"username\":\"e2e_staff_104490\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T07:32:05.058Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]},\"after\":{\"userId\":\"19da3990-467a-4154-8423-d4d8317c6b3c\",\"username\":\"e2e_staff_104490\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T07:32:05.058Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}}','2026-11-13 07:32:06.597'),('5fba5a58-df65-4795-b5e7-2031ac985dd3','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','STUDENT_DELETED','b3f53d80-4527-4b0a-89c9-41ee12867c73','{\"id\":\"b3f53d80-4527-4b0a-89c9-41ee12867c73\",\"orgId\":\"11111111-1111-4111-8111-111111111111\",\"studentCode\":\"SV001\",\"fullName\":\"Ki?m Th? T? Sinh\",\"dateOfBirth\":\"2008-05-05\",\"email\":null,\"phone\":null,\"status\":\"active\",\"classId\":null,\"classCode\":null,\"className\":null,\"createdBy\":\"22222222-2222-4222-8222-222222222001\",\"createdAt\":\"2026-11-13T10:07:33.044Z\",\"updatedAt\":null}','2026-11-13 10:07:40.588'),('62d63c33-4b71-4a2f-84d3-19fb3cca82ca','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','DEPARTMENT_MODULES_CHANGED','65843c5e-1868-4217-b925-40336c6ef5a3','{\"before\":[\"STUDENT_MANAGEMENT\"],\"after\":[\"STUDENT_MANAGEMENT\"]}','2026-11-13 08:20:03.020'),('6a3de34a-07a8-46b0-a1ad-95f5b8799efa','050f1426-a066-4afe-b85d-2e4c4962aea4','02043f1a-c507-472e-bad8-531dbe4659a6','CLASS_UPDATED','66564365-1f0e-46a3-af52-d286ac13f1ba','{\"before\":{\"id\":\"66564365-1f0e-46a3-af52-d286ac13f1ba\",\"orgId\":\"050f1426-a066-4afe-b85d-2e4c4962aea4\",\"classCode\":\"SMOKE-1793965057\",\"name\":\"Smoke Class\",\"academicYear\":\"2026\",\"startDate\":null,\"endDate\":null,\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"02043f1a-c507-472e-bad8-531dbe4659a6\",\"createdAt\":\"2026-11-06T11:37:37.635Z\",\"updatedAt\":null},\"after\":{\"id\":\"66564365-1f0e-46a3-af52-d286ac13f1ba\",\"orgId\":\"050f1426-a066-4afe-b85d-2e4c4962aea4\",\"classCode\":\"SMOKE-1793965057\",\"name\":\"Smoke Class 2\",\"academicYear\":null,\"startDate\":null,\"endDate\":null,\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":1,\"studentCount\":0,\"createdBy\":\"02043f1a-c507-472e-bad8-531dbe4659a6\",\"createdAt\":\"2026-11-06T11:37:37.635Z\",\"updatedAt\":\"2026-11-06T11:37:37.745Z\"}}','2026-11-06 11:37:37.753'),('6bfc71f4-b3bd-480b-a62d-7b25c542d9b7','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222002','MEMBER_APPOINTED','f94a90d4-7535-456a-ada1-1e9da09abeb1','{\"userId\":\"f94a90d4-7535-456a-ada1-1e9da09abeb1\",\"username\":\"sample_teacher3\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222002\",\"appointedAt\":\"2026-11-06T12:23:39.244Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333003\"],\"permissions\":[\"CLASS_VIEW\",\"SCHEDULE_VIEW\",\"STUDENT_VIEW\"]}','2026-11-06 12:23:39.271'),('6cae1aca-f9da-4dc9-b9aa-31bbd2300468','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','POSITION_UPDATED','f6762c94-c213-4f7d-a7cd-756d44fd1617','{\"before\":{\"id\":\"f6762c94-c213-4f7d-a7cd-756d44fd1617\",\"name\":\"CVe2e 104490\",\"description\":\"Tạo bởi E2E live\",\"createdAt\":\"2026-11-13T07:31:58.236Z\",\"permissions\":[\"PEOPLE_VIEW\"],\"profileType\":\"GENERAL\"},\"after\":{\"id\":\"f6762c94-c213-4f7d-a7cd-756d44fd1617\",\"name\":\"CVe2e 104490 sửa\",\"description\":\"Tạo bởi E2E live\",\"createdAt\":\"2026-11-13T07:31:58.236Z\",\"permissions\":[\"PEOPLE_VIEW\"],\"profileType\":\"GENERAL\"}}','2026-11-13 07:32:00.014'),('6d47e871-6f33-44ea-9569-f4978aae04a1','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222003','CLASS_TEACHER_ASSIGNED','7ecbe836-5fc7-40b7-b3ec-bc51203c6da7','{\"before\":null,\"after\":{\"id\":\"f94a90d4-7535-456a-ada1-1e9da09abeb1\",\"code\":\"GV004\",\"fullName\":\"Đỗ Thị Giáo\"}}','2026-11-06 12:36:50.904'),('6d6dc75f-378f-49c2-bb37-ff39c2b8de9e','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_REMOVED','5873bdbe-f266-4511-a656-12cfdd86f7f5','{\"userId\":\"5873bdbe-f266-4511-a656-12cfdd86f7f5\",\"username\":\"e2e_staff_975308\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T08:19:44.653Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}','2026-11-13 08:19:46.847'),('729a2378-4b34-4f6f-906e-fdc7ec18f6de','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','POSITION_DELETED','f6762c94-c213-4f7d-a7cd-756d44fd1617','{\"id\":\"f6762c94-c213-4f7d-a7cd-756d44fd1617\",\"name\":\"CVe2e 104490 sửa\",\"description\":\"Tạo bởi E2E live\",\"createdAt\":\"2026-11-13T07:31:58.236Z\",\"permissions\":[\"PEOPLE_VIEW\"],\"profileType\":\"GENERAL\"}','2026-11-13 07:32:01.590'),('75aaf3ec-1bd1-484d-9bd2-d28a1b0c217b','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_APPOINTED','5873bdbe-f266-4511-a656-12cfdd86f7f5','{\"userId\":\"5873bdbe-f266-4511-a656-12cfdd86f7f5\",\"username\":\"e2e_staff_975308\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T08:19:44.653Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}','2026-11-13 08:19:44.718'),('77596d6c-a311-4cf2-a9c6-f4d1df76e3c9','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','STUDENT_CREATED','65eff477-0166-4cf2-8ac8-338d90694eb6','{\"id\":\"65eff477-0166-4cf2-8ac8-338d90694eb6\",\"orgId\":\"11111111-1111-4111-8111-111111111111\",\"studentCode\":\"SV007\",\"fullName\":\"B\",\"dateOfBirth\":null,\"email\":null,\"phone\":null,\"status\":\"active\",\"classId\":null,\"classCode\":null,\"className\":null,\"createdBy\":\"22222222-2222-4222-8222-222222222001\",\"createdAt\":\"2026-11-13T10:08:12.312Z\",\"updatedAt\":null}','2026-11-13 10:08:12.315'),('77738b78-1c51-4f8d-8089-ed7a42d623f0','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222002','MEMBER_REMOVED','066c952f-8a14-4cd6-827e-e20c34599cfa','{\"userId\":\"066c952f-8a14-4cd6-827e-e20c34599cfa\",\"username\":\"verify_hr_staff\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222002\",\"appointedAt\":\"2026-11-13T10:40:07.668Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333007\"],\"permissions\":[]}','2026-11-13 10:40:37.426'),('7b3547ce-a209-41fa-8543-79accee86c49','eff0ce1e-1234-4892-a9f7-031383a681a5','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','MEMBER_POSITIONS_CHANGED','f7f282ff-c021-48b6-92d9-a10ea0546e6e','{\"before\":{\"userId\":\"f7f282ff-c021-48b6-92d9-a10ea0546e6e\",\"username\":\"Sang\",\"departmentId\":\"965f9d17-8c11-4191-8579-0e617875100e\",\"role\":\"MANAGER\",\"appointedBy\":\"b3bd1fe9-b739-42c2-9b04-86bd35ab1846\",\"appointedAt\":\"2026-11-13T08:41:44.970Z\",\"positionIds\":[\"09abe78d-a8ba-431b-bcb9-43c22334cae1\",\"1badbc89-38f0-4b44-9f1f-f112f56828d2\",\"8a0c7099-25c1-439b-b07c-4cd8b31bdcdc\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_APPROVE\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_REOPEN\",\"CLASS_VIEW\",\"PEOPLE_EDIT\",\"PEOPLE_VIEW\",\"SCHEDULE_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]},\"after\":{\"userId\":\"f7f282ff-c021-48b6-92d9-a10ea0546e6e\",\"username\":\"Sang\",\"departmentId\":\"965f9d17-8c11-4191-8579-0e617875100e\",\"role\":\"MANAGER\",\"appointedBy\":\"b3bd1fe9-b739-42c2-9b04-86bd35ab1846\",\"appointedAt\":\"2026-11-13T08:41:44.970Z\",\"positionIds\":[\"09abe78d-a8ba-431b-bcb9-43c22334cae1\",\"1badbc89-38f0-4b44-9f1f-f112f56828d2\",\"4d4cb69e-0d6b-438f-890f-08aede208b49\",\"8a0c7099-25c1-439b-b07c-4cd8b31bdcdc\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_APPROVE\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_REOPEN\",\"CLASS_VIEW\",\"PEOPLE_EDIT\",\"PEOPLE_VIEW\",\"SCHEDULE_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}}','2026-11-13 09:48:26.928'),('7bbb07f3-3b11-41b7-a822-f30d81062759','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','TEACHER_CREATED','2900d32c-0cce-439b-a1cc-5e51f0340b92','{\"staffCode\":\"GV004\",\"fullName\":\"Demo Teacher Auto\",\"email\":\"demo.teacher.auto@sample-mems.example\",\"phone\":\"0909999999\",\"contractType\":\"CO_HUU\",\"specialtyIds\":[\"88888888-8888-4888-8888-888888888001\"]}','2026-11-13 10:07:55.786'),('7ed1dadf-8024-42a3-bb35-ddf0a5890da9','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','TEACHER_UPDATED','22222222-2222-4222-8222-222222222005','{\"phone\":{\"before\":\"0912345678\",\"after\":\"0900000005\"}}','2026-11-13 08:27:52.434'),('844e6603-3fcc-4052-bad8-950cdfe03d37','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','STUDENT_CREATED','8a9ed3a4-8cc9-4977-bb7b-e27c61346ead','{\"id\":\"8a9ed3a4-8cc9-4977-bb7b-e27c61346ead\",\"orgId\":\"11111111-1111-4111-8111-111111111111\",\"studentCode\":\"SV008\",\"fullName\":\"C\",\"dateOfBirth\":null,\"email\":null,\"phone\":null,\"status\":\"active\",\"classId\":null,\"classCode\":null,\"className\":null,\"createdBy\":\"22222222-2222-4222-8222-222222222001\",\"createdAt\":\"2026-11-13T10:08:12.370Z\",\"updatedAt\":null}','2026-11-13 10:08:12.374'),('86067a9f-ca8f-4e51-a866-dbee8b5f4d33','050f1426-a066-4afe-b85d-2e4c4962aea4','02043f1a-c507-472e-bad8-531dbe4659a6','CLASS_DELETED','43aef52d-19ac-4741-95f3-e414eb055f17','{\"id\":\"43aef52d-19ac-4741-95f3-e414eb055f17\",\"orgId\":\"050f1426-a066-4afe-b85d-2e4c4962aea4\",\"classCode\":\"SMOKE-1793965341-C\",\"name\":\"Smoke Close\",\"academicYear\":\"2026\",\"startDate\":null,\"endDate\":null,\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":5,\"studentCount\":0,\"createdBy\":\"02043f1a-c507-472e-bad8-531dbe4659a6\",\"createdAt\":\"2026-11-06T11:42:22.185Z\",\"updatedAt\":\"2026-11-06T11:42:22.380Z\"}','2026-11-06 11:42:22.439'),('87dcff42-d256-42f9-8a6f-c22802fe1ba0','050f1426-a066-4afe-b85d-2e4c4962aea4','02043f1a-c507-472e-bad8-531dbe4659a6','CLASS_CREATED','5da155c1-daf9-437b-bc0e-55ea881d5a38','{\"id\":\"5da155c1-daf9-437b-bc0e-55ea881d5a38\",\"orgId\":\"050f1426-a066-4afe-b85d-2e4c4962aea4\",\"classCode\":\"SMOKE-1793965057-C\",\"name\":\"Smoke Close\",\"academicYear\":\"2026\",\"startDate\":null,\"endDate\":null,\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"02043f1a-c507-472e-bad8-531dbe4659a6\",\"createdAt\":\"2026-11-06T11:37:37.975Z\",\"updatedAt\":null}','2026-11-06 11:37:37.980'),('888b326d-4679-4daf-846a-6d543aea361d','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','DEPARTMENT_MODULES_CHANGED','3d962c0d-bfb0-4800-9965-0e91aadd6c85','{\"before\":[],\"after\":[\"STUDENT_MANAGEMENT\"]}','2026-11-13 07:15:21.011'),('8a9f67e4-5a11-4290-9992-5b0f629c41d3','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_APPOINTED','19da3990-467a-4154-8423-d4d8317c6b3c','{\"userId\":\"19da3990-467a-4154-8423-d4d8317c6b3c\",\"username\":\"e2e_staff_104490\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T07:32:05.058Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}','2026-11-13 07:32:05.095'),('8d5fb1ef-fecc-4c40-8836-46a26b28e256','eff0ce1e-1234-4892-a9f7-031383a681a5','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','MEMBER_POSITIONS_CHANGED','2937090b-28db-4878-95c7-13c911b31a29','{\"before\":{\"userId\":\"2937090b-28db-4878-95c7-13c911b31a29\",\"username\":\"vyvy\",\"departmentId\":\"965f9d17-8c11-4191-8579-0e617875100e\",\"role\":\"STAFF\",\"appointedBy\":\"f7f282ff-c021-48b6-92d9-a10ea0546e6e\",\"appointedAt\":\"2026-11-13T09:45:57.747Z\",\"positionIds\":[\"7a9cbe64-5cdb-4807-99c6-f0754ff85290\"],\"permissions\":[\"CLASS_VIEW\",\"SCHEDULE_VIEW\",\"STUDENT_VIEW\"]},\"after\":{\"userId\":\"2937090b-28db-4878-95c7-13c911b31a29\",\"username\":\"vyvy\",\"departmentId\":\"965f9d17-8c11-4191-8579-0e617875100e\",\"role\":\"STAFF\",\"appointedBy\":\"f7f282ff-c021-48b6-92d9-a10ea0546e6e\",\"appointedAt\":\"2026-11-13T09:45:57.747Z\",\"positionIds\":[\"4d4cb69e-0d6b-438f-890f-08aede208b49\",\"7a9cbe64-5cdb-4807-99c6-f0754ff85290\"],\"permissions\":[\"CLASS_VIEW\",\"SCHEDULE_VIEW\",\"STUDENT_VIEW\"]}}','2026-11-13 09:49:00.718'),('8e5ac013-11a0-48a7-93ac-922f1ccf203c','050f1426-a066-4afe-b85d-2e4c4962aea4','02043f1a-c507-472e-bad8-531dbe4659a6','CLASS_DELETED','5da155c1-daf9-437b-bc0e-55ea881d5a38','{\"id\":\"5da155c1-daf9-437b-bc0e-55ea881d5a38\",\"orgId\":\"050f1426-a066-4afe-b85d-2e4c4962aea4\",\"classCode\":\"SMOKE-1793965057-C\",\"name\":\"Smoke Close\",\"academicYear\":\"2026\",\"startDate\":null,\"endDate\":null,\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"02043f1a-c507-472e-bad8-531dbe4659a6\",\"createdAt\":\"2026-11-06T11:37:37.975Z\",\"updatedAt\":null}','2026-11-06 11:37:38.276'),('954f0bff-6990-4cdb-818f-69b7c1422085','050f1426-a066-4afe-b85d-2e4c4962aea4','02043f1a-c507-472e-bad8-531dbe4659a6','CLASS_DELETED','7aac22cf-c5fd-4aa9-be9b-4cedd295c4af','{\"id\":\"7aac22cf-c5fd-4aa9-be9b-4cedd295c4af\",\"orgId\":\"050f1426-a066-4afe-b85d-2e4c4962aea4\",\"classCode\":\"SMOKE-1793965108\",\"name\":\"Smoke Class 2\",\"academicYear\":null,\"startDate\":null,\"endDate\":null,\"status\":\"DA_HUY\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":2,\"studentCount\":0,\"createdBy\":\"02043f1a-c507-472e-bad8-531dbe4659a6\",\"createdAt\":\"2026-11-06T11:38:29.048Z\",\"updatedAt\":\"2026-11-06T11:38:29.169Z\"}','2026-11-06 11:38:29.263'),('95a3b9f1-3b10-4620-86ff-a5bc1dbf0dc9','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_POSITIONS_CHANGED','5873bdbe-f266-4511-a656-12cfdd86f7f5','{\"before\":{\"userId\":\"5873bdbe-f266-4511-a656-12cfdd86f7f5\",\"username\":\"e2e_staff_975308\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T08:19:44.653Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]},\"after\":{\"userId\":\"5873bdbe-f266-4511-a656-12cfdd86f7f5\",\"username\":\"e2e_staff_975308\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T08:19:44.653Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}}','2026-11-13 08:19:46.015'),('95a9a1b9-cef3-4213-8cb5-eacf39346223','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','DEPARTMENT_MODULES_CHANGED','210046e7-a6ca-41bb-acea-1b04f2aa3ede','{\"before\":[],\"after\":[\"STUDENT_MANAGEMENT\"]}','2026-11-13 08:19:38.844'),('9a080759-a03a-4674-acf7-e85a4855767f','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','TEACHER_UPDATED','22222222-2222-4222-8222-222222222005','{\"phone\":{\"before\":\"0912345678\",\"after\":\"0900000005\"}}','2026-11-13 07:21:16.365'),('9bb27889-5e0b-4f9a-8284-9e113cab5d9a','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_REMOVED','ba652942-ca39-4931-b66e-2dbe55bf2e73','{\"userId\":\"ba652942-ca39-4931-b66e-2dbe55bf2e73\",\"username\":\"e2e_staff_993170\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T08:20:14.059Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}','2026-11-13 08:20:16.419'),('9c77973a-7acf-4361-9076-a4e53c8d73fa','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','POSITION_DELETED','4b35aaf4-d228-47f8-8ceb-cc8a376e7c08','{\"id\":\"4b35aaf4-d228-47f8-8ceb-cc8a376e7c08\",\"name\":\"CVe2e 261134 sửa\",\"description\":\"Tạo bởi E2E live\",\"createdAt\":\"2026-11-13T07:17:44.597Z\",\"permissions\":[\"PEOPLE_VIEW\"],\"profileType\":\"GENERAL\"}','2026-11-13 07:17:47.884'),('9f145278-df8f-4709-9739-614209be4c9d','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','POSITION_UPDATED','9798fa07-4dc0-4f71-ab10-3e5c3bcecbe4','{\"before\":{\"id\":\"9798fa07-4dc0-4f71-ab10-3e5c3bcecbe4\",\"name\":\"CVe2e 993170\",\"description\":\"Tạo bởi E2E live\",\"createdAt\":\"2026-11-13T08:20:07.702Z\",\"permissions\":[\"PEOPLE_VIEW\"],\"profileType\":\"GENERAL\"},\"after\":{\"id\":\"9798fa07-4dc0-4f71-ab10-3e5c3bcecbe4\",\"name\":\"CVe2e 993170 sửa\",\"description\":\"Tạo bởi E2E live\",\"createdAt\":\"2026-11-13T08:20:07.702Z\",\"permissions\":[\"PEOPLE_VIEW\"],\"profileType\":\"GENERAL\"}}','2026-11-13 08:20:08.890'),('a0fe15cb-ec02-400c-8562-09ddaf86142a','050f1426-a066-4afe-b85d-2e4c4962aea4','02043f1a-c507-472e-bad8-531dbe4659a6','CLASS_DELETED','60368458-8b4d-4200-9cec-82d25ed4d04b','{\"id\":\"60368458-8b4d-4200-9cec-82d25ed4d04b\",\"orgId\":\"050f1426-a066-4afe-b85d-2e4c4962aea4\",\"classCode\":\"SMOKE-1793965341\",\"name\":\"Smoke Class 2\",\"academicYear\":null,\"startDate\":null,\"endDate\":null,\"status\":\"DA_HUY\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":2,\"studentCount\":0,\"createdBy\":\"02043f1a-c507-472e-bad8-531dbe4659a6\",\"createdAt\":\"2026-11-06T11:42:21.863Z\",\"updatedAt\":\"2026-11-06T11:42:22.051Z\"}','2026-11-06 11:42:22.159'),('a2c69408-026f-4f75-b406-361c8717b02d','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_POSITIONS_CHANGED','ba652942-ca39-4931-b66e-2dbe55bf2e73','{\"before\":{\"userId\":\"ba652942-ca39-4931-b66e-2dbe55bf2e73\",\"username\":\"e2e_staff_993170\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T08:20:14.059Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]},\"after\":{\"userId\":\"ba652942-ca39-4931-b66e-2dbe55bf2e73\",\"username\":\"e2e_staff_993170\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T08:20:14.059Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}}','2026-11-13 08:20:15.610'),('a2e8c8ef-1e69-4945-8c4b-e364010a81e4','eff0ce1e-1234-4892-a9f7-031383a681a5','f7f282ff-c021-48b6-92d9-a10ea0546e6e','CLASS_TEACHER_ASSIGNED','f5aff886-cfa1-4e7f-863d-5cf5855ecd58','{\"before\":null,\"after\":{\"id\":\"2937090b-28db-4878-95c7-13c911b31a29\",\"code\":\"GV001\",\"fullName\":\"vy\"}}','2026-11-13 10:32:43.718'),('a5f17e50-69da-4474-af85-697b08d7efc0','050f1426-a066-4afe-b85d-2e4c4962aea4','02043f1a-c507-472e-bad8-531dbe4659a6','CLASS_CREATED','454733a9-efcf-4c50-a8d3-8ba44ae7b2e5','{\"id\":\"454733a9-efcf-4c50-a8d3-8ba44ae7b2e5\",\"orgId\":\"050f1426-a066-4afe-b85d-2e4c4962aea4\",\"classCode\":\"SMOKE-1793965108-C\",\"name\":\"Smoke Close\",\"academicYear\":\"2026\",\"startDate\":null,\"endDate\":null,\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"02043f1a-c507-472e-bad8-531dbe4659a6\",\"createdAt\":\"2026-11-06T11:38:29.288Z\",\"updatedAt\":null}','2026-11-06 11:38:29.292'),('a915bf55-0ae0-421c-85ec-7bc306325b42','050f1426-a066-4afe-b85d-2e4c4962aea4','02043f1a-c507-472e-bad8-531dbe4659a6','CLASS_UPDATED','60368458-8b4d-4200-9cec-82d25ed4d04b','{\"before\":{\"id\":\"60368458-8b4d-4200-9cec-82d25ed4d04b\",\"orgId\":\"050f1426-a066-4afe-b85d-2e4c4962aea4\",\"classCode\":\"SMOKE-1793965341\",\"name\":\"Smoke Class\",\"academicYear\":\"2026\",\"startDate\":null,\"endDate\":null,\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"02043f1a-c507-472e-bad8-531dbe4659a6\",\"createdAt\":\"2026-11-06T11:42:21.863Z\",\"updatedAt\":null},\"after\":{\"id\":\"60368458-8b4d-4200-9cec-82d25ed4d04b\",\"orgId\":\"050f1426-a066-4afe-b85d-2e4c4962aea4\",\"classCode\":\"SMOKE-1793965341\",\"name\":\"Smoke Class 2\",\"academicYear\":null,\"startDate\":null,\"endDate\":null,\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":1,\"studentCount\":0,\"createdBy\":\"02043f1a-c507-472e-bad8-531dbe4659a6\",\"createdAt\":\"2026-11-06T11:42:21.863Z\",\"updatedAt\":\"2026-11-06T11:42:21.961Z\"}}','2026-11-06 11:42:21.965'),('ab03f7bc-e0e4-45de-9dd9-685c7eb9a2a7','050f1426-a066-4afe-b85d-2e4c4962aea4','02043f1a-c507-472e-bad8-531dbe4659a6','CLASS_CREATED','66564365-1f0e-46a3-af52-d286ac13f1ba','{\"id\":\"66564365-1f0e-46a3-af52-d286ac13f1ba\",\"orgId\":\"050f1426-a066-4afe-b85d-2e4c4962aea4\",\"classCode\":\"SMOKE-1793965057\",\"name\":\"Smoke Class\",\"academicYear\":\"2026\",\"startDate\":null,\"endDate\":null,\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"02043f1a-c507-472e-bad8-531dbe4659a6\",\"createdAt\":\"2026-11-06T11:37:37.635Z\",\"updatedAt\":null}','2026-11-06 11:37:37.653'),('ae7a777f-536b-4cb0-ae58-f120de9f0b76','eff0ce1e-1234-4892-a9f7-031383a681a5','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','MEMBER_APPOINTED','f7f282ff-c021-48b6-92d9-a10ea0546e6e','{\"userId\":\"f7f282ff-c021-48b6-92d9-a10ea0546e6e\",\"username\":\"Sang\",\"departmentId\":\"965f9d17-8c11-4191-8579-0e617875100e\",\"role\":\"MANAGER\",\"appointedBy\":\"b3bd1fe9-b739-42c2-9b04-86bd35ab1846\",\"appointedAt\":\"2026-11-13T08:41:44.970Z\",\"positionIds\":[\"09abe78d-a8ba-431b-bcb9-43c22334cae1\",\"1badbc89-38f0-4b44-9f1f-f112f56828d2\",\"8a0c7099-25c1-439b-b07c-4cd8b31bdcdc\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_APPROVE\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_REOPEN\",\"CLASS_VIEW\",\"PEOPLE_EDIT\",\"PEOPLE_VIEW\",\"SCHEDULE_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}','2026-11-13 08:41:45.018'),('ae9da0c1-9997-4d70-aa39-4daa67f58dbd','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_POSITIONS_CHANGED','22222222-2222-4222-8222-222222222003','{\"after\":{\"userId\":\"22222222-2222-4222-8222-222222222003\",\"username\":\"sample_academic\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-06T19:20:52.857Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\",\"33333333-3333-4333-8333-333333333005\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"PEOPLE_EDIT\",\"PEOPLE_VIEW\",\"SCHEDULE_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]},\"before\":{\"userId\":\"22222222-2222-4222-8222-222222222003\",\"username\":\"sample_academic\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-06T19:20:52.857Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}}','2026-11-13 10:40:08.179'),('afda1b7a-9be1-43c6-8589-582a34689983','050f1426-a066-4afe-b85d-2e4c4962aea4','02043f1a-c507-472e-bad8-531dbe4659a6','CLASS_CREATED','43aef52d-19ac-4741-95f3-e414eb055f17','{\"id\":\"43aef52d-19ac-4741-95f3-e414eb055f17\",\"orgId\":\"050f1426-a066-4afe-b85d-2e4c4962aea4\",\"classCode\":\"SMOKE-1793965341-C\",\"name\":\"Smoke Close\",\"academicYear\":\"2026\",\"startDate\":null,\"endDate\":null,\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"02043f1a-c507-472e-bad8-531dbe4659a6\",\"createdAt\":\"2026-11-06T11:42:22.185Z\",\"updatedAt\":null}','2026-11-06 11:42:22.189'),('b00d098a-3c19-4055-81b5-44f086af9faf','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','TEACHER_UPDATED','22222222-2222-4222-8222-222222222005','{\"phone\":{\"before\":\"0900000005\",\"after\":\"0912345678\"}}','2026-11-13 07:21:16.011'),('b02617cf-23c4-47a1-ae25-317ddc3f0304','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','STUDENT_CREATED','e60500ce-1424-4d64-8841-f5a7085d4406','{\"id\":\"e60500ce-1424-4d64-8841-f5a7085d4406\",\"orgId\":\"11111111-1111-4111-8111-111111111111\",\"studentCode\":\"SV006\",\"fullName\":\"A\",\"dateOfBirth\":\"2008-05-05\",\"email\":null,\"phone\":null,\"status\":\"active\",\"classId\":null,\"classCode\":null,\"className\":null,\"createdBy\":\"22222222-2222-4222-8222-222222222001\",\"createdAt\":\"2026-11-13T10:08:12.253Z\",\"updatedAt\":null}','2026-11-13 10:08:12.257'),('b0faeaa8-3eb5-4fa9-899b-007a3cadd875','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_REMOVED','3ad70ac7-387f-4aaa-aeb6-8a8e59f28040','{\"userId\":\"3ad70ac7-387f-4aaa-aeb6-8a8e59f28040\",\"username\":\"e2e_staff_989112\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T07:30:07.746Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}','2026-11-13 07:30:09.907'),('b519613c-cb35-44bf-90ff-2fa7b68cf3b0','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','DEPARTMENT_MODULES_CHANGED','65843c5e-1868-4217-b925-40336c6ef5a3','{\"before\":[],\"after\":[\"STUDENT_MANAGEMENT\"]}','2026-11-13 08:20:02.118'),('b6c1a6ac-8ef6-40ed-983e-8ad44d04f606','050f1426-a066-4afe-b85d-2e4c4962aea4','02043f1a-c507-472e-bad8-531dbe4659a6','CLASS_DELETED','5c40f844-ef3e-4815-b38d-7ef5e9633d85','{\"id\":\"5c40f844-ef3e-4815-b38d-7ef5e9633d85\",\"orgId\":\"050f1426-a066-4afe-b85d-2e4c4962aea4\",\"classCode\":\"X9\",\"name\":\"x\",\"academicYear\":null,\"startDate\":null,\"endDate\":null,\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"viewer-user\",\"createdAt\":\"2026-11-06T11:42:38.611Z\",\"updatedAt\":null}','2026-11-06 11:42:48.246'),('b9c7d62d-e1d8-4094-a87b-b6a819216e8b','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222003','CLASS_CREATED','bee00292-68b8-43f2-a248-7124550f5f82','{\"id\":\"bee00292-68b8-43f2-a248-7124550f5f82\",\"orgId\":\"11111111-1111-4111-8111-111111111111\",\"classCode\":\"S4B-193017\",\"name\":\"Lớp demo hủy\",\"academicYear\":\"2026-2027\",\"startDate\":\"2026-12-06\",\"endDate\":\"2027-09-02\",\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"22222222-2222-4222-8222-222222222003\",\"createdAt\":\"2026-11-06T12:30:18.204Z\",\"updatedAt\":null}','2026-11-06 12:30:18.209'),('bc4cf1a8-d0e4-4796-94b1-01d6bd74f1aa','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','TEACHER_UPDATED','22222222-2222-4222-8222-222222222005','{\"phone\":{\"before\":\"0912345678\",\"after\":\"0900000005\"}}','2026-11-13 08:20:21.990'),('bc9aa629-a0e4-4ff2-92c4-ee6bee8b3d4d','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222003','CLASS_CREATED','7ecbe836-5fc7-40b7-b3ec-bc51203c6da7','{\"id\":\"7ecbe836-5fc7-40b7-b3ec-bc51203c6da7\",\"orgId\":\"11111111-1111-4111-8111-111111111111\",\"classCode\":\"S4A-193649\",\"name\":\"Lớp demo gán giáo viên\",\"academicYear\":\"2026-2027\",\"startDate\":\"2026-12-06\",\"endDate\":\"2027-09-02\",\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"22222222-2222-4222-8222-222222222003\",\"createdAt\":\"2026-11-06T12:36:50.797Z\",\"updatedAt\":null}','2026-11-06 12:36:50.809'),('bd5ab920-4c9a-4d64-a788-cafa8ead1baa','eff0ce1e-1234-4892-a9f7-031383a681a5','f7f282ff-c021-48b6-92d9-a10ea0546e6e','CLASS_CREATED','f5aff886-cfa1-4e7f-863d-5cf5855ecd58','{\"id\":\"f5aff886-cfa1-4e7f-863d-5cf5855ecd58\",\"orgId\":\"eff0ce1e-1234-4892-a9f7-031383a681a5\",\"classCode\":\"PNV27\",\"name\":\"PNV27\",\"academicYear\":\"2024-2027\",\"startDate\":\"2026-11-08\",\"endDate\":\"2027-11-15\",\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"f7f282ff-c021-48b6-92d9-a10ea0546e6e\",\"createdAt\":\"2026-11-13T09:44:56.179Z\",\"updatedAt\":null,\"cancelReason\":null,\"closeRequestNote\":null,\"closeRejectReason\":null}','2026-11-13 09:44:56.194'),('bffcf5df-26d0-4158-8104-c826efc11173','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222003','CLASS_CREATED','c1081e10-7098-4e5d-a8cd-349f73cf7a41','{\"id\":\"c1081e10-7098-4e5d-a8cd-349f73cf7a41\",\"orgId\":\"11111111-1111-4111-8111-111111111111\",\"classCode\":\"S4B-192412\",\"name\":\"Lớp demo hủy\",\"academicYear\":\"2026-2027\",\"startDate\":\"2026-12-06\",\"endDate\":\"2027-09-02\",\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"22222222-2222-4222-8222-222222222003\",\"createdAt\":\"2026-11-06T12:24:12.953Z\",\"updatedAt\":null}','2026-11-06 12:24:12.956'),('c2634c83-fc13-4f6f-8f35-234104e31c5e','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_REMOVED','19da3990-467a-4154-8423-d4d8317c6b3c','{\"userId\":\"19da3990-467a-4154-8423-d4d8317c6b3c\",\"username\":\"e2e_staff_104490\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T07:32:05.058Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}','2026-11-13 07:32:07.427'),('c3915e27-8e9f-4ee0-9102-d98ea12aa022','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_APPOINTED','2900d32c-0cce-439b-a1cc-5e51f0340b92','{\"userId\":\"2900d32c-0cce-439b-a1cc-5e51f0340b92\",\"username\":\"demo_teacher_auto\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T10:07:55.734Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333003\"],\"permissions\":[\"CLASS_VIEW\",\"SCHEDULE_VIEW\",\"STUDENT_VIEW\"]}','2026-11-13 10:07:55.776'),('c42e20a8-247e-4b3d-aaf1-2532191c9eb5','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','DEPARTMENT_MODULES_CHANGED','a510d41c-f893-4832-bdd2-fc36bebfc9f4','{\"before\":[],\"after\":[\"STUDENT_MANAGEMENT\"]}','2026-11-13 07:31:52.087'),('c7c299ff-7fa4-4633-8046-6fe684ce0fab','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_POSITIONS_CHANGED','22222222-2222-4222-8222-222222222003','{\"after\":{\"userId\":\"22222222-2222-4222-8222-222222222003\",\"username\":\"sample_academic\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-06T19:20:52.857Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]},\"before\":{\"userId\":\"22222222-2222-4222-8222-222222222003\",\"username\":\"sample_academic\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-06T19:20:52.857Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\",\"33333333-3333-4333-8333-333333333005\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"PEOPLE_EDIT\",\"PEOPLE_VIEW\",\"SCHEDULE_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}}','2026-11-13 10:40:08.820'),('c96ee6e7-81a5-486c-aabb-0c3782937716','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','DEPARTMENT_MODULES_CHANGED','210046e7-a6ca-41bb-acea-1b04f2aa3ede','{\"before\":[\"STUDENT_MANAGEMENT\"],\"after\":[\"STUDENT_MANAGEMENT\"]}','2026-11-13 08:19:40.081'),('cab8d16e-70c1-4ead-8ced-612f377fc57a','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','POSITION_CREATED','4b35aaf4-d228-47f8-8ceb-cc8a376e7c08','{\"name\":\"CVe2e 261134\",\"description\":\"Tạo bởi E2E live\",\"permissions\":[\"PEOPLE_VIEW\"]}','2026-11-13 07:17:44.616'),('d0103c19-3570-4594-9e26-afe41e5d1875','eff0ce1e-1234-4892-a9f7-031383a681a5','f7f282ff-c021-48b6-92d9-a10ea0546e6e','TEACHER_CREATED','2937090b-28db-4878-95c7-13c911b31a29','{\"staffCode\":\"vyvy\",\"fullName\":\"vy\",\"email\":\"vy@gmail.com\",\"phone\":\"09090909090\",\"contractType\":\"CO_HUU\",\"specialtyIds\":[\"ceffad9b-496d-41f8-b5dc-26332c14e6e3\"]}','2026-11-13 09:45:57.793'),('d1f87b7c-7281-4b3a-8a5a-6e919f58f28c','050f1426-a066-4afe-b85d-2e4c4962aea4','viewer-user','CLASS_CREATED','5c40f844-ef3e-4815-b38d-7ef5e9633d85','{\"id\":\"5c40f844-ef3e-4815-b38d-7ef5e9633d85\",\"orgId\":\"050f1426-a066-4afe-b85d-2e4c4962aea4\",\"classCode\":\"X9\",\"name\":\"x\",\"academicYear\":null,\"startDate\":null,\"endDate\":null,\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"viewer-user\",\"createdAt\":\"2026-11-06T11:42:38.611Z\",\"updatedAt\":null}','2026-11-06 11:42:38.616'),('d3a42581-6061-459e-9208-fa2811d6753f','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222002','POSITION_DELETED','2014c82a-2d62-4418-89be-c70ce5208a7e','{\"id\":\"2014c82a-2d62-4418-89be-c70ce5208a7e\",\"name\":\"Verify HR Position\",\"description\":\"tmp verify\",\"createdAt\":\"2026-11-13T10:40:07.911Z\",\"permissions\":[\"PEOPLE_VIEW\"],\"profileType\":\"GENERAL\"}','2026-11-13 10:40:37.579'),('d53b7583-c814-4266-8439-7a9696816c7a','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','TEACHER_UPDATED','22222222-2222-4222-8222-222222222005','{\"phone\":{\"before\":\"0900000005\",\"after\":\"0912345678\"}}','2026-11-13 08:27:51.991'),('d56a47e7-5bdb-46b2-9fb3-32e288970f33','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_APPOINTED','73462015-6f33-45c3-85b0-93d1f5825d9f','{\"userId\":\"73462015-6f33-45c3-85b0-93d1f5825d9f\",\"username\":\"e2e_staff_330549\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T07:18:54.582Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}','2026-11-13 07:18:54.846'),('d7034569-9088-434b-b45d-de5f01da9d46','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','TEACHER_UPDATED','22222222-2222-4222-8222-222222222005','{\"phone\":{\"before\":\"0912345678\",\"after\":\"0900000005\"}}','2026-11-13 07:23:12.209'),('d7728a3a-fd1e-4b11-a2ca-4a2cf2354e85','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','POSITION_DELETED','9798fa07-4dc0-4f71-ab10-3e5c3bcecbe4','{\"id\":\"9798fa07-4dc0-4f71-ab10-3e5c3bcecbe4\",\"name\":\"CVe2e 993170 sửa\",\"description\":\"Tạo bởi E2E live\",\"createdAt\":\"2026-11-13T08:20:07.702Z\",\"permissions\":[\"PEOPLE_VIEW\"],\"profileType\":\"GENERAL\"}','2026-11-13 08:20:10.455'),('d791dfab-63d2-4e62-9da9-a16980c9e63f','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','TEACHER_UPDATED','22222222-2222-4222-8222-222222222005','{\"phone\":{\"before\":\"0900000005\",\"after\":\"0912345678\"}}','2026-11-13 07:23:11.883'),('d88a52cc-eeaf-43d7-b5b6-2f162c1b2756','050f1426-a066-4afe-b85d-2e4c4962aea4','02043f1a-c507-472e-bad8-531dbe4659a6','CLASS_DELETED','454733a9-efcf-4c50-a8d3-8ba44ae7b2e5','{\"id\":\"454733a9-efcf-4c50-a8d3-8ba44ae7b2e5\",\"orgId\":\"050f1426-a066-4afe-b85d-2e4c4962aea4\",\"classCode\":\"SMOKE-1793965108-C\",\"name\":\"Smoke Close\",\"academicYear\":\"2026\",\"startDate\":null,\"endDate\":null,\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":5,\"studentCount\":0,\"createdBy\":\"02043f1a-c507-472e-bad8-531dbe4659a6\",\"createdAt\":\"2026-11-06T11:38:29.288Z\",\"updatedAt\":\"2026-11-06T11:38:29.467Z\"}','2026-11-06 11:38:29.520'),('d897ca3b-561c-426e-8ffe-8a7b162bf7f4','eff0ce1e-1234-4892-a9f7-031383a681a5','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','DEPARTMENT_MODULES_CHANGED','965f9d17-8c11-4191-8579-0e617875100e','{\"before\":[],\"after\":[\"STUDENT_MANAGEMENT\"]}','2026-11-13 08:37:48.294'),('da5a3e92-d6c4-4fa1-b9a0-872d2b4dfcfc','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','TEACHER_UPDATED','22222222-2222-4222-8222-222222222005','{\"phone\":{\"before\":\"0900000005\",\"after\":\"0912345678\"}}','2026-11-13 08:20:21.544'),('dfdec2b3-d8c1-4bcd-865f-aba80768ce29','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_APPOINTED','1f32155e-444d-4585-81dd-385df36a3f08','{\"userId\":\"1f32155e-444d-4585-81dd-385df36a3f08\",\"username\":\"e2e_staff_369911\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T07:19:33.124Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}','2026-11-13 07:19:33.159'),('e06f4afa-35e9-4a9d-85f2-b1ba46eae9d6','050f1426-a066-4afe-b85d-2e4c4962aea4','02043f1a-c507-472e-bad8-531dbe4659a6','CLASS_CREATED','7aac22cf-c5fd-4aa9-be9b-4cedd295c4af','{\"id\":\"7aac22cf-c5fd-4aa9-be9b-4cedd295c4af\",\"orgId\":\"050f1426-a066-4afe-b85d-2e4c4962aea4\",\"classCode\":\"SMOKE-1793965108\",\"name\":\"Smoke Class\",\"academicYear\":\"2026\",\"startDate\":null,\"endDate\":null,\"status\":\"CHUA_BAT_DAU\",\"teacher\":null,\"closeState\":\"NONE\",\"version\":0,\"studentCount\":0,\"createdBy\":\"02043f1a-c507-472e-bad8-531dbe4659a6\",\"createdAt\":\"2026-11-06T11:38:29.048Z\",\"updatedAt\":null}','2026-11-06 11:38:29.052'),('ecc87c27-1136-4236-aacb-3c728a83d2b0','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_APPOINTED','3ad70ac7-387f-4aaa-aeb6-8a8e59f28040','{\"userId\":\"3ad70ac7-387f-4aaa-aeb6-8a8e59f28040\",\"username\":\"e2e_staff_989112\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T07:30:07.746Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}','2026-11-13 07:30:07.767'),('ecf4f622-4297-4c67-904d-28d7a6cbedfe','eff0ce1e-1234-4892-a9f7-031383a681a5','f7f282ff-c021-48b6-92d9-a10ea0546e6e','MEMBER_APPOINTED','2937090b-28db-4878-95c7-13c911b31a29','{\"userId\":\"2937090b-28db-4878-95c7-13c911b31a29\",\"username\":\"vyvy\",\"departmentId\":\"965f9d17-8c11-4191-8579-0e617875100e\",\"role\":\"STAFF\",\"appointedBy\":\"f7f282ff-c021-48b6-92d9-a10ea0546e6e\",\"appointedAt\":\"2026-11-13T09:45:57.747Z\",\"positionIds\":[\"7a9cbe64-5cdb-4807-99c6-f0754ff85290\"],\"permissions\":[\"CLASS_VIEW\",\"SCHEDULE_VIEW\",\"STUDENT_VIEW\"]}','2026-11-13 09:45:57.784'),('eeb163ec-33e9-4920-811c-0723ce90294f','eff0ce1e-1234-4892-a9f7-031383a681a5','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','POSITION_CREATED','abdaa712-476a-4f8d-af0f-4cb14543afbd','{\"name\":\"Giáo viên thực tập\",\"description\":null,\"permissions\":[\"CLASS_VIEW\",\"STUDENT_VIEW\"]}','2026-11-13 08:53:58.369'),('f2fd6161-93ba-4a17-9d85-304edb9024e9','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_POSITIONS_CHANGED','3ad70ac7-387f-4aaa-aeb6-8a8e59f28040','{\"before\":{\"userId\":\"3ad70ac7-387f-4aaa-aeb6-8a8e59f28040\",\"username\":\"e2e_staff_989112\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T07:30:07.746Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]},\"after\":{\"userId\":\"3ad70ac7-387f-4aaa-aeb6-8a8e59f28040\",\"username\":\"e2e_staff_989112\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T07:30:07.746Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}}','2026-11-13 07:30:09.078'),('f3b400fd-a811-4343-bf7e-a92b996c1050','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','MEMBER_APPOINTED','ba652942-ca39-4931-b66e-2dbe55bf2e73','{\"userId\":\"ba652942-ca39-4931-b66e-2dbe55bf2e73\",\"username\":\"e2e_staff_993170\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222001\",\"appointedAt\":\"2026-11-13T08:20:14.059Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333002\"],\"permissions\":[\"CLASS_ASSIGN_TEACHER\",\"CLASS_CANCEL\",\"CLASS_CLOSE_REQUEST\",\"CLASS_CREATE\",\"CLASS_EDIT\",\"CLASS_VIEW\",\"STUDENT_CREATE\",\"STUDENT_DELETE\",\"STUDENT_EDIT\",\"STUDENT_VIEW\"]}','2026-11-13 08:20:14.091'),('f76e33f5-081d-4d52-af32-150c8343703c','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222003','MEMBER_APPOINTED','75ac094f-d05c-456e-8627-1b20a9a63b02','{\"userId\":\"75ac094f-d05c-456e-8627-1b20a9a63b02\",\"username\":\"verify_academic_staff2\",\"departmentId\":\"44444444-4444-4444-8444-444444444001\",\"role\":\"STAFF\",\"appointedBy\":\"22222222-2222-4222-8222-222222222003\",\"appointedAt\":\"2026-11-13T10:40:08.565Z\",\"positionIds\":[\"33333333-3333-4333-8333-333333333007\"],\"permissions\":[]}','2026-11-13 10:40:08.581'),('ff3daf03-b4b8-4076-a42a-45873240bc9d','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222001','STUDENT_CREATED','33addb4b-fe71-4367-8370-a44173c64269','{\"id\":\"33addb4b-fe71-4367-8370-a44173c64269\",\"orgId\":\"11111111-1111-4111-8111-111111111111\",\"studentCode\":\"SV010\",\"fullName\":\"Kiểm Thử Sinh Viên\",\"dateOfBirth\":null,\"email\":null,\"phone\":null,\"status\":\"active\",\"classId\":null,\"classCode\":null,\"className\":null,\"createdBy\":\"22222222-2222-4222-8222-222222222001\",\"createdAt\":\"2026-11-13T10:08:19.953Z\",\"updatedAt\":null}','2026-11-13 10:08:19.958');
/*!40000 ALTER TABLE `people_audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `position`
--

DROP TABLE IF EXISTS `position`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `position` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL,
  `profile_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'GENERAL',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_position_org_name` (`org_id`,`name`),
  UNIQUE KEY `uq_position_id_org` (`id`,`org_id`),
  CONSTRAINT `chk_position_profile_type` CHECK ((`profile_type` in (_utf8mb4'GENERAL',_utf8mb4'TEACHER')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `position`
--

LOCK TABLES `position` WRITE;
/*!40000 ALTER TABLE `position` DISABLE KEYS */;
INSERT INTO `position` VALUES ('09abe78d-a8ba-431b-bcb9-43c22334cae1','eff0ce1e-1234-4892-a9f7-031383a681a5','Nhân sự phòng ban','Quản lý nhân sự trong phòng ban','2026-11-13 08:37:12.948','GENERAL'),('1badbc89-38f0-4b44-9f1f-f112f56828d2','eff0ce1e-1234-4892-a9f7-031383a681a5','Trưởng phòng ban','Phê duyệt đóng lớp trong phòng ban','2026-11-13 08:37:12.941','GENERAL'),('33333333-3333-4333-8333-333333333001','11111111-1111-4111-8111-111111111111','Quản trị viên tổ chức','Quản trị toàn bộ tổ chức','2026-11-06 19:20:52.851','GENERAL'),('33333333-3333-4333-8333-333333333002','11111111-1111-4111-8111-111111111111','Giáo vụ','Quản lý lớp học và sinh viên','2026-11-06 19:20:52.851','GENERAL'),('33333333-3333-4333-8333-333333333003','11111111-1111-4111-8111-111111111111','Giáo viên','Giáo viên giảng dạy','2026-11-06 19:20:52.851','TEACHER'),('33333333-3333-4333-8333-333333333004','11111111-1111-4111-8111-111111111111','Trưởng phòng ban','Phê duyệt đóng lớp trong phòng ban','2026-11-06 19:20:52.851','GENERAL'),('33333333-3333-4333-8333-333333333005','11111111-1111-4111-8111-111111111111','Nhân sự phòng ban','Quản lý nhân sự trong phòng ban','2026-11-06 19:20:52.851','GENERAL'),('33333333-3333-4333-8333-333333333006','11111111-1111-4111-8111-111111111111','NhÃ¢n viÃªn cÆ¡ sá»Ÿ váº­t cháº¥t','Quáº£n lÃ½ cÆ¡ sá»Ÿ váº­t cháº¥t','2026-11-06 19:31:28.389','GENERAL'),('33333333-3333-4333-8333-333333333007','11111111-1111-4111-8111-111111111111','NhÃ¢n viÃªn','NhÃ¢n viÃªn chung','2026-11-06 19:31:28.389','GENERAL'),('46977f4d-d07e-4aa8-8573-7760fcf8f994','eff0ce1e-1234-4892-a9f7-031383a681a5','Quản trị viên tổ chức','Quản trị toàn bộ tổ chức','2026-11-13 08:37:12.867','GENERAL'),('4d4cb69e-0d6b-438f-890f-08aede208b49','eff0ce1e-1234-4892-a9f7-031383a681a5','Nhân viên','Nhân viên chung','2026-11-13 08:37:12.961','GENERAL'),('7a9cbe64-5cdb-4807-99c6-f0754ff85290','eff0ce1e-1234-4892-a9f7-031383a681a5','Giáo viên','Giáo viên giảng dạy','2026-11-13 08:37:12.933','TEACHER'),('81731d09-6ec1-43e4-8044-eda88aa16506','eff0ce1e-1234-4892-a9f7-031383a681a5','Nhân viên cơ sở vật chất','Quản lý cơ sở vật chất','2026-11-13 08:37:12.957','GENERAL'),('8a0c7099-25c1-439b-b07c-4cd8b31bdcdc','eff0ce1e-1234-4892-a9f7-031383a681a5','Giáo vụ','Quản lý lớp học và sinh viên','2026-11-13 08:37:12.916','GENERAL'),('abdaa712-476a-4f8d-af0f-4cb14543afbd','eff0ce1e-1234-4892-a9f7-031383a681a5','Giáo viên thực tập',NULL,'2026-11-13 08:53:58.358','GENERAL');
/*!40000 ALTER TABLE `position` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `position_permission`
--

DROP TABLE IF EXISTS `position_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `position_permission` (
  `position_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `permission_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`position_id`,`permission_code`),
  CONSTRAINT `position_permission_ibfk_1` FOREIGN KEY (`position_id`) REFERENCES `position` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `position_permission`
--

LOCK TABLES `position_permission` WRITE;
/*!40000 ALTER TABLE `position_permission` DISABLE KEYS */;
INSERT INTO `position_permission` VALUES ('09abe78d-a8ba-431b-bcb9-43c22334cae1','CLASS_VIEW'),('09abe78d-a8ba-431b-bcb9-43c22334cae1','PEOPLE_EDIT'),('09abe78d-a8ba-431b-bcb9-43c22334cae1','PEOPLE_VIEW'),('09abe78d-a8ba-431b-bcb9-43c22334cae1','SCHEDULE_VIEW'),('09abe78d-a8ba-431b-bcb9-43c22334cae1','STUDENT_VIEW'),('1badbc89-38f0-4b44-9f1f-f112f56828d2','CLASS_CLOSE_APPROVE'),('1badbc89-38f0-4b44-9f1f-f112f56828d2','CLASS_REOPEN'),('1badbc89-38f0-4b44-9f1f-f112f56828d2','CLASS_VIEW'),('33333333-3333-4333-8333-333333333001','CLASS_ASSIGN_TEACHER'),('33333333-3333-4333-8333-333333333001','CLASS_CANCEL'),('33333333-3333-4333-8333-333333333001','CLASS_CLOSE_APPROVE'),('33333333-3333-4333-8333-333333333001','CLASS_CLOSE_REQUEST'),('33333333-3333-4333-8333-333333333001','CLASS_CREATE'),('33333333-3333-4333-8333-333333333001','CLASS_DELETE'),('33333333-3333-4333-8333-333333333001','CLASS_EDIT'),('33333333-3333-4333-8333-333333333001','CLASS_REOPEN'),('33333333-3333-4333-8333-333333333001','CLASS_VIEW'),('33333333-3333-4333-8333-333333333001','FACILITY_MANAGE'),('33333333-3333-4333-8333-333333333001','PEOPLE_EDIT'),('33333333-3333-4333-8333-333333333001','PEOPLE_VIEW'),('33333333-3333-4333-8333-333333333001','SCHEDULE_CREATE'),('33333333-3333-4333-8333-333333333001','SCHEDULE_VIEW'),('33333333-3333-4333-8333-333333333001','STUDENT_CREATE'),('33333333-3333-4333-8333-333333333001','STUDENT_DELETE'),('33333333-3333-4333-8333-333333333001','STUDENT_EDIT'),('33333333-3333-4333-8333-333333333001','STUDENT_VIEW'),('33333333-3333-4333-8333-333333333002','CLASS_ASSIGN_TEACHER'),('33333333-3333-4333-8333-333333333002','CLASS_CANCEL'),('33333333-3333-4333-8333-333333333002','CLASS_CLOSE_REQUEST'),('33333333-3333-4333-8333-333333333002','CLASS_CREATE'),('33333333-3333-4333-8333-333333333002','CLASS_EDIT'),('33333333-3333-4333-8333-333333333002','CLASS_VIEW'),('33333333-3333-4333-8333-333333333002','STUDENT_CREATE'),('33333333-3333-4333-8333-333333333002','STUDENT_DELETE'),('33333333-3333-4333-8333-333333333002','STUDENT_EDIT'),('33333333-3333-4333-8333-333333333002','STUDENT_VIEW'),('33333333-3333-4333-8333-333333333003','CLASS_VIEW'),('33333333-3333-4333-8333-333333333003','SCHEDULE_VIEW'),('33333333-3333-4333-8333-333333333003','STUDENT_VIEW'),('33333333-3333-4333-8333-333333333004','CLASS_CLOSE_APPROVE'),('33333333-3333-4333-8333-333333333004','CLASS_REOPEN'),('33333333-3333-4333-8333-333333333004','CLASS_VIEW'),('33333333-3333-4333-8333-333333333005','CLASS_VIEW'),('33333333-3333-4333-8333-333333333005','PEOPLE_EDIT'),('33333333-3333-4333-8333-333333333005','PEOPLE_VIEW'),('33333333-3333-4333-8333-333333333005','SCHEDULE_VIEW'),('33333333-3333-4333-8333-333333333005','STUDENT_VIEW'),('33333333-3333-4333-8333-333333333006','FACILITY_MANAGE'),('46977f4d-d07e-4aa8-8573-7760fcf8f994','CLASS_ASSIGN_TEACHER'),('46977f4d-d07e-4aa8-8573-7760fcf8f994','CLASS_CANCEL'),('46977f4d-d07e-4aa8-8573-7760fcf8f994','CLASS_CLOSE_APPROVE'),('46977f4d-d07e-4aa8-8573-7760fcf8f994','CLASS_CLOSE_REQUEST'),('46977f4d-d07e-4aa8-8573-7760fcf8f994','CLASS_CREATE'),('46977f4d-d07e-4aa8-8573-7760fcf8f994','CLASS_DELETE'),('46977f4d-d07e-4aa8-8573-7760fcf8f994','CLASS_EDIT'),('46977f4d-d07e-4aa8-8573-7760fcf8f994','CLASS_REOPEN'),('46977f4d-d07e-4aa8-8573-7760fcf8f994','CLASS_VIEW'),('46977f4d-d07e-4aa8-8573-7760fcf8f994','FACILITY_MANAGE'),('46977f4d-d07e-4aa8-8573-7760fcf8f994','PEOPLE_EDIT'),('46977f4d-d07e-4aa8-8573-7760fcf8f994','PEOPLE_VIEW'),('46977f4d-d07e-4aa8-8573-7760fcf8f994','SCHEDULE_CREATE'),('46977f4d-d07e-4aa8-8573-7760fcf8f994','SCHEDULE_VIEW'),('46977f4d-d07e-4aa8-8573-7760fcf8f994','STUDENT_CREATE'),('46977f4d-d07e-4aa8-8573-7760fcf8f994','STUDENT_DELETE'),('46977f4d-d07e-4aa8-8573-7760fcf8f994','STUDENT_EDIT'),('46977f4d-d07e-4aa8-8573-7760fcf8f994','STUDENT_VIEW'),('7a9cbe64-5cdb-4807-99c6-f0754ff85290','CLASS_VIEW'),('7a9cbe64-5cdb-4807-99c6-f0754ff85290','SCHEDULE_VIEW'),('7a9cbe64-5cdb-4807-99c6-f0754ff85290','STUDENT_VIEW'),('81731d09-6ec1-43e4-8044-eda88aa16506','FACILITY_MANAGE'),('8a0c7099-25c1-439b-b07c-4cd8b31bdcdc','CLASS_ASSIGN_TEACHER'),('8a0c7099-25c1-439b-b07c-4cd8b31bdcdc','CLASS_CANCEL'),('8a0c7099-25c1-439b-b07c-4cd8b31bdcdc','CLASS_CLOSE_REQUEST'),('8a0c7099-25c1-439b-b07c-4cd8b31bdcdc','CLASS_CREATE'),('8a0c7099-25c1-439b-b07c-4cd8b31bdcdc','CLASS_EDIT'),('8a0c7099-25c1-439b-b07c-4cd8b31bdcdc','CLASS_VIEW'),('8a0c7099-25c1-439b-b07c-4cd8b31bdcdc','STUDENT_CREATE'),('8a0c7099-25c1-439b-b07c-4cd8b31bdcdc','STUDENT_DELETE'),('8a0c7099-25c1-439b-b07c-4cd8b31bdcdc','STUDENT_EDIT'),('8a0c7099-25c1-439b-b07c-4cd8b31bdcdc','STUDENT_VIEW'),('abdaa712-476a-4f8d-af0f-4cb14543afbd','CLASS_VIEW'),('abdaa712-476a-4f8d-af0f-4cb14543afbd','STUDENT_VIEW');
/*!40000 ALTER TABLE `position_permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `position_seed`
--

DROP TABLE IF EXISTS `position_seed`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `position_seed` (
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `seeded_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `position_seed`
--

LOCK TABLES `position_seed` WRITE;
/*!40000 ALTER TABLE `position_seed` DISABLE KEYS */;
INSERT INTO `position_seed` VALUES ('050f1426-a066-4afe-b85d-2e4c4962aea4','2026-11-06 11:38:37.165'),('11111111-1111-4111-8111-111111111111','2026-11-06 19:20:52.852'),('eff0ce1e-1234-4892-a9f7-031383a681a5','2026-11-13 08:37:12.857');
/*!40000 ALTER TABLE `position_seed` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `school_class`
--

DROP TABLE IF EXISTS `school_class`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `school_class` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `class_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `academic_year` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CHUA_BAT_DAU',
  `created_by` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `teacher_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `subject_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `version` bigint NOT NULL DEFAULT '0',
  `close_state` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NONE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_school_class_org_code` (`org_id`,`class_code`),
  KEY `idx_school_class_org_deleted` (`org_id`,`deleted_at`),
  KEY `idx_school_class_teacher` (`teacher_id`),
  KEY `idx_school_class_subject` (`subject_id`),
  KEY `idx_school_class_org_status` (`org_id`,`status`),
  KEY `fk_school_class_teacher` (`teacher_id`,`org_id`),
  KEY `fk_school_class_subject` (`subject_id`,`org_id`),
  CONSTRAINT `fk_school_class_subject` FOREIGN KEY (`subject_id`, `org_id`) REFERENCES `subject` (`id`, `org_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_school_class_teacher` FOREIGN KEY (`teacher_id`, `org_id`) REFERENCES `staff_profile` (`user_id`, `org_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_school_class_close_state` CHECK ((`close_state` in (_utf8mb4'NONE',_utf8mb4'PENDING',_utf8mb4'CLOSED'))),
  CONSTRAINT `chk_school_class_dates` CHECK (((`start_date` is null) or (`end_date` is null) or (`end_date` >= `start_date`))),
  CONSTRAINT `chk_school_class_status` CHECK ((`status` in (_utf8mb4'CHUA_BAT_DAU',_utf8mb4'DANG_DIEN_RA',_utf8mb4'DA_KET_THUC',_utf8mb4'DA_HUY')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `school_class`
--

LOCK TABLES `school_class` WRITE;
/*!40000 ALTER TABLE `school_class` DISABLE KEYS */;
INSERT INTO `school_class` VALUES ('55555555-5555-4555-8555-555555555001','11111111-1111-4111-8111-111111111111','C001','Lớp 10A','2026-2027','CHUA_BAT_DAU','22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.870','2026-11-13 05:00:52.338',NULL,NULL,'2026-12-06','2027-09-02','99999999-9999-4999-8999-999999999001',2,'NONE'),('55555555-5555-4555-8555-555555555002','11111111-1111-4111-8111-111111111111','C002','Lớp 10B','2026-2027','DANG_DIEN_RA','22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.870','2026-11-13 08:20:40.332',NULL,'22222222-2222-4222-8222-222222222005','2026-10-07','2027-01-05','99999999-9999-4999-8999-999999999001',2,'NONE'),('55555555-5555-4555-8555-555555555003','11111111-1111-4111-8111-111111111111','C003','Lớp 11A','2025-2026','DA_KET_THUC','22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.870',NULL,NULL,'22222222-2222-4222-8222-222222222006','2026-01-10','2026-09-07','99999999-9999-4999-8999-999999999002',0,'NONE'),('55555555-5555-4555-8555-555555555004','11111111-1111-4111-8111-111111111111','C004','Lớp 11B','2025-2026','DA_HUY','22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.870',NULL,NULL,'22222222-2222-4222-8222-222222222006','2026-10-07','2027-01-05','99999999-9999-4999-8999-999999999003',0,'NONE'),('55555555-5555-4555-8555-555555555005','11111111-1111-4111-8111-111111111111','C005','Lớp 12A','2026-2027','DANG_DIEN_RA','22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.870',NULL,NULL,'22222222-2222-4222-8222-222222222005','2026-10-17','2026-12-16','99999999-9999-4999-8999-999999999001',0,'CLOSED'),('f5aff886-cfa1-4e7f-863d-5cf5855ecd58','eff0ce1e-1234-4892-a9f7-031383a681a5','PNV27','PNV27','2024-2027','DANG_DIEN_RA','f7f282ff-c021-48b6-92d9-a10ea0546e6e','2026-11-13 09:44:56.179','2026-11-13 10:32:43.709',NULL,'2937090b-28db-4878-95c7-13c911b31a29','2026-11-08','2027-11-15',NULL,2,'NONE');
/*!40000 ALTER TABLE `school_class` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `specialty`
--

DROP TABLE IF EXISTS `specialty`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `specialty` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_unaccented` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_specialty_id_org` (`id`,`org_id`),
  UNIQUE KEY `uq_specialty_org_name` (`org_id`,`name_unaccented`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `specialty`
--

LOCK TABLES `specialty` WRITE;
/*!40000 ALTER TABLE `specialty` DISABLE KEYS */;
INSERT INTO `specialty` VALUES ('88888888-8888-4888-8888-888888888001','11111111-1111-4111-8111-111111111111','Toán','toan',1,'22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.864'),('88888888-8888-4888-8888-888888888002','11111111-1111-4111-8111-111111111111','Vật lý','vat ly',1,'22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.864'),('88888888-8888-4888-8888-888888888003','11111111-1111-4111-8111-111111111111','Tin học','tin hoc',1,'22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.864'),('ceffad9b-496d-41f8-b5dc-26332c14e6e3','eff0ce1e-1234-4892-a9f7-031383a681a5','English','english',1,'f7f282ff-c021-48b6-92d9-a10ea0546e6e','2026-11-13 08:56:45.690');
/*!40000 ALTER TABLE `specialty` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff`
--

DROP TABLE IF EXISTS `staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive','on_leave','resigned') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_staff_org_code` (`org_id`,`code`),
  UNIQUE KEY `uq_staff_account` (`account_id`),
  KEY `idx_staff_org_status` (`org_id`,`status`,`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff`
--

LOCK TABLES `staff` WRITE;
/*!40000 ALTER TABLE `staff` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_profile`
--

DROP TABLE IF EXISTS `staff_profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_profile` (
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `staff_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name_unaccented` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `version` bigint NOT NULL DEFAULT '0',
  `created_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_staff_profile_user_org` (`user_id`,`org_id`),
  UNIQUE KEY `uq_staff_profile_org_code` (`org_id`,`staff_code`),
  KEY `idx_staff_profile_org_name` (`org_id`,`full_name_unaccented`),
  CONSTRAINT `fk_staff_profile_member` FOREIGN KEY (`user_id`, `org_id`) REFERENCES `department_member` (`user_id`, `org_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_profile`
--

LOCK TABLES `staff_profile` WRITE;
/*!40000 ALTER TABLE `staff_profile` DISABLE KEYS */;
INSERT INTO `staff_profile` VALUES ('22222222-2222-4222-8222-222222222001','11111111-1111-4111-8111-111111111111','OW001','Nguyễn Chủ Tịch','nguyen chu tich','0900000001','owner@sample-mems.example',0,'22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.861',NULL,NULL),('22222222-2222-4222-8222-222222222002','11111111-1111-4111-8111-111111111111','NS001','Trần Nhân Sự','tran nhan su','0900000002','hr@sample-mems.example',0,'22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.861',NULL,NULL),('22222222-2222-4222-8222-222222222003','11111111-1111-4111-8111-111111111111','GV002','Lê Giáo Vụ','le giao vu','0900000003','academic@sample-mems.example',0,'22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.861',NULL,NULL),('22222222-2222-4222-8222-222222222004','11111111-1111-4111-8111-111111111111','TP001','Phạm Trưởng Phòng','pham truong phong','0900000004','head@sample-mems.example',0,'22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.861',NULL,NULL),('22222222-2222-4222-8222-222222222005','11111111-1111-4111-8111-111111111111','GV001','Nguyễn Văn An','nguyen van an','0900000005','teacher@sample-mems.example',16,'22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.861','22222222-2222-4222-8222-222222222001','2026-11-13 08:27:52.431'),('22222222-2222-4222-8222-222222222006','11111111-1111-4111-8111-111111111111','GV003','Trần Thị Bình','tran thi binh','0900000006','teacher2@sample-mems.example',0,'22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.861',NULL,NULL),('2937090b-28db-4878-95c7-13c911b31a29','eff0ce1e-1234-4892-a9f7-031383a681a5','GV001','vy','vy','09090909090','vy@gmail.com',0,'f7f282ff-c021-48b6-92d9-a10ea0546e6e','2026-11-13 09:45:57.756',NULL,NULL),('6e19d5f9-fe91-440b-b4c9-6727473c6fb6','eff0ce1e-1234-4892-a9f7-031383a681a5','NS001','bao','bao',NULL,'bao@gmail.com',0,'b3bd1fe9-b739-42c2-9b04-86bd35ab1846','2026-11-13 09:49:51.194',NULL,NULL),('f7f282ff-c021-48b6-92d9-a10ea0546e6e','eff0ce1e-1234-4892-a9f7-031383a681a5','NS002','Sang','sang',NULL,'hoanhsang24@gmail.com',0,'b3bd1fe9-b739-42c2-9b04-86bd35ab1846','2026-11-13 08:41:44.992',NULL,NULL);
/*!40000 ALTER TABLE `staff_profile` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student`
--

DROP TABLE IF EXISTS `student`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_by` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_org_code` (`org_id`,`student_code`),
  KEY `idx_student_org_deleted` (`org_id`,`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student`
--

LOCK TABLES `student` WRITE;
/*!40000 ALTER TABLE `student` DISABLE KEYS */;
INSERT INTO `student` VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001','11111111-1111-4111-8111-111111111111','SV001','Nguyễn Minh Khang','2008-03-12','khang.nguyen@sample-mems.example','0911000001','active','22222222-2222-4222-8222-222222222003','2026-11-13 17:07:47.966',NULL,NULL),('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002','11111111-1111-4111-8111-111111111111','SV002','Trần Thị Lan','2008-07-25','lan.tran@sample-mems.example','0911000002','active','22222222-2222-4222-8222-222222222003','2026-11-13 17:07:41.060',NULL,NULL),('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa003','11111111-1111-4111-8111-111111111111','SV003','Lê Quốc Bảo','2007-11-02','bao.le@sample-mems.example','0911000003','active','22222222-2222-4222-8222-222222222003','2026-11-13 17:07:41.060',NULL,NULL),('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa004','11111111-1111-4111-8111-111111111111','SV004','Phạm Thu Hà','2008-01-18','ha.pham@sample-mems.example','0911000004','inactive','22222222-2222-4222-8222-222222222003','2026-11-13 17:07:41.060',NULL,NULL),('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa005','11111111-1111-4111-8111-111111111111','SV005','Đỗ Gia Huy','2008-09-30','huy.do@sample-mems.example','0911000005','suspended','22222222-2222-4222-8222-222222222003','2026-11-13 17:07:41.060',NULL,NULL),('ab000001-0000-4000-8000-000000000001','eff0ce1e-1234-4892-a9f7-031383a681a5','SV001','Nguyễn Minh Khang','2008-03-12','khang.nguyen@example.edu.vn','0911000001','active','f7f282ff-c021-48b6-92d9-a10ea0546e6e','2026-11-13 17:02:08.811',NULL,NULL),('ab000001-0000-4000-8000-000000000002','eff0ce1e-1234-4892-a9f7-031383a681a5','SV002','Trần Thị Lan','2008-07-25','lan.tran@example.edu.vn','0911000002','active','f7f282ff-c021-48b6-92d9-a10ea0546e6e','2026-11-13 17:02:08.811',NULL,NULL),('ab000001-0000-4000-8000-000000000003','eff0ce1e-1234-4892-a9f7-031383a681a5','SV003','Lê Quốc Bảo','2007-11-02','bao.le@example.edu.vn','0911000003','active','f7f282ff-c021-48b6-92d9-a10ea0546e6e','2026-11-13 17:02:08.811',NULL,NULL),('ab000001-0000-4000-8000-000000000004','eff0ce1e-1234-4892-a9f7-031383a681a5','SV004','Phạm Thu Hà','2008-01-18','ha.pham@example.edu.vn','0911000004','inactive','f7f282ff-c021-48b6-92d9-a10ea0546e6e','2026-11-13 17:02:08.811',NULL,NULL),('ab000001-0000-4000-8000-000000000005','eff0ce1e-1234-4892-a9f7-031383a681a5','SV005','Đỗ Gia Huy','2008-09-30','huy.do@example.edu.vn','0911000005','suspended','f7f282ff-c021-48b6-92d9-a10ea0546e6e','2026-11-13 17:02:08.811',NULL,NULL);
/*!40000 ALTER TABLE `student` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_legacy_20261106`
--

DROP TABLE IF EXISTS `student_legacy_20261106`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_legacy_20261106` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dob` date DEFAULT NULL,
  `gender` enum('male','female','other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive','graduated','withdrawn') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_org_code` (`org_id`,`code`),
  UNIQUE KEY `uq_student_account` (`account_id`),
  KEY `idx_student_org_status` (`org_id`,`status`,`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_legacy_20261106`
--

LOCK TABLES `student_legacy_20261106` WRITE;
/*!40000 ALTER TABLE `student_legacy_20261106` DISABLE KEYS */;
/*!40000 ALTER TABLE `student_legacy_20261106` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subject`
--

DROP TABLE IF EXISTS `subject`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subject` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_unaccented` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_subject_id_org` (`id`,`org_id`),
  UNIQUE KEY `uq_subject_org_name` (`org_id`,`name_unaccented`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subject`
--

LOCK TABLES `subject` WRITE;
/*!40000 ALTER TABLE `subject` DISABLE KEYS */;
INSERT INTO `subject` VALUES ('99999999-9999-4999-8999-999999999001','11111111-1111-4111-8111-111111111111','Toán','toan',1,'22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.868'),('99999999-9999-4999-8999-999999999002','11111111-1111-4111-8111-111111111111','Vật lý','vat ly',1,'22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.868'),('99999999-9999-4999-8999-999999999003','11111111-1111-4111-8111-111111111111','Tin học','tin hoc',1,'22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.868');
/*!40000 ALTER TABLE `subject` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teacher`
--

DROP TABLE IF EXISTS `teacher`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teacher` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `specialization` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contract_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive','on_leave','resigned') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_teacher_org_code` (`org_id`,`code`),
  UNIQUE KEY `uq_teacher_account` (`account_id`),
  KEY `idx_teacher_org_status` (`org_id`,`status`,`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teacher`
--

LOCK TABLES `teacher` WRITE;
/*!40000 ALTER TABLE `teacher` DISABLE KEYS */;
/*!40000 ALTER TABLE `teacher` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teacher_profile`
--

DROP TABLE IF EXISTS `teacher_profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teacher_profile` (
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contract_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `teaching_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DANG_DAY',
  `version` bigint NOT NULL DEFAULT '0',
  `created_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_teacher_profile_user_org` (`user_id`,`org_id`),
  KEY `idx_teacher_profile_org_status` (`org_id`,`teaching_status`),
  CONSTRAINT `fk_teacher_profile_staff` FOREIGN KEY (`user_id`, `org_id`) REFERENCES `staff_profile` (`user_id`, `org_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_teacher_profile_contract` CHECK (((`contract_type` is null) or (`contract_type` in (_utf8mb4'CO_HUU',_utf8mb4'THINH_GIANG')))),
  CONSTRAINT `chk_teacher_profile_status` CHECK ((`teaching_status` in (_utf8mb4'DANG_DAY',_utf8mb4'TAM_NGHI',_utf8mb4'NGHI_VIEC')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teacher_profile`
--

LOCK TABLES `teacher_profile` WRITE;
/*!40000 ALTER TABLE `teacher_profile` DISABLE KEYS */;
INSERT INTO `teacher_profile` VALUES ('22222222-2222-4222-8222-222222222005','11111111-1111-4111-8111-111111111111','CO_HUU','DANG_DAY',16,'22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.862','22222222-2222-4222-8222-222222222001','2026-11-13 08:27:52.432'),('22222222-2222-4222-8222-222222222006','11111111-1111-4111-8111-111111111111','THINH_GIANG','TAM_NGHI',0,'22222222-2222-4222-8222-222222222001','2026-11-06 19:20:52.862',NULL,NULL),('2937090b-28db-4878-95c7-13c911b31a29','eff0ce1e-1234-4892-a9f7-031383a681a5','CO_HUU','DANG_DAY',0,'f7f282ff-c021-48b6-92d9-a10ea0546e6e','2026-11-13 09:45:57.760',NULL,NULL);
/*!40000 ALTER TABLE `teacher_profile` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teacher_specialty`
--

DROP TABLE IF EXISTS `teacher_specialty`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teacher_specialty` (
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `specialty_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`user_id`,`specialty_id`),
  KEY `idx_teacher_specialty_specialty` (`specialty_id`,`org_id`),
  KEY `fk_teacher_specialty_teacher` (`user_id`,`org_id`),
  CONSTRAINT `fk_teacher_specialty_specialty` FOREIGN KEY (`specialty_id`, `org_id`) REFERENCES `specialty` (`id`, `org_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_teacher_specialty_teacher` FOREIGN KEY (`user_id`, `org_id`) REFERENCES `teacher_profile` (`user_id`, `org_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teacher_specialty`
--

LOCK TABLES `teacher_specialty` WRITE;
/*!40000 ALTER TABLE `teacher_specialty` DISABLE KEYS */;
INSERT INTO `teacher_specialty` VALUES ('22222222-2222-4222-8222-222222222005','88888888-8888-4888-8888-888888888001','11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222006','88888888-8888-4888-8888-888888888002','11111111-1111-4111-8111-111111111111'),('2937090b-28db-4878-95c7-13c911b31a29','ceffad9b-496d-41f8-b5dc-26332c14e6e3','eff0ce1e-1234-4892-a9f7-031383a681a5');
/*!40000 ALTER TABLE `teacher_specialty` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-16 17:28:44
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: mems_identity_db
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `account`
--

DROP TABLE IF EXISTS `account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `account` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `org_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_login_attempts` smallint unsigned NOT NULL DEFAULT '0',
  `locked_until` datetime(3) DEFAULT NULL,
  `last_login_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `must_change_password` bit(1) DEFAULT NULL,
  `provisioned_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_account_username` (`username`),
  KEY `idx_account_org_status` (`org_id`,`status`),
  CONSTRAINT `fk_account_org` FOREIGN KEY (`org_id`) REFERENCES `organization` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `account`
--

LOCK TABLES `account` WRITE;
/*!40000 ALTER TABLE `account` DISABLE KEYS */;
INSERT INTO `account` VALUES ('0582c2c0-1307-418b-bade-4b9d02b60ea6','b9791653-0b5d-4325-b3b1-6e2e93c4c4f7','school_owner_01','school01@example.com','$2a$10$dI5BKbIjFtXw2M8mpUr/Q.tKy4QsJmPnrknUu3ShJjG33CKM3NWo6','pending',0,NULL,NULL,'2026-10-16 20:28:24.650','2026-10-16 20:28:24.650',NULL,NULL),('22222222-2222-4222-8222-222222222001','11111111-1111-4111-8111-111111111111','sample_owner','owner@sample-mems.example','$2b$10$HHoto94Ged9eR927ydeSTOgnEpl.8WKxiXw9gWv5nulyBhTQa4UIW','active',0,NULL,'2026-11-16 10:02:47.893','2026-11-06 19:20:52.839','2026-11-16 17:02:47.897',NULL,NULL),('22222222-2222-4222-8222-222222222002','11111111-1111-4111-8111-111111111111','sample_hr','hr@sample-mems.example','$2b$10$HHoto94Ged9eR927ydeSTOgnEpl.8WKxiXw9gWv5nulyBhTQa4UIW','active',0,NULL,'2026-11-16 10:02:48.058','2026-11-06 19:20:52.839','2026-11-16 17:02:48.065',NULL,NULL),('22222222-2222-4222-8222-222222222003','11111111-1111-4111-8111-111111111111','sample_academic','academic@sample-mems.example','$2b$10$HHoto94Ged9eR927ydeSTOgnEpl.8WKxiXw9gWv5nulyBhTQa4UIW','active',0,NULL,'2026-11-13 10:40:37.303','2026-11-06 19:20:52.839','2026-11-13 17:40:37.307',NULL,NULL),('22222222-2222-4222-8222-222222222004','11111111-1111-4111-8111-111111111111','sample_head','head@sample-mems.example','$2b$10$HHoto94Ged9eR927ydeSTOgnEpl.8WKxiXw9gWv5nulyBhTQa4UIW','active',0,NULL,'2026-11-13 08:20:36.930','2026-11-06 19:20:52.839','2026-11-13 15:20:36.936',NULL,NULL),('22222222-2222-4222-8222-222222222005','11111111-1111-4111-8111-111111111111','sample_teacher','teacher@sample-mems.example','$2b$10$HHoto94Ged9eR927ydeSTOgnEpl.8WKxiXw9gWv5nulyBhTQa4UIW','active',0,NULL,'2026-11-06 12:21:31.477','2026-11-06 19:20:52.839','2026-11-06 19:21:31.480',NULL,NULL),('22222222-2222-4222-8222-222222222006','11111111-1111-4111-8111-111111111111','sample_teacher2','teacher2@sample-mems.example','$2b$10$HHoto94Ged9eR927ydeSTOgnEpl.8WKxiXw9gWv5nulyBhTQa4UIW','active',0,NULL,NULL,'2026-11-06 19:20:52.839','2026-11-06 19:20:52.839',NULL,NULL),('22290044-48da-40ae-888d-36acb7f50f7d','784c1382-0c5b-4236-9f4f-7a47b335928a','Hieu_pho','n63680017@gmail.com','$2a$10$Kl.zL7MIGdmaM7dOP9s1kOvreZQKJ/y7ogkBu7KTlF58hwE6y4JU6','pending',0,NULL,NULL,'2026-10-22 22:48:50.631','2026-10-22 22:48:50.631',NULL,NULL),('22eb4dfb-14c8-4a53-9152-19f0e5e78ff5','8fb17bf2-7952-4252-8d0c-f5433288695b','teacher_5307','teacher_5307@school.edu.vn','$2a$10$zMLFuQCIgoGSwDeGvy3yX.L0kd.PjRM.gMPmEW/Myevnon8pi75nS','locked',0,NULL,NULL,'2026-10-28 10:46:35.421','2026-10-28 10:46:35.614',NULL,NULL),('2937090b-28db-4878-95c7-13c911b31a29','eff0ce1e-1234-4892-a9f7-031383a681a5','vyvy','vy@gmail.com','$2a$10$UAGSQhHIqQtrPBPtgw4nm.Yb/D0KoAlpggS18XzIXyLU2DCMUoOPa','active',0,NULL,'2026-11-16 09:56:28.088','2026-11-13 16:45:57.687','2026-11-16 16:56:28.102',_binary '\0','f7f282ff-c021-48b6-92d9-a10ea0546e6e'),('2f9d974f-3b2d-40a5-951f-0ab167982c54','bb46e437-0816-4e2f-b6c9-e684e0bf484f','test_owner_6719','testowner8836@example.com','$2a$10$Tn8Blbwr6.nKlgbSgtaq1edmxrxa0vVtdooB.9DgI37bYwl1cFRye','active',0,NULL,'2026-10-27 14:04:50.652','2026-10-27 21:03:55.532','2026-10-27 21:04:50.659',NULL,NULL),('5c36384b-97e7-4b9a-8e6f-03cbd1e76415','8fb17bf2-7952-4252-8d0c-f5433288695b','teacher_4560','teacher_4560@school.edu.vn','$2a$10$JKWCmHQNnJ4zP/oFvXfoSO.vRqDJbzQRo0tIjETapriCz12nz1ydK','locked',0,NULL,NULL,'2026-10-28 10:46:14.657','2026-10-28 10:46:14.870',NULL,NULL),('691249b9-3ae0-4dbf-aace-929cd9c2c913','0bfe89b9-ccbb-4d84-b9f4-b936c0d066b0','reject_owner_5532','reject5714@example.com','$2a$10$nb3Zyu0YQ2Nt1e7eMCYnB.tQwsd3TigEGwGmJyUS92iVH9btUOlkC','disabled',0,NULL,NULL,'2026-10-27 21:05:04.563','2026-10-27 21:05:04.692',NULL,NULL),('6e19d5f9-fe91-440b-b4c9-6727473c6fb6','eff0ce1e-1234-4892-a9f7-031383a681a5','bao','bao@gmail.com','$2a$10$/opbTcSn/H.by3btozLjkunbAg8.dafvJd0is5WjqZmHCLcZWqrF6','active',0,NULL,NULL,'2026-11-13 16:49:51.154','2026-11-13 16:49:51.154',_binary '','b3bd1fe9-b739-42c2-9b04-86bd35ab1846'),('73049d97-abf5-4ad5-9877-126059351cfc','8fb17bf2-7952-4252-8d0c-f5433288695b','abc_owner_01','owner01@example.com','$2a$10$HQTP1Fkcbky8N9F.SuxpeOKtjY9FUFUj0ca2KmrCYWfizhPbSKmRC','active',0,NULL,NULL,'2026-10-16 20:25:01.026','2026-10-28 10:46:35.208',NULL,NULL),('7913faf7-c892-11f1-8537-74d4dd2c201f',NULL,'platform_admin','admin@your-domain.example','$2a$10$AhJGwGbkHbX/G9kyf0T5rOTPpu4ZqN0MguwP3YkbvV1aaLWdZ0tTO','active',0,NULL,'2026-11-16 10:05:36.015','2026-10-15 19:18:04.699','2026-11-16 17:05:36.023',NULL,NULL),('7e75e3c4-e093-4483-b1ac-07bbbf2d9468','050f1426-a066-4afe-b85d-2e4c4962aea4','abc_owner_02','owner01@example.com','$2a$10$w8ZVnS7KMvim58q6fJvWyeAeM84aLBNgzLJIAp9djc28oCzaSCowC','active',0,NULL,NULL,'2026-10-16 20:59:53.411','2026-10-22 22:07:31.298',NULL,NULL),('b3bd1fe9-b739-42c2-9b04-86bd35ab1846','eff0ce1e-1234-4892-a9f7-031383a681a5','AnhSang','hoanhsang24@gmail.com','$2a$10$sJkeCd.rbYYoOP0.HfL8bukL/tRDQW5tYD2Nh17hdJUVsYk1n7Mdm','active',0,NULL,'2026-11-16 09:55:02.719','2026-10-30 22:03:32.855','2026-11-16 16:55:02.717',NULL,NULL),('e21b41bf-3447-4f3e-994b-abf5cc415346','9ccc9700-f7a9-4dcc-a1f9-d60877172b90','Hieu_truong','nvy69512@gmail.com','$2a$10$1wDqVO/MToTV.v1XxjiRqO403zfmm5nxUT.Vtgskec4AooWQBE8By','active',0,NULL,'2026-10-22 15:10:52.223','2026-10-22 22:09:44.131','2026-10-22 22:10:52.230',NULL,NULL),('f449d0ec-aa7a-4b09-b2b4-58a0d00792cf','eb1f87e9-16d3-409a-a900-6a1b44dfe8f7','abc_owner_03','test3@gmail.com','$2a$10$la5aDMd13Qn.CCRlTqOF2e6aYOmCoDG8IU/m12HDi0u4McL6KtNSO','pending',0,NULL,NULL,'2026-10-16 22:06:22.052','2026-10-16 22:06:22.052',NULL,NULL),('f7f282ff-c021-48b6-92d9-a10ea0546e6e','eff0ce1e-1234-4892-a9f7-031383a681a5','Sang','hoanhsang24@gmail.com','$2a$10$ISonA6c3xzep4xG89TWdZe2qbc94oGHfia33KuxmKkMljCHEG2Mla','active',0,NULL,'2026-11-13 14:57:02.658','2026-11-13 15:41:44.922','2026-11-13 21:57:02.664',_binary '\0','b3bd1fe9-b739-42c2-9b04-86bd35ab1846');
/*!40000 ALTER TABLE `account` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `account_role`
--

DROP TABLE IF EXISTS `account_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `account_role` (
  `account_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  `assigned_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`account_id`,`role_id`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `account_role_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `account_role_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `account_role`
--

LOCK TABLES `account_role` WRITE;
/*!40000 ALTER TABLE `account_role` DISABLE KEYS */;
INSERT INTO `account_role` VALUES ('0582c2c0-1307-418b-bade-4b9d02b60ea6',7,'2026-10-16 20:28:24.652'),('22222222-2222-4222-8222-222222222001',8,'2026-11-06 19:20:52.841'),('22222222-2222-4222-8222-222222222002',9,'2026-11-06 19:20:52.848'),('22222222-2222-4222-8222-222222222003',10,'2026-11-06 19:20:52.849'),('22222222-2222-4222-8222-222222222004',10,'2026-11-06 19:20:52.849'),('22222222-2222-4222-8222-222222222005',10,'2026-11-06 19:20:52.849'),('22222222-2222-4222-8222-222222222006',10,'2026-11-06 19:20:52.849'),('22290044-48da-40ae-888d-36acb7f50f7d',7,'2026-10-22 22:48:50.633'),('22eb4dfb-14c8-4a53-9152-19f0e5e78ff5',3,'2026-10-28 10:46:35.500'),('2937090b-28db-4878-95c7-13c911b31a29',10,'2026-11-13 16:45:57.689'),('2f9d974f-3b2d-40a5-951f-0ab167982c54',7,'2026-10-27 21:03:55.538'),('5c36384b-97e7-4b9a-8e6f-03cbd1e76415',3,'2026-10-28 10:46:14.763'),('691249b9-3ae0-4dbf-aace-929cd9c2c913',7,'2026-10-27 21:05:04.564'),('6e19d5f9-fe91-440b-b4c9-6727473c6fb6',10,'2026-11-13 16:49:51.156'),('73049d97-abf5-4ad5-9877-126059351cfc',7,'2026-10-16 20:25:01.027'),('7913faf7-c892-11f1-8537-74d4dd2c201f',1,'2026-10-15 19:18:04.759'),('7e75e3c4-e093-4483-b1ac-07bbbf2d9468',7,'2026-10-16 20:59:53.414'),('b3bd1fe9-b739-42c2-9b04-86bd35ab1846',7,'2026-10-30 22:03:32.858'),('e21b41bf-3447-4f3e-994b-abf5cc415346',7,'2026-10-22 22:09:44.133'),('f449d0ec-aa7a-4b09-b2b4-58a0d00792cf',7,'2026-10-16 22:06:22.055'),('f7f282ff-c021-48b6-92d9-a10ea0546e6e',9,'2026-11-13 15:41:44.925');
/*!40000 ALTER TABLE `account_role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `org_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actor_account_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `old_value` json DEFAULT NULL,
  `new_value` json DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_audit_org_time` (`org_id`,`created_at`),
  KEY `actor_account_id` (`actor_account_id`),
  CONSTRAINT `audit_log_ibfk_1` FOREIGN KEY (`org_id`) REFERENCES `organization` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `audit_log_ibfk_2` FOREIGN KEY (`actor_account_id`) REFERENCES `account` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_log`
--

LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */;
INSERT INTO `audit_log` VALUES ('02c9a448-5d09-429b-9b29-f86b727ac8cc','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,'ORG_MODULES_UPDATED','ORGANIZATION','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,NULL,'2026-10-28 10:46:35.000'),('0ba7238e-b297-4a58-9e7a-e27c9d6c47b2','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,'ORG_SUSPENDED','ORGANIZATION','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,NULL,'2026-10-28 10:46:35.000'),('0c81de1e-7efa-4311-91a0-435875ca50ad','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,'ORG_SUSPENDED','ORGANIZATION','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,NULL,'2026-10-28 10:35:04.000'),('16657dd6-5d08-4f5c-9d20-04b66d3e388d','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,'ORG_REACTIVATED','ORGANIZATION','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,NULL,'2026-10-28 10:46:14.000'),('1d7d37c3-28a4-4173-8554-b3348bac9083','eff0ce1e-1234-4892-a9f7-031383a681a5',NULL,'ORG_APPROVED','ORGANIZATION','eff0ce1e-1234-4892-a9f7-031383a681a5',NULL,NULL,'2026-10-30 22:04:15.000'),('24e0458c-999b-4593-8fae-df697e113cc1','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,'ORG_MODULES_UPDATED','ORGANIZATION','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,NULL,'2026-10-28 10:46:14.000'),('27fc4f89-109f-42ff-b9de-5bcc5745f40c','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,'ORG_REACTIVATED','ORGANIZATION','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,NULL,'2026-10-28 10:35:04.000'),('390b0488-2efe-4df2-81af-043a8e1098e5','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,'ORG_MODULES_UPDATED','ORGANIZATION','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,NULL,'2026-10-28 10:40:37.000'),('8b0c7759-9d56-4ad8-91ca-3ecd81c78c66','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,'ORG_REACTIVATED','ORGANIZATION','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,NULL,'2026-10-28 10:40:37.000'),('8f91d5aa-f48c-44a5-abb6-6965668f093b','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,'ORG_SUSPENDED','ORGANIZATION','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,NULL,'2026-10-28 10:40:37.000'),('93154a78-2e43-471f-9d5d-aabea849e901','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,'ORG_REACTIVATED','ORGANIZATION','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,NULL,'2026-10-28 10:46:35.000'),('afe83ad3-ffa4-421e-a540-96c9071e707d','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,'ORG_SUSPENDED','ORGANIZATION','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,NULL,'2026-10-28 10:38:39.000'),('b2f7046e-268b-43a0-bd2e-c7d9ab7e688c','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,'ORG_SUSPENDED','ORGANIZATION','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,NULL,'2026-10-28 10:46:14.000'),('b42ac41e-0814-40b4-a36d-9556e4a22d3f','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,'ORG_REACTIVATED','ORGANIZATION','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,NULL,'2026-10-28 10:38:39.000'),('ddd4b70d-55e5-4eb3-9d81-95f1e51e77f7','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,'ORG_MODULES_UPDATED','ORGANIZATION','8fb17bf2-7952-4252-8d0c-f5433288695b',NULL,NULL,'2026-10-28 10:38:40.000');
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `module`
--

DROP TABLE IF EXISTS `module`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `module` (
  `code` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `module`
--

LOCK TABLES `module` WRITE;
/*!40000 ALTER TABLE `module` DISABLE KEYS */;
INSERT INTO `module` VALUES ('CLASS_MANAGEMENT','Quản lý lớp học',1),('EQUIPMENT_MANAGEMENT','Quản lý thiết bị',1),('ROOM_MANAGEMENT','Quản lý phòng học',1),('SCHEDULE_MANAGEMENT','Quản lý lịch học',1),('STUDENT_MANAGEMENT','Quản lý học sinh',1),('TEACHER_MANAGEMENT','Quản lý giáo viên',1);
/*!40000 ALTER TABLE `module` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `module_config`
--

DROP TABLE IF EXISTS `module_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `module_config` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` enum('student_management','teacher_management','class_management','schedule_management','staff_management','classroom_management','computer_room_management','equipment_management','teacher_assignment','room_usage_management') COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '0',
  `updated_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_module_config_org_module` (`org_id`,`module`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `module_config_ibfk_1` FOREIGN KEY (`org_id`) REFERENCES `organization` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `module_config_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `account` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `module_config`
--

LOCK TABLES `module_config` WRITE;
/*!40000 ALTER TABLE `module_config` DISABLE KEYS */;
/*!40000 ALTER TABLE `module_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organization`
--

DROP TABLE IF EXISTS `organization`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organization` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_type` enum('school','center') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','active','rejected','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `contact_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_at` datetime(3) DEFAULT NULL,
  `rejection_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_org_status` (`status`),
  KEY `fk_org_approved_by` (`approved_by`),
  CONSTRAINT `fk_org_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `account` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organization`
--

LOCK TABLES `organization` WRITE;
/*!40000 ALTER TABLE `organization` DISABLE KEYS */;
INSERT INTO `organization` VALUES ('050f1426-a066-4afe-b85d-2e4c4962aea4','Trung tâm Tin học ABCD','center','active',NULL,NULL,NULL,NULL,NULL,'2026-10-16 20:59:53.350','2026-10-22 22:07:31.293'),('0bfe89b9-ccbb-4d84-b9f4-b936c0d066b0','Truong Cho Tu Choi','center','rejected',NULL,NULL,NULL,NULL,NULL,'2026-10-27 21:05:04.502','2026-10-27 21:05:04.690'),('11111111-1111-4111-8111-111111111111','Trường THPT Mẫu MEMS','school','active','contact@sample-mems.example',NULL,NULL,NULL,NULL,'2026-11-06 19:20:52.832','2026-11-06 19:20:52.832'),('784c1382-0c5b-4236-9f4f-7a47b335928a','Trường THCS Nguyễn Viết Xuân','school','pending',NULL,NULL,NULL,NULL,NULL,'2026-10-22 22:48:50.567','2026-10-22 22:48:50.567'),('8fb17bf2-7952-4252-8d0c-f5433288695b','Trung tâm Tin học ABC','center','active',NULL,NULL,NULL,NULL,NULL,'2026-10-16 20:25:00.947','2026-10-28 10:46:35.206'),('9ccc9700-f7a9-4dcc-a1f9-d60877172b90','Trường THCS Nguyễn Viết Xuân','school','active',NULL,NULL,NULL,NULL,NULL,'2026-10-22 22:09:44.069','2026-10-22 22:10:13.193'),('b9791653-0b5d-4325-b3b1-6e2e93c4c4f7','Trường THPT Demo','school','pending',NULL,NULL,NULL,NULL,NULL,'2026-10-16 20:28:24.582','2026-10-16 20:28:24.582'),('bb46e437-0816-4e2f-b6c9-e684e0bf484f','Truong Test Tu Dong','school','active',NULL,NULL,NULL,NULL,NULL,'2026-10-27 21:03:55.453','2026-10-27 21:04:36.118'),('eb1f87e9-16d3-409a-a900-6a1b44dfe8f7','Trung tâm Tin học ABCF','center','pending',NULL,NULL,NULL,NULL,NULL,'2026-10-16 22:06:21.980','2026-10-16 22:06:21.980'),('eff0ce1e-1234-4892-a9f7-031383a681a5','DEMO','center','active',NULL,NULL,NULL,NULL,NULL,'2026-10-30 22:03:32.788','2026-10-30 22:04:15.262');
/*!40000 ALTER TABLE `organization` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organization_module`
--

DROP TABLE IF EXISTS `organization_module`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organization_module` (
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module_code` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('requested','active','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requested',
  PRIMARY KEY (`org_id`,`module_code`),
  KEY `fk_org_module_module` (`module_code`),
  CONSTRAINT `fk_org_module_module` FOREIGN KEY (`module_code`) REFERENCES `module` (`code`),
  CONSTRAINT `fk_org_module_org` FOREIGN KEY (`org_id`) REFERENCES `organization` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organization_module`
--

LOCK TABLES `organization_module` WRITE;
/*!40000 ALTER TABLE `organization_module` DISABLE KEYS */;
INSERT INTO `organization_module` VALUES ('050f1426-a066-4afe-b85d-2e4c4962aea4','CLASS_MANAGEMENT','active'),('050f1426-a066-4afe-b85d-2e4c4962aea4','STUDENT_MANAGEMENT','active'),('0bfe89b9-ccbb-4d84-b9f4-b936c0d066b0','STUDENT_MANAGEMENT','rejected'),('11111111-1111-4111-8111-111111111111','CLASS_MANAGEMENT','active'),('11111111-1111-4111-8111-111111111111','STUDENT_MANAGEMENT','active'),('11111111-1111-4111-8111-111111111111','TEACHER_MANAGEMENT','active'),('784c1382-0c5b-4236-9f4f-7a47b335928a','STUDENT_MANAGEMENT','requested'),('8fb17bf2-7952-4252-8d0c-f5433288695b','CLASS_MANAGEMENT','active'),('8fb17bf2-7952-4252-8d0c-f5433288695b','EQUIPMENT_MANAGEMENT','rejected'),('8fb17bf2-7952-4252-8d0c-f5433288695b','ROOM_MANAGEMENT','rejected'),('8fb17bf2-7952-4252-8d0c-f5433288695b','SCHEDULE_MANAGEMENT','rejected'),('8fb17bf2-7952-4252-8d0c-f5433288695b','STUDENT_MANAGEMENT','active'),('8fb17bf2-7952-4252-8d0c-f5433288695b','TEACHER_MANAGEMENT','active'),('9ccc9700-f7a9-4dcc-a1f9-d60877172b90','CLASS_MANAGEMENT','active'),('9ccc9700-f7a9-4dcc-a1f9-d60877172b90','SCHEDULE_MANAGEMENT','active'),('9ccc9700-f7a9-4dcc-a1f9-d60877172b90','STUDENT_MANAGEMENT','active'),('b9791653-0b5d-4325-b3b1-6e2e93c4c4f7','CLASS_MANAGEMENT','requested'),('b9791653-0b5d-4325-b3b1-6e2e93c4c4f7','STUDENT_MANAGEMENT','requested'),('bb46e437-0816-4e2f-b6c9-e684e0bf484f','CLASS_MANAGEMENT','active'),('bb46e437-0816-4e2f-b6c9-e684e0bf484f','STUDENT_MANAGEMENT','active'),('eb1f87e9-16d3-409a-a900-6a1b44dfe8f7','SCHEDULE_MANAGEMENT','requested'),('eb1f87e9-16d3-409a-a900-6a1b44dfe8f7','STUDENT_MANAGEMENT','requested'),('eff0ce1e-1234-4892-a9f7-031383a681a5','CLASS_MANAGEMENT','active'),('eff0ce1e-1234-4892-a9f7-031383a681a5','EQUIPMENT_MANAGEMENT','active'),('eff0ce1e-1234-4892-a9f7-031383a681a5','ROOM_MANAGEMENT','active'),('eff0ce1e-1234-4892-a9f7-031383a681a5','SCHEDULE_MANAGEMENT','active'),('eff0ce1e-1234-4892-a9f7-031383a681a5','STUDENT_MANAGEMENT','active'),('eff0ce1e-1234-4892-a9f7-031383a681a5','TEACHER_MANAGEMENT','active');
/*!40000 ALTER TABLE `organization_module` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_token`
--

DROP TABLE IF EXISTS `password_reset_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_token` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `account_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expires_at` datetime(3) NOT NULL,
  `used_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reset_hash` (`token_hash`),
  KEY `idx_reset_account` (`account_id`),
  CONSTRAINT `password_reset_token_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_token`
--

LOCK TABLES `password_reset_token` WRITE;
/*!40000 ALTER TABLE `password_reset_token` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_token` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permission`
--

DROP TABLE IF EXISTS `permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permission` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `module_code` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=239 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permission`
--

LOCK TABLES `permission` WRITE;
/*!40000 ALTER TABLE `permission` DISABLE KEYS */;
INSERT INTO `permission` VALUES (1,'ORG_APPROVE','Approve/reject organizations',NULL),(2,'ORG_MANAGE','Manage own organization',NULL),(3,'ACCOUNT_MANAGE','Manage organization accounts and roles',NULL),(4,'MODULE_MANAGE','Manage enabled modules',NULL),(5,'PEOPLE_READ','Read people profiles',NULL),(6,'PEOPLE_WRITE','Manage people profiles',NULL),(7,'CLASS_READ','Read classes',NULL),(8,'CLASS_WRITE','Manage classes and enrollment',NULL),(9,'SCHEDULE_READ','Read schedules',NULL),(10,'SCHEDULE_WRITE','Manage schedules and assignments',NULL),(11,'FACILITY_READ','Read facilities and equipment',NULL),(12,'FACILITY_WRITE','Manage facilities and equipment',NULL),(13,'INCIDENT_CREATE','Report equipment incidents',NULL),(14,'INCIDENT_MANAGE','Resolve equipment incidents',NULL),(15,'REPORT_READ','Read management reports',NULL),(16,'FACILITY_MANAGE','Manage department facilities',NULL),(17,'SCHEDULE_CREATE','Create department schedules',NULL),(18,'SCHEDULE_VIEW','View department schedules',NULL),(19,'PEOPLE_VIEW','View department members',NULL),(20,'PEOPLE_EDIT','Manage department members',NULL),(56,'STUDENT_VIEW','View students','STUDENT_MANAGEMENT'),(57,'STUDENT_CREATE','Create students','STUDENT_MANAGEMENT'),(58,'STUDENT_EDIT','Edit students','STUDENT_MANAGEMENT'),(59,'STUDENT_DELETE','Delete students','STUDENT_MANAGEMENT'),(60,'CLASS_VIEW','View classes','STUDENT_MANAGEMENT'),(61,'CLASS_CREATE','Create classes','STUDENT_MANAGEMENT'),(62,'CLASS_EDIT','Edit classes','STUDENT_MANAGEMENT'),(63,'CLASS_DELETE','Delete classes','STUDENT_MANAGEMENT'),(64,'CLASS_ASSIGN_TEACHER','Assign teachers to classes','STUDENT_MANAGEMENT'),(65,'CLASS_CANCEL','Cancel classes','STUDENT_MANAGEMENT'),(66,'CLASS_CLOSE_REQUEST','Request class closure','STUDENT_MANAGEMENT'),(67,'CLASS_CLOSE_APPROVE','Approve class closure','STUDENT_MANAGEMENT'),(68,'CLASS_REOPEN','Reopen closed classes','STUDENT_MANAGEMENT');
/*!40000 ALTER TABLE `permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refresh_token`
--

DROP TABLE IF EXISTS `refresh_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_token` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `account_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `device_info` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issued_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expires_at` datetime(3) NOT NULL,
  `revoked_at` datetime(3) DEFAULT NULL,
  `replaced_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `session_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_refresh_hash` (`token_hash`),
  KEY `idx_refresh_account` (`account_id`),
  KEY `idx_refresh_expires` (`expires_at`),
  KEY `replaced_by` (`replaced_by`),
  KEY `idx_refresh_session` (`session_id`),
  CONSTRAINT `fk_refresh_session` FOREIGN KEY (`session_id`) REFERENCES `user_session` (`id`),
  CONSTRAINT `refresh_token_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `refresh_token_ibfk_2` FOREIGN KEY (`replaced_by`) REFERENCES `refresh_token` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refresh_token`
--

LOCK TABLES `refresh_token` WRITE;
/*!40000 ALTER TABLE `refresh_token` DISABLE KEYS */;
INSERT INTO `refresh_token` VALUES ('0022b964-1f6d-4eaa-8a0f-a032dc27f313','7913faf7-c892-11f1-8537-74d4dd2c201f','3d0fee45385f62bd9fb5bdb0fa98d681a5f16146a2256c867b6d25729ac62aef',NULL,NULL,'2026-10-22 15:55:28.718','2026-10-29 15:55:28.718','2026-10-22 15:59:20.107','e462f221-a066-4daf-9bc8-7d17524e7b1f',NULL),('002784b6-2ef9-436b-b91b-aec6e3795549','22222222-2222-4222-8222-222222222003','659b7accf52a9162f62f3d654db185deed260f67d35e43ab357e0b9df589cf24',NULL,NULL,'2026-11-06 12:30:18.037','2026-11-13 12:30:18.037',NULL,NULL,NULL),('00b5f3ec-2b41-4054-94ae-a9edc8fd6dd2','22222222-2222-4222-8222-222222222004','3931bb8d3e317f26c62d01a3786cb67a0f275345b67e9ded0e9f08340883f121',NULL,NULL,'2026-11-13 07:32:24.252','2026-11-20 07:32:24.252',NULL,NULL,NULL),('029112a1-780d-476b-a4b8-1499fe5c9e3d','22222222-2222-4222-8222-222222222001','8196624f04d8da6d8a1102730bcb875f45cae711152145c5d0500ddb6a37630a',NULL,NULL,'2026-11-13 08:20:12.332','2026-11-20 08:20:12.332',NULL,NULL,NULL),('042c71ce-0cb5-4dca-b8b7-9d5038a337b0','22222222-2222-4222-8222-222222222001','4a69c259ebceddc6f588aa1cc8269a97756e702c606f017848c24c0a7840fb74',NULL,NULL,'2026-11-13 07:32:45.805','2026-11-20 07:32:45.805',NULL,NULL,NULL),('065bf684-89a2-4ec5-b4f6-e0f844cb6e30','22222222-2222-4222-8222-222222222001','e2b96482e72b56f4f06bf1dc4d37d609b8550be7b42f122d1025f1587bad0111',NULL,NULL,'2026-11-13 07:23:09.903','2026-11-20 07:23:09.903',NULL,NULL,NULL),('0703938e-c7fe-44b0-b7e4-9a6296b5a80b','22222222-2222-4222-8222-222222222001','cdb268d61421d11ef52ceca83eaeab9ff17e939b5de35845ee053c646c37c378',NULL,NULL,'2026-11-13 08:06:42.069','2026-11-20 08:06:42.069','2026-11-13 08:38:53.396','8641dcf1-1535-4b38-b493-acc4dcea749d',NULL),('0a40e72e-e01a-4aa6-9e1e-7764cce9c9f4','f7f282ff-c021-48b6-92d9-a10ea0546e6e','1bec6bdf60a29bf19b532db2e829e52bf12c1e088d1a504afb815f802b8a3563',NULL,NULL,'2026-11-13 10:31:50.676','2026-11-20 10:31:50.676','2026-11-13 14:18:47.687','41d5eab2-7f17-4659-addc-f70639da5eef',NULL),('0b613132-6eb0-4271-9f08-cbc21ed9c88e','7913faf7-c892-11f1-8537-74d4dd2c201f','0b766dde748f61527fb21533dd623ef09297348dfb5ac3b8da1e241f597d809b',NULL,NULL,'2026-10-22 14:39:10.814','2026-10-29 14:39:10.814',NULL,NULL,NULL),('0c164e1b-5c89-4703-a6bb-42de19b73384','22222222-2222-4222-8222-222222222001','772d6bb4220ed2c9b180d626659819123a1776d16efd9881a39192371750db2e',NULL,NULL,'2026-11-13 07:15:22.319','2026-11-20 07:15:22.319',NULL,NULL,NULL),('0d304ffc-a51b-4398-87b7-9fd6d2828797','e21b41bf-3447-4f3e-994b-abf5cc415346','59c84b7e01476e724ab41a5f961f7f3b30cd2586aa98f2002f3d76ac04a59f2c',NULL,NULL,'2026-10-22 15:10:52.220','2026-10-29 15:10:52.220',NULL,NULL,NULL),('0ec689cf-9657-49e3-9dc2-020916f82c5f','f7f282ff-c021-48b6-92d9-a10ea0546e6e','4d3f628bc8d8874e2affe8280778fc22e718ed6554ea3997f6f025bfaebcb431',NULL,NULL,'2026-11-13 08:52:08.067','2026-11-20 08:52:08.067','2026-11-13 09:42:29.538','b5312dcf-60bc-4e4a-93e6-6de2bd848d1f',NULL),('0f1ddc96-7842-4102-811e-3275ded0e679','7913faf7-c892-11f1-8537-74d4dd2c201f','76bad9a065fe9c53aab9cd14ef715fee2c34f3f4fc0a09a0aeb5450617f17d79',NULL,NULL,'2026-10-27 13:57:48.198','2026-11-03 13:57:48.198',NULL,NULL,NULL),('0ff1f8c3-5f40-48b4-9ddd-a1c3a5d37936','2937090b-28db-4878-95c7-13c911b31a29','70ef292943926a6a313c9d163104c44dbe709bbc41dc2c779b354125d07940eb',NULL,NULL,'2026-11-13 14:20:45.759','2026-11-20 14:20:45.759','2026-11-16 09:56:27.959','d239c3ee-10e1-402c-9ebb-79b4da04350e',NULL),('11cdd41d-c4c5-41c8-adc9-18b50a36572f','22222222-2222-4222-8222-222222222001','44272ebd0d9e3c3814e3b8acb9ee35cea808b11d004d29f99bcd7d0e14b83bf1',NULL,NULL,'2026-11-13 07:32:20.315','2026-11-20 07:32:20.315',NULL,NULL,NULL),('12b51230-733e-4a23-8232-46cb87d790c4','22222222-2222-4222-8222-222222222001','195920def47c1aceee7c2a2c5672b398b51897f8a9de0edfeb3c5fb7de2e0a39',NULL,NULL,'2026-11-13 07:32:09.038','2026-11-20 07:32:09.038',NULL,NULL,NULL),('13721f30-ca3f-4add-87a3-a858e0d089ce','22222222-2222-4222-8222-222222222001','b7bed5e51142ae4751bed4a51ab40f2e8cfd1c3f88c46fa05f6c18a0d3e8e92f',NULL,NULL,'2026-11-13 07:15:20.678','2026-11-20 07:15:20.678',NULL,NULL,NULL),('13b3e481-f86b-4472-9e66-4fbe1b1b4122','22222222-2222-4222-8222-222222222003','31c282115ee9b9ffbdbabb2fcd777a49a8c20ee20e2c2dfdee62128667c5261f',NULL,NULL,'2026-11-06 12:24:12.851','2026-11-13 12:24:12.851',NULL,NULL,NULL),('142d50b4-50a6-4fab-aefc-12c7b0488fd6','22222222-2222-4222-8222-222222222002','578045645e90d0d7c78dc83f77c2835c71d08f09f2ffc84ef76a9d3d0c24049c',NULL,NULL,'2026-11-06 12:21:04.545','2026-11-13 12:21:04.545',NULL,NULL,NULL),('14f8bc5d-6594-46dd-85df-6c9e048d34e7','f7f282ff-c021-48b6-92d9-a10ea0546e6e','71981c475450d04befebc68c198d3e77ae1f9cf514c7297894ed7cdc47c52135',NULL,NULL,'2026-11-13 14:57:02.654','2026-11-20 14:57:02.654',NULL,NULL,NULL),('1535f457-7865-422c-b7dc-ea9b28ff2cf4','7913faf7-c892-11f1-8537-74d4dd2c201f','92f009ac378835e1ac9d46c94437231cecf80c8269d9fd71c8bc84e3a1dacf1c',NULL,NULL,'2026-10-27 14:05:04.658','2026-11-03 14:05:04.658',NULL,NULL,NULL),('1659e2b8-8c24-46e1-a25a-fca81cc0b119','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','197a33f60599cf3139481dbd1bf54e5368e5f718f843c2145dd7047f575afefb',NULL,NULL,'2026-10-30 15:04:21.125','2026-11-06 15:04:21.125',NULL,NULL,NULL),('168bed0e-8f0e-4b1e-878b-c4a1662cb3c5','22222222-2222-4222-8222-222222222001','30f7635dc7e76049631cb0b1cacc54f1d8c199fc8f1197788f33a207e11b0b92',NULL,NULL,'2026-11-13 07:23:27.858','2026-11-20 07:23:27.858',NULL,NULL,NULL),('1717db5e-834c-4d86-ba81-dd8b2c19d8a0','7913faf7-c892-11f1-8537-74d4dd2c201f','26c74acfb3a599329a6fda6a498cfdc0d64bf3946273e88e316e1cde6c70f822',NULL,NULL,'2026-10-28 02:55:39.445','2026-11-04 02:55:39.445',NULL,NULL,NULL),('1a18d04b-9581-43d1-b254-969f535bf80c','7913faf7-c892-11f1-8537-74d4dd2c201f','f6bae12f175beae7a7a2767ff152f2454ac461f878534defed806a7953c84ada',NULL,NULL,'2026-11-16 10:02:32.916','2026-11-23 10:02:32.916',NULL,NULL,NULL),('1ae87f1d-c58f-4f7b-b15b-ff2c2cf0c858','22222222-2222-4222-8222-222222222001','2c0c161b6df3db1ca760d9dcd7954296260347904e070fd2749858b80490c953',NULL,NULL,'2026-11-13 10:07:55.420','2026-11-20 10:07:55.420',NULL,NULL,NULL),('1bac1db4-ce35-443e-8de1-a50ead2d3e4e','22222222-2222-4222-8222-222222222001','346ec23791a3d52e2e7d1b25bf75a8831c0bb68e9cf9f873da3d609452cdcfb7',NULL,NULL,'2026-11-13 07:16:01.809','2026-11-20 07:16:01.809',NULL,NULL,NULL),('1cd59ce5-4ba3-45da-9433-e7143454dacc','22222222-2222-4222-8222-222222222001','7c197f68b9346026ec69fb1e4dce5c7d49c096b5e1d0db5c6800cb36602cfb89',NULL,NULL,'2026-11-13 07:19:31.342','2026-11-20 07:19:31.342',NULL,NULL,NULL),('1de4ad67-2bbb-4b18-beda-26ec76bfa224','7913faf7-c892-11f1-8537-74d4dd2c201f','edd6636ca8e69f5fd30f5b039ff8f8902bc58e632f8ceab59c37a5323a994b01',NULL,NULL,'2026-10-28 04:12:43.343','2026-11-04 04:12:43.343',NULL,NULL,NULL),('1fc9b5e0-c694-4a57-a32b-ac710e6287da','22222222-2222-4222-8222-222222222001','934f93de529e8b9d7f825b8a427b1d6b726895e9ac50c5ce2f82ddf1a4230da1',NULL,NULL,'2026-11-13 07:30:15.402','2026-11-20 07:30:15.402',NULL,NULL,NULL),('211b8291-1467-4e1e-a5ed-5e9259816fdf','22222222-2222-4222-8222-222222222003','5ed7f1a21117cc6236d59e021cd73a83b0f4db2372189975f58d35bf24b12227',NULL,NULL,'2026-11-13 10:40:08.323','2026-11-20 10:40:08.323',NULL,NULL,NULL),('224ec19d-5b54-4694-8ad6-456cc1617a8b','22222222-2222-4222-8222-222222222003','e262d46a3bb41e4d27dc8d0c6c24de169e79560e4d880736886abc9b69292893',NULL,NULL,'2026-11-13 10:40:37.299','2026-11-20 10:40:37.299',NULL,NULL,NULL),('22774949-3a58-48d3-ac33-d47441771b33','7913faf7-c892-11f1-8537-74d4dd2c201f','694857ddab2219cd62ba1e1c418d37570c8812527c040d18d09172dbe9c5f043',NULL,NULL,'2026-10-28 03:35:08.581','2026-11-04 03:35:08.581','2026-10-28 04:12:43.369','1de4ad67-2bbb-4b18-beda-26ec76bfa224',NULL),('23e9760b-15c4-415d-8a50-f41435d75f8c','22222222-2222-4222-8222-222222222001','86aae54841cac9d0e8a3c807dbabd88416bd36fdad6d0a6099849cad39bee98f',NULL,NULL,'2026-11-13 04:59:50.919','2026-11-20 04:59:50.919',NULL,NULL,NULL),('247dc48d-d402-4d82-8af1-102d9895387d','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','4d75ae5ea0a3e509287074f292e12047cd9c1fa75389e0f7a7fd525a3bf4011e',NULL,NULL,'2026-11-13 14:19:11.435','2026-11-20 14:19:11.435','2026-11-13 14:58:10.545','3c3ecac5-97b0-4d14-b551-dd59590dd6f5',NULL),('250e16e5-78ba-41cc-8f5a-ee3829e68bed','7913faf7-c892-11f1-8537-74d4dd2c201f','3696f39a672ba42a6cd4fe9e25368f8670305aa686e5e6bb23e2c149180ba23f',NULL,NULL,'2026-10-15 12:45:21.505','2026-10-22 12:45:21.505','2026-10-15 13:17:26.059','38a5f124-b728-4089-930c-69cbea1ee6f8',NULL),('2510b3cb-66a7-4a67-923d-50aa03092162','22222222-2222-4222-8222-222222222001','e5edc0c80061109d0f7f59b9fc1903fa474d6de936c69c04368907ee35a7cbcd',NULL,NULL,'2026-11-13 09:04:22.539','2026-11-20 09:04:22.539','2026-11-13 09:42:39.708','7fcc7173-abfb-4c43-b318-a0c57335d60d',NULL),('2605a11b-da8e-442b-a820-7658e0fd172d','22222222-2222-4222-8222-222222222002','eac71e2076a3ea542e46795210ebb93a0ca78058b13223281f9c0339499ade5f',NULL,NULL,'2026-11-06 12:36:50.001','2026-11-13 12:36:50.001',NULL,NULL,NULL),('298ee69f-b3d0-4b2b-9789-b9e2b12326d4','7913faf7-c892-11f1-8537-74d4dd2c201f','0fdabb15d6ecdf3fbedce71e8ae58e48cdc4a9504e37ee6d49a949856f09991d',NULL,NULL,'2026-10-27 13:55:38.224','2026-11-03 13:55:38.224',NULL,NULL,NULL),('2ae6fcd3-167c-4af7-ba58-fd72acf55f92','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','7c11a2599dec92754b0829dcbaef50b4740164320c852dd11f2f14ccc510dd85',NULL,NULL,'2026-11-13 11:32:57.266','2026-11-20 11:32:57.266','2026-11-13 12:06:14.531','e9268206-4b40-434e-ad03-724009508a87',NULL),('2b34bdb6-83c4-440e-bc1c-d6b55fc4f162','7913faf7-c892-11f1-8537-74d4dd2c201f','dd990698413f204130c2c17c047227b58d5e27b62165b3fa704e8cfb98ab5cfc',NULL,NULL,'2026-10-28 03:46:14.037','2026-11-04 03:46:14.037','2026-10-28 03:46:15.002','c2fd5902-7af7-4a69-9b84-8d51cb5b507c',NULL),('2c02a601-f2b0-4be9-96e1-d0a1d5b70c3a','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','75c5ebdb9fee983eeba1f00f953bb9cf05b1747407763158673f45e3f3f8f0c8',NULL,NULL,'2026-11-16 09:50:09.062','2026-11-23 09:50:09.062',NULL,NULL,NULL),('2e3ad762-86be-444f-be7b-dcaed2b09f70','22222222-2222-4222-8222-222222222001','7313a45a2bab5661dc4c0978c8b0a4e6346dccfab22b8b69c34f7bb2cf50fc93',NULL,NULL,'2026-11-13 07:31:48.240','2026-11-20 07:31:48.240','2026-11-13 07:31:48.639',NULL,NULL),('2f0236cc-0d1b-4f69-a9d4-84bc2461e041','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','f5f2ec2286cda0536902801d586680ec8823c43733b12e2127984fcf60e3e26d',NULL,NULL,'2026-11-16 09:50:16.239','2026-11-23 09:50:16.239','2026-11-16 09:53:24.662',NULL,NULL),('30abfba5-9a32-4528-a5cd-49212828c410','22222222-2222-4222-8222-222222222004','35185b390329c8746b33c0874ecbf67e4c48d0c9f7b4b38bdda71fcded5cdbdd',NULL,NULL,'2026-11-06 12:24:13.148','2026-11-13 12:24:13.148',NULL,NULL,NULL),('318c310c-7e16-405b-9654-e4a15922f9b8','22222222-2222-4222-8222-222222222001','53bc81e4a62a018a64f140cdb5b8277244d3dfe69f4e8a7b7b4775f3882db29b',NULL,NULL,'2026-11-13 10:07:32.574','2026-11-20 10:07:32.574',NULL,NULL,NULL),('32a5fa97-f0c9-4965-9e16-935b9fc7602f','7913faf7-c892-11f1-8537-74d4dd2c201f','3bb0e6bb2e5117c8ee870230c56a9fb1c5b294efb3bc9097315107ed0b21b41e',NULL,NULL,'2026-11-13 07:28:39.050','2026-11-20 07:28:39.050',NULL,NULL,NULL),('348f1148-2e5f-4e54-a9b4-b08f1afabdd6','22222222-2222-4222-8222-222222222001','c00bc02f4415c849b858db1e24bdcd549ebb25b9211094d56e6a29d5c6949140',NULL,NULL,'2026-11-13 07:30:00.353','2026-11-20 07:30:00.353',NULL,NULL,NULL),('34aa54e5-99ac-4bee-a4f6-61aff0324f30','22222222-2222-4222-8222-222222222004','e5d6b15bfde31b2ed8646311152d025db254e629e56fe5f91b4e6c31a13e269f',NULL,NULL,'2026-11-13 07:27:39.683','2026-11-20 07:27:39.683',NULL,NULL,NULL),('373da6c4-a838-4f23-a5a0-e9d9fa095a03','7913faf7-c892-11f1-8537-74d4dd2c201f','b26ead72c4cc7bf8257f400763611244aa4dd29a210c1c952a3d23a6c493c4a5',NULL,NULL,'2026-10-28 02:24:08.566','2026-11-04 02:24:08.566','2026-10-28 02:55:39.325','ef5bab62-1d76-45cf-b321-57cdde399299',NULL),('37bb38da-7b50-4d43-91a3-32c05185f4aa','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','4a17d0c32a267890faa105c3e72ba9b3bbf6107145a6fd3b370b418dbed3bdb7',NULL,NULL,'2026-11-13 09:43:05.003','2026-11-20 09:43:05.003',NULL,NULL,NULL),('37d9d7d1-f471-4925-8746-529709d39045','22222222-2222-4222-8222-222222222001','f96e7393fea2ea5326b3088422808786339b23c4fc870eb8bab4db53cb3b2182',NULL,NULL,'2026-11-13 07:24:22.976','2026-11-20 07:24:22.976',NULL,NULL,NULL),('38973d12-af52-4d5c-804d-59030905e420','22222222-2222-4222-8222-222222222001','d3d39882fe724227c58fae1c531f0cedfd2acc86967d6133d9f14249686e2850',NULL,NULL,'2026-11-13 06:04:40.799','2026-11-20 06:04:40.799',NULL,NULL,NULL),('38a5f124-b728-4089-930c-69cbea1ee6f8','7913faf7-c892-11f1-8537-74d4dd2c201f','8e263de7c6d702a3779804a8a18d115f9e1f512eac399430b666a50bc796f16a',NULL,NULL,'2026-10-15 13:17:26.016','2026-10-22 13:17:26.016','2026-10-15 13:19:23.241',NULL,NULL),('396a4eb1-6885-4ed7-84c4-1dfe75173bb1','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','f936625f866d85bb50a692d7844e22b1f17448526fadf6ce8a831c4e8933c1be',NULL,NULL,'2026-11-13 08:41:16.843','2026-11-20 08:41:16.843','2026-11-13 09:04:15.229','9fd57ae7-a6c5-4856-acda-ec519122c087',NULL),('3adf6979-bbd1-4d4d-b0f1-5427737d88cc','22222222-2222-4222-8222-222222222001','c6b6b3a3c3317ff72a48bca2ed7393fc5f1e3272793ef356710459dcc76cfa4d',NULL,NULL,'2026-11-13 07:31:56.432','2026-11-20 07:31:56.432',NULL,NULL,NULL),('3b280cae-9429-47b8-a7ef-e8bc84df5385','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','7c03c80c0016e50c11ababffa08fe7075a7031652ca6d6e30532ae0895e84556',NULL,NULL,'2026-11-13 08:37:10.247','2026-11-20 08:37:10.247','2026-11-13 08:38:33.273',NULL,NULL),('3c1bcc36-3374-433e-9864-5c89b0e45f58','22222222-2222-4222-8222-222222222001','3a31a65750332a457c426e0a5b774a7d1a50c86e0f14e0fca2f7db97a5ffc7a5',NULL,NULL,'2026-11-13 07:29:39.982','2026-11-20 07:29:39.982',NULL,NULL,NULL),('3c37ac2e-74d3-48c1-aa91-3e8f776b9a86','7913faf7-c892-11f1-8537-74d4dd2c201f','73554d05650206725ada252b4f41ee29d2131825967151332fd289bdfa07dd89',NULL,NULL,'2026-10-28 03:35:04.197','2026-11-04 03:35:04.197',NULL,NULL,NULL),('3c3ecac5-97b0-4d14-b551-dd59590dd6f5','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','821ff1329df84f76811d953b9a3bb94735a268bf7dbae0ef943f374c72fd4fdf',NULL,NULL,'2026-11-13 14:58:10.531','2026-11-20 14:58:10.531',NULL,NULL,NULL),('3c4651df-f3ab-4fb1-a392-5af53988a2c2','22222222-2222-4222-8222-222222222001','25dc84dbce74609ccefc7279257725b3893f59f9097a100d0a4273e7355377bc',NULL,NULL,'2026-11-13 08:16:26.611','2026-11-20 08:16:26.611',NULL,NULL,NULL),('3dc66ee8-09e2-449d-bca9-4eb81bb5d9b5','7913faf7-c892-11f1-8537-74d4dd2c201f','571e47ac34982ab6a08dd0412904ff0bd892be841e1212ffe2fa55b68becc653',NULL,NULL,'2026-10-16 15:02:35.970','2026-10-23 15:02:35.970',NULL,NULL,NULL),('3dfd0bbd-e735-4b55-8c70-374ee988f981','22222222-2222-4222-8222-222222222001','cfe2c350ba165b457e7511fe178ef2433f22a2f9e7645f11415fc51d10abcf1d',NULL,NULL,'2026-11-13 07:17:49.493','2026-11-20 07:17:49.493',NULL,NULL,NULL),('3e7e1239-adb8-4987-b25e-d4d4b015c607','7913faf7-c892-11f1-8537-74d4dd2c201f','a9efb6ffaf659fef65a47007a96adf1bf47b8023001be927febb352136dfe9a5',NULL,NULL,'2026-11-13 07:28:30.891','2026-11-20 07:28:30.891',NULL,NULL,NULL),('4017ef74-adc0-4349-89be-efcad39358cc','22222222-2222-4222-8222-222222222001','9be51166682c220c70f84fd1c38f677f7f09991c8b6e8774f3b551f406086de3',NULL,NULL,'2026-11-13 08:27:47.599','2026-11-20 08:27:47.599',NULL,NULL,NULL),('40999a90-7faa-42ab-b05b-b4e8c959734b','7913faf7-c892-11f1-8537-74d4dd2c201f','4dd327a241a7e9aeae68ba838bd42d5847de07bca02df9a9f77a1de5c03b118a',NULL,NULL,'2026-10-22 15:31:41.594','2026-10-29 15:31:41.594',NULL,NULL,NULL),('41d5eab2-7f17-4659-addc-f70639da5eef','f7f282ff-c021-48b6-92d9-a10ea0546e6e','fd7a50f58d9e639663d8b53826d5640b7c9724c038f8f58020afb3e5b363d720',NULL,NULL,'2026-11-13 14:18:47.672','2026-11-20 14:18:47.672',NULL,NULL,NULL),('429de8f8-ef9e-474e-acf2-55270dfbe17c','f7f282ff-c021-48b6-92d9-a10ea0546e6e','d806adf2550541a1e05503547ef8ba45e11af34cbc918600e2fdf51ea41458e0',NULL,NULL,'2026-11-13 10:31:50.540','2026-11-20 10:31:50.540',NULL,NULL,NULL),('435807d7-12cb-4e42-b27a-46d4782ab377','22222222-2222-4222-8222-222222222001','5f03c9f77cd1d7132bc1c42665c9df20ad9f2d371b91e922aeb5b1417f0b540b',NULL,NULL,'2026-11-13 07:28:14.192','2026-11-20 07:28:14.192',NULL,NULL,NULL),('44bbcb1f-159d-4e55-a8d8-c55da03e9fa6','22222222-2222-4222-8222-222222222001','845dc7f462f17e538bf2b5a1398baadb03f3fb949678ffbde9c6546f1a396e8d',NULL,NULL,'2026-11-13 07:31:11.101','2026-11-20 07:31:11.101',NULL,NULL,NULL),('44da2efc-4c0c-4460-a291-dbe6255bf87a','7913faf7-c892-11f1-8537-74d4dd2c201f','cf05bfacf537abf9c25a84106945bd9b508f7565f434d7a68b655f0305cfca65',NULL,NULL,'2026-10-22 16:01:56.592','2026-10-29 16:01:56.592',NULL,NULL,NULL),('44df423e-221c-4e14-b3ba-f269824840d7','7913faf7-c892-11f1-8537-74d4dd2c201f','6c605780bf2541c209a411a2148016224e46ee70258d346ad9cb85ee9c6d4655',NULL,NULL,'2026-10-16 14:00:29.847','2026-10-23 14:00:29.847',NULL,NULL,NULL),('45dc614e-18bb-4c20-a143-d0d7a3d092d2','22222222-2222-4222-8222-222222222001','aafb13a0c8afaaa3c944fb8254fbc9f8a5361efc7c9ea454a05b11a4d25ef1c4',NULL,NULL,'2026-11-13 07:30:18.603','2026-11-20 07:30:18.603',NULL,NULL,NULL),('4602fd03-67d4-4725-8738-b83748a12070','7913faf7-c892-11f1-8537-74d4dd2c201f','062d14304c2e9a358ddb3011139dfcd7e3078edbf45800a38362c5e36fa0f1b8',NULL,NULL,'2026-10-22 16:01:17.917','2026-10-29 16:01:17.917',NULL,NULL,NULL),('46782a86-d5b6-4917-a6a5-ce296f4bbf1e','22222222-2222-4222-8222-222222222001','4b0696496b938f8baab804780dd943a0ecc6f1269509b6c2abf01e08817e75b9',NULL,NULL,'2026-11-13 10:08:12.183','2026-11-20 10:08:12.183',NULL,NULL,NULL),('47637ec1-5f72-46c5-8e94-3b2b2285a1eb','7913faf7-c892-11f1-8537-74d4dd2c201f','4815cbb0bd95584c88780b77ee16ef87150ddfce483813bf14030b7abde38c57',NULL,NULL,'2026-10-27 13:56:49.643','2026-11-03 13:56:49.643',NULL,NULL,NULL),('4887bfda-c48c-42d0-b9f1-bb585ca9c844','7913faf7-c892-11f1-8537-74d4dd2c201f','b1b17c9a98f7a52ec582c58238b4f17d39b260462fe7180f3cf9dd5285c37f0a',NULL,NULL,'2026-10-27 13:57:29.905','2026-11-03 13:57:29.905',NULL,NULL,NULL),('4a688103-6f7e-4fe4-b80c-f2a8e14e3995','2937090b-28db-4878-95c7-13c911b31a29','fb8adb8a446fe81f40685a0b85ce7c8630b093a08793311f3e890686f61a926b',NULL,NULL,'2026-11-13 09:46:32.333','2026-11-20 09:46:32.333','2026-11-13 09:46:57.600',NULL,NULL),('4beeeef0-712a-4e72-9d1b-f7f7c4e3a76a','22222222-2222-4222-8222-222222222001','2724a20b8e434571f89d39146ba19adbfb9a1d8167a4756d05caa4a3d1afebc0',NULL,NULL,'2026-11-13 07:14:01.787','2026-11-20 07:14:01.787',NULL,NULL,NULL),('50cf7b0d-267c-41d3-b71a-d0c59f2191a2','22222222-2222-4222-8222-222222222002','7d218085beb9069c609c4c99bb5b241d7a4cbd3e1f8911d783c931629b82ec62',NULL,NULL,'2026-11-06 12:22:26.870','2026-11-13 12:22:26.870',NULL,NULL,NULL),('52e55753-697e-4234-8c65-e34f45a603de','22222222-2222-4222-8222-222222222001','09644d6df0f98db9ab52a1e74db3687ef50137d7e7840739f686afccf9965074',NULL,NULL,'2026-11-13 07:29:52.783','2026-11-20 07:29:52.783','2026-11-13 07:29:53.123',NULL,NULL),('5498703c-cbc9-4913-b1bb-7d56305918b3','7913faf7-c892-11f1-8537-74d4dd2c201f','435611a402e29a0fb13179c7fdc3951ea77a306382a3d870300d8d4e6dd385b2',NULL,NULL,'2026-11-13 08:20:51.699','2026-11-20 08:20:51.699',NULL,NULL,NULL),('54b3c30e-ffa3-4f4c-b71e-ed88c49a9944','22222222-2222-4222-8222-222222222001','f281210a62de87e30e05e628480e67aba0420c4c79efeaf3897aeb15ec4fe2dc',NULL,NULL,'2026-11-13 08:19:55.463','2026-11-20 08:19:55.463',NULL,NULL,NULL),('54c62108-078e-4301-b407-daf45cff837f','f7f282ff-c021-48b6-92d9-a10ea0546e6e','14480f9044ef85f70e926d52b132fe6683828341b88fe2eb5db9d11ed40ff897',NULL,NULL,'2026-11-13 10:00:54.647','2026-11-20 10:00:54.647','2026-11-13 10:31:50.552','429de8f8-ef9e-474e-acf2-55270dfbe17c',NULL),('55607bf6-e6ef-489b-b283-8895aae8ac3c','7913faf7-c892-11f1-8537-74d4dd2c201f','fcf27b5c3717d077a2c579e150336ca2564ef0a98b4ae4e1254b512638d62313',NULL,NULL,'2026-10-22 15:01:59.306','2026-10-29 15:01:59.306',NULL,NULL,NULL),('58156e08-d655-4b1b-bb66-006bdede6ece','7913faf7-c892-11f1-8537-74d4dd2c201f','d2dfe7439d3d0f875e3ea24b86981e0edeaff8bd2136eb62f59cf71ae13a4e1d',NULL,NULL,'2026-11-13 07:32:37.212','2026-11-20 07:32:37.212',NULL,NULL,NULL),('59b8bee5-fb61-4f06-bcb0-9ef6bd69a8e2','7913faf7-c892-11f1-8537-74d4dd2c201f','ec8da3fb03a057b3e9793a606c3a96ecd6448b6603baeb6ec6263bec853d4370',NULL,NULL,'2026-11-16 09:57:01.847','2026-11-23 09:57:01.847',NULL,NULL,NULL),('59ddfc8a-91e0-4af5-8f94-9a165f063dff','22222222-2222-4222-8222-222222222001','5ac423fc5d5f1d45f4a585f42463556c9598eba534ffc8648556e6d12339bd98',NULL,NULL,'2026-11-13 08:20:05.622','2026-11-20 08:20:05.622',NULL,NULL,NULL),('5be76529-afb2-451c-9be6-1c7931ccb025','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','ea3be0bd50fec1f61740d92c37c3dcbf60e88c4f00434346d7e71e77e22f55bb',NULL,NULL,'2026-11-13 09:57:28.721','2026-11-20 09:57:28.721',NULL,NULL,NULL),('5d2febdb-91d9-4056-8865-bae4b43bd989','22222222-2222-4222-8222-222222222001','735dd23d62de296cc5a267cfef5f7cb0d75f7a8ecc4cd6c26a703ebc5fd2b73e',NULL,NULL,'2026-11-13 07:29:55.219','2026-11-20 07:29:55.219',NULL,NULL,NULL),('5efcd746-b4fb-4788-a172-b2cb449abe89','7913faf7-c892-11f1-8537-74d4dd2c201f','da0a97eb06d4345aff0d1bfa411b03146ce1a1caf402e92ec1b1be458b8ffa3e',NULL,NULL,'2026-10-27 13:55:45.425','2026-11-03 13:55:45.425',NULL,NULL,NULL),('609de61d-7a4b-48b1-8dfd-d26c16ea853b','f7f282ff-c021-48b6-92d9-a10ea0546e6e','5dc649a3fab7f042f71e45c820e33da40c7dd6c9730aae273ca06cbd87e8b74b',NULL,NULL,'2026-11-13 14:56:00.175','2026-11-20 14:56:00.175',NULL,NULL,NULL),('6443b969-03d1-4963-b079-7375b332d4d9','7913faf7-c892-11f1-8537-74d4dd2c201f','7595b8b9471aa40249033edefa8f55b63a2a905dd80148db8899cd40a5503727',NULL,NULL,'2026-10-28 03:39:01.421','2026-11-04 03:39:01.421',NULL,NULL,NULL),('64c8b56d-7e9c-4456-b539-e6546a8c61b1','22222222-2222-4222-8222-222222222001','8b432f900570349c98733697a138eb6ec400dae565e54535d8d7dbd535025be2',NULL,NULL,'2026-11-13 07:17:42.716','2026-11-20 07:17:42.716',NULL,NULL,NULL),('65df4300-bb65-49e0-8c1c-93718fbb574a','7913faf7-c892-11f1-8537-74d4dd2c201f','12f757b95e9529f3fa9c9fe75260e1c0f64aa158def6264e7d0e2c8f78d7e9bb',NULL,NULL,'2026-10-22 14:28:43.993','2026-10-29 14:28:43.993',NULL,NULL,NULL),('66a1b945-a80e-42f1-8877-724fb175c9a8','2937090b-28db-4878-95c7-13c911b31a29','5e920fc5b3e13145c7c79f82fcc8542316c3e20ad9eb944e406a9c8f6c1b61e8',NULL,NULL,'2026-11-16 09:56:28.084','2026-11-23 09:56:28.084',NULL,NULL,NULL),('67dce0a5-faed-4452-ba7b-36d652acffb0','22222222-2222-4222-8222-222222222001','e2d19449b1d56c6b94f941e62b9e2bbe4f9fcc8d093c926b76495495145e3939',NULL,NULL,'2026-11-13 07:31:46.512','2026-11-20 07:31:46.512',NULL,NULL,NULL),('6957cc9d-cfe3-474c-9af1-2a0b2d037d90','22222222-2222-4222-8222-222222222002','40698cf79663b8ab59e9c1f1a07393d291b373b85cf6cc2d8e45e285c1a0b072',NULL,NULL,'2026-11-16 10:02:48.049','2026-11-23 10:02:48.049',NULL,NULL,NULL),('69a4a401-b689-48a4-bf72-e5f558a8c33c','22222222-2222-4222-8222-222222222002','0adb08ab8e51a9a2030d96b3198fff40230188d1df36cbf1d5088800b0431d2f',NULL,NULL,'2026-11-13 10:40:37.133','2026-11-20 10:40:37.133',NULL,NULL,NULL),('69bbd4a0-9ac8-4af7-8bba-7f917821cd0e','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','ebca2905301f4c947f8a0c292cd6385638522f8fbb659c3424e7eae08f9438c4',NULL,NULL,'2026-11-09 15:27:57.510','2026-11-16 15:27:57.510','2026-11-09 15:28:07.160',NULL,NULL),('69f417cf-bfe6-4778-b638-322de789fc0f','22222222-2222-4222-8222-222222222001','e4fc91e55a2a5567455c864e35a6a27e21d97e34a0643404a850b63e1e181d40',NULL,NULL,'2026-11-13 08:19:37.401','2026-11-20 08:19:37.401',NULL,NULL,NULL),('6ae22a0c-a0bd-44ef-b961-40a063f5d5bf','22222222-2222-4222-8222-222222222003','5dbfdbf276c928d7e885cb68cca457fc8da5cd0133932b4d1ddfc00eb4726ba9',NULL,NULL,'2026-11-13 10:40:07.150','2026-11-20 10:40:07.150',NULL,NULL,NULL),('6b08a7a9-4627-4052-8ce1-3c697abef897','22222222-2222-4222-8222-222222222001','4f5eefd0b0b3b9e8365a188c1cf0d8c933929b934c06406995ca2a5adec747a4',NULL,NULL,'2026-11-13 08:20:23.943','2026-11-20 08:20:23.943',NULL,NULL,NULL),('6b59370f-941c-4c3f-a77c-86d1f6453066','22222222-2222-4222-8222-222222222001','e3a77d80383c6a6d5afe8b35c4978e0c5ef6a6e67a8bbd7cbbf77a3ba6f1d8f4',NULL,NULL,'2026-11-13 07:21:13.878','2026-11-20 07:21:13.878',NULL,NULL,NULL),('6c848703-aaaf-404d-ae7a-9af9f7e93ae9','22222222-2222-4222-8222-222222222001','90dd054740fcb8b02a5b1d8d92d79ff906c7534257e1987b71554beb06e36767',NULL,NULL,'2026-11-13 07:24:07.629','2026-11-20 07:24:07.629',NULL,NULL,NULL),('6e0c147a-a1ec-49f2-ab31-4c54046ff4cb','22222222-2222-4222-8222-222222222001','b9eb018a107933fb20acbf39ffc800dd2857e9be6a0a0bf5befc0cc47862a71a',NULL,NULL,'2026-11-13 07:14:44.567','2026-11-20 07:14:44.567',NULL,NULL,NULL),('74479dde-14e5-4db8-a242-0d09e799e730','7913faf7-c892-11f1-8537-74d4dd2c201f','e3d644d452b7a69801cc72204d4d244f73c039c581e14a8926b1ee12736c0141',NULL,NULL,'2026-10-28 03:40:37.475','2026-11-04 03:40:37.475','2026-10-28 03:40:37.844','dd5294ac-2ec5-4453-824a-8fbc73508d6a',NULL),('74f7261f-9f14-4b5c-b881-71a4ccb185e9','22222222-2222-4222-8222-222222222001','0ae4b1b704b65540047cf9551618e9093c91f0007d41c66f8691396fbf4cae9f',NULL,NULL,'2026-11-13 06:33:36.276','2026-11-20 06:33:36.276',NULL,NULL,NULL),('7819c221-cc8b-40c3-b43a-6466a7710583','22222222-2222-4222-8222-222222222001','91c72c5f81bc47de5cc01f5934815cd0a93beb97fd144df4478d91fdd029bb1d',NULL,NULL,'2026-11-13 06:33:40.039','2026-11-20 06:33:40.039',NULL,NULL,NULL),('7b0e3203-2409-4e36-a381-135c5260971f','22222222-2222-4222-8222-222222222001','e66ad782d6a30c313d70a9b4bb6eebd401aa3b031025f29e1c7616ded30f4869',NULL,NULL,'2026-11-13 08:21:00.585','2026-11-20 08:21:00.585',NULL,NULL,NULL),('7b199316-5272-44af-a606-605a4abdbdb2','22222222-2222-4222-8222-222222222004','97d7fe699df793d53cae4d1ec2372754ff90e466666922c195087d8d590d613f',NULL,NULL,'2026-11-06 12:24:29.136','2026-11-13 12:24:29.136',NULL,NULL,NULL),('7cf882a9-bcd2-4e2f-bef0-f6078f6c51e5','7913faf7-c892-11f1-8537-74d4dd2c201f','ea88e43437cb7d625892aa265b38e97864e59549bf5a60f3183ed572a0fa6ee9',NULL,NULL,'2026-10-28 03:00:48.995','2026-11-04 03:00:48.995',NULL,NULL,NULL),('7ded0d12-5be6-4b78-87e7-850505964a37','22222222-2222-4222-8222-222222222001','fda6232930db69b413464dbb7501a96f6c1df48023ee3a2fca81500bf539fc78',NULL,NULL,'2026-11-13 10:02:44.837','2026-11-20 10:02:44.837',NULL,NULL,NULL),('7e341c58-68ad-4699-bede-6f35e11a67b5','22222222-2222-4222-8222-222222222001','267fe4d65701f84c3f5d2600d0a96fea09ec14ec2a3e83715aa671ad331e54a2',NULL,NULL,'2026-11-13 08:27:49.730','2026-11-20 08:27:49.730',NULL,NULL,NULL),('7efca366-c4fe-45fd-88a4-c166e9d1e9d8','7913faf7-c892-11f1-8537-74d4dd2c201f','206aa7d1368c5acf02a11fd2b9c0d74b9e46ba6b5840a37a41a7c6eba825767e',NULL,NULL,'2026-10-16 15:08:00.415','2026-10-23 15:08:00.415',NULL,NULL,NULL),('7fcc7173-abfb-4c43-b318-a0c57335d60d','22222222-2222-4222-8222-222222222001','e659ba069ec64c8ad642ad822ce6c088d1c9da07fb7c6450e7fb3d18d8dced20',NULL,NULL,'2026-11-13 09:42:39.697','2026-11-20 09:42:39.697','2026-11-13 10:02:44.851','7ded0d12-5be6-4b78-87e7-850505964a37',NULL),('80d469a0-e376-4800-860d-b74651658c28','f7f282ff-c021-48b6-92d9-a10ea0546e6e','06ae9b7ed73cdfea81cd8fdcfd2f7d0ccd1f757534173ded122fd68e951ea4b3',NULL,NULL,'2026-11-13 09:42:29.675','2026-11-20 09:42:29.675','2026-11-13 10:00:54.660','54c62108-078e-4301-b407-daf45cff837f',NULL),('80d8ab34-1eff-4ba8-a766-4b4158cb4188','22222222-2222-4222-8222-222222222001','cd7f5ac9239a664ce89f805addacfaf7f840226d1bccc7a8599206d92625c697',NULL,NULL,'2026-11-13 10:08:00.244','2026-11-20 10:08:00.244',NULL,NULL,NULL),('816e4a52-2464-49ff-82a7-be944a86509e','22222222-2222-4222-8222-222222222001','186b9f355bb17006453d9f886f4e4d8e8ba145a095d7c971edb9ca565accbdc1',NULL,NULL,'2026-11-13 07:23:24.281','2026-11-20 07:23:24.281',NULL,NULL,NULL),('8323d98e-c330-4039-9563-a94b753444cd','22222222-2222-4222-8222-222222222001','7144b28cdf74d2aa6bc15a630bafdff17976267d5b3eee0a6b10c1693bbb401d',NULL,NULL,'2026-11-13 05:01:46.938','2026-11-20 05:01:46.938',NULL,NULL,NULL),('83a4bb3c-58e6-4236-be88-801ab206c8a2','7913faf7-c892-11f1-8537-74d4dd2c201f','986f4a8fa7bbf75fd3e0c391d0c132e5bc02a439897db5f155df99c5e10fcb3c',NULL,NULL,'2026-10-27 14:05:20.195','2026-11-03 14:05:20.195',NULL,NULL,NULL),('85eef1b5-e27c-4bdb-8058-be7de4650716','22222222-2222-4222-8222-222222222001','66d81d8208d28ec47c7cdecf8feb6dd74724c1e5a538ff1f71f8b0196ed7e16e',NULL,NULL,'2026-11-16 10:02:33.054','2026-11-23 10:02:33.054',NULL,NULL,NULL),('862599a7-9667-4624-959a-d3ff832e1b55','7913faf7-c892-11f1-8537-74d4dd2c201f','a0fca3de72ea19268f11e6de0db373946ef4faa6bef09e795a39e882558819ae',NULL,NULL,'2026-10-16 14:05:09.749','2026-10-23 14:05:09.749',NULL,NULL,NULL),('8641dcf1-1535-4b38-b493-acc4dcea749d','22222222-2222-4222-8222-222222222001','a14a783e79dc97d2851ba4cb51d678ca11fdf64f11704969b77c2ed81ce0c3ca',NULL,NULL,'2026-11-13 08:38:53.379','2026-11-20 08:38:53.379','2026-11-13 09:04:22.553','2510b3cb-66a7-4a67-923d-50aa03092162',NULL),('8721205a-4b4f-41a7-8ff8-1894fe86a0c1','22222222-2222-4222-8222-222222222001','1c5d83eb40ad7b9a4f426945d543d24c0847332c6aeab75c7ed3280e2fc797bd',NULL,NULL,'2026-11-16 10:02:47.890','2026-11-23 10:02:47.890',NULL,NULL,NULL),('897ff83a-1baa-4036-9be5-969326eceacf','7913faf7-c892-11f1-8537-74d4dd2c201f','dd5b9ef0576835cfa02f80899eba7e47f2d168b2f6b2fcd0b93fb3a8f13c6ecb',NULL,NULL,'2026-10-27 14:04:36.039','2026-11-03 14:04:36.039',NULL,NULL,NULL),('8b8f7ba6-afa1-46d7-a3d2-cd8c6420d61c','22222222-2222-4222-8222-222222222001','def9a5b7b42bd84f834b169bd4dc13f527db04c9f7d5c1701bddafa782804562',NULL,NULL,'2026-11-13 10:08:19.880','2026-11-20 10:08:19.880',NULL,NULL,NULL),('8e69f900-b9b1-4e8c-82f5-44864f138a9e','22222222-2222-4222-8222-222222222001','911767ce2afd6e74a238664d9ec4cf55fd06807c045eca8a8abd768c01b81122',NULL,NULL,'2026-11-13 07:31:50.965','2026-11-20 07:31:50.965',NULL,NULL,NULL),('8f153681-ff59-4877-b160-22b794a17204','22222222-2222-4222-8222-222222222001','6b6a2ed4a72b946c4ee207399bbd6f426f12a633f9a9ceff456882e4fec54adc',NULL,NULL,'2026-11-13 07:32:16.430','2026-11-20 07:32:16.430',NULL,NULL,NULL),('8f5474a7-ef9e-4b53-bc36-68c5ca96667f','22222222-2222-4222-8222-222222222001','1fd15f538963b420b408fbe74e3d3b439a02e087a6bc2863222375645b238a4c',NULL,NULL,'2026-11-13 07:30:11.552','2026-11-20 07:30:11.552',NULL,NULL,NULL),('919fbbdf-e8b8-4222-9319-21d1e0819690','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','26c4c8d41750fc6d0ddf6089511fa777448de57f065ea629ac47a0a18603174b',NULL,NULL,'2026-11-13 08:49:23.556','2026-11-20 08:49:23.556',NULL,NULL,NULL),('95158eff-6049-45de-9e3c-56575bf2cffc','22222222-2222-4222-8222-222222222004','bc35de49c9092b334ba9a29549fc4a2db8080e12e71dbf7ebaf0553550951569',NULL,NULL,'2026-11-13 07:28:18.220','2026-11-20 07:28:18.220',NULL,NULL,NULL),('966ab500-f790-48d5-988d-8bbb32e268a2','22222222-2222-4222-8222-222222222001','e5141f31c48700e4c8dd66f8afc071ec8309363180ad15fe63bc74f9ad6ae275',NULL,NULL,'2026-11-13 07:09:17.215','2026-11-20 07:09:17.215','2026-11-13 08:06:42.085','0703938e-c7fe-44b0-b7e4-9a6296b5a80b',NULL),('96b1fe02-3d4f-40c9-a58c-f24255c93957','22222222-2222-4222-8222-222222222001','3587d1ddb86ee4a60209dc2fd01a4dffc4201159fa9b3d3d5ca45457fcc67c33',NULL,NULL,'2026-11-13 07:15:25.323','2026-11-20 07:15:25.323',NULL,NULL,NULL),('99a167e0-3132-4a54-8f2d-5310a77c5eba','22222222-2222-4222-8222-222222222001','a33f0360bda22097e297fde2bd70117f2619c32e9d627b1713cf95607d25261f',NULL,NULL,'2026-11-13 07:29:51.132','2026-11-20 07:29:51.132',NULL,NULL,NULL),('9b0ef0c6-55af-484c-9346-7b6fd7924a98','22222222-2222-4222-8222-222222222001','c673ac7aeded3bccc6524b35ea128078febbb08a8b47f1246630ac85849b42d5',NULL,NULL,'2026-11-13 07:14:11.502','2026-11-20 07:14:11.502','2026-11-13 07:14:12.532',NULL,NULL),('9be90411-b93b-4b50-b737-54a945a0b7c1','22222222-2222-4222-8222-222222222004','a6365132b827758bcf36efecf4ecd255790c88144e6f44a76f8e08ccf49689f1',NULL,NULL,'2026-11-06 12:36:51.274','2026-11-13 12:36:51.274',NULL,NULL,NULL),('9becc0e8-07aa-4b20-9c42-2cf19f816b99','7913faf7-c892-11f1-8537-74d4dd2c201f','1642e525dc2b8c1b33fa149445cd8b7cc000bc747e3902c3a36139bf9f97b913',NULL,NULL,'2026-10-27 14:03:18.282','2026-11-03 14:03:18.282','2026-10-27 14:03:18.415',NULL,NULL),('9c41c313-bd5c-422d-bf0b-e8be5dbcc1b5','7913faf7-c892-11f1-8537-74d4dd2c201f','a04a33ce8102dfc502fb6e2698135cf5fa082019366d8399d4e821dff1923710',NULL,NULL,'2026-10-28 03:33:26.866','2026-11-04 03:33:26.866',NULL,NULL,NULL),('9ee0a7ff-d087-4f70-9a78-dffd9f5b9ce0','2937090b-28db-4878-95c7-13c911b31a29','5a19b537c9f3d95c8896f729c8b9d8b8d71f91f3d5790d92c5ca3cd5201fea2b',NULL,NULL,'2026-11-13 10:31:27.133','2026-11-20 10:31:27.133','2026-11-13 11:28:53.672','e95be946-0250-47b8-a157-f871e6526199',NULL),('9fd57ae7-a6c5-4856-acda-ec519122c087','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','30fb3956c3ff2d037ebb05e63900941947dc4bc169e5b1f885817feb52fbc23f',NULL,NULL,'2026-11-13 09:04:15.207','2026-11-20 09:04:15.207','2026-11-13 09:43:05.014','37bb38da-7b50-4d43-91a3-32c05185f4aa',NULL),('a01f4d34-128b-4573-977f-067d9b791bc7','22222222-2222-4222-8222-222222222003','cd920c1ab35bc913482cb41bbe2c3f997a6cd83ef1d11db13a1b3468e163f385',NULL,NULL,'2026-11-06 12:23:39.424','2026-11-13 12:23:39.424',NULL,NULL,NULL),('a206ee15-bcd3-4959-a1f2-0e041ba5550f','2937090b-28db-4878-95c7-13c911b31a29','6c21bb2f6ed630741691738a2691fc4f39736e66524ad8027ea92ccf53c1ec76',NULL,NULL,'2026-11-13 09:47:03.933','2026-11-20 09:47:03.933','2026-11-13 10:31:27.156','9ee0a7ff-d087-4f70-9a78-dffd9f5b9ce0',NULL),('a25c5b2a-bf7c-4b8b-a82b-cb45a70bd131','22222222-2222-4222-8222-222222222001','97a6e98072d8902d3f0d0aea7c9b5471754975c862ec11509b870cb30565cb8e',NULL,NULL,'2026-11-13 04:59:34.987','2026-11-20 04:59:34.987',NULL,NULL,NULL),('a2d21a7c-afaa-4a76-a7b8-7b3c1cbb0bc3','7913faf7-c892-11f1-8537-74d4dd2c201f','1512fd85c995ec4b37bbcccaee7fb7bb4e2ddc5b6a6a6e61f937b2c38c7ada94',NULL,NULL,'2026-10-22 15:12:23.785','2026-10-29 15:12:23.785',NULL,NULL,NULL),('a3797c5f-b04e-4ea7-8a63-220a97436ba6','7913faf7-c892-11f1-8537-74d4dd2c201f','dfca13dd165a57c377521db005c7ac4351f0d597a5a48863de86869f9f078c08',NULL,NULL,'2026-10-16 13:58:17.063','2026-10-23 13:58:17.063',NULL,NULL,NULL),('a481b2f4-c2f8-4af2-b1ef-7cbc1fbc7aa5','7913faf7-c892-11f1-8537-74d4dd2c201f','9fdedb4e523b1a5167439ae4e4df3985555e221a3c183bca6973b71a9fb29be8',NULL,NULL,'2026-10-22 15:01:09.881','2026-10-29 15:01:09.881',NULL,NULL,NULL),('a4af789e-ba65-40e9-82b3-11a36effe4e5','7913faf7-c892-11f1-8537-74d4dd2c201f','0cbb40a581165e286b8e078f1f662c81ee6fc5ae5e05cade927dfcadb61297b4',NULL,NULL,'2026-10-27 13:57:48.122','2026-11-03 13:57:48.122','2026-10-27 13:57:48.210','0f1ddc96-7842-4102-811e-3275ded0e679',NULL),('a5cff64b-1daa-4dd9-a091-6ba8d5735681','22222222-2222-4222-8222-222222222001','08c50e79b9ff1c7117fda0e7bbe4b8b764aa216bb9853e0bd9a2b36cb86da5a7',NULL,NULL,'2026-11-13 07:31:52.035','2026-11-20 07:31:52.035',NULL,NULL,NULL),('a6376f11-a413-4896-bc70-51bc5554f7fe','22222222-2222-4222-8222-222222222002','11553088b41b34f45cfec0af6b69d5f61572be2b7a885cd1b994135a2b6820cb',NULL,NULL,'2026-11-13 10:40:06.974','2026-11-20 10:40:06.974',NULL,NULL,NULL),('a7c313ac-b3ae-4b63-bead-2e3c2917a73a','7913faf7-c892-11f1-8537-74d4dd2c201f','b20700ab87bca5720f9ad35132ae1cbad02b5b8d46bee7ff8f3da3ea1fe3bd24',NULL,NULL,'2026-10-22 16:00:33.217','2026-10-29 16:00:33.217',NULL,NULL,NULL),('aab12973-3c3b-41ed-b54c-77119a336172','22222222-2222-4222-8222-222222222001','7d67fc2764581a49339466e3945aae466954808f405d1ee26db92b2816318354',NULL,NULL,'2026-11-13 07:35:22.288','2026-11-20 07:35:22.288',NULL,NULL,NULL),('aba945a0-7971-40d1-a240-16705ea28d14','22222222-2222-4222-8222-222222222001','bdcd24e749c295eedb1ac49c1cc269a4a3a8cb1ea31152538d4092b3b9c73b65',NULL,NULL,'2026-11-13 08:20:00.768','2026-11-20 08:20:00.768',NULL,NULL,NULL),('ac171e33-7b68-4ad3-a822-3c4ecf5421b9','22222222-2222-4222-8222-222222222001','450dd49228b22a2dcc4dfccb48d0a8da759a3d6698a994b3f7dd0e599f6df93a',NULL,NULL,'2026-11-13 04:59:27.745','2026-11-20 04:59:27.745',NULL,NULL,NULL),('ac3e12ab-717a-42e8-9db9-d61a131cb701','7913faf7-c892-11f1-8537-74d4dd2c201f','381ecc7f50c398b789342c48bb8d753620d39b6942995d083b3c11f2d42f716b',NULL,NULL,'2026-10-22 16:01:11.616','2026-10-29 16:01:11.616',NULL,NULL,NULL),('ac55eed2-7df6-4626-878a-076e371198c4','22222222-2222-4222-8222-222222222003','d9c6dbea965666ad68fe43d5b6d3f535f1ff6eb33a1a93950aef4d3415732247',NULL,NULL,'2026-11-06 12:21:31.216','2026-11-13 12:21:31.216',NULL,NULL,NULL),('acf03c07-f02d-409d-ab2d-50c228e52df7','22222222-2222-4222-8222-222222222001','be35f2941a210d457d448050c010464185b791f8ff27e100577eedb4555c435e',NULL,NULL,'2026-11-13 07:29:56.307','2026-11-20 07:29:56.307',NULL,NULL,NULL),('ad45ffc9-87ab-4465-890b-752188825fe2','22222222-2222-4222-8222-222222222003','2daf671e961bb5cb3d849f9ec1b12fef186306b0ae8e5448d79d7089ee9b2042',NULL,NULL,'2026-11-06 12:36:50.701','2026-11-13 12:36:50.701',NULL,NULL,NULL),('af8881f6-4d46-4537-b30a-b8968d51d2eb','f7f282ff-c021-48b6-92d9-a10ea0546e6e','8591acc42cf09b22706c34bb8efeb47429db99e8f5cd5559d39894f9ffe4a7b5',NULL,NULL,'2026-11-13 14:18:47.878','2026-11-20 14:18:47.878',NULL,NULL,NULL),('b044f6d4-cace-41b0-b30d-102592c95310','22222222-2222-4222-8222-222222222002','a8d1219aac474628213691ecd97cfc31ec13c62bcf04979303cbd08c91ec57e1',NULL,NULL,'2026-11-06 12:23:39.045','2026-11-13 12:23:39.045',NULL,NULL,NULL),('b192e644-80f9-4032-92d8-49790d6396c7','7913faf7-c892-11f1-8537-74d4dd2c201f','e0b6dc436168ba66ffb988290bdd0b56f5a40de6b998c48aadf43871e5ea66ee',NULL,NULL,'2026-11-13 07:29:31.303','2026-11-20 07:29:31.303',NULL,NULL,NULL),('b1f78aff-0773-4f7c-b66d-50a31ae90c04','7913faf7-c892-11f1-8537-74d4dd2c201f','220b4930c7467f73d1b4a6aecf95e066d5f6f9c0e7b5ce72a16aa66181c41c4e',NULL,NULL,'2026-10-22 15:06:04.043','2026-10-29 15:06:04.043',NULL,NULL,NULL),('b2135ab3-684a-4ddb-a85d-9137dd82722d','7913faf7-c892-11f1-8537-74d4dd2c201f','52b1faaa32a70fa9b2f93a53c12732bf783fccff0256d0bf35cc9941389b02e5',NULL,NULL,'2026-10-22 15:32:14.550','2026-10-29 15:32:14.550',NULL,NULL,NULL),('b277c0af-d8be-4020-aa4e-36e99f725712','22222222-2222-4222-8222-222222222001','cf17cb05ede7df4e44c29a51c857dac602b547287e1d367e01b80001ead999f0',NULL,NULL,'2026-11-13 07:31:34.753','2026-11-20 07:31:34.753',NULL,NULL,NULL),('b5312dcf-60bc-4e4a-93e6-6de2bd848d1f','f7f282ff-c021-48b6-92d9-a10ea0546e6e','e5af38d9262e7fd2ac603abaa11ad63979673e365266e9b036132dcd5cdc8704',NULL,NULL,'2026-11-13 09:42:29.510','2026-11-20 09:42:29.510',NULL,NULL,NULL),('b53e43c1-c1c0-4950-a9ca-d319e9da3dd9','22222222-2222-4222-8222-222222222001','c541f49b9aea4562c039f80b4cbdf11b4aff57a53b50c297d9e3deb071a09e16',NULL,NULL,'2026-11-13 07:27:15.625','2026-11-20 07:27:15.625',NULL,NULL,NULL),('b626acf6-7e21-43c0-9fff-aa2e040f6a56','22222222-2222-4222-8222-222222222001','f37b647aac85877331f6940492e1a05baafeba798b456061e0d7f05d721efc11',NULL,NULL,'2026-11-13 10:07:48.094','2026-11-20 10:07:48.094',NULL,NULL,NULL),('b71012d0-5fc6-41dd-821d-cd789818de89','7913faf7-c892-11f1-8537-74d4dd2c201f','f4244aaab114a106a768ad29147bec28a056f2d3b0dc05cb2e6b5752649d351e',NULL,NULL,'2026-11-16 10:02:26.273','2026-11-23 10:02:26.273',NULL,NULL,NULL),('ba462fe2-0d74-4b66-b9c2-5dad418bdd61','22222222-2222-4222-8222-222222222001','dad2cb9bfbfd01a004fed0739731fc41edde2281d138f9ecab9197beb374c6a2',NULL,NULL,'2026-11-13 07:14:14.940','2026-11-20 07:14:14.940',NULL,NULL,NULL),('bb89745a-2e96-4b07-8ba9-7e9e9ea6cbd5','7913faf7-c892-11f1-8537-74d4dd2c201f','e8c4c09d776d8d49731cd6e1dedc1146eb21410aef6242ecfd402e09ed07510b',NULL,NULL,'2026-10-22 15:32:18.493','2026-10-29 15:32:18.493',NULL,NULL,NULL),('bc33f7b8-6e09-4ec1-b1c7-1dc186cb23e7','7913faf7-c892-11f1-8537-74d4dd2c201f','afed44ffe116584ded5266143895954bb3d4c61d061c27c72315e8fbf5e11761',NULL,NULL,'2026-10-22 12:35:51.859','2026-10-29 12:35:51.859',NULL,NULL,NULL),('bccdfa8e-d30a-44d7-82b4-8b4e018e61b6','22222222-2222-4222-8222-222222222001','eac4b66fedadad1975e3af1a32b8aedacc656d63cb29f49bbadc6bbc163079e8',NULL,NULL,'2026-11-13 05:00:45.626','2026-11-20 05:00:45.626',NULL,NULL,NULL),('bd997568-64cd-4fbe-b947-bf232440b41e','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','0f02cd4d1073748d36084c898be83f6d1e3024732fde1119d6b3c6dbe16be15f',NULL,NULL,'2026-11-16 09:55:02.708','2026-11-23 09:55:02.708','2026-11-16 09:56:53.430',NULL,NULL),('be5f16df-aa11-464a-aab1-b77ec6f45f8b','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','8ce3b3b1a126527e32847f64e3ce46923c36b19b70ef7e8ecf67632be61876a8',NULL,NULL,'2026-11-13 14:19:11.134','2026-11-20 14:19:11.134',NULL,NULL,NULL),('c2fd5902-7af7-4a69-9b84-8d51cb5b507c','7913faf7-c892-11f1-8537-74d4dd2c201f','baabc959b6cbe997c969011f76c0dcd7f156366dbfbec965c55125c434401c59',NULL,NULL,'2026-10-28 03:46:14.985','2026-11-04 03:46:14.985','2026-10-28 03:46:15.042',NULL,NULL),('c3813093-dc57-451d-8b49-1eb4b4de3ce8','2f9d974f-3b2d-40a5-951f-0ab167982c54','38f5d73e116a5e5b0a804eb1be5ec3d6708c04d639cd59dc0d1b884f6d38fefa',NULL,NULL,'2026-10-27 14:04:50.649','2026-11-03 14:04:50.649',NULL,NULL,NULL),('c42d578d-a805-468e-9536-b7ef0e7e07f0','7913faf7-c892-11f1-8537-74d4dd2c201f','b836f508926bf2d27e678fcc548703ec393189affd26622ee8fefd17d42ab8f5',NULL,NULL,'2026-10-22 14:28:20.536','2026-10-29 14:28:20.536',NULL,NULL,NULL),('c4b4e02c-148e-42dc-b723-6b54621a0c5f','22222222-2222-4222-8222-222222222004','c0f9e072ddba4e845513b3c59ba3274e9589e6f3b85ff1688d100f5d86372181',NULL,NULL,'2026-11-13 08:20:36.926','2026-11-20 08:20:36.926',NULL,NULL,NULL),('c58497fe-e88e-49ad-8fd4-fc7cfc3d1591','22222222-2222-4222-8222-222222222001','0271c2d481b733d7ac36d352d9b8ccb55fb54c6c7a0e9251ee579ee6000ed248',NULL,NULL,'2026-11-13 08:19:57.638','2026-11-20 08:19:57.638','2026-11-13 08:19:58.149',NULL,NULL),('c6218c20-a6de-40c8-baec-f7af0fac969b','2937090b-28db-4878-95c7-13c911b31a29','a5e38637fb805d0b1978cbb91be3cdca9d81e8a575965eb0ed5b257513b84f7c',NULL,NULL,'2026-11-13 14:18:33.735','2026-11-20 14:18:33.735',NULL,NULL,NULL),('c6e1ba0c-7d81-404a-9c32-8a429c2a0774','22222222-2222-4222-8222-222222222001','d2d6f49367a66fd8d3089ee7f2569f9a0ee24c0f878d2655fea170c1ecea6a31',NULL,NULL,'2026-11-13 10:07:40.502','2026-11-20 10:07:40.502',NULL,NULL,NULL),('c8c003d2-afd0-42b1-b5d6-e9ec860980e1','22222222-2222-4222-8222-222222222001','557eb2e239617cbf2bac157b8c2dd1d20b5a7dd3d7cb49885270d642e7b4cdc1',NULL,NULL,'2026-11-13 07:32:13.066','2026-11-20 07:32:13.066',NULL,NULL,NULL),('c970f82a-1a96-48c7-ae63-91614e629f20','22222222-2222-4222-8222-222222222002','8c36119b82fd2071049e08ea5b8fa7b1bdd2e165c65fff6deae747a096e109e7',NULL,NULL,'2026-11-06 12:24:12.647','2026-11-13 12:24:12.647',NULL,NULL,NULL),('ca30d6db-70b6-442d-9650-4280560ef5bc','7913faf7-c892-11f1-8537-74d4dd2c201f','7f5547d74199ce429f95759f6d58553675da20aad4151d2e29440ffc2963334c',NULL,NULL,'2026-11-13 07:32:29.120','2026-11-20 07:32:29.120',NULL,NULL,NULL),('ca9664d2-b7c4-4a7a-98a6-ee40d8ff7bbc','22222222-2222-4222-8222-222222222001','71319862ad81abde5705e43d63a8bfe2986d9c291476e0f9822754e166f3658c',NULL,NULL,'2026-11-13 06:34:42.351','2026-11-20 06:34:42.351',NULL,NULL,NULL),('cb0a7ba6-7447-4174-a794-02ccdb32eaf8','22222222-2222-4222-8222-222222222004','5332c3e62d2f6134c2fc0393723e1bff035acd4743b8a5ad7fd0ec01e97a25ad',NULL,NULL,'2026-11-06 12:30:18.450','2026-11-13 12:30:18.450',NULL,NULL,NULL),('cb8365c8-ba23-4c60-8a0f-484136a55b47','22222222-2222-4222-8222-222222222001','172e11dde75152e2011a9a01ef53ce912a94aa2033493d18ee9a79eba5949483',NULL,NULL,'2026-11-13 07:31:22.142','2026-11-20 07:31:22.142',NULL,NULL,NULL),('cc0617d2-66d3-4162-a169-50e059e21dcb','22222222-2222-4222-8222-222222222001','fba0d4ecac7a51eb84f43646a19bd0e82dc1c68294c31ef762a2ff1821cc0276',NULL,NULL,'2026-11-13 06:33:44.194','2026-11-20 06:33:44.194',NULL,NULL,NULL),('cc6efb25-92af-4c72-aa33-aac60f195cb8','22222222-2222-4222-8222-222222222002','b02324afaa7a6a79355e7d720bb29b197268386f1ee37e45e9f2fbc3a9da9a1c',NULL,NULL,'2026-11-06 12:30:17.542','2026-11-13 12:30:17.542',NULL,NULL,NULL),('cd5ac088-ed47-43e0-997b-8e539b757ed4','22222222-2222-4222-8222-222222222002','a1874086c73d40bfd6b3d71298179771a2e882eb089871658b7b32b96afeb6a6',NULL,NULL,'2026-11-06 12:21:26.504','2026-11-13 12:21:26.504',NULL,NULL,NULL),('ce25fd77-e25c-4535-92bd-15abbf8c1348','7913faf7-c892-11f1-8537-74d4dd2c201f','6f2e3fb30011dabd48a13568095958554d05ab63c671b6a316e3153d5882b4d3',NULL,NULL,'2026-10-27 14:02:35.547','2026-11-03 14:02:35.547','2026-10-27 14:02:35.603',NULL,NULL),('cf41f061-c26c-40ef-ab93-e8ba451b1a6c','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','b42b0ebf4cf89e26f750f883b7d6c6e00fccc152bf14864b234f872294db21e9',NULL,NULL,'2026-11-13 11:32:57.142','2026-11-20 11:32:57.142',NULL,NULL,NULL),('d239c3ee-10e1-402c-9ebb-79b4da04350e','2937090b-28db-4878-95c7-13c911b31a29','809865410c356c99503ebaaf06f5535036b863d49138892da4b5e91ab4c3d870',NULL,NULL,'2026-11-16 09:56:27.944','2026-11-23 09:56:27.944',NULL,NULL,NULL),('d26ad405-5805-46f9-9634-7b0495307a13','f7f282ff-c021-48b6-92d9-a10ea0546e6e','6585eca1a1ee446cf3f555cd01108c04d6c7ea7a9d4c11e6e0017e1dd37407ab',NULL,NULL,'2026-11-13 14:56:00.365','2026-11-20 14:56:00.365',NULL,NULL,NULL),('d2c7db18-43f0-4421-a55f-1c03c3463990','22222222-2222-4222-8222-222222222002','81d2625d7db30581f459a91079e4fbdaeca12fb224323808d984e88fb0f53e4d',NULL,NULL,'2026-11-06 12:24:28.651','2026-11-13 12:24:28.651',NULL,NULL,NULL),('d309edef-8cf9-4091-9ff3-8a6397d5e636','7913faf7-c892-11f1-8537-74d4dd2c201f','5cf8423afdd3886de1df30531f8d35b933ff973f1e2bb273d19f02cc2395f3c4',NULL,NULL,'2026-11-16 10:05:36.011','2026-11-23 10:05:36.011',NULL,NULL,NULL),('d3e13c9d-dd4f-41d2-99cb-fe8434f64c4a','22222222-2222-4222-8222-222222222001','33acccc907f2933bdb3e6566d903bd3e7d0c2da2cfb729c7663cbb4bd25a4e35',NULL,NULL,'2026-11-13 08:20:18.695','2026-11-20 08:20:18.695',NULL,NULL,NULL),('d472b064-4de2-4314-a5db-669f555f5758','7913faf7-c892-11f1-8537-74d4dd2c201f','1406f8b3ac65d8e772ea6879d86e0157c374d48ba9b295816ed31e972a2888ba',NULL,NULL,'2026-10-30 15:03:56.441','2026-11-06 15:03:56.441','2026-10-30 15:04:18.599',NULL,NULL),('d694909e-70c0-474d-a399-773d73c3e590','7913faf7-c892-11f1-8537-74d4dd2c201f','d0d63818ba52544c59b5fceadd6a7a23baed3f0350e432fff85c60c7ae6dbc6f',NULL,NULL,'2026-10-28 03:38:39.804','2026-11-04 03:38:39.804','2026-10-28 03:38:40.268','ebcd10dd-74d1-40e7-b649-19212c5749cc',NULL),('d7d3c8e8-86e7-4ac8-aea6-145ebb0856f7','22222222-2222-4222-8222-222222222001','60b26a6da2f10482abd2baf032d6cae4193b65d006be89cfa03907e073f338e5',NULL,NULL,'2026-11-13 07:20:03.155','2026-11-20 07:20:03.155',NULL,NULL,NULL),('d84d7f49-2b05-476c-a8d3-d15bc9b15f38','22222222-2222-4222-8222-222222222001','a2b7cc52d5cfe813a9c57c446596cbba1f3ca6f6e0ff10c12725f708f8cfbaab',NULL,NULL,'2026-11-13 06:34:20.191','2026-11-20 06:34:20.191',NULL,NULL,NULL),('db1437ca-071c-48cd-93d9-505eb4097644','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','0cac05db56f6c2f51d1e10ff93f1be96caeebc73534b8b0b9a3db126a5a94424',NULL,NULL,'2026-11-13 09:09:02.250','2026-11-20 09:09:02.250',NULL,NULL,NULL),('db15a3c4-2b6a-4b37-abce-e440b18876c0','7913faf7-c892-11f1-8537-74d4dd2c201f','6c7a21ca6236a160e1845265cfa5df99f3283cf6a45eca9a4fa747a28f466f74',NULL,NULL,'2026-11-13 08:20:42.431','2026-11-20 08:20:42.431',NULL,NULL,NULL),('db36c28c-21dc-450d-a362-649375d68051','7913faf7-c892-11f1-8537-74d4dd2c201f','06d00e96fe331c9f611f475f480ca17755c58e6893d3ad3b6d755360fdaa1cf6',NULL,NULL,'2026-10-28 03:46:35.671','2026-11-04 03:46:35.671','2026-10-28 03:46:35.712',NULL,NULL),('db7522b7-0c20-4802-975d-a64731754326','22222222-2222-4222-8222-222222222001','43d9f5be11386f3bee452c35d10d44cca1e74accb0196f3ec00efb7966d6b9a0',NULL,NULL,'2026-11-13 05:00:52.217','2026-11-20 05:00:52.217',NULL,NULL,NULL),('dd5294ac-2ec5-4453-824a-8fbc73508d6a','7913faf7-c892-11f1-8537-74d4dd2c201f','0f8f99e4b080f0e17071e6fe15a996c9ce023bc4dcc9e7d010ac445309e044ea',NULL,NULL,'2026-10-28 03:40:37.837','2026-11-04 03:40:37.837','2026-10-28 03:40:37.862',NULL,NULL),('dde6c74f-7b5d-41d3-ad4e-830daf3e3135','2937090b-28db-4878-95c7-13c911b31a29','d4cce39b0ebc7a27b1aa5c5e6b5d96fd20404479e2f5e44c2d8f516540b4ed44',NULL,NULL,'2026-11-13 14:18:33.967','2026-11-20 14:18:33.967',NULL,NULL,NULL),('de2c5af3-dcdf-42ff-a932-55b87f3fc664','22222222-2222-4222-8222-222222222001','19e06ac48019f2ac5db7116c76703642752b9eb8f8563f969b286cdefba715c1',NULL,NULL,'2026-11-13 08:50:23.096','2026-11-20 08:50:23.096',NULL,NULL,NULL),('deaa6ef1-448f-48a1-b6d8-c7c3203bd0d3','22222222-2222-4222-8222-222222222001','f6d6d6a958657f2ceb42a6ea097522c0995410df7bce9be7bc2addce01263ad6',NULL,NULL,'2026-11-13 08:50:24.859','2026-11-20 08:50:24.859','2026-11-13 08:50:25.279',NULL,NULL),('e0b606d5-a87d-41ab-8ff5-5c4de017f43a','22222222-2222-4222-8222-222222222001','82b40477ae9772a47251110dfe619a1adb5c117fbdd2746f41af5d9103d86b9b',NULL,NULL,'2026-11-13 07:31:53.381','2026-11-20 07:31:53.381',NULL,NULL,NULL),('e330d58c-047c-4d04-9aff-4f4a25bf3d25','f7f282ff-c021-48b6-92d9-a10ea0546e6e','24d2774640d2fc53a41dfed14fbf63f96cf70bd597d7e5f79b8c16ac7c2813d0',NULL,NULL,'2026-11-13 14:21:01.467','2026-11-20 14:21:01.467','2026-11-13 14:56:00.214','609de61d-7a4b-48b1-8dfd-d26c16ea853b',NULL),('e462f221-a066-4daf-9bc8-7d17524e7b1f','7913faf7-c892-11f1-8537-74d4dd2c201f','73fcc8071f262e2ef4e294c36463772040c6e92d03a6de5fd78d0391d9d9582b',NULL,NULL,'2026-10-22 15:59:20.094','2026-10-29 15:59:20.094',NULL,NULL,NULL),('e5371b26-bb6e-4eff-b8c8-5d3b4b88b764','22222222-2222-4222-8222-222222222001','708d289cab89865e413205ff56991eb657d84d2178da84cbfa9725a0e0f7cc9f',NULL,NULL,'2026-11-13 07:15:19.449','2026-11-20 07:15:19.449',NULL,NULL,NULL),('e602ed5d-5636-4c0e-98af-8e4c20b97dd4','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','334b240f78597bac24ec61c7a47e2ea46c733e4bedaed91307e9de381d914ccf',NULL,NULL,'2026-11-13 09:43:05.115','2026-11-20 09:43:05.115','2026-11-13 11:32:57.156','cf41f061-c26c-40ef-ab93-e8ba451b1a6c',NULL),('e88c01f9-16bb-443c-a546-ab02879368ab','7913faf7-c892-11f1-8537-74d4dd2c201f','2aa48b3c107c3b6f3d183269770639bd351ab220ec2324cd1bef82a436854f57',NULL,NULL,'2026-10-22 14:28:38.690','2026-10-29 14:28:38.690',NULL,NULL,NULL),('e9268206-4b40-434e-ad03-724009508a87','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','f2286950c80ccf4a8c4c5bea944507513f7075e3a5c184d6c58d3abff3c74033',NULL,NULL,'2026-11-13 12:06:14.498','2026-11-20 12:06:14.498','2026-11-13 14:19:11.185','be5f16df-aa11-464a-aab1-b77ec6f45f8b',NULL),('e95be946-0250-47b8-a157-f871e6526199','2937090b-28db-4878-95c7-13c911b31a29','c14b1c078873fb6b0626913035b34c446cf941cd0582b33a486ff97b70df65d6',NULL,NULL,'2026-11-13 11:28:53.646','2026-11-20 11:28:53.646','2026-11-13 14:18:33.808','c6218c20-a6de-40c8-baec-f7af0fac969b',NULL),('e95cc1a1-e832-4277-a7a5-f723ddc251a4','22222222-2222-4222-8222-222222222001','e044e83e5bef96d60585fcc8f8c2ca01d158b82b94b4df05934aed45f6a2b6e5',NULL,NULL,'2026-11-13 07:32:03.282','2026-11-20 07:32:03.282',NULL,NULL,NULL),('e96ddb0b-ddc6-429f-ae1e-7b06a0772e95','22222222-2222-4222-8222-222222222001','460b818b4d4adeb7b44d298e62e7c55aea08ac47fba0cab68a66444e7f9f5cd7',NULL,NULL,'2026-11-13 08:20:27.808','2026-11-20 08:20:27.808',NULL,NULL,NULL),('eaa1bf56-f286-4d3f-ab3a-48fa21f28f46','22222222-2222-4222-8222-222222222001','5ec58d19638d1bfc6d365a84cac5d85f27690ee25e11ce1a94b5884db33bb10d',NULL,NULL,'2026-11-13 07:29:57.497','2026-11-20 07:29:57.497',NULL,NULL,NULL),('ebcd10dd-74d1-40e7-b649-19212c5749cc','7913faf7-c892-11f1-8537-74d4dd2c201f','cba1eff33eeb04adfcdeb74a3de7c1f8d8513b18998cb3914fc609ba73991ea3',NULL,NULL,'2026-10-28 03:38:40.254','2026-11-04 03:38:40.254',NULL,NULL,NULL),('ed1c24a5-e66d-4d44-914c-e816ebb3782b','22222222-2222-4222-8222-222222222001','81656e6da99ee139ac8e85717392b4cd8516edb6da42a1d48a1bef67829edae6',NULL,NULL,'2026-11-13 10:08:28.156','2026-11-20 10:08:28.156',NULL,NULL,NULL),('ed628f06-72c7-4cfe-bb8c-80b44028b53a','f7f282ff-c021-48b6-92d9-a10ea0546e6e','e452923381d48d7a86461994003af9f730382d2332379994d2dd25d3a2a29b41',NULL,NULL,'2026-11-13 08:42:33.664','2026-11-20 08:42:33.664','2026-11-13 08:52:03.378',NULL,NULL),('ef0c3871-eca9-4d98-8de3-d44e22c89541','22222222-2222-4222-8222-222222222005','574d58381c1d494ed0dbc99c2585db6cb078ede0973b54c9e069e6107769703a',NULL,NULL,'2026-11-06 12:21:31.475','2026-11-13 12:21:31.475',NULL,NULL,NULL),('ef567832-00e0-498e-b917-cf785104db31','7913faf7-c892-11f1-8537-74d4dd2c201f','6dccdcd78f623669cb2471d8202a891002388157d7eae577e53e6c7748289fde',NULL,NULL,'2026-10-28 03:46:35.047','2026-11-04 03:46:35.047','2026-10-28 03:46:35.684','db36c28c-21dc-450d-a362-649375d68051',NULL),('ef5bab62-1d76-45cf-b321-57cdde399299','7913faf7-c892-11f1-8537-74d4dd2c201f','eee202485198c5e0ce15eb42239a6b9b1f7cd935df24dc5f98634609adeeab46',NULL,NULL,'2026-10-28 02:55:39.282','2026-11-04 02:55:39.282',NULL,NULL,NULL),('f1801578-7f26-4a25-bbee-6db55d196024','22222222-2222-4222-8222-222222222001','c6a85f885aee16dbaf52d6a063fe85b28f94e8deb886a01ea91ec10e5f82a9c5',NULL,NULL,'2026-11-13 07:22:27.500','2026-11-20 07:22:27.500',NULL,NULL,NULL),('f24de7ff-1e7d-4509-8250-46dc0eaec54f','22222222-2222-4222-8222-222222222001','045445862275b3c4fdc20b44466f50a6a88d1e2cef94bbc93f4fe9d149df9ebc',NULL,NULL,'2026-11-13 07:18:52.246','2026-11-20 07:18:52.246',NULL,NULL,NULL),('f3766559-0cbe-4943-ab80-4f5c85d8dc40','22222222-2222-4222-8222-222222222001','ca44540f0c64459081a029aa7395d84f3eca5bfb3e1d387480290ab477819e87',NULL,NULL,'2026-11-13 05:28:01.257','2026-11-20 05:28:01.257',NULL,NULL,NULL),('f56a54bf-5308-4804-a1d8-2d913be07d84','22222222-2222-4222-8222-222222222003','822bbdc895f3562be92a38fccb5ef08296c6cc6374368f66d432733bd3b69a13',NULL,NULL,'2026-11-06 12:24:28.867','2026-11-13 12:24:28.867',NULL,NULL,NULL),('f6107ec0-fcc3-4cdc-90d8-789c64c6403a','22222222-2222-4222-8222-222222222001','b42f1c746d86ecdaf549c58ffb0fca1c4a26c4c0c0c91dd21ae2799336def460',NULL,NULL,'2026-11-13 08:19:42.579','2026-11-20 08:19:42.579',NULL,NULL,NULL),('f7db9237-39d0-4418-becf-10ca63468871','22222222-2222-4222-8222-222222222001','80bf8aaa8fd752a8fb9c88965480607c08ad5cf564db21b6ed75094e91de23ce',NULL,NULL,'2026-11-16 10:02:26.413','2026-11-23 10:02:26.413',NULL,NULL,NULL),('f91a2c86-5e6f-4833-b6cd-67fb27418a7c','22222222-2222-4222-8222-222222222001','5d2af4ebf9d8eef673c38027806ad45ea483a3d4f7e879139493b9678371c6a3',NULL,NULL,'2026-11-13 08:20:32.241','2026-11-20 08:20:32.241',NULL,NULL,NULL),('f91ca20c-72ca-4f89-9b04-e6f8df1a5242','22222222-2222-4222-8222-222222222001','35b8cba3bac390ef80aa22d7713a7dceb8c81d368b5bb44c5f59856a951929fc',NULL,NULL,'2026-11-13 10:40:06.606','2026-11-20 10:40:06.606',NULL,NULL,NULL),('fa494958-183e-4687-b33f-101de2201a66','22222222-2222-4222-8222-222222222001','cdfe678585f96fd78c1a68c59266fc8e5fa13108c312fae4e8a2e4803c8dc35b',NULL,NULL,'2026-11-13 07:23:54.105','2026-11-20 07:23:54.105',NULL,NULL,NULL),('fb04e7de-a678-458c-a492-f3f99a9f7c27','22222222-2222-4222-8222-222222222001','a039cbb7a140187ff012271e9079631aeae171a485a9066873ef06ea493723f9',NULL,NULL,'2026-11-13 07:30:06.148','2026-11-20 07:30:06.148',NULL,NULL,NULL),('fb609350-baad-498a-999c-4f98d49ac557','22222222-2222-4222-8222-222222222001','0042a05beaa271a8e4289ca5e658b2d66bf80d4cd33c093c8453fc74b6f87a54',NULL,NULL,'2026-11-13 07:23:57.155','2026-11-20 07:23:57.155',NULL,NULL,NULL),('fcebd510-96f3-4e3a-8dac-f6d81bb58bc8','7913faf7-c892-11f1-8537-74d4dd2c201f','c554e6e7ff0384e0077eb65767f000e6ff2280e4433f71e6195d3dbce285e925',NULL,NULL,'2026-10-27 14:04:44.537','2026-11-03 14:04:44.537',NULL,NULL,NULL),('fefeb508-db66-4a16-b3e7-ac3f82c86055','b3bd1fe9-b739-42c2-9b04-86bd35ab1846','a84c5c88b46c3a099c0400fa953476f93f4dd52fd2dcf7d61bca0edce893edb0',NULL,NULL,'2026-11-13 14:58:10.648','2026-11-20 14:58:10.648','2026-11-16 09:50:09.122','2c02a601-f2b0-4be9-96e1-d0a1d5b70c3a',NULL),('ffa3b7d4-1a35-4ecc-8632-362e74c96842','22222222-2222-4222-8222-222222222004','625d15cae42858606abf0589e7c184ecca0b100157de556b33c627f899c1b25d',NULL,NULL,'2026-11-06 12:21:31.346','2026-11-13 12:21:31.346',NULL,NULL,NULL),('ffd40808-2852-48e0-bef9-7f2ec8ea40f3','22222222-2222-4222-8222-222222222001','57e021862bca5b85d0e49b143a7e5e0e93fcf2a22b9c1c8eb58c73d66206b347',NULL,NULL,'2026-11-13 08:16:18.879','2026-11-20 08:16:18.879',NULL,NULL,NULL);
/*!40000 ALTER TABLE `refresh_token` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role`
--

DROP TABLE IF EXISTS `role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scope` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role`
--

LOCK TABLES `role` WRITE;
/*!40000 ALTER TABLE `role` DISABLE KEYS */;
INSERT INTO `role` VALUES (1,'SUPER_ADMIN','System administrator','platform','Approves organizations and manages platform'),(2,'ORG_ADMIN','Organization manager','organization','Manages an organization'),(3,'ACADEMIC_STAFF','Academic staff','organization','Students, teachers, classes, schedules'),(4,'FACILITY_STAFF','Facility staff','organization','Rooms, equipment, incidents'),(5,'TEACHER','Teacher','organization','Teaching-related access'),(6,'STUDENT','Student','organization','Own learning-related access'),(7,'ORG_OWNER','Organization Owner','organization',NULL),(8,'OWNER','OWNER','organization','Department access: OWNER'),(9,'MANAGER','MANAGER','organization','Department access: MANAGER'),(10,'STAFF','STAFF','organization','Department access: STAFF');
/*!40000 ALTER TABLE `role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permission`
--

DROP TABLE IF EXISTS `role_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permission` (
  `role_id` bigint unsigned NOT NULL,
  `permission_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `permission_id` (`permission_id`),
  CONSTRAINT `role_permission_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permission_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permission` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permission`
--

LOCK TABLES `role_permission` WRITE;
/*!40000 ALTER TABLE `role_permission` DISABLE KEYS */;
INSERT INTO `role_permission` VALUES (1,1),(1,2),(2,2),(1,3),(2,3),(1,4),(2,4),(1,5),(2,5),(3,5),(1,6),(2,6),(3,6),(1,7),(2,7),(3,7),(5,7),(6,7),(1,8),(2,8),(3,8),(1,9),(2,9),(3,9),(5,9),(6,9),(1,10),(2,10),(3,10),(1,11),(2,11),(4,11),(1,12),(2,12),(4,12),(1,13),(2,13),(4,13),(5,13),(6,13),(1,14),(2,14),(4,14),(1,15),(2,15),(3,15),(7,16),(8,16),(7,17),(8,17),(7,18),(8,18),(7,19),(8,19),(7,20),(8,20),(7,56),(8,56),(7,57),(8,57),(7,58),(8,58),(7,59),(8,59),(7,60),(8,60),(7,61),(8,61),(7,62),(8,62),(7,63),(8,63),(7,64),(8,64),(7,65),(8,65),(7,66),(8,66),(7,67),(8,67),(7,68),(8,68);
/*!40000 ALTER TABLE `role_permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_session`
--

DROP TABLE IF EXISTS `user_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_session` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `device_info` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL,
  `last_active_at` datetime(3) NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `revoked_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_session_account` (`account_id`),
  CONSTRAINT `fk_session_account` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_session`
--

LOCK TABLES `user_session` WRITE;
/*!40000 ALTER TABLE `user_session` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_session` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-16 17:28:44
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: identity_service
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `user_id` varchar(255) NOT NULL,
  `bd` date DEFAULT NULL,
  `fristname` varchar(255) DEFAULT NULL,
  `lastname` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `username` varchar(255) DEFAULT NULL,
  `firstname` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES ('3c0e03e6-c41a-4249-b3a6-35c07f35347a','2022-09-02','c','c','123','c',NULL),('482b8e91-1a30-4038-a70d-6c69be86784c','2022-09-02',NULL,'d','12345678','abcd','a'),('6de19756-9a9e-4502-b038-9dc1dddaf396','2022-09-02','a','d','12345678','ddddd',NULL),('950a58b0-c403-40be-85a5-a27bf3ff57ec','2022-09-02','c','c','123','c',NULL),('966b2f73-b621-442a-b476-aa0bf139aacb','2022-09-02','a','a','123','a',NULL),('966bc328-4c1b-4673-add6-c0fe9fb80141','2022-09-02','a','d','12345678','dddd',NULL),('db20e02d-7233-45c4-b94c-a27e7faacf49','2022-09-02','a','a','123','a',NULL),('ebf37ef1-8799-4983-a2c6-2a3788629c3c','2022-09-02','b','b','123','b',NULL),('f7122d85-06a5-4e00-b23d-8d0b87bc47d2','2022-09-02','c','c','123','c',NULL),('fec9adf1-8c9d-4e69-9a7b-65653bd8167f','2022-09-02','c','c','123','c',NULL);
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-16 17:28:44
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: mems_facility_db
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `classroom`
--

DROP TABLE IF EXISTS `classroom`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `classroom` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `building` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `floor` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capacity` int NOT NULL,
  `room_type` enum('classroom','computer_room') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'classroom',
  `status` enum('active','maintenance','closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_classroom_org_code` (`org_id`,`code`),
  UNIQUE KEY `uq_classroom_id_org` (`id`,`org_id`),
  KEY `idx_classroom_org_status` (`org_id`,`status`,`deleted_at`),
  CONSTRAINT `chk_classroom_capacity` CHECK ((`capacity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `classroom`
--

LOCK TABLES `classroom` WRITE;
/*!40000 ALTER TABLE `classroom` DISABLE KEYS */;
/*!40000 ALTER TABLE `classroom` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `computer_room`
--

DROP TABLE IF EXISTS `computer_room`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `computer_room` (
  `classroom_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `machine_count` int NOT NULL,
  `spec_description` text COLLATE utf8mb4_unicode_ci,
  `installed_software` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`classroom_id`),
  CONSTRAINT `computer_room_ibfk_1` FOREIGN KEY (`classroom_id`) REFERENCES `classroom` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_computer_room_machines` CHECK ((`machine_count` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `computer_room`
--

LOCK TABLES `computer_room` WRITE;
/*!40000 ALTER TABLE `computer_room` DISABLE KEYS */;
/*!40000 ALTER TABLE `computer_room` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `equipment`
--

DROP TABLE IF EXISTS `equipment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipment` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `room_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `asset_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `equipment_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `status` enum('in_use','broken','maintenance','in_storage','retired') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'in_use',
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_equipment_org_asset` (`org_id`,`asset_code`),
  UNIQUE KEY `uq_equipment_id_org` (`id`,`org_id`),
  KEY `idx_equipment_room_status` (`room_id`,`status`),
  KEY `idx_equipment_org_status` (`org_id`,`status`,`deleted_at`),
  KEY `room_id` (`room_id`,`org_id`),
  CONSTRAINT `equipment_ibfk_1` FOREIGN KEY (`room_id`, `org_id`) REFERENCES `classroom` (`id`, `org_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipment`
--

LOCK TABLES `equipment` WRITE;
/*!40000 ALTER TABLE `equipment` DISABLE KEYS */;
/*!40000 ALTER TABLE `equipment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `equipment_status_log`
--

DROP TABLE IF EXISTS `equipment_status_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipment_status_log` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `equipment_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `incident_report_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changed_by` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_status` enum('in_use','broken','maintenance','in_storage','retired') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_status` enum('in_use','broken','maintenance','in_storage','retired') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `changed_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_equipment_log_equipment` (`equipment_id`,`changed_at`),
  KEY `incident_report_id` (`incident_report_id`,`equipment_id`),
  CONSTRAINT `equipment_status_log_ibfk_1` FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `equipment_status_log_ibfk_2` FOREIGN KEY (`incident_report_id`, `equipment_id`) REFERENCES `incident_report` (`id`, `equipment_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipment_status_log`
--

LOCK TABLES `equipment_status_log` WRITE;
/*!40000 ALTER TABLE `equipment_status_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `equipment_status_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `incident_report`
--

DROP TABLE IF EXISTS `incident_report`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `incident_report` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `org_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `equipment_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reported_by` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `photo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('open','in_progress','resolved','unresolved') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `resolved_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_incident_id_equipment` (`id`,`equipment_id`),
  KEY `idx_incident_org_status` (`org_id`,`status`),
  KEY `idx_incident_equipment_status` (`equipment_id`,`status`),
  KEY `equipment_id` (`equipment_id`,`org_id`),
  CONSTRAINT `incident_report_ibfk_1` FOREIGN KEY (`equipment_id`, `org_id`) REFERENCES `equipment` (`id`, `org_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `incident_report`
--

LOCK TABLES `incident_report` WRITE;
/*!40000 ALTER TABLE `incident_report` DISABLE KEYS */;
/*!40000 ALTER TABLE `incident_report` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-16 17:28:44
