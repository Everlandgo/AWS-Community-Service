# 비밀번호 찾기 기능 테스트 가이드

## 테스트 시나리오

### 1. 정상 플로우 테스트
1. **로그인 페이지 접속**
   - http://localhost:3000/login
   - "비밀번호 찾기" 버튼 클릭

2. **1단계: 이메일 입력**
   - 가입된 이메일 주소 입력
   - "인증 코드 받기" 버튼 클릭
   - 성공 메시지 확인: "인증 코드가 이메일로 전송되었습니다. 메일함과 스팸함을 확인해주세요."

3. **2단계: 인증 코드 및 새 비밀번호 입력**
   - 이메일로 받은 6자리 인증 코드 입력
   - 새 비밀번호 입력 (정책 준수)
   - 비밀번호 확인 입력
   - "비밀번호 변경" 버튼 클릭
   - 성공 메시지 확인 후 로그인 페이지로 자동 이동

### 2. 오류 케이스 테스트

#### 이메일 입력 단계
- **빈 이메일**: "이메일을 입력해주세요."
- **잘못된 이메일 형식**: "유효한 이메일 형식을 입력해주세요."
- **존재하지 않는 이메일**: PreventUserExistenceErrors 고려하여 동일한 성공 메시지

#### 비밀번호 변경 단계
- **잘못된 인증 코드**: "인증코드가 올바르지 않습니다."
- **만료된 인증 코드**: "코드가 만료되었거나 요청이 선행되지 않았습니다."
- **비밀번호 정책 위반**: "비밀번호 정책을 확인해주세요."
- **비밀번호 불일치**: "비밀번호가 일치하지 않습니다."

### 3. UI/UX 테스트
- **반응형 디자인**: 모바일/태블릿에서도 정상 작동
- **로딩 상태**: 버튼 비활성화 및 로딩 텍스트 표시
- **네비게이션**: "로그인으로 돌아가기", "이메일 다시 입력하기" 버튼 작동
- **비밀번호 표시/숨김**: 눈 아이콘 클릭으로 토글

## API 엔드포인트 테스트

### 1. 인증 코드 요청
```bash
curl -X POST http://localhost:5000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### 2. 비밀번호 변경
```bash
curl -X POST http://localhost:5000/api/v1/auth/confirm-forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "confirmation_code": "123456",
    "new_password": "NewPassword123!"
  }'
```

## 환경 변수 확인

백엔드 `.env` 파일에 다음 설정이 있는지 확인:
```env
COGNITO_REGION=ap-northeast-2
COGNITO_CLIENT_ID=2v16jp80jce0c40neuuhtlgg8t
COGNITO_USER_POOL_ID=ap-northeast-2_nneGIIVuJ
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
```

## Cognito 설정 확인

1. **User Pool 설정**
   - 이메일 인증 활성화
   - 비밀번호 정책 설정
   - PreventUserExistenceErrors=ENABLED (보안 권장)

2. **App Client 설정**
   - Public Client (시크릿 없음)
   - OAuth 플로우 설정
   - 콜백 URL 설정

## 문제 해결

### 일반적인 문제들
1. **CORS 오류**: 백엔드 CORS 설정 확인
2. **API 연결 실패**: 프록시 설정 및 포트 확인
3. **Cognito 인증 실패**: AWS 자격 증명 및 설정 확인
4. **이메일 전송 실패**: Cognito SES 설정 확인

### 로그 확인
```bash
# 백엔드 로그
docker-compose logs -f post-service

# 프론트엔드 로그
docker-compose logs -f frontend
```

