// import React from 'react';
import { useNavigate } from 'react-router-dom';
import './splashPage.css'; // This will contain the CSS similar to what was provided earlier

const SplashPage = () => {
  const navigate = useNavigate();
  return (
    <div className="splash-container">
      <header>
        <img src="logo.webp" alt="Displaygram Logo" className="logo" />
      </header>
      <main>
        <h1>Welcome to Displaygram</h1>
        <p>Discover and share retail success.</p>
        <button onClick={()=>navigate('/user-home-page')} className="enter-site-btn">
          Enter Site
        </button>
      </main>
      <footer>
        <small>&copy; 2024 Displaygram</small>
        <nav>
          <a href="privacy">Privacy Policy</a>
          <a href="terms">Terms of Service</a>
        </nav>
      </footer>
    </div>
  );
};

export default SplashPage;
