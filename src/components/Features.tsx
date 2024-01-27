import { useNavigate } from "react-router-dom";
import { FeaturesPageHelmet } from "../utils/helmetConfigurations";

const Features = () => {
  const navigate = useNavigate();

  const handleSignUpClick = () => {
    navigate("/sign-up-login");
  };

  return (
    <>
      <FeaturesPageHelmet />
      <div className="features-page">
        <nav className="features-navigation">
          <button
            className="nav-button"
            onClick={() => navigate("/user-home-page")}
          >
            Home
          </button>
          <button className="cta-button" onClick={handleSignUpClick}>
            Sign Up
          </button>
        </nav>
        <section className="features-content">
          <h1>Enhance Your Retail Experience with Displaygram</h1>
          <p>
            Displaygram.com is the ultimate tool for retailers seeking a comprehensive and intuitive system for display management, organization, and collaboration.
          </p>
          <article className="about-features">
            <h2>Our Robust Feature Set</h2>
            <p>Each feature of Displaygram is designed with your retail needs in mind:</p>
            <ul>
              <li>
                <strong>Interactive Display Posting:</strong> Showcase your retail displays by uploading high-resolution images. Our platform allows you to share your visual merchandising successes and organizational skills with a broad professional community.
              </li>
              <li>
                <strong>Accurate Location Tagging:</strong> Utilize our seamless Google Maps integration to tag the exact location of your retail displays, making it easier for users to find and view displays in specific stores or regions.
              </li>
              <li>
                <strong>Detailed Descriptions and Tagging:</strong> Attach comprehensive descriptions to your displays, highlighting unique features and using targeted hashtags to make your posts easily discoverable.
              </li>
            </ul>
          </article>
          <aside className="about-cta">
            <h2>Ready to Transform Your Displays?</h2>
            <p>
              Embrace the future of retail display management. Become part of a community that's leading the change in how visual merchandising is shared and appreciated.
            </p>
            <button className="cta-button" onClick={handleSignUpClick}>
              Start Your Journey
            </button>
          </aside>
        </section>
      </div>
    </>
  )
  
}

export default Features;