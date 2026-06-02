import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles.css";
import { AuthProvider } from "./pages/site/auth/AuthProvider";

// 기능: 전역 인증 컨텍스트와 라우터를 먼저 감싼 뒤 전체 화면을 렌더링한다.
// 설명: 로그인 여부에 따라 라우트 접근 제어와 초기 세션 복구가 같은 기준으로 동작하도록 진입점을 고정한다.
// 흐름: 브라우저 라우터 생성 -> AuthProvider에서 세션 상태 준비 -> App 라우트 렌더링.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
