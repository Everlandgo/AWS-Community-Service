# React 프론트엔드 Dockerfile
FROM node:18-alpine

WORKDIR /app

# 패키지 파일 복사 및 의존성 설치
COPY package*.json ./
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# 개발 서버 실행
EXPOSE 3000
CMD ["npm", "start"]


