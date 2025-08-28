import React, { Component } from 'react';
import CommonLayout from './CommonLayout';

class MainBoardPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      posts: [],
      allPosts: [], // 원본 게시글 저장
      filteredPosts: [], // 필터링된 게시글
      isLoading: true,
      error: null,
      activeCategory: "전체",
      searchTerm: "",
      sortBy: "최신순"
    };
    this.categories = ["전체", "동물/반려동물", "여행", "건강/헬스", "연예인"];
  }

  componentDidMount() {
    this.loadPosts();
    // URL 파라미터에서 카테고리 확인
    this.checkUrlCategory();
  }

  // URL 파라미터에서 카테고리 확인
  checkUrlCategory = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryFromUrl = urlParams.get('category');
    
    if (categoryFromUrl && this.categories.includes(categoryFromUrl)) {
      console.log('URL에서 카테고리 감지:', categoryFromUrl);
      this.setState({ activeCategory: categoryFromUrl });
      // 게시글이 로드된 후에 필터링 적용
      setTimeout(() => {
        this.filterPostsByCategory(categoryFromUrl);
      }, 100);
    }
  };

  loadPosts = async () => {
    try {
      const response = await fetch('http://localhost:8081/api/v1/posts');
      if (!response.ok) {
        throw new Error('게시글을 가져오는데 실패했습니다.');
      }
      const data = await response.json();
      // posts 배열이 없으면 빈 배열로 설정
      const posts = data.posts || data.data || [];
      this.setState({ 
        posts: posts,
        allPosts: posts, // 원본 게시글 저장
        filteredPosts: posts, // 필터링된 게시글
        isLoading: false 
      });
    } catch (error) {
      console.error('게시글 로드 오류:', error);
      this.setState({ 
        posts: [], 
        allPosts: [],
        filteredPosts: [],
        error: error.message, 
        isLoading: false 
      });
    }
  };

  handleCategoryChange = (category) => {
    this.setState({ activeCategory: category });
    // 카테고리별 게시글 필터링
    this.filterPostsByCategory(category);
  };

  filterPostsByCategory = (category) => {
    if (category === "전체") {
      // 전체 카테고리일 때는 모든 게시글 표시
      this.setState({ filteredPosts: this.state.allPosts });
    } else {
      // 특정 카테고리일 때는 해당 카테고리 게시글만 표시
      const filtered = this.state.allPosts.filter(post => post.category === category);
      this.setState({ filteredPosts: filtered });
    }
  };

  handleSearchChange = (e) => {
    this.setState({ searchTerm: e.target.value });
    // 검색어에 따른 게시글 필터링
    this.filterPostsBySearch(e.target.value);
  };

  filterPostsBySearch = (searchTerm) => {
    const { allPosts, activeCategory } = this.state;
    let filtered = allPosts;

    // 카테고리 필터링
    if (activeCategory !== "전체") {
      filtered = filtered.filter(post => post.category === activeCategory);
    }

    // 검색어 필터링
    if (searchTerm.trim()) {
      filtered = filtered.filter(post => 
        post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.author?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    this.setState({ filteredPosts: filtered });
  };

  handleSortChange = (sortType) => {
    this.setState({ sortBy: sortType });
    // 정렬 적용
    this.sortPosts(sortType);
  };

  sortPosts = (sortType) => {
    const { filteredPosts } = this.state;
    let sorted = [...filteredPosts];

    if (sortType === "최신순") {
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortType === "인기순") {
      sorted.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
    }

    this.setState({ filteredPosts: sorted });
  };

  handleWritePost = () => {
    this.props.navigate('/write');
  };

  render() {
    const { filteredPosts, isLoading, error, activeCategory, searchTerm, sortBy } = this.state;
    const { isLoggedIn, currentUser } = this.props;

    if (isLoading) return <div className="loading">로딩 중...</div>;
    if (error) return <div className="error">오류: {error}</div>;

    // posts가 없으면 빈 배열로 설정
    const safePosts = filteredPosts || [];

    return (
      <CommonLayout
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        navigate={this.props.navigate}
        activeCategory={activeCategory}
        searchTerm={searchTerm}
        onCategoryChange={this.handleCategoryChange}
        onSearchChange={this.handleSearchChange}
        onWritePost={this.handleWritePost}
        onLogout={this.props.onLogout}
      >
        {/* 필터 및 정렬 섹션 */}
        <div className="filter-section">
          <div className="category-filters">
            {this.categories.slice(1).map((category) => (
              <button
                key={category}
                className={`category-filter-btn ${activeCategory === category ? 'active' : ''}`}
                onClick={() => this.handleCategoryChange(category)}
              >
                {category}
              </button>
            ))}
          </div>
          
          <div className="sort-buttons">
            <button
              className={`sort-btn ${sortBy === '최신순' ? 'active' : ''}`}
              onClick={() => this.handleSortChange('최신순')}
            >
              최신순
            </button>
            <button
              className={`sort-btn ${sortBy === '인기순' ? 'active' : ''}`}
              onClick={() => this.handleSortChange('인기순')}
            >
              인기순
            </button>
          </div>
        </div>

        {/* 게시글 테이블 */}
        <div className="posts-table">
          {/* 테이블 헤더 */}
          <div className="table-header">
            <div className="header-row">
              <div className="header-cell category-cell">카테고리</div>
              <div className="header-cell title-cell">제목</div>
              <div className="header-cell author-cell">글쓴이</div>
              <div className="header-cell date-cell">작성날짜</div>
              <div className="header-cell views-cell">조회수</div>
              <div className="header-cell likes-cell">좋아요</div>
            </div>
          </div>

          {/* 게시글 목록 */}
          <div className="table-body">
            {safePosts.length > 0 ? (
              safePosts.map((post) => (
                <div key={post.id} className="table-row">
                  <div className="table-cell category-cell">
                    <span className="category-tag">{post.category}</span>
                  </div>
                  <div className="table-cell title-cell">
                    <a href={`/post/${post.id}`} className="post-title-link">
                      {post.title}
                    </a>
                  </div>
                  <div className="table-cell author-cell">{post.author}</div>
                  <div className="table-cell date-cell">
                    {new Date(post.created_at).toLocaleDateString('ko-KR')}
                  </div>
                  <div className="table-cell views-cell">{post.view_count || 0}</div>
                  <div className="table-cell likes-cell">{post.like_count || 0}</div>
                </div>
              ))
            ) : (
              <div className="no-posts" style={{ 
                textAlign: 'center', 
                padding: '40px', 
                color: 'var(--muted-foreground)',
                fontSize: '16px',
                gridColumn: '1 / -1'
              }}>
                {activeCategory === "전체" ? "게시글이 없습니다." : `${activeCategory} 카테고리에 게시글이 없습니다.`}
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .posts-table {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            margin-top: 20px;
          }

          .table-header {
            background: #f8f9fa;
            border-bottom: 2px solid #e9ecef;
          }

          .header-row {
            display: grid;
            grid-template-columns: 100px 1fr 120px 120px 80px 80px;
            gap: 1px;
            background: #f8f9fa;
          }

          .header-cell {
            padding: 16px 12px;
            font-weight: 600;
            color: #495057;
            text-align: left;
            border-right: 1px solid #e9ecef;
          }

          .header-cell:last-child {
            border-right: none;
          }

          .category-cell { text-align: center; }
          .author-cell { text-align: center; }
          .date-cell { text-align: center; }
          .views-cell { text-align: center; }
          .likes-cell { text-align: center; }

          .table-body {
            background: white;
          }

          .table-row {
            display: grid;
            grid-template-columns: 100px 1fr 120px 120px 80px 80px;
            gap: 1px;
            border-bottom: 1px solid #e9ecef;
            transition: background-color 0.2s;
          }

          .table-row:hover {
            background-color: #f8f9fa;
          }

          .table-cell {
            padding: 16px 12px;
            border-right: 1px solid #e9ecef;
            display: flex;
            align-items: center;
          }

          .table-cell:last-child {
            border-right: none;
          }

          .category-tag {
            background: var(--primary);
            color: var(--primary-foreground);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
          }

          .post-title-link {
            color: #212529;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s;
          }

          .post-title-link:hover {
            color: var(--primary);
          }

          .no-posts {
            grid-column: 1 / -1;
            padding: 40px;
            text-align: center;
            color: var(--muted-foreground);
            font-size: 16px;
          }
        `}</style>
      </CommonLayout>
    );
  }
}

export default MainBoardPage;
