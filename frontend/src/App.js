import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

// Import page components
import WelcomePage from './pages/WelcomePage';
import UploadPage from './pages/UploadPage';
import ResultsPage from './pages/ResultsPage';

function App() {
  return (
    <Router>
      <div style={{ backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
        <main>
          <Routes>
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/" element={<WelcomePage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;