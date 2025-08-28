workspace_minjae 브랜치에 코드 올리는 방법
1. 저장소 클론
   git clone https://github.com/Everlandgo/AWS-Community-Service.git
   cd AWS-Community-Service
2. workspace_minjae 브랜치로 이동 및 최신 상태로 업데이트
   git fetch origin
   git switch workspace_minjae
   git pull origin workspace_minjae
3. 새로운 작업 브랜치 생성 (선택사항)
   git switch -c feature/your-feature-name
4. 작업 및 변경 사항 커밋
   git add .
   git commit -m "작업 내용에 대한 설명"
5. workspace_minjae 브랜치에 작업 내용 반영
만약 3번에서 별도의 feature 브랜치를 생성했다면, 해당 브랜치를 원격에 푸시합니다.
  git push origin feature/your-feature-name
GitHub에서 원격의 feature/your-feature-name 브랜치를 workspace_minjae 브랜치로 Pull Request를 생성하여 병합 요청합니다.
직접 workspace_minjae 브랜치에 커밋하려면 로컬 브랜치를 workspace_minjae로 스위치 후 다음 명령어로 푸시합니다.
  git push origin workspace_minjae
6. 작업 완료 후 최신 상태 유지
   git switch workspace_minjae
   git pull origin workspace_minjae
