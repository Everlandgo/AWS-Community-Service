import React, { Component } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from 'react-router-dom';
import MainBoardPage from './components/MainBoardPage';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import MyPage from './components/MyPage';
import PostDetails from './components/PostDetails';
import WritePostPage from './components/WritePostPage';

// useNavigate를 클래스 컴포넌트에서 사용하기 위한 래퍼
function withNavigate(Component) {
  return function WrappedComponent(props) {
    const navigate = useNavigate();
    return <Component {...props} navigate={navigate} />;
  };
}

const MainBoardPageWithNavigate = withNavigate(MainBoardPage);
const LoginPageWithNavigate = withNavigate(LoginPage);
const SignupPageWithNavigate = withNavigate(SignupPage);
const MyPageWithNavigate = withNavigate(MyPage);
const PostDetailsWithNavigate = withNavigate(PostDetails);
const WritePostPageWithNavigate = withNavigate(WritePostPage);

// AWS Cognito 인증 상태를 관리하는 App 컴포넌트
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      posts: [],
      currentUser: null,
      isLoggedIn: false
    };
  }

  componentDidMount() {
    // 페이지 로드 시 저장된 로그인 상태 복원
    this.restoreLoginState();
  }

  // 저장된 로그인 상태 복원
  restoreLoginState = () => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      const savedTokens = localStorage.getItem('cognitoTokens');
      
      if (savedUser && savedTokens) {
        const userData = JSON.parse(savedUser);
        const tokens = JSON.parse(savedTokens);
        
        // 토큰이 유효한지 확인 (간단한 검증)
        if (tokens.idToken || tokens.accessToken) {
          console.log("저장된 로그인 상태 복원:", userData);
          this.setState({
            currentUser: userData,
            isLoggedIn: true
          });
        } else {
          // 토큰이 유효하지 않으면 저장된 데이터 삭제
          localStorage.removeItem('currentUser');
          localStorage.removeItem('cognitoTokens');
        }
      }
    } catch (error) {
      console.error("로그인 상태 복원 실패:", error);
      // 오류 발생 시 저장된 데이터 삭제
      localStorage.removeItem('currentUser');
      localStorage.removeItem('cognitoTokens');
    }
  };

  handleLogin = (userData) => {
    console.log("Cognito 로그인 완료:", userData);
    console.log("토큰 확인:", userData.id_token);
    
    // 토큰이 있는지 확인
    if (!userData.id_token) {
      console.error("로그인은 성공했지만 ID 토큰이 없습니다:", userData);
      alert("로그인은 성공했지만 인증 토큰을 가져오지 못했습니다. 다시 시도해주세요.");
      return;
    }
    
    // 토큰 정보를 포함한 사용자 데이터 설정
    const userWithTokens = {
      ...userData,
      idToken: userData.id_token,
      accessToken: userData.access_token,
      refreshToken: userData.refresh_token
    };
    
    this.setState({
      currentUser: userWithTokens,
      isLoggedIn: true
    });
    
    // localStorage에 사용자 정보와 토큰 저장
    localStorage.setItem('currentUser', JSON.stringify(userWithTokens));
    
    // 토큰만 별도로도 저장
    const tokens = {
      idToken: userData.id_token,
      accessToken: userData.access_token,
      refreshToken: userData.refresh_token
    };
    localStorage.setItem('cognitoTokens', JSON.stringify(tokens));
    
    console.log("로그인 상태 업데이트 및 저장 완료:", this.state);
  };

  handleSignup = (userData) => {
    console.log("Cognito 회원가입 완료:", userData);
    this.setState({
      currentUser: userData,
      isLoggedIn: true
    });
  };

  handleLogout = async () => {
    try {
      // localStorage에서 로그인 정보 삭제
      localStorage.removeItem('currentUser');
      localStorage.removeItem('cognitoTokens');
      
      this.setState({
        currentUser: null,
        isLoggedIn: false
      });
      alert("로그아웃 되었습니다.");
    } catch (error) {
      console.error("로그아웃 중 오류 발생:", error);
      alert("로그아웃 처리 중 문제가 발생했습니다.");
    }
  };

  setPosts = (posts) => {
    this.setState({ posts });
  };

  render() {
    const { posts, currentUser, isLoggedIn } = this.state;

    // 사용자 정보 디버깅
    console.log('=== App Render Debug ===');
    console.log('App render - currentUser:', currentUser);
    console.log('App render - isLoggedIn:', isLoggedIn);
    console.log('App render - 토큰 확인:', currentUser?.id_token);
    console.log('========================');

    return (
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <MainBoardPageWithNavigate
                isLoggedIn={isLoggedIn}
                onLogout={this.handleLogout}
                profileImage={currentUser?.profile?.picture}
                posts={posts}
                setPosts={this.setPosts}
                currentUser={currentUser}
                setIsLoggedIn={(status) => this.setState({ isLoggedIn: status })}
                setCurrentUser={(user) => this.setState({ currentUser: user })}
                setProfileImage={() => {}}
              />
            }
          />
          <Route
            path="/post/:postId"
            element={
              <PostDetailsWithNavigate
                currentUser={currentUser}
                isLoggedIn={isLoggedIn}
                onLogout={this.handleLogout}
              />
            }
          />
          <Route
            path="/write"
            element={
              <WritePostPageWithNavigate
                currentUser={currentUser}
                isLoggedIn={isLoggedIn}
                onLogout={this.handleLogout}
              />
            }
          />
          <Route
            path="/login"
            element={
              <LoginPageWithNavigate
                onLogin={this.handleLogin}
              />
            }
          />
          <Route 
            path="/signup" 
            element={
              <SignupPageWithNavigate 
                onSignup={this.handleSignup}
              />
            } 
          />
          <Route 
            path="/mypage" 
            element={
              <MyPageWithNavigate 
                currentUser={currentUser}
                isLoggedIn={isLoggedIn}
                onLogout={this.handleLogout}
              />
            } 
          />
        </Routes>
      </Router>
    );
  }
}

export default App;
