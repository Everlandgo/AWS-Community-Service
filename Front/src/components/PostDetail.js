import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Eye, User, Search } from 'lucide-react';
import CommonLayout from './CommonLayout';

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
      isLiked: false // 좋아요 상태
    };
    this.categories = ["전체", "동물/반려동물", "여행", "건강/헬스", "연예인"];
  }

  componentDidMount() {
    this.fetchPostDetail();
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

  render() {
    const { post, isLoading, error, isLiked } = this.state;
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
              {isLiked ? '좋아요 취소' : '좋아요'}
            </button>
            <span className="like-count">좋아요 {post.like_count || 0}</span>
          </div>
        </article>

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
          }
        `}</style>
      </CommonLayout>
    );
  }
}

export default withParams(PostDetail);
