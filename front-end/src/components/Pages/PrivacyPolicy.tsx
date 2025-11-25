// import React from 'react';
import "./PrivacyPolicy.css";
import { PrivacyPolicyHelmet } from "../../utils/helmetConfigurations";

const PrivacyPolicy = () => {
  
  return (
    <>
      <PrivacyPolicyHelmet />
      <div className="privacy-policy-container">
        <h1>Privacy Policy</h1>
        <p>Last updated: January 13, 2024</p>
        <section>
          <h2>1. Introduction</h2>
          <p>
            At Displaygram.com, we are committed to protecting your personal
            information and your right to privacy. If you have any questions or
            concerns about this privacy notice or our practices with regard to
            your personal information, please contact us at
            contact@displaygram.com.
          </p>
        </section>
        <section>
          <h2>2. Information We Collect</h2>
          <p>
            We collect personal information that you voluntarily provide to us
            when you register on the Website, express an interest in obtaining
            information about us or our products and services, when you
            participate in activities on the Website, or otherwise when you
            contact us.
          </p>
          <p>
            The personal information that we collect depends on the context of
            your interactions with us and the Website, the choices you make, and
            the products and features you use.
          </p>
        </section>
        {/* Add more sections as necessary */}
        <section>
          <h2>3. How We Use Information</h2>
          <p>
            We use personal information collected via our Website for a variety
            of business purposes described below. We process your personal
            information for these purposes in reliance on our legitimate
            business interests, in order to enter into or perform a contract
            with you, with your consent, and/or for compliance with our legal
            obligations.
          </p>
          {/* List specific uses */}
        </section>
        {/* ... Other sections ... */}
        <section>
          <h2>Contact Us</h2>
          <p>
            If you have any questions or concerns regarding this policy, you may
            contact us using the information below:
          </p>
          <p>Email: contact@displaygram.com</p>
          {/* Include other contact information if necessary */}
        </section>
      </div>
    </>
  );
};

export default PrivacyPolicy;
