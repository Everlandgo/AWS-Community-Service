import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Eye, User, Search } from 'lucide-react';
import CommonLayout from './CommonLayout';
import "../styles/PostDetailPage.css"

// useParams를 클래스 컴포넌트에서 사용하기 위한 래퍼
function withParams(Component) {
  return function WrappedComponent(props) {
    const { useParams } = require('react-router-dom');
    const params = useParams();
    return <Component {...props} params={params} />;
  };
}

class PostDetail extends Component {
  constructor(props) {
    super(props);
    this.state = {
      post: null,
      isLoading: true,
      error: null,
      activeCategory: "전체",
      isLiked: false, // 좋아요 상태
      comments: [], // 댓글 목록을 저장할 상태
      newComment: "" // 새 댓글 내용을 저장할 상태
    };
    this.categories = ["전체", "동물/반려동물", "여행", "건강/헬스", "연예인"];
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
    console.log('=== 좋아요 토글 디버깅 ===');
    console.log('isLoggedIn:', this.props.isLoggedIn);
    console.log('currentUser:', this.props.currentUser);
    console.log('currentUser.sub:', this.props.currentUser?.sub);
    console.log('post:', this.state.post);

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
      
      console.log('요청 데이터:', requestBody);
      
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
      console.error('좋아요 처리 오류:', error);
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
      console.error('게시글 상세 로드 오류:', error);
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
      const response = await fetch(`http://localhost:5000/api/v1/posts/${postId}/comments`);
      if (!response.ok) {
        throw new Error('댓글을 가져오는데 실패했습니다.');
      }
      const data = await response.json();
      this.setState({ comments: data.comments || data.data || [] });
    } catch (error) {
      console.error('댓글 로드 오류:', error);
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
      const requestBody = {
        user_id: currentUser.sub,
        content: newComment
      };

      const response = await fetch(`http://localhost:5000/api/v1/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('댓글 작성에 실패했습니다.');
      }

      // 댓글 작성 성공 시 목록 다시 불러오기 및 입력창 초기화
      this.setState({ newComment: "" });
      this.fetchComments();
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      alert('댓글 작성 중 오류가 발생했습니다.');
    }
  };

  render() {
    const { post, isLoading, error, isLiked, comments, newComment } = this.state;
    const { isLoggedIn, currentUser } = this.props;

    if (isLoading) {
      return (
        <CommonLayout
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
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
          currentUser={currentUser}
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
          currentUser={currentUser}
          navigate={this.props.navigate}
        >
          <div className="error">게시글을 찾을 수 없습니다.</div>
        </CommonLayout>
      );
    }

    return (
      <CommonLayout
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        navigate={this.props.navigate}
        activeCategory={post.category || '전체'}
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

        {/* 댓글 섹션 */}
        <div className="comments-section">
          <h2>댓글 ({comments.length})</h2>
          {/* 댓글 입력 폼 */}
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
          
          {/* 댓글 목록 */}
          <div className="comments-list">
            {comments.length > 0 ? (
              comments.map((comment, index) => (
                <div key={index} className="comment-item">
                  <div className="comment-meta">
                    <span className="comment-author">
                      <User size={14} style={{ marginRight: '4px' }} />
                      {comment.author || 'Anonymous'}
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
                  <div className="comment-content">
                    {comment.content}
                  </div>
                </div>
              ))
            ) : (
              <p className="no-comments">아직 댓글이 없습니다.</p>
            )}
          </div>
        </div>
      </CommonLayout>
    );
  }
}

export default withParams(PostDetail);
