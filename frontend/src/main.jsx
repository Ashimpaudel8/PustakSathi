import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { PageStateProvider } from './context/PageStateContext.jsx'
import App from './App.jsx'
import "./styles/global.css";
import "./styles/variables.css";
import "./styles/utilities.css";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PageStateProvider>
          <App />
        </PageStateProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)