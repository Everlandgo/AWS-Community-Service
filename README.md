# 🚀 게시판 애플리케이션 실행 방법

## 📋 사전 요구사항

- **Docker Desktop** 설치 및 실행
- **Git** 설치

## 🚀 빠른 시작

### 1. 프로젝트 클론

```bash
git clone https://github.com/ksjj3765/Front.git
cd Front
git checkout Combined_repo_Ju
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# AWS Cognito 설정
REACT_APP_COGNITO_USER_POOL_ID=ap-northeast-2_nneGIIVuJ
REACT_APP_COGNITO_CLIENT_ID=2v16jp80jce0c40neuuhtlgg8t
REACT_APP_COGNITO_REGION=ap-northeast-2

# 백엔드 서비스 Cognito 설정
COGNITO_USER_POOL_ID=ap-northeast-2_nneGIIVuJ
COGNITO_CLIENT_ID=2v16jp80jce0c40neuuhtlgg8t
COGNITO_REGION=ap-northeast-2

# 백엔드 API 설정
REACT_APP_API_BASE_URL=http://localhost:8081
REACT_APP_COMMENT_SERVICE_URL=http://localhost:8083

# AWS 자격 증명 (MinIO 사용 시)
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_DEFAULT_REGION=ap-northeast-2

# 데이터베이스 설정
MYSQL_ROOT_PASSWORD=rootpass
MYSQL_DATABASE=communitydb
MYSQL_USER=postuser
MYSQL_PASSWORD=postpass
```

### 3. Docker Compose로 실행

```bash
# 모든 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 특정 서비스 로그 확인
docker-compose logs -f frontend
docker-compose logs -f post-service
```

### 4. 서비스 접속

- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:8081
- **MinIO 콘솔**: http://localhost:9001
- **MySQL**: localhost:3306

## 🔧 개발 환경 설정

### Docker 개발 환경

```bash
# 개발 모드로 실행 (볼륨 마운트)
docker-compose -f docker-compose.yml up -d

# 특정 서비스만 재시작
docker-compose restart frontend
docker-compose restart post-service

# 서비스 중지
docker-compose down
```

## 🐛 문제 해결

### 일반적인 문제들

#### 1. 포트 충돌
```bash
# 포트 사용 확인
netstat -an | findstr :3000
netstat -an | findstr :8081

# Docker 컨테이너 상태 확인
docker ps
```

#### 2. 프론트엔드 "Failed to fetch" 오류
- 백엔드 서비스가 실행 중인지 확인
- API URL이 올바른지 확인 (localhost:8081)
- 브라우저 개발자 도구에서 네트워크 탭 확인

#### 3. 컨테이너 재시작
```bash
# 전체 재시작
docker-compose down
docker-compose up -d

# 특정 서비스만 재시작
docker-compose restart mysql
docker-compose restart post-service
docker-compose restart frontend
```

### 로그 확인
```bash
# 실시간 로그 모니터링
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f frontend
docker-compose logs -f post-service
docker-compose logs -f mysql
docker-compose logs -f minio
```

## 📊 서비스 상태 확인

```bash
# 모든 컨테이너 상태
docker ps

# 서비스 헬스체크
curl http://localhost:8081/health
curl http://localhost:3000
```

---

**Happy Coding! 🎉**
