class CommentService {
  constructor() {
    this.baseURL = process.env.REACT_APP_COMMENT_SERVICE_URL || 'http://localhost:8083';
  }

  // 인증 헤더 생성
  getAuthHeaders() {
    // 디버깅을 위한 로그 추가
    console.log('=== CommentService getAuthHeaders 디버깅 ===');
    
    try {
      // 공통 토큰 유틸리티 사용
      const { createAuthHeaders, debugTokenStatus, getCognitoToken } = require('../utils/tokenUtils');
      
      // 토큰 상태 디버깅
      debugTokenStatus();
      
      // 토큰 직접 확인
      const token = getCognitoToken();
      if (!token) {
        console.error('토큰이 없습니다. 로그인이 필요합니다.');
        throw new Error('토큰이 없습니다. 로그인이 필요합니다.');
      }
      
      const headers = createAuthHeaders();
      
      console.log('생성된 헤더:', headers);
      console.log('토큰 존재 여부:', !!headers.Authorization);
      console.log('토큰 값:', headers.Authorization ? headers.Authorization.substring(0, 50) + '...' : '없음');
      
      return headers;
    } catch (error) {
      console.error('토큰 유틸리티 로드 실패:', error);
      
      // 폴백: 직접 토큰 가져오기
      const savedTokens = localStorage.getItem('cognitoTokens');
      console.log('직접 가져온 토큰:', savedTokens);
      
      let accessToken = null;
      if (savedTokens) {
        try {
          const tokens = JSON.parse(savedTokens);
          accessToken = tokens.accessToken || tokens.idToken || tokens.access_token || tokens.id_token;
          console.log('파싱된 토큰:', accessToken);
        } catch (parseError) {
          console.error('토큰 파싱 실패:', parseError);
        }
      }
      
      if (!accessToken) {
        console.error('액세스 토큰을 찾을 수 없습니다.');
        throw new Error('액세스 토큰을 찾을 수 없습니다. 로그인이 필요합니다.');
      }
      
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
    }
  }

  // 댓글 작성
  async createComment(postId, commentData) {
    console.log('=== CommentService createComment 디버깅 ===');
    console.log('postId:', postId);
    console.log('commentData:', commentData);
    console.log('baseURL:', this.baseURL);
    
    try {
      const headers = this.getAuthHeaders();
      console.log('요청 헤더:', headers);
      
      const requestBody = JSON.stringify(commentData);
      console.log('요청 바디:', requestBody);
      
      const url = `${this.baseURL}/api/v1/posts/${postId}/comments`;
      console.log('요청 URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: requestBody
      });

      console.log('응답 상태:', response.status);
      console.log('응답 헤더:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('응답 에러 내용:', errorText);
        throw new Error(`댓글 작성 실패: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('응답 결과:', result);
      return result;
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      console.error('에러 스택:', error.stack);
      throw error;
    }
  }

  // 댓글 목록 조회
  async getComments(postId, params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.size) queryParams.append('size', params.size);
      if (params.sortBy) queryParams.append('sort_by', params.sortBy);
      if (params.sortOrder) queryParams.append('sort_order', params.sortOrder);

      const url = `${this.baseURL}/api/v1/posts/${postId}/comments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`댓글 목록 조회 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('댓글 목록 조회 오류:', error);
      throw error;
    }
  }

  // 댓글 수정
  async updateComment(commentId, commentData) {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/comments/${commentId}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(commentData)
      });

      if (!response.ok) {
        throw new Error(`댓글 수정 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('댓글 수정 오류:', error);
      throw error;
    }
  }

  // 댓글 삭제
  async deleteComment(commentId) {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/comments/${commentId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`댓글 삭제 실패: ${response.status}`);
      }

      return response.ok;
    } catch (error) {
      console.error('댓글 삭제 오류:', error);
      throw error;
    }
  }

  // 내가 작성한 댓글 조회
  async getMyComments(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.size) queryParams.append('size', params.size);

      const url = `${this.baseURL}/api/v1/comments/my${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`내 댓글 조회 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('내 댓글 조회 오류:', error);
      throw error;
    }
  }

  // 댓글 좋아요
  async likeComment(commentId) {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/comments/${commentId}/like`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`댓글 좋아요 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('댓글 좋아요 오류:', error);
      throw error;
    }
  }

  // 댓글 좋아요 취소 (토글 방식으로 변경)
  async unlikeComment(commentId) {
    try {
      // 백엔드가 토글 방식이므로 likeComment와 동일하게 처리
      const response = await fetch(`${this.baseURL}/api/v1/comments/${commentId}/like`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`댓글 좋아요 취소 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('댓글 좋아요 취소 오류:', error);
      throw error;
    }
  }

  // 댓글 좋아요 상태 확인 (새로 추가)
  async getCommentLikeStatus(commentId) {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/comments/${commentId}/like/status`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`댓글 좋아요 상태 확인 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('댓글 좋아요 상태 확인 오류:', error);
      throw error;
    }
  }

  // 댓글 신고 (백엔드에 구현되지 않음 - 제거)
  // async reportComment(commentId, reportData) { ... }
}

export default new CommentService();
