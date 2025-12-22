import React, { useState } from 'react'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'

function App() {
  const [view, setView] = useState('landing');

  React.useEffect(() => {
    const session = localStorage.getItem('erika_session');
    if (session) {
      const { timestamp } = JSON.parse(session);
      const eightHours = 8 * 60 * 60 * 1000;
      if (Date.now() - timestamp < eightHours) {
        setView('dashboard');
      } else {
        localStorage.removeItem('erika_session');
      }
    }
  }, []);

  const handleLoginSuccess = () => {
    const sessionData = {
      loggedIn: true,
      timestamp: Date.now()
    };
    localStorage.setItem('erika_session', JSON.stringify(sessionData));
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('erika_session');
    setView('auth');
  };

  return (
    <div className="min-h-screen">
      {view === 'landing' && <LandingPage onStart={() => setView('auth')} />}
      {view === 'auth' && <AuthPage onLogin={handleLoginSuccess} />}
      {view === 'dashboard' && <Dashboard onLogout={handleLogout} />}
    </div>
  )
}

export default App
