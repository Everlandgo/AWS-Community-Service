-- Post Service 데이터베이스 스키마 업데이트
-- username 컬럼 추가

USE postdb;

-- 1. username 컬럼 추가
ALTER TABLE posts ADD COLUMN username VARCHAR(100);

-- 2. username 컬럼을 NOT NULL로 설정
ALTER TABLE posts MODIFY COLUMN username VARCHAR(100) NOT NULL;

-- 3. 결과 확인
SELECT id, title, username FROM posts LIMIT 5;
