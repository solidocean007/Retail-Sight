// import React from 'react';
import "./ContactUs.css";
import { ContactUsPageHelmet } from "../../utils/helmetConfigurations";
import React, { useState } from "react";
import { getFunctions, httpsCallable } from "@firebase/functions";

const ContactUs = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target as
      | HTMLInputElement
      | HTMLTextAreaElement;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = event.currentTarget;
    const functions = getFunctions();
    const sendEmail = httpsCallable(functions, "sendContactUsEmail");
    const formData = {
      name: (target.elements.namedItem("name") as HTMLInputElement).value,
      email: (target.elements.namedItem("email") as HTMLInputElement).value,
      message: (target.elements.namedItem("message") as HTMLTextAreaElement)
        .value,
      phone: (target.elements.namedItem("phone") as HTMLInputElement).value,
    };
    sendEmail(formData)
      .then((result) => {
        // result is defined but never read
        // Handle response
        setForm({ name: "", email: "", phone: "", message: "" }); // Reset form fields
        alert("Message sent successfully");
      })
      .catch((error) => {
        // Handle errors
        console.error("Error sending message:", error);
        alert("Failed to send message");
      });
  };

  return (
    <>
      <ContactUsPageHelmet />
      <div className="contact-container">
        <h1>Contact Us</h1>
        <p>
          If you have any questions or feedback, please feel free to reach out
          to us.
        </p>
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Phone (Optional)</label>
            <input
              type="text"
              id="phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              rows={4}
              value={form.message}
              onChange={handleChange}
              required
            ></textarea>
          </div>
          <button type="submit" className="submit-button">
            Send Message
          </button>
        </form>
      </div>
    </>
  );
};

export default ContactUs;
