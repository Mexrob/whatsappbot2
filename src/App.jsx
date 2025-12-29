import React, { useState, useEffect } from 'react'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import { api } from './lib/api'

function App() {
  const [view, setView] = useState('landing');
  const [clinicName, setClinicName] = useState('Erika IA');
  const [clinicLogo, setClinicLogo] = useState(null);

  useEffect(() => {
    // Session check
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

    // Fetch clinic name
    api.getSettings().then(res => {
      if (res.data?.clinic_name) {
        setClinicName(res.data.clinic_name);
      }
      if (res.data?.clinic_logo) {
        setClinicLogo(res.data.clinic_logo);
      }
    }).catch(console.error);
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
      {view === 'landing' && <LandingPage clinicName={clinicName} clinicLogo={clinicLogo} onStart={() => setView('auth')} />}
      {view === 'auth' && <AuthPage clinicName={clinicName} clinicLogo={clinicLogo} onLogin={handleLoginSuccess} />}
      {view === 'dashboard' && <Dashboard onLogout={handleLogout} />}
    </div>
  )
}

export default App
