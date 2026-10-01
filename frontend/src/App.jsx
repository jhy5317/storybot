import { Route, Routes } from 'react-router-dom'
import Header from './components/Header.jsx'
import LoginModal from './components/LoginModal.jsx'
import Toaster from './components/Toaster.jsx'
import MainPage from './pages/MainPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import SignupPage from './pages/SignupPage.jsx'

export default function App() {
  return (
    <div className="app">
      <Header />
      <main className="page">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<MainPage />} />
        </Routes>
      </main>
      <footer className="footer">StoryBot · 작은 GPT가 들려주는 동화</footer>
      <LoginModal />
      <Toaster />
    </div>
  )
}
