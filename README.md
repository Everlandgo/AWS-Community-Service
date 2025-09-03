# AWS Community Service

## 🚀 빠른 시작 (실행 방법)

### 사전 요구사항

- Docker 및 Docker Compose 설치
- Git 설치
- 최소 4GB RAM 권장

### 1단계: 프로젝트 클론

```bash
git clone <repository-url>
cd AWS-Community-Service
```

### 2단계: 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# ============================================
# AWS Cognito 설정
# ============================================
COGNITO_USER_POOL_ID=ap-northeast-2_HnquQbxZ4
COGNITO_REGION=ap-northeast-2
COGNITO_CLIENT_ID=47fnsb2rstr5ssi0lb68r2jeat

# ============================================
# AWS 자격 증명
# ============================================
AWS_ACCESS_KEY_ID=your_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
AWS_DEFAULT_REGION=ap-northeast-2

# ============================================
# 데이터베이스 설정
# ============================================
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=postdb
MYSQL_USER=postuser
MYSQL_PASSWORD=postpass

# ============================================
# MinIO 설정
# ============================================
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# ============================================
# Flask 애플리케이션 설정
# ============================================
FLASK_APP=post
FLASK_ENV=development

# ============================================
# API URL 설정
# ============================================
REACT_APP_API_URL=http://localhost:8081/api/v1
REACT_APP_COMMENT_SERVICE_URL=http://localhost:8083
REACT_APP_MINIO_URL=http://localhost:9000
```

### 3단계: 서비스 실행

```bash
# 모든 서비스 시작
docker-compose up -d

# 로그 확인 (선택사항)
docker-compose logs -f
```

### 4단계: 서비스 접속

- **Frontend**: http://localhost:3000
- **Post Service API**: http://localhost:8081
- **Comment Service API**: http://localhost:8083
- **MinIO Console**: http://localhost:9001 (admin/minioadmin)

### 5단계: 서비스 관리

```bash
# 서비스 상태 확인
docker-compose ps

# 서비스 중지
docker-compose down

# 서비스 재시작
docker-compose restart

# 로그 확인
docker-compose logs [service-name]
```

---

## 📋 프로젝트 개요

AWS Community Service는 마이크로서비스 아키텍처를 기반으로 한 커뮤니티 플랫폼입니다. 게시글 작성, 댓글 기능, 사용자 인증을 제공하는 현대적인 웹 애플리케이션입니다.

### 🏗️ 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Post Service  │    │ Comment Service │
│   (React)       │◄──►│   (Flask)       │◄──►│   (Flask)       │
│   Port: 3000    │    │   Port: 8081    │    │   Port: 8083    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   MySQL DB      │
                    │   Port: 3306    │
                    └─────────────────┘
```

### 🛠️ 기술 스택

- **Frontend**: React 18.2.0, React Router DOM 7.8.0
- **Backend**: Flask 2.3.3/3.0.0, SQLAlchemy
- **Database**: MySQL 8.0
- **Authentication**: AWS Cognito
- **Storage**: MinIO (S3 호환)
- **Container**: Docker & Docker Compose

## 📁 프로젝트 구조

```
AWS-Community-Service/
├── Front/                    # React 프론트엔드
│   ├── src/
│   │   ├── components/      # React 컴포넌트
│   │   ├── services/        # API 서비스
│   │   └── utils/           # 유틸리티 함수
│   └── package.json
├── Post-master/             # 게시글 서비스
│   ├── post/
│   │   ├── models.py        # 데이터 모델
│   │   ├── routes.py        # API 라우트
│   │   └── services.py      # 비즈니스 로직
│   └── requirements.txt
├── Comment-master/          # 댓글 서비스
│   ├── comment/
│   │   ├── models.py        # 댓글 모델
│   │   ├── routes.py        # 댓글 API
│   │   └── services.py      # 댓글 로직
│   └── requirements.txt
├── docker-compose.yml       # 컨테이너 구성
└── init.sql                # 데이터베이스 초기화
```

## 🔧 개발 환경 설정

### 로컬 개발 (Docker 없이)

#### Frontend 개발

```bash
cd Front
npm install
npm start
```

#### Post Service 개발

```bash
cd Post-master
pip install -r requirements.txt
python app.py
```

#### Comment Service 개발

```bash
cd Comment-master
pip install -r requirements.txt
python app.py
```

### 데이터베이스 설정

MySQL 데이터베이스가 필요합니다:

```sql
CREATE DATABASE postdb;
CREATE DATABASE commentdb;
```

## 📚 API 문서

### Post Service API

- `GET /api/v1/posts` - 게시글 목록 조회
- `POST /api/v1/posts` - 게시글 작성
- `GET /api/v1/posts/{id}` - 게시글 상세 조회
- `PUT /api/v1/posts/{id}` - 게시글 수정
- `DELETE /api/v1/posts/{id}` - 게시글 삭제

### Comment Service API

- `GET /comments/{post_id}` - 댓글 목록 조회
- `POST /comments` - 댓글 작성
- `PUT /comments/{id}` - 댓글 수정
- `DELETE /comments/{id}` - 댓글 삭제

## 🔐 인증 시스템

AWS Cognito를 사용한 JWT 토큰 기반 인증:

1. 사용자 로그인 시 Cognito에서 JWT 토큰 발급
2. API 요청 시 Authorization 헤더에 토큰 포함
3. 서비스에서 토큰 검증 후 요청 처리

## 🐳 Docker 명령어

```bash
# 서비스 상태 확인
docker-compose ps

# 특정 서비스 로그 확인
docker-compose logs post-service
docker-compose logs comment-service
docker-compose logs frontend

# 서비스 재시작
docker-compose restart post-service

# 모든 서비스 중지
docker-compose down

# 볼륨까지 삭제 (데이터 초기화)
docker-compose down -v
```

## 🧪 테스트

### Post Service 테스트

```bash
cd Post-master
python -m pytest tests/
```

### Frontend 테스트

```bash
cd Front
npm test
```

## 🚨 문제 해결

### 일반적인 문제들

1. **포트 충돌**
   ```bash
   # 사용 중인 포트 확인
   netstat -tulpn | grep :3000
   ```

2. **데이터베이스 연결 실패**
   ```bash
   # MySQL 컨테이너 상태 확인
   docker-compose logs mysql
   ```

3. **메모리 부족**
   ```bash
   # Docker 메모리 제한 확인
   docker system df
   ```

### 로그 확인

```bash
# 실시간 로그 모니터링
docker-compose logs -f --tail=100
```

## 📞 지원

문제가 발생하거나 질문이 있으시면:

1. 이슈를 생성해 주세요
2. 로그 파일을 첨부해 주세요
3. 환경 정보를 포함해 주세요

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

---

**마지막 업데이트**: 2024년 12월