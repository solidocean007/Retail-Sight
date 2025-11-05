import { useNavigate } from "react-router-dom";
import { FeaturesPageHelmet } from "../../utils/helmetConfigurations";
import "./features.css";

const Features = () => {
  const navigate = useNavigate();
  const goRequestAccess = () => navigate("/request-access");

  return (
    <>
      <FeaturesPageHelmet />
      <div className="features">
        {/* Sticky Header CTA */}
        <header className="features__topbar">
          <div className="features__brand">Displaygram</div>
          <nav className="features__nav">
            <button className="btn btn--ghost" onClick={goRequestAccess}>
              Request Access
            </button>
          </nav>
        </header>

        {/* Hero */}
        <section className="hero">
          <div className="hero__eyebrow">
            Built for sales teams • Frictionless reporting
          </div>

          <h1 className="hero__title">
            Share display wins and connect with your partners in real time.
          </h1>

          <p className="hero__subtitle">
            Snap a photo, tag the store, and instantly show results to the
            suppliers and distributors you work with—clean connections and
            filters, without messy group texts or email chains.
          </p>

          <div className="hero__cta">
            <button className="btn btn--primary" onClick={goRequestAccess}>
              Request Access
            </button>
            <span className="hero__note">
              Invite-only • Free tier available
            </span>
          </div>
        </section>

        {/* Value Props */}
        <section className="value">
          <div className="value__grid">
            <article className="card">
              <div className="card__eyebrow">Onboarding</div>
              <h3 className="card__title">Simple, guided setup</h3>
              <p className="card__body">
                Import your store list and product list so posts are always tied
                to the right account and brand. New team members are invited by
                your company and verified before joining. Then start capturing
                displays and sharing results with partners right away.
              </p>
            </article>

            <article className="card">
              <div className="card__eyebrow">Connections</div>
              <h3 className="card__title">
                Connect with supplier & distributor partners
              </h3>
              <p className="card__body">
                Build trusted, two-way relationships. When a connection is
                approved, partners see displays you post for shared brands—
                simple collaboration and clear results without exposing your
                entire book of business.
              </p>
            </article>

            <article className="card">
              <div className="card__eyebrow">Content</div>
              <h3 className="card__title">Post displays that drive action</h3>
              <p className="card__body">
                Build the display, tag the exact store, and add the brands you
                placed. Suppliers instantly see results for their products, and
                distributors get credit for execution in the market.
              </p>
            </article>

            <article className="card">
              <div className="card__eyebrow">Permissions</div>
              <h3 className="card__title">You decide who sees what</h3>
              <p className="card__body">
                Keep posts private to your team or share with connected partners
                when it makes sense. Suppliers focus on the brands they care
                about, while distributors stay in control of what leaves the
                company.
              </p>
            </article>

            <article className="card">
              <div className="card__eyebrow">Tiers</div>
              <h3 className="card__title">Start free, upgrade as you grow</h3>
              <p className="card__body">
                Clear limits on users, connections, and features. When your team
                is ready, in-app prompts make upgrading seamless—no disruption
                to your workflow.
              </p>
            </article>

            <article className="card">
              <div className="card__eyebrow">Management</div>
              <h3 className="card__title">Tools for company admins</h3>
              <p className="card__body">
                Approve new team members, manage supplier and distributor
                connections, and keep plan settings up to date—without extra
                emails or spreadsheets.
              </p>
            </article>
          </div>
        </section>

        {/* Social Proof / Use Cases */}
        <section className="proof">
          <h2 className="proof__title">
            Built for the way distributors and suppliers really work
          </h2>
          <ul className="proof__list">
            <li>
              <b>Field teams:</b> build a display and tag the store.
            </li>
            <li>
              <b>Supplier reps:</b> instantly see your brands in market across
              your network.
            </li>
            <li>
              <b>Managers:</b> clear visibility into partner activity without
              blasting everything to everyone.
            </li>
            <li>
              <b>Trust:</b> every post comes from a verified company, with a
              clean record of who shared what.
            </li>
          </ul>
        </section>

        {/* Mini Plan Strip */}
        <section className="plans">
          <div className="plans__card">
            <div className="plans__name">Free</div>
            <div className="plans__line">Up to 5 users per company</div>
            <div className="plans__line">1 partner connection</div>
            <div className="plans__line">Post and share displays</div>
          </div>

          <div className="plans__card plans__card--highlight">
            <div className="plans__badge">Most Popular</div>
            <div className="plans__name">Pro</div>
            <div className="plans__line">Larger teams & multiple partners</div>
            <div className="plans__line">Advanced sharing controls</div>
            <div className="plans__line">Brand-level filters for suppliers</div>
          </div>

          {/* Enterprise can be added later when ready */}
          {/* 
          <div className="plans__card">
            <div className="plans__name">Enterprise</div>
            <div className="plans__line">Unlimited users & connections</div>
            <div className="plans__line">Custom roles for large networks</div>
            <div className="plans__line">Dedicated support & reporting</div>
          </div> 
          */}
        </section>

        {/* Final CTA */}
        <section className="cta">
          <h2>Ready for verified, permissioned collaboration?</h2>
          <p>
            Request access and we’ll verify your company, connect your partners,
            and get your team live in minutes.
          </p>
          <button
            className="btn btn--primary btn--xl"
            onClick={goRequestAccess}
          >
            Request Access
          </button>
          <div className="cta__subnote">No credit card required to start</div>
        </section>
      </div>
    </>
  );
};

export default Features;
