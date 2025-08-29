import React, { useState } from 'react';
import { Eye, EyeOff, Hash, Mail, Lock } from 'lucide-react';
import CommonLayout from './CommonLayout';

const SignupPage = ({ onSignup, navigate }) => {
  const [formData, setFormData] = useState({
    id: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // 에러 메시지 초기화
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.id.trim()) {
      newErrors.id = '아이디를 입력해주세요';
    } else if (formData.id.length < 4) {
      newErrors.id = '아이디는 4자 이상이어야 합니다';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.id)) {
      newErrors.id = '아이디는 영문, 숫자, 언더스코어만 사용 가능합니다';
    }

    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요';
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    } else if (formData.password.length < 6) {
      newErrors.password = '비밀번호는 6자 이상이어야 합니다';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // AWS Cognito와 직접 연결하여 회원가입
      const cognitoResponse = await fetch('https://cognito-idp.ap-northeast-2.amazonaws.com/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp'
        },
        body: JSON.stringify({
          ClientId: '2v16jp80jce0c40neuuhtlgg8t',
          Username: formData.id,
          Password: formData.password,
          UserAttributes: [
            {
              Name: 'email',
              Value: formData.email
            },
            {
              Name: 'name',
              Value: formData.id
            }
          ]
        })
      });

      if (cognitoResponse.ok) {
        const result = await cognitoResponse.json();
        console.log('Cognito 회원가입 성공:', result);
        
        if (result.UserSub) {
          // 회원가입 성공
          const userData = {
            username: formData.id,
            sub: result.UserSub,
            email: formData.email
          };
          
          onSignup(userData);
          alert('회원가입이 완료되었습니다! 이메일을 확인하여 계정을 활성화해주세요.');
          navigate('/login');
        } else {
          setErrors({ general: '회원가입에 실패했습니다.' });
        }
      } else {
        const errorData = await cognitoResponse.json();
        console.error('Cognito 회원가입 오류:', errorData);
        
        if (errorData.__type === 'UsernameExistsException') {
          setErrors({ general: '이미 존재하는 사용자 이름입니다.' });
        } else if (errorData.__type === 'InvalidPasswordException') {
          setErrors({ general: '비밀번호가 요구사항을 충족하지 않습니다.' });
        } else if (errorData.__type === 'InvalidParameterException') {
          setErrors({ general: '입력된 정보가 올바르지 않습니다.' });
        } else {
          setErrors({ general: `회원가입 오류: ${errorData.message || '알 수 없는 오류'}` });
        }
      }
    } catch (error) {
      console.error('회원가입 오류:', error);
      setErrors({ general: '네트워크 오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CommonLayout
      isLoggedIn={false}
      currentUser={null}
      navigate={navigate}
    >
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <h1 className="auth-title">회원가입</h1>
            <p className="auth-subtitle">새 계정을 생성하여 커뮤니티를 시작하세요.</p>
          </div>

          {errors.general && (
            <div className="error-message">
              {errors.general}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                ID
              </label>
              <input
                type="text"
                name="id"
                value={formData.id}
                onChange={handleChange}
                className={`form-input ${errors.id ? 'error' : ''}`}
                placeholder="아이디를 입력하세요"
                required
              />
              <p className='password-toggle'/>
              {errors.id && <span className="error-message">{errors.id}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="이메일을 입력하세요"
                required
              />
              <p className='password-toggle'/>
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                PWD
              </label>
              <div className="password-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="비밀번호를 입력하세요"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Confirm<br/>PWD
              </label>
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                  placeholder="비밀번호를 다시 입력하세요"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>

            <button type="submit" className="auth-button" disabled={isLoading}>
              {isLoading ? '가입 중...' : '회원가입'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              이미 계정이 있으신가요?{' '}
              <button
                onClick={() => navigate('/login')}
                className="auth-link"
              >
                로그인하기
              </button>
            </p>
          </div>
        </div>
      </div>
    </CommonLayout>
  );
};

export default SignupPage;
