import React, { Component } from 'react';
import { User, LogOut, Settings } from 'lucide-react';

class ProfilePopup extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isVisible: false
    };
  }

  handleMyPage = () => {
    // 마이페이지로 이동
    this.props.navigate('/mypage');
    this.props.setShowProfilePopup(false);
  };

  handleLogout = async () => {
    try {
      await this.props.onLogout();
      this.props.setShowProfilePopup(false);
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
    }
  };

  render() {
    const { currentUser, profileImage, setShowProfilePopup } = this.props;

    // 사용자 정보 디버깅
    console.log('ProfilePopup render - currentUser:', currentUser);
    console.log('ProfilePopup render - profileImage:', profileImage);

    if (!this.props.showProfilePopup) {
      return null;
    }

    return (
      <div className="profile-popup">
        <div className="profile-header">
          <div className="profile-avatar">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="profile-avatar"
              />
            ) : (
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af'
              }}>
                <User size={24} />
              </div>
            )}
          </div>
          <div className="profile-info">
            <h3>{currentUser?.profile?.name || currentUser?.profile?.username || currentUser?.username || "USER"}</h3>
            <p>{currentUser?.profile?.email || currentUser?.email || ""}</p>
          </div>
        </div>
        <div className="profile-actions">
          <button
            className="profile-action-btn"
            onClick={this.handleMyPage}
          >
            <Settings size={18} />
            <span>마이페이지</span>
          </button>
          <button
            className="profile-action-btn logout"
            onClick={this.handleLogout}
          >
            <LogOut size={18} />
            <span>로그아웃</span>
          </button>
        </div>
      </div>
    );
  }
}

export default ProfilePopup;
