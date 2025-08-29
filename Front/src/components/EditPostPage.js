import React, { Component } from 'react';
import { ArrowLeft, Save, X } from 'lucide-react';
import CommonLayout from './CommonLayout';

// useParams를 클래스 컴포넌트에서 사용하기 위한 래퍼
function withParams(Component) {
  return function WrappedComponent(props) {
    const { useParams } = require('react-router-dom');
    const params = useParams();
    return <Component {...props} params={params} />;
  };
}

class EditPostPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      title: "",
      content: "",
      category: "전체",
      isLoading: false,
      error: null,
      isInitialized: false
    };
    this.categories = ["전체", "동물/반려동물", "여행", "건강/헬스", "연예인"];
  }

  componentDidMount() {
    this.fetchPostData();
  }

  // 기존 게시글 데이터 가져오기
  fetchPostData = async () => {
    try {
      const postId = this.props.params.postId;
      const response = await fetch(`http://localhost:8081/api/v1/posts/${postId}`);
      
      if (!response.ok) {
        throw new Error('게시글을 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      const post = data.data || data.post;
      
      // 본인 확인
      if (!this.props.isLoggedIn || !this.props.currentUser) {
        throw new Error('로그인이 필요합니다.');
      }

             const isOwner = (
         (post.username === this.props.currentUser.username) || 
         (post.username === this.props.currentUser.email)
       );

      if (!isOwner) {
        throw new Error('본인이 작성한 게시글만 수정할 수 있습니다.');
      }

      // 기존 데이터로 폼 초기화
      this.setState({
        title: post.title || "",
        content: post.content || "",
        category: post.category || "전체",
        isInitialized: true
      });
    } catch (error) {
      console.error('게시글 데이터 로드 오류:', error);
      this.setState({ 
        error: error.message, 
        isLoading: false 
      });
    }
  };

  handleInputChange = (field, value) => {
    this.setState({ [field]: value });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    
    // 입력 내용 검증
    if (!this.state.title.trim()) {
      alert("게시글 제목을 입력해주세요.");
      return;
    }

    if (!this.state.content.trim()) {
      alert("게시글 내용을 입력해주세요.");
      return;
    }

    if (this.state.content.trim().length < 5) {
      alert("게시글은 최소 5자 이상 입력해주세요.");
      return;
    }

    this.setState({ isLoading: true, error: null });
    
    try {
      const postId = this.props.params.postId;
      const requestBody = {
        title: this.state.title.trim(),
        content: this.state.content.trim(),
        // 카테고리는 수정 불가능하므로 제거
        username: this.props.currentUser.username || this.props.currentUser.email
      };

      const response = await fetch(`http://localhost:8081/api/v1/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '게시글 수정에 실패했습니다.');
      }

      const result = await response.json();
      if (result.success) {
        alert("게시글이 성공적으로 수정되었습니다!");
        this.props.navigate(`/post/${postId}`);
      } else {
        throw new Error(result.message || '게시글 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('게시글 수정 오류:', error);
      this.setState({ error: error.message });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  handleCancel = () => {
    if (this.state.title.trim() || this.state.content.trim()) {
      if (window.confirm('수정 중인 내용이 있습니다. 정말로 취소하시겠습니까?')) {
        const postId = this.props.params.postId;
        this.props.navigate(`/post/${postId}`);
      }
    } else {
      const postId = this.props.params.postId;
      this.props.navigate(`/post/${postId}`);
    }
  };

  render() {
    const { isLoggedIn, currentUser } = this.props;
    const { title, content, category, isLoading, error, isInitialized } = this.state;

    if (!isLoggedIn) {
      return (
        <CommonLayout
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
          navigate={this.props.navigate}
        >
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: 'var(--muted-foreground)'
          }}>
            <h2 style={{ 
              fontSize: '24px', 
              marginBottom: '16px',
              color: 'var(--foreground)'
            }}>
              로그인이 필요합니다
            </h2>
            <p style={{ 
              fontSize: '16px', 
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              게시글을 수정하려면 먼저 로그인해주세요.
            </p>
            <button
              onClick={() => this.props.navigate('/login')}
              style={{
                padding: '12px 24px',
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '1';
              }}
            >
              로그인하기
            </button>
          </div>
        </CommonLayout>
      );
    }

    if (!isInitialized) {
      return (
        <CommonLayout
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
          navigate={this.props.navigate}
        >
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: 'var(--muted-foreground)'
          }}>
            <div>로딩 중...</div>
          </div>
        </CommonLayout>
      );
    }

    return (
      <CommonLayout
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        navigate={this.props.navigate}
      >
        <div className="edit-post-container">
          {/* 뒤로가기 버튼 */}
          <div className="back-button-container">
            <button
              onClick={this.handleCancel}
              className="back-button"
            >
              <ArrowLeft size={20} />
              뒤로가기
            </button>
          </div>

          <div className="edit-post-header">
            <h1 className="edit-post-title">게시글 수정</h1>
            <div className="edit-post-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={this.handleCancel}
                disabled={isLoading}
              >
                <X size={16} />
                취소
              </button>
              <button
                type="submit"
                className="save-btn"
                onClick={this.handleSubmit}
                disabled={isLoading}
              >
                <Save size={16} />
                {isLoading ? '수정 중...' : '수정 완료'}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <p>오류: {error}</p>
            </div>
          )}

          <form className="edit-post-form" onSubmit={this.handleSubmit}>
            <div className="form-group">
              <label htmlFor="title" className="form-label">제목</label>
              <input
                type="text"
                id="title"
                className="form-input"
                value={title}
                onChange={(e) => this.handleInputChange('title', e.target.value)}
                placeholder="게시글 제목을 입력하세요"
                maxLength={100}
                required
              />
              <span className="char-count">{title.length}/100</span>
            </div>

            <div className="form-group">
              <label htmlFor="category" className="form-label">카테고리</label>
              <div className="category-display">
                <span className="category-value">{category}</span>
                <span className="category-note">(수정 불가)</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="content" className="form-label">내용</label>
              <textarea
                id="content"
                className="form-textarea"
                value={content}
                onChange={(e) => this.handleInputChange('content', e.target.value)}
                placeholder="게시글 내용을 입력하세요 (최소 5자)"
                rows={15}
                minLength={5}
                required
              />
              <span className="char-count">{content.length}자</span>
            </div>
          </form>
        </div>

        <style jsx>{`
          .edit-post-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
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

          .edit-post-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e2e8f0;
          }

          .edit-post-title {
            font-size: 28px;
            font-weight: 700;
            color: #1e293b;
            margin: 0;
          }

          .edit-post-actions {
            display: flex;
            gap: 12px;
          }

          .cancel-btn, .save-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }

          .cancel-btn {
            background: #f1f5f9;
            color: #64748b;
            border: 1px solid #e2e8f0;
          }

          .cancel-btn:hover {
            background: #e2e8f0;
            border-color: #cbd5e1;
          }

          .save-btn {
            background: var(--primary);
            color: var(--primary-foreground);
          }

          .save-btn:hover {
            opacity: 0.9;
          }

          .save-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .error-message {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #dc2626;
            padding: 12px 16px;
            border-radius: 6px;
            margin-bottom: 24px;
          }

          .form-group {
            margin-bottom: 24px;
          }

          .form-label {
            display: block;
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
            font-size: 14px;
          }

          .form-input, .form-select, .form-textarea {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.2s;
          }

          .form-input:focus, .form-select:focus, .form-textarea:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .form-textarea {
            resize: vertical;
            min-height: 200px;
          }

          .char-count {
            display: block;
            text-align: right;
            color: #6b7280;
            font-size: 12px;
            margin-top: 4px;
          }

          .category-display {
            padding: 12px 16px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            background-color: #f9fafb;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .category-value {
            font-size: 14px;
            color: #374151;
            font-weight: 500;
          }

          .category-note {
            font-size: 12px;
            color: #6b7280;
            font-style: italic;
          }
        `}</style>
      </CommonLayout>
    );
  }
}

export default withParams(EditPostPage);
