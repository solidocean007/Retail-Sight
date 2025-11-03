import {
  ContactPage,
  Cookie,
  Gavel,
  Help,
  Info,
  PrivacyTip,
} from "@mui/icons-material";
import "./footer.css";
import { SvgIconTypeMap } from "@mui/material";
import { OverridableComponent } from "@mui/material/OverridableComponent";
import { Link } from "react-router-dom";
import InfoIcon from '@mui/icons-material/Info';

type FooterLinkProps = {
  to: string;
  icon?: OverridableComponent<SvgIconTypeMap<object, "svg">>;
  children: React.ReactNode;
};

const FooterLink = ({ to, icon: Icon, children }: FooterLinkProps) => (
  <Link to={to} className="footer-link">
    {Icon && <Icon className="footer-icon" />}
    {children}
  </Link>
);

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="footer-container">
      <div className="footer-content">
        <FooterLink to="/about" icon={InfoIcon}>
          About
        </FooterLink>
        <FooterLink to="/privacy" icon={PrivacyTip}>
          Privacy
        </FooterLink>
        <FooterLink to="/terms" icon={Gavel}>
          Terms
        </FooterLink>
        <FooterLink to="/cookies" icon={Cookie}>
          Cookies
        </FooterLink>
        <FooterLink to="/contact" icon={ContactPage}>
          Contact
        </FooterLink>
        <FooterLink to="/help" icon={Help}>
          Help
        </FooterLink>
      </div>
      <div className="footer-bottom">
        © {year} <span className="footer-brand">Displaygram LLC</span>. All
        rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
