class CommentService {
  constructor() {
    this.baseURL = process.env.REACT_APP_COMMENT_SERVICE_URL || 'http://localhost:8083';
  }

  // 인증 헤더 생성
  getAuthHeaders() {
    try {
      const { createAuthHeaders, getCognitoToken } = require('../utils/tokenUtils');
      const token = getCognitoToken();
      if (!token) throw new Error('인증 토큰이 필요합니다.');
      const headers = createAuthHeaders();
      if (!headers.Authorization) throw new Error('인증 토큰이 필요합니다.');
      return headers;
    } catch (error) {
      const savedTokens = localStorage.getItem('cognitoTokens');
      let accessToken = null;
      if (savedTokens) {
        try {
          const tokens = JSON.parse(savedTokens);
          accessToken = tokens.accessToken || tokens.idToken || tokens.access_token || tokens.id_token;
        } catch (_) {}
      }
      if (!accessToken) throw new Error('인증 토큰이 필요합니다.');
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
    }
  }

  // 댓글 작성
  async createComment(postId, commentData) {
    try {
      const headers = this.getAuthHeaders();
      const requestBody = JSON.stringify(commentData);
      const url = `${this.baseURL}/api/v1/posts/${postId}/comments`;
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: requestBody
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`댓글 작성 실패: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
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
