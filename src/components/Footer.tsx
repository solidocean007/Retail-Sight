// import React from 'react';
import { useNavigate } from 'react-router-dom';
import './footer.css';

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="footer-container">
      <div className="footer-content">
        <div onClick={() => navigate('/about')} className="footer-link">About Us</div>
        <div onClick={() => navigate('/contact-us')} className="footer-link">Contact</div>
        <div onClick={() => navigate('/privacy-policy')} className="footer-link">Privacy Policy</div>
        <div onClick={() => navigate('/terms-service')} className="footer-link">Terms of Service</div>
        <div onClick={() => navigate('/help-support')} className="footer-link">Help & Support</div>
      </div>
    </footer>
  );
};

export default Footer;
