import React, { Component } from 'react';
import { ArrowLeft, Heart, User } from 'lucide-react';
import CommonLayout from './CommonLayout';
import CommentService from '../services/CommentService';
import '../styles/PostDetailPage.css';

// useParams를 클래스 컴포넌트에서 사용하기 위한 래퍼
function withParams(Component) {
  return function WrappedComponent(props) {
    const { useParams } = require('react-router-dom');
    const params = useParams();
    return <Component {...props} params={params} />;
  };
}

class PostDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      post: null,
      isLoading: true,
      error: null,
      activeCategory: "ALL",
      isLiked: false, // 좋아요 상태
      comments: [], // 댓글 목록을 저장할 상태
      newComment: "", // 새 댓글 내용을 저장할 상태
      commentLikeStatus: {}, // 댓글별 좋아요 여부
      editingCommentId: null, // 현재 수정 중인 댓글 ID
      editingContent: "" // 수정 중인 내용
    };
    this.categories = ["ALL", "동물/반려동물", "여행", "건강/헬스", "연예인"];
  }

  componentDidMount() {
    this.fetchPostDetail();
    this.fetchComments(); // 컴포넌트 마운트 시 댓글 로드
  }

  componentDidUpdate(prevProps, prevState) {
    // 게시글이 로드되면 좋아요 상태 확인
    if (this.state.post && !prevState.post && this.props.isLoggedIn && this.props.currentUser?.sub) {
      this.checkLikeStatus();
    }
  }

  // 좋아요 상태 확인
  checkLikeStatus = async () => {
    if (!this.state.post || !this.props.isLoggedIn || !this.props.currentUser?.sub) return;
    
    try {
      const response = await fetch(`http://localhost:8081/api/v1/posts/${this.state.post.id}/like/status?user_id=${this.props.currentUser.sub}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          this.setState({ isLiked: result.data.is_liked });
        }
      }
    } catch (error) {
      console.error('좋아요 상태 확인 오류:', error);
    }
  };

  // 좋아요 토글
  handleLikeToggle = async () => {
    if (!this.props.isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!this.state.post) return;

    if (!this.props.currentUser?.sub) {
      alert('사용자 정보를 가져올 수 없습니다. 다시 로그인해주세요.');
      return;
    }

    try {
      const requestBody = {
        user_id: this.props.currentUser.sub
      };
      
      const response = await fetch(`http://localhost:8081/api/v1/posts/${this.state.post.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('좋아요 처리에 실패했습니다.');
      }

      const result = await response.json();
      
      if (result.success) {
        // 좋아요 상태와 수 업데이트
        this.setState({ 
          isLiked: result.data.is_liked,
          post: {
            ...this.state.post,
            like_count: result.data.like_count
          }
        });
      }
    } catch (error) {
      // notify user
      alert('좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  fetchPostDetail = async () => {
    try {
      const postId = this.props.params.postId;
      const response = await fetch(`http://localhost:8081/api/v1/posts/${postId}`);
      
      if (!response.ok) {
        throw new Error('게시글을 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      this.setState({ 
        post: data.post || data.data, 
        isLoading: false 
      });
         } catch (error) {
       this.setState({ 
         error: error.message, 
         isLoading: false 
       });
     }
  };

    // 댓글 목록을 가져오는 함수
  fetchComments = async () => {
    try {
      const postId = this.props.params.postId;
      
      // CommentService를 사용하여 댓글 목록 조회
      const result = await CommentService.getComments(postId);
      
      if (result.success) {
        // 백엔드 응답 구조와 일치: data.comments에 댓글 배열이 저장됨
        const comments = result.data.comments || [];
        this.setState({ comments });
        // 댓글별 좋아요 상태 초기화
        this.initCommentLikeStatus(comments);
      } else {
        this.setState({ comments: [] });
      }
    } catch (error) {
      console.warn('댓글 목록 조회 실패 (로그인 상태 유지):', error.message);
      // 에러 발생 시에도 로그인 상태는 유지하고 댓글만 빈 배열로 설정
      this.setState({ comments: [] });
      
      // 인증 관련 에러인 경우에만 사용자에게 알림
      if (error.message.includes('인증') || error.message.includes('토큰')) {
        console.warn('인증 관련 에러로 댓글을 불러올 수 없습니다. 로그인 상태는 유지됩니다.');
      }
    }
  };

  // 댓글별 좋아요 상태 불러오기
  initCommentLikeStatus = async (comments) => {
    try {
      const likeStatusEntries = await Promise.all(
        (comments || []).map(async (c) => {
          try {
            const res = await CommentService.getCommentLikeStatus(c.id);
            if (res && res.success) {
              return [c.id, !!res.data.is_liked];
            }
          } catch (error) {
            console.warn(`댓글 ${c.id}의 좋아요 상태 확인 실패:`, error.message);
            // 개별 댓글의 좋아요 상태 확인 실패는 전체 프로세스를 중단시키지 않음
          }
          return [c.id, false];
        })
      );
      const statusMap = Object.fromEntries(likeStatusEntries);
      this.setState({ commentLikeStatus: statusMap });
    } catch (error) {
      console.warn('댓글 좋아요 상태 초기화 실패 (로그인 상태 유지):', error.message);
      // 에러 발생 시에도 기본 상태로 설정하여 UI가 깨지지 않도록 함
      const defaultStatus = Object.fromEntries(
        (comments || []).map(c => [c.id, false])
      );
      this.setState({ commentLikeStatus: defaultStatus });
    }
  };

  // 새 댓글 입력 핸들러
  handleCommentChange = (e) => {
    this.setState({ newComment: e.target.value });
  };



  // 댓글 제출 핸들러
  handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!this.props.isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }

    const { newComment, post } = this.state;
    const { currentUser } = this.props;
    
    if (!newComment.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }

    try {
      // CommentService를 사용하여 댓글 작성
      const commentData = {
        content: newComment
      };

      // CommentService.createComment 호출
      const result = await CommentService.createComment(post.id, commentData);
      
             if (result.success) {
         // 댓글 작성 성공 시 목록 다시 불러오기 및 입력창 초기화
         this.setState({ newComment: "" });
         this.fetchComments();
       } else {
        throw new Error(result.message || '댓글 작성에 실패했습니다.');
      }
         } catch (error) {
       alert(error.message || '댓글 작성 중 오류가 발생했습니다.');
     }
  };

  // 댓글 좋아요 토글
  handleCommentLikeToggle = async (commentId) => {
    if (!this.props.isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }
    try {
      const res = await CommentService.likeComment(commentId);
      if (res && res.success) {
        // 상태 토글 및 목록 새로고침(개수 반영)
        this.setState((prev) => ({
          commentLikeStatus: {
            ...prev.commentLikeStatus,
            [commentId]: !!res.data?.liked
          }
        }));
        await this.fetchComments();
      } else {
        throw new Error('댓글 좋아요 처리 실패');
      }
         } catch (e) {
       alert('댓글 좋아요 처리 중 오류가 발생했습니다.');
     }
  };

  // 댓글 수정 시작
  handleStartEdit = (comment) => {
    this.setState({ editingCommentId: comment.id, editingContent: comment.content || '' });
  };

  // 댓글 수정 내용 변경
  handleEditChange = (e) => {
    this.setState({ editingContent: e.target.value });
  };

  // 댓글 수정 취소
  handleEditCancel = () => {
    this.setState({ editingCommentId: null, editingContent: '' });
  };

  // 댓글 저장
  handleEditSave = async (commentId) => {
    if (!this.props.isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }
    const { editingContent } = this.state;
    if (!editingContent.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }
    try {
      const res = await CommentService.updateComment(commentId, { content: editingContent.trim() });
      if (res && res.success) {
        this.setState({ editingCommentId: null, editingContent: '' });
        await this.fetchComments();
      } else {
        throw new Error('댓글 수정 실패');
      }
         } catch (e) {
       alert('댓글 수정 중 오류가 발생했습니다.');
     }
  };

  // 현재 사용자 sub 추출
  getCurrentUserSub = () => {
    // JWT 토큰에서 실제 sub 값 추출 (더 안전한 방법)
    try {
      if (this.props.currentUser?.access_token) {
        const token = this.props.currentUser.access_token;
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        

        return payload.sub || this.props.currentUser?.sub || null;
      }
    } catch (error) {
      console.warn('JWT 토큰 파싱 실패:', error);
    }
    
    // 폴백: 기존 방식
    return this.props.currentUser?.sub || null;
  };

  // 댓글 소유자 여부
  isOwner = (comment) => {
    const currentUserSub = this.getCurrentUserSub();
    return currentUserSub && comment.user_id && currentUserSub === comment.user_id;
  };

  // 댓글 삭제
  handleDelete = async (commentId) => {
    if (!this.props.isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (!window.confirm('이 댓글을 삭제하시겠습니까?')) return;
    try {
      const ok = await CommentService.deleteComment(commentId);
      if (ok) {
        await this.fetchComments();
      } else {
        throw new Error('댓글 삭제 실패');
      }
         } catch (e) {
       alert('댓글 삭제 중 오류가 발생했습니다.');
     }
  };

  render() {
    const { post, isLoading, error, isLiked, comments, newComment } = this.state;
    const { isLoggedIn } = this.props;

    if (isLoading) {
      return (
        <CommonLayout
          isLoggedIn={isLoggedIn}
          currentUser={this.props.currentUser}
          navigate={this.props.navigate}
        >
          <div className="loading">로딩 중...</div>
        </CommonLayout>
      );
    }

    if (error) {
      return (
        <CommonLayout
          isLoggedIn={isLoggedIn}
          currentUser={this.props.currentUser}
          navigate={this.props.navigate}
        >
          <div className="error">오류: {error}</div>
        </CommonLayout>
      );
    }

    if (!post) {
      return (
        <CommonLayout
          isLoggedIn={isLoggedIn}
          currentUser={this.props.currentUser}
          navigate={this.props.navigate}
        >
          <div className="error">게시글을 찾을 수 없습니다.</div>
        </CommonLayout>
      );
    }

    return (
      <CommonLayout
        isLoggedIn={isLoggedIn}
        currentUser={this.props.currentUser}
        navigate={this.props.navigate}
        activeCategory={post.category || 'ALL'}
        onCategoryChange={(category) => {
          this.props.navigate(`/?category=${encodeURIComponent(category)}`);
        }}
      >
        {/* 뒤로가기 버튼 */}
        <div className="back-button-container">
          <button
            onClick={() => this.props.navigate('/')}
            className="back-button"
          >
            <ArrowLeft size={20} />
            목록으로 돌아가기
          </button>
        </div>

        {/* 게시글 상세 내용 */}
        <article className="post-detail-card">
          {/* 맨 위: 카테고리 */}
          <div className="post-category-header">
            <span className="category-tag">{post.category || '미분류'}</span>
          </div>

          {/* 제목과 작성시간 */}
          <div className="post-title-section">
            <h1 className="post-title">{post.title}</h1>
            <div className="post-creation-time">
              {new Date(post.created_at).toLocaleString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>

          {/* 닉네임과 통계 정보 */}
          <div className="post-meta-section">
            <div className="post-author">
              {post.author || 'Anonymous'}
            </div>
            <div className="post-stats">
              <span className="stat-item">조회수 {post.view_count || 0}</span>
              <span className="stat-item">좋아요 {post.like_count || 0}</span>
              <span className="stat-item">댓글 {post.comment_count || 0}</span>
            </div>
          </div>

          {/* 게시글 내용 */}
          <div className="post-content">
            {post.content}
          </div>

          {/* 하단: 좋아요 버튼과 좋아요 수 */}
          <div className="post-actions">
            <button 
              className={`like-button ${isLiked ? 'liked' : ''}`}
              onClick={this.handleLikeToggle}
            >
              <Heart size={20} />
              {isLiked ? '좋아요 취소' : '좋아요'}
            </button>
            <span className="like-count">좋아요 {post.like_count || 0}</span>
          </div>
        </article>

        {/* ✅ 통합: 댓글 섹션 추가 */}
        <div className="comments-section">
          <h2>댓글 ({comments.length})</h2>
          
          {/* 댓글 입력 폼 */}
          {isLoggedIn && (
            <form className="comment-form" onSubmit={this.handleCommentSubmit}>
              <textarea
                className="comment-input"
                value={newComment}
                onChange={this.handleCommentChange}
                placeholder="댓글을 입력하세요..."
                rows="3"
              />
              <button type="submit" className="comment-submit-btn">작성</button>
            </form>
          )}
          
          {/* 댓글 목록 */}
          <div className="comments-list">
            {comments.length > 0 ? (
              comments.map((comment, index) => (
                <div key={index} className="comment-item">
                  <div className="comment-meta">
                    <span className="comment-author">
                      <User size={14} style={{ marginRight: '4px' }} />
                      {comment.user_name || comment.author || 'Anonymous'}
                    </span>
                    <span className="comment-date">
                      {new Date(comment.created_at).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {this.state.editingCommentId === comment.id ? (
                    <div className="comment-editing">
                      <textarea
                        className="comment-edit-input"
                        rows="3"
                        value={this.state.editingContent}
                        onChange={this.handleEditChange}
                      />
                      <div className="comment-actions">
                        <button type="button" className="comment-btn primary" onClick={() => this.handleEditSave(comment.id)}>저장</button>
                        <button type="button" className="comment-btn" onClick={this.handleEditCancel}>취소</button>
                      </div>
                    </div>
                  ) : (
                    <div className="comment-content">
                      {comment.content}
                    </div>
                  )}

                  <div className="comment-footer">
                    <div className="comment-like">
                      <button
                        type="button"
                        className={`comment-like-btn ${this.state.commentLikeStatus[comment.id] ? 'liked' : ''}`}
                        onClick={() => this.handleCommentLikeToggle(comment.id)}
                        disabled={!isLoggedIn}
                        title={!isLoggedIn ? '로그인이 필요합니다' : ''}
                      >
                        <Heart size={16} /> {this.state.commentLikeStatus[comment.id] ? '좋아요 취소' : '좋아요'}
                      </button>
                      <span className="comment-like-count">좋아요 {comment.like_count || 0}</span>
                    </div>
                    
                                         {isLoggedIn && this.isOwner(comment) && this.state.editingCommentId !== comment.id && (
                       <div className="comment-owner-actions">
                         <button type="button" className="comment-btn" onClick={() => this.handleStartEdit(comment)}>수정</button>
                         <button type="button" className="comment-btn" onClick={() => this.handleDelete(comment.id)}>삭제</button>
                       </div>
                     )}
                  </div>
                </div>
              ))
            ) : (
              <p className="no-comments">아직 댓글이 없습니다.</p>
            )}
          </div>
        </div>

        <style jsx>{`
          .post-detail-card {
            background: #f8f9fa;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 24px;
            margin-top: 20px;
            border: 1px solid #e9ecef;
          }

          .post-category-header {
            margin-bottom: 16px;
            padding-bottom: 16px;
            border-bottom: 1px solid #dee2e6;
          }

          .category-tag {
            background: var(--primary);
            color: var(--primary-foreground);
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }

          .post-title-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
            padding-bottom: 16px;
            border-bottom: 1px solid #dee2e6;
          }

          .post-title {
            font-size: 24px;
            font-weight: 700;
            color: #1e293b;
            margin: 0;
            flex: 1;
            margin-right: 16px;
          }

          .post-creation-time {
            color: #64748b;
            font-size: 14px;
            white-space: nowrap;
          }

          .post-meta-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid #dee2e6;
          }

          .post-author {
            color: #475569;
            font-weight: 500;
          }

          .post-stats {
            display: flex;
            gap: 20px;
          }

          .stat-item {
            color: #64748b;
            font-size: 14px;
          }

          .post-content {
            font-size: 16px;
            line-height: 1.7;
            color: #334155;
            margin-bottom: 24px;
            white-space: pre-wrap;
            word-break: break-word;
            padding-bottom: 16px;
            border-bottom: 1px solid #dee2e6;
          }

          .post-actions {
            display: flex;
            align-items: center;
            gap: 16px;
            padding-top: 16px;
          }

          .like-button {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            color: #64748b;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 14px;
            font-weight: 500;
          }

          .like-button:hover {
            background: #e2e8f0;
            border-color: #cbd5e1;
          }

          .like-button.liked {
            background: #fecaca;
            border-color: #fca5a5;
            color: #dc2626;
          }

          .like-count {
            color: #64748b;
            font-size: 14px;
            font-weight: 500;
          }

          .back-button-container {
            margin-bottom: 20px;
          }

          .back-button {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            background: none;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            color: #64748b;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 14px;
          }

          .back-button:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
            color: #475569;
          }

          /* ✅ 통합: 댓글 섹션 스타일 추가 */
          .comments-section {
            background: #f8f9fa;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 24px;
            margin-top: 20px;
            border: 1px solid #e9ecef;
          }

          .comments-section h2 {
            margin: 0 0 20px 0;
            color: #1e293b;
            font-size: 20px;
            font-weight: 600;
          }

          .comment-form {
            margin-bottom: 24px;
            padding-bottom: 20px;
            border-bottom: 1px solid #dee2e6;
          }

          .comment-input {
            width: 100%;
            padding: 12px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 14px;
            line-height: 1.5;
            resize: vertical;
            margin-bottom: 12px;
            font-family: inherit;
          }

          .comment-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .comment-submit-btn {
            padding: 8px 16px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
          }

          .comment-submit-btn:hover {
            background: #2563eb;
          }

          .comments-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .comment-item {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 16px;
          }

          .comment-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }

          .comment-author {
            display: flex;
            align-items: center;
            color: #475569;
            font-weight: 500;
            font-size: 14px;
          }

          .comment-date {
            color: #64748b;
            font-size: 12px;
          }

          .comment-content {
            color: #334155;
            font-size: 14px;
            line-height: 1.5;
            white-space: pre-wrap;
            word-break: break-word;
          }

          .comment-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 10px;
          }

          .comment-like {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .comment-like-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            color: #64748b;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 13px;
          }

          .comment-like-btn:hover { background: #e2e8f0; }
          .comment-like-btn.liked { background: #fecaca; border-color: #fca5a5; color: #dc2626; }

          .comment-like-count { color: #64748b; font-size: 13px; }

          .comment-owner-actions { display: flex; gap: 8px; }

          .comment-btn {
            padding: 6px 12px;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            color: #475569;
            cursor: pointer;
            font-size: 13px;
          }

          .comment-btn.primary { background: #3b82f6; color: white; border-color: #2563eb; }
          .comment-btn + .comment-btn { margin-left: 6px; }

          .comment-editing { margin-top: 8px; }
          .comment-edit-input {
            width: 100%;
            padding: 10px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 14px;
            resize: vertical;
          }

          .no-comments {
            text-align: center;
            color: #64748b;
            font-style: italic;
            padding: 20px;
          }

          .loading, .error {
            text-align: center;
            padding: 60px 20px;
            font-size: 16px;
            color: #64748b;
          }

          .error {
            color: #ef4444;
          }

          @media (max-width: 768px) {
            .post-title-section {
              flex-direction: column;
              gap: 12px;
            }

            .post-meta-section {
              flex-direction: column;
              gap: 16px;
              align-items: flex-start;
            }

            .post-stats {
              gap: 16px;
            }

            .comment-meta {
              flex-direction: column;
              align-items: flex-start;
              gap: 8px;
            }
          }
        `}</style>
      </CommonLayout>
    );
  }
}

export default withParams(PostDetails);
