# AWS Community Service - 오늘 작업 내역

## 🔄 댓글 수 자동 동기화 구현
- **Post 서비스**에 댓글 수 업데이트 API 추가
- **Comment 서비스**에서 댓글 작성/삭제 시 Post 서비스에 자동 알림 전송
- **실시간 동기화**: 댓글 변경 시 즉시 Post DB의 comment_count 업데이트

## 📱 메인 페이지 댓글 수 표시
- 게시글 제목 옆에 댓글 수 표시: `"제목 (5)"` 형태
- 댓글이 0개인 게시글은 댓글 수 숨김
- 회색 텍스트로 제목과 구분

## 🔐 JWT 토큰 처리 완성
- **Post 서비스**에 JWT 토큰 검증 시스템 추가
- **Cognito sub 값**을 user_id로 사용
- **Frontend**에서 Authorization 헤더로 토큰 전송

## 🗑️ 불필요한 테이블/필드 제거
- **users 테이블** 삭제 (Cognito 사용으로 불필요)
- **tags 테이블** 삭제 (사용하지 않음)
- **post_reactions 테이블** 삭제 (likes 테이블로 대체)
- **posts 테이블**에서 불필요한 필드 제거: content_md, content_s3url, visibility, status

## 🗄️ 데이터베이스 시스템 통일
- **Post 서비스**를 MySQL로 변경 (Comment 서비스와 동일)
- **Alembic 마이그레이션** 시스템 제거
- **db.create_all()** 방식으로 변경

## 🕐 한국 시간(KST) 적용
- 모든 시간 필드에 한국 시간(UTC+9) 적용
- created_at, updated_at 필드에 kst_now() 함수 사용

## 🏷️ 카테고리 자동 생성
- 프론트엔드에서 문자열로 받은 카테고리를 DB에 자동 생성
- 기존 카테고리 조회 또는 새 카테고리 생성 로직 복원

## 📊 변경 통계
- **수정된 파일**: 15개
- **신규 파일**: 1개 (auth_utils.py)
- **삭제된 파일**: 5개 (migrations 폴더)
- **총 변경 라인**: 약 530라인

## 🚀 작동 방식
1. **댓글 작성/삭제** → Comment 서비스 처리
2. **Comment 서비스** → Post 서비스에 알림 전송
3. **Post 서비스** → Comment 서비스에서 댓글 수 조회 후 DB 업데이트
4. **메인 페이지** → 업데이트된 댓글 수 표시

## ✅ 완료된 기능
- [x] 댓글 수 자동 동기화
- [x] 메인 페이지 댓글 수 표시
- [x] JWT 토큰 인증
- [x] 불필요한 테이블/필드 제거
- [x] MySQL 통일
- [x] 한국 시간 적용
- [x] 카테고리 자동 생성