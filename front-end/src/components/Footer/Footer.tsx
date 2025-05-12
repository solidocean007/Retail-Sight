import {
  ContactPage,
  Gavel,
  Help,
  Info,
  PrivacyTip,
} from "@mui/icons-material";
import "./footer.css";
import { SvgIconTypeMap } from "@mui/material";
import { OverridableComponent } from "@mui/material/OverridableComponent";

// Define a type for the props
type FooterLinkProps = {
  to: string;
  icon: OverridableComponent<SvgIconTypeMap<object, "svg">>;
  children: React.ReactNode;
};

const FooterLink = ({ to, icon: Icon, children }: FooterLinkProps) => {
  return (
    <div className="footer-link">
      <a href={to} className="footer-anchor">
        {Icon && <Icon className="footer-icon" />}
        <p>{children}</p>
      </a>
    </div>
  );
};

const Footer = () => {
  return (
    <footer className="footer-container">
      <div className="footer-content">
        <FooterLink to="/about" icon={Info}>
          About Us
        </FooterLink>
        <FooterLink to="/contact-us" icon={ContactPage}>
          Contact
        </FooterLink>
        <FooterLink to="/privacy-policy" icon={PrivacyTip}>
          Privacy Policy
        </FooterLink>
        <FooterLink to="/terms-service" icon={Gavel}>
          Terms of Service
        </FooterLink>
        <FooterLink to="/help-support" icon={Help}>
          Help & Support
        </FooterLink>
      </div>
    </footer>
  );
};

export default Footer;
