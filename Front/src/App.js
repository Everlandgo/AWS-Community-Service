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
import ForgotPasswordPage from './components/ForgotPasswordPage';
import MyPage from './components/MyPage';
import PostDetail from './components/PostDetails';
import WritePostPage from './components/WritePostPage';
import { useAuth } from "react-oidc-context";
import { setupTabCloseListener } from './utils/tokenUtils';

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
const ForgotPasswordPageWithNavigate = withNavigate(ForgotPasswordPage);
const MyPageWithNavigate = withNavigate(MyPage);
const PostDetailWithNavigate = withNavigate(PostDetail);
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
    this.cleanupTabListener = null;
  }

  componentDidMount() {
    // 페이지 로드 시 저장된 로그인 상태 복원
    this.restoreLoginState();
    
    // 탭 종료 시 자동 로그아웃을 위한 리스너 설정
    this.cleanupTabListener = setupTabCloseListener();
  }

  componentWillUnmount() {
    // 컴포넌트 언마운트 시 이벤트 리스너 정리
    if (this.cleanupTabListener) {
      this.cleanupTabListener();
    }
  }

  // 저장된 로그인 상태 복원
  restoreLoginState = () => {
    try {
      const savedUser = sessionStorage.getItem('currentUser');
      const savedTokens = sessionStorage.getItem('cognitoTokens');
      

      
      if (savedUser && savedTokens) {
        const userData = JSON.parse(savedUser);
        const tokens = JSON.parse(savedTokens);
        

        
        // 통일된 토큰 키로 유효성 검증
        if (tokens.id_token || tokens.access_token) {

          this.setState({
            currentUser: userData,
            isLoggedIn: true
          });
        } else {
          // 토큰이 유효하지 않으면 저장된 데이터 삭제

          sessionStorage.removeItem('currentUser');
          sessionStorage.removeItem('cognitoTokens');
        }
      } else {

      }
    } catch (error) {
      console.error("❌ 로그인 상태 복원 실패:", error);
      // 오류 발생 시 저장된 데이터 삭제
      sessionStorage.removeItem('currentUser');
      sessionStorage.removeItem('cognitoTokens');
    }
  };

  handleLogin = (userData) => {

    
    // 토큰이 있는지 확인
    if (!userData.id_token) {
      console.error("로그인은 성공했지만 ID 토큰이 없습니다:", userData);
      alert("로그인은 성공했지만 인증 토큰을 가져오지 못했습니다. 다시 시도해주세요.");
      return;
    }
    
    // 통일된 토큰 키로 저장
    const tokens = {
      id_token: userData.id_token,
      access_token: userData.access_token,
      refresh_token: userData.refresh_token
    };
    
    // sessionStorage에 토큰 저장 (통일된 키 사용)
    sessionStorage.setItem('cognitoTokens', JSON.stringify(tokens));
    
    // 사용자 데이터 설정 (내부 사용을 위한 매핑 포함)
    const userWithTokens = {
      ...userData,
      // Cognito 원본 키로 통일
      id_token: userData.id_token,
      access_token: userData.access_token,
      refresh_token: userData.refresh_token,
      // 내부 사용을 위한 매핑
      idToken: userData.id_token,
      accessToken: userData.access_token,
      refreshToken: userData.refresh_token
    };
    
    this.setState({
      currentUser: userWithTokens,
      isLoggedIn: true
    });
    
    // sessionStorage에 사용자 정보 저장
    sessionStorage.setItem('currentUser', JSON.stringify(userWithTokens));
    

    
    // 저장된 토큰 내용 확인
    const savedTokens = sessionStorage.getItem('cognitoTokens');
    const savedUser = sessionStorage.getItem('currentUser');

    

  };

  handleSignup = (userData) => {

    this.setState({
      currentUser: userData,
      isLoggedIn: true
    });
  };

  handleLogout = async () => {
    try {
      // sessionStorage에서 로그인 정보 삭제
      sessionStorage.removeItem('currentUser');
      sessionStorage.removeItem('cognitoTokens');
      
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
              <PostDetailWithNavigate
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
                setIsLoggedIn={(status) => this.setState({ isLoggedIn: status })}
                setCurrentUser={(user) => this.setState({ currentUser: user })}
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
            path="/forgot-password" 
            element={
              <ForgotPasswordPageWithNavigate />
            } 
          />
          <Route 
            path="/mypage" 
            element={
              <MyPageWithNavigate 
                currentUser={currentUser}
                isLoggedIn={isLoggedIn}
                onLogout={this.handleLogout}
                setIsLoggedIn={(status) => this.setState({ isLoggedIn: status })}
                setCurrentUser={(user) => this.setState({ currentUser: user })}
              />
            } 
          />
        </Routes>
      </Router>
    );
  }
}

export default App;
