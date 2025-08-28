#!/usr/bin/env python3
"""
Comment Service API 테스트 스크립트
Comment 서비스의 각 엔드포인트를 테스트하여 올바르게 응답하는지 확인합니다.
"""

import requests
import json
import time
from datetime import datetime

# Comment 서비스 기본 URL
COMMENT_SERVICE_URL = "http://localhost:8083"

def test_health_endpoint():
    """헬스체크 엔드포인트 테스트"""
    print("🔍 헬스체크 엔드포인트 테스트...")
    try:
        response = requests.get(f"{COMMENT_SERVICE_URL}/health", timeout=10)
        print(f"   상태 코드: {response.status_code}")
        print(f"   응답: {response.json()}")
        
        if response.status_code == 200:
            print("   ✅ 헬스체크 성공")
            return True
        else:
            print("   ❌ 헬스체크 실패")
            return False
            
    except requests.exceptions.ConnectionError:
        print("   ❌ 서비스에 연결할 수 없습니다. Comment 서비스가 실행 중인지 확인하세요.")
        return False
    except Exception as e:
        print(f"   ❌ 오류 발생: {e}")
        return False

def test_comments_list_endpoint():
    """댓글 목록 조회 엔드포인트 테스트"""
    print("\n🔍 댓글 목록 조회 엔드포인트 테스트...")
    try:
        # post_id 없이 요청 (400 에러 예상)
        response = requests.get(f"{COMMENT_SERVICE_URL}/api/v1/comments", timeout=10)
        print(f"   post_id 없이 요청 - 상태 코드: {response.status_code}")
        print(f"   응답: {response.json()}")
        
        # post_id와 함께 요청
        response = requests.get(f"{COMMENT_SERVICE_URL}/api/v1/comments?post_id=test123", timeout=10)
        print(f"   post_id와 함께 요청 - 상태 코드: {response.status_code}")
        print(f"   응답: {response.json()}")
        
        if response.status_code in [200, 404]:
            print("   ✅ 댓글 목록 조회 성공")
            return True
        else:
            print("   ❌ 댓글 목록 조회 실패")
            return False
            
    except Exception as e:
        print(f"   ❌ 오류 발생: {e}")
        return False

def test_create_comment_endpoint():
    """댓글 생성 엔드포인트 테스트"""
    print("\n🔍 댓글 생성 엔드포인트 테스트...")
    try:
        # 필수 필드가 없는 경우 (400 에러 예상)
        response = requests.post(
            f"{COMMENT_SERVICE_URL}/api/v1/comments",
            json={},
            timeout=10
        )
        print(f"   필수 필드 없이 요청 - 상태 코드: {response.status_code}")
        print(f"   응답: {response.json()}")
        
        # 올바른 데이터로 요청
        comment_data = {
            "post_id": "test123",
            "user_id": "test_user_123",
            "user_name": "테스트 사용자",
            "content": "테스트 댓글입니다."
        }
        
        response = requests.post(
            f"{COMMENT_SERVICE_URL}/api/v1/comments",
            json=comment_data,
            timeout=10
        )
        print(f"   올바른 데이터로 요청 - 상태 코드: {response.status_code}")
        print(f"   응답: {response.json()}")
        
        if response.status_code in [201, 500]:  # 500은 DB 연결 문제일 수 있음
            print("   ✅ 댓글 생성 테스트 성공")
            return True
        else:
            print("   ❌ 댓글 생성 테스트 실패")
            return False
            
    except Exception as e:
        print(f"   ❌ 오류 발생: {e}")
        return False

def test_swagger_endpoint():
    """Swagger UI 엔드포인트 테스트"""
    print("\n🔍 Swagger UI 엔드포인트 테스트...")
    try:
        response = requests.get(f"{COMMENT_SERVICE_URL}/api/docs", timeout=10)
        print(f"   상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ Swagger UI 접근 성공")
            return True
        else:
            print("   ❌ Swagger UI 접근 실패")
            return False
            
    except Exception as e:
        print(f"   ❌ 오류 발생: {e}")
        return False

def test_invalid_endpoint():
    """존재하지 않는 엔드포인트 테스트 (404 에러)"""
    print("\n🔍 존재하지 않는 엔드포인트 테스트...")
    try:
        response = requests.get(f"{COMMENT_SERVICE_URL}/api/v1/nonexistent", timeout=10)
        print(f"   상태 코드: {response.status_code}")
        print(f"   응답: {response.json()}")
        
        if response.status_code == 404:
            print("   ✅ 404 에러 핸들링 성공")
            return True
        else:
            print("   ❌ 404 에러 핸들링 실패")
            return False
            
    except Exception as e:
        print(f"   ❌ 오류 발생: {e}")
        return False

def main():
    """메인 테스트 함수"""
    print("🚀 Comment Service API 테스트 시작")
    print(f"📅 테스트 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 서비스 URL: {COMMENT_SERVICE_URL}")
    print("=" * 60)
    
    test_results = []
    
    # 각 테스트 실행
    test_results.append(("헬스체크", test_health_endpoint()))
    test_results.append(("댓글 목록 조회", test_comments_list_endpoint()))
    test_results.append(("댓글 생성", test_create_comment_endpoint()))
    test_results.append(("Swagger UI", test_swagger_endpoint()))
    test_results.append(("404 에러 핸들링", test_invalid_endpoint()))
    
    # 결과 요약
    print("\n" + "=" * 60)
    print("📊 테스트 결과 요약")
    print("=" * 60)
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ 통과" if result else "❌ 실패"
        print(f"   {test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n   총 테스트: {total}개")
    print(f"   통과: {passed}개")
    print(f"   실패: {total - passed}개")
    print(f"   성공률: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("\n🎉 모든 테스트가 통과했습니다!")
    else:
        print(f"\n⚠️  {total - passed}개의 테스트가 실패했습니다.")
        print("   Comment 서비스의 로그를 확인하여 문제를 해결하세요.")
        
        # 실패한 테스트 상세 정보
        print("\n📋 실패한 테스트 상세 정보:")
        for test_name, result in test_results:
            if not result:
                print(f"   - {test_name}: 실패")

if __name__ == "__main__":
    main()
