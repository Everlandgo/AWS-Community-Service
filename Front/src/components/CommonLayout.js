import React from 'react';
import { Search, Plus, User, Home, LogIn, UserPlus, LogOut } from 'lucide-react';

const CommonLayout = ({ children, isLoggedIn, currentUser, navigate, hideSidebar = false, activeCategory, onCategoryChange, searchTerm = '', onSearchChange, onWritePost, onLogout }) => {
  const categories = ["전체", "동물/반려동물", "여행", "건강/헬스", "연예인"];

  const handleHomeClick = () => {
    // 홈으로 이동
    navigate('/');
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleSignupClick = () => {
    navigate('/signup');
  };

  const handleUserClick = () => {
    // 사용자 개인 페이지로 이동
    navigate('/mypage');
  };

  const handleWritePostClick = () => {
    if (onWritePost) {
      onWritePost();
    } else {
      navigate('/write');
    }
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    }
  };

  // 사용자 정보 표시용
  const displayUsername = currentUser?.username || currentUser?.sub || currentUser?.email?.split('@')[0] || '사용자';
  const displayInitial = displayUsername.charAt(0).toUpperCase();

  return (
    <div className="main-board-wrapper">
      <div className="main-board-container">
        {/* 상단 헤더 */}
        <header className="main-header">
          <div className="header-content">
            <div className="logo-section">
              <button
                className="logo-placeholder"
                onClick={handleHomeClick}
                style={{ cursor: 'pointer', border: 'none' }}
                title="홈으로 이동"
              >
                C
              </button>
            </div>

            <div className="search-section">
              <div className="search-bar-container">
                <input
                  type="text"
                  className="search-input"
                  placeholder="게시글 검색..."
                  value={searchTerm || ''}
                  onChange={onSearchChange ? (e) => onSearchChange(e) : undefined}
                />
                <button className="search-button">
                  <Search size={16} />
                </button>
              </div>
            </div>

            <div className="header-actions">
              {isLoggedIn ? (
                <div className="user-profile-section">
                  <div className="user-profile" onClick={handleUserClick} style={{ cursor: 'pointer' }}>
                    {/* 디버깅용 콘솔 로그 */}
                    {console.log('CommonLayout - currentUser:', currentUser)}
                    {console.log('CommonLayout - currentUser.username:', currentUser?.username)}
                    {console.log('CommonLayout - currentUser.sub:', currentUser?.sub)}
                    {console.log('CommonLayout - currentUser.email:', currentUser?.email)}
                    
                    <div className="user-icon">
                      {currentUser?.username?.charAt(0)?.toUpperCase() || 
                       currentUser?.sub?.charAt(0)?.toUpperCase() || 
                       currentUser?.email?.charAt(0)?.toUpperCase() || 
                       'U'}
                    </div>
                    <span>
                      {currentUser?.username || 
                       currentUser?.sub || 
                       currentUser?.email?.split('@')[0] || 
                       '사용자'}
                    </span>
                  </div>
                  <button 
                    className="logout-button" 
                    onClick={handleLogoutClick}
                    title="로그아웃"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <button className="header-button" onClick={handleSignupClick}>
                    <UserPlus size={16} />
                    회원가입
                  </button>
                  <button className="header-button" onClick={handleLoginClick}>
                    <LogIn size={16} />
                    로그인
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="main-content">
          {/* 왼쪽 사이드바 */}
          <aside className="sidebar">
            <div className="sidebar-content">
              <div className="category-section">
                <h3 className="sidebar-title">카테고리</h3>
                <div className="category-list">
                  {categories.map((category) => (
                                         <button
                       key={category}
                       className={`category-item ${activeCategory === category ? 'active' : ''}`}
                       onClick={() => onCategoryChange ? onCategoryChange(category) : undefined}
                     >
                       {category}
                     </button>
                  ))}
                </div>
              </div>

              {isLoggedIn && (
                <div className="action-section">
                  <button className="write-post-button" onClick={handleWritePostClick}>
                    <Plus size={16} />
                    글쓰기
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* 메인 콘텐츠 영역 */}
          <main className="content-area">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default CommonLayout;
