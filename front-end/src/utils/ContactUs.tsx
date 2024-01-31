// import React from 'react';
import './ContactUs.css';
import { ContactUsPageHelmet } from './helmetConfigurations';

const ContactUs = () => {
  return (
    <>
    <ContactUsPageHelmet />
     <div className="contact-container">
      <h1>Contact Us</h1>
      <p>If you have any questions or feedback, please feel free to reach out to us.</p>
      <form className="contact-form">
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input type="text" id="name" name="name" required />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input type="email" id="email" name="email" required />
        </div>
        <div className="form-group">
          <label htmlFor="message">Message</label>
          <textarea id="message" name="message" rows={4} required></textarea>
        </div>
        <button type="submit" className="submit-button">Send Message</button>
      </form>
    </div>
    </>
   
  );
};

export default ContactUs;
