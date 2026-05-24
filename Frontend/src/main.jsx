import { createRoot } from 'react-dom/client'
import './index.css'
import App from "../src/App.jsx"
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>

    <ScrollToTop />

    <AuthProvider>
      <App />
    </AuthProvider>

  </BrowserRouter>,
)