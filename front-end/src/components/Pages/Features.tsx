import { useNavigate } from "react-router-dom";
import { FeaturesPageHelmet } from "../../utils/helmetConfigurations";
import "./features.css";

const Features = () => {
  const navigate = useNavigate();

  const goRequestAccess = () => navigate("/request-access");
  const goHome = () => navigate("/");

  return (
    <>
      <FeaturesPageHelmet />

      <main className="features-page">

        {/* Top Bar */}

        {/* <header className="features-topbar">

          <div
            className="features-brand"
            onClick={goHome}
          >
            Displaygram
          </div>

          <button
            className="button-primary"
            onClick={goRequestAccess}
          >
            Request Access
          </button>

        </header> */}


        {/* HERO */}

        <section className="features-hero">

          <div className="features-eyebrow">
            Built for distributor & supplier networks
          </div>

          <h1 className="features-title">
            Share retail display results with partners in real time
          </h1>

          <p className="features-subtitle">
            Capture store displays, tag the location, and instantly share
            results with supplier and distributor partners. Displaygram creates
            a clean, trusted record of real execution happening in market.
          </p>

          <button
            className="button-primary features-hero-cta"
            onClick={goRequestAccess}
          >
            Request Access
          </button>

        </section>


        {/* FEATURES GRID */}

        <section className="features-grid">

          <article className="feature-card">
            <h3>Capture real store displays</h3>

            <p>
              Snap a photo of the display, tag the exact store location, and
              attach the brands placed in the set. Partners instantly see what
              is happening in the market.
            </p>
          </article>


          <article className="feature-card">
            <h3>Connect distributors and suppliers</h3>

            <p>
              Build trusted company-to-company connections. Partners can
              collaborate around shared brands without exposing your entire
              account base.
            </p>
          </article>


          <article className="feature-card">
            <h3>Brand-level visibility</h3>

            <p>
              Suppliers focus on their brands while distributors stay in
              control of what information is shared outside the company.
            </p>
          </article>


          <article className="feature-card">
            <h3>Track program execution</h3>

            <p>
              Monitor retail execution tied to programs, promotions, and brand
              initiatives across your account network.
            </p>
          </article>


          <article className="feature-card">
            <h3>Company admin controls</h3>

            <p>
              Manage team members, approve partner connections, and maintain
              clear control over company access.
            </p>
          </article>


          <article className="feature-card">
            <h3>Trusted execution history</h3>

            <p>
              Every display post is tied to a verified company and store,
              creating a reliable record of retail activity.
            </p>
          </article>

        </section>


        {/* AUDIENCE */}

        <section className="features-audience">

          <h2>
            Built for the way distributor networks actually work
          </h2>

          <ul>

            <li>
              <strong>Field teams:</strong> capture displays and tag the store.
            </li>

            <li>
              <strong>Supplier reps:</strong> instantly see brand presence in
              market.
            </li>

            <li>
              <strong>Managers:</strong> monitor execution across accounts and
              partners.
            </li>

            <li>
              <strong>Trusted collaboration:</strong> every post comes from a
              verified company.
            </li>

          </ul>

        </section>


        {/* CTA */}

        <section className="features-cta">

          <h2>
            Ready to connect your distributor and supplier teams?
          </h2>

          <p>
            Request access and we’ll verify your company, connect your
            partners, and get your team sharing display results in minutes.
          </p>

          <button
            className="button-primary features-final-cta"
            onClick={goRequestAccess}
          >
            Request Access
          </button>

        </section>

      </main>
    </>
  );
};

export default Features;