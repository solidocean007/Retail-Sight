// import React from 'react';
import { HelpSupportHelmet } from "../utils/helmetConfigurations";
import "./helpSupport.css";

const HelpSupport = () => {
  return (
    <>
      <HelpSupportHelmet />
      <div className="help-support-container">
        <h1>Help & Support</h1>
        <section>
          <h2>Frequently Asked Questions (FAQs)</h2>
          <p>
            Find answers to the most common questions about Displaygram.com.
          </p>
          {/* Assuming you would have a link to a FAQ page or expandable sections here */}
        </section>
        <section>
          <h2>Customer Support</h2>
          <p>
            Need more help? Our customer support team is available Monday to
            Friday from 9am to 5pm (your timezone). You can reach us at:
          </p>
          <ul>
            <li>Email: support@displaygram.com</li>
            <li typeof="phone">Phone: +1 910-583-6914</li>
            {/* Add other contact methods if available */}
          </ul>
        </section>
        <section>
          <h2>Technical Support</h2>
          <p>
            If you are experiencing technical issues, please contact our
            technical support team at:
          </p>
          <ul>
            <li>Email: techsupport@displaygram.com</li>
            {/* Add other contact methods if available */}
          </ul>
        </section>
      </div>
    </>
  );
};

export default HelpSupport;
