import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "react-oidc-context";

const oidc = {
  authority: `https://cognito-idp.${process.env.REACT_APP_COGNITO_REGION}.amazonaws.com/${process.env.REACT_APP_COGNITO_USER_POOL_ID}`,
  client_id: process.env.REACT_APP_COGNITO_CLIENT_ID,
  redirect_uri: `${window.location.origin}/callback`, // ← /callback 권장
  response_type: "code", // PKCE
  scope: "openid email profile",
  onSigninCallback: () => {
    // 콜백 후 쿼리스트립 정리
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider {...oidc}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
