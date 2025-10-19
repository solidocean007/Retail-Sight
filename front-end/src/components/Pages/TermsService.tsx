// import React from 'react';
import { TermsOfServiceHelmet } from "../../utils/helmetConfigurations";
import "./termsService.css";

const TermsOfService = () => {
  return (
    <>
      <TermsOfServiceHelmet />
      <div className="terms-container">
        <h1>Terms of Service</h1>
        <p>Last updated: January 13, 2024</p>
        <section>
          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing and using Displaygram.com, you agree to be bound by
            these Terms of Service and all terms incorporated by reference. If
            you do not agree to all of these terms, do not use our website.
          </p>
        </section>
        <section>
          <h2>2. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms of Service at any time.
            All changes will be effective immediately upon posting to the
            Website and, by continuing to use the Website, you agree to be bound
            by the changes.
          </p>
        </section>
        {/* Add more sections as necessary */}
        <section>
          <h2>3. Privacy Policy</h2>
          <p>
            Please refer to our Privacy Policy for information about how we
            collect, use, and share your information.
          </p>
        </section>
        {/* ... Other sections ... */}
        <section>
          <h2>Contact Us</h2>
          <p>
            If you have any questions or concerns regarding these terms, you may
            contact us using the information below:
          </p>
          <p>Email: contact@displaygram.com</p>
          {/* Include other contact information if necessary */}
        </section>
      </div>
    </>
  );
};

export default TermsOfService;
