-- MySQL 데이터베이스 초기화 스크립트
-- Post와 Comment 서비스가 별도 데이터베이스 사용

-- UTF8MB4 문자셋 설정
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET character_set_connection=utf8mb4;

-- Post 서비스 데이터베이스
CREATE DATABASE IF NOT EXISTS postdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Comment 서비스 데이터베이스
CREATE DATABASE IF NOT EXISTS commentdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 사용자 권한 설정
GRANT ALL PRIVILEGES ON postdb.* TO 'postuser'@'%';
GRANT ALL PRIVILEGES ON commentdb.* TO 'postuser'@'%';
FLUSH PRIVILEGES;

-- 데이터베이스 생성 확인
SELECT 'postdb' as database_name, SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = 'postdb'
UNION ALL
SELECT 'commentdb' as database_name, SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = 'commentdb';
