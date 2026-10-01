import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './AuthContext.jsx'

// StrictMode는 개발 모드에서 상세 조회를 두 번 호출해 조회수가 2씩 오르므로 사용하지 않는다
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>,
)
