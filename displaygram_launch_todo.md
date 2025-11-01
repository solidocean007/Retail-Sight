# 🚀 Displaygram LLC — Launch & Business Setup Checklist

### 📅 Status
✅ LLC Approved (North Carolina)  
✅ EIN Received (39-5095690)  
✅ Mercury Account Pending  
⬜ Business Bank Funding .. 100 pending from my personal checking to my mercury business 
⬜ Privacy / Terms Setup  

---

## 🏦 1. Banking & Finance
- [X] Open **Mercury** business checking account.. it is pending review
  - Upload: Articles of Organization, EIN letter, Operating Agreement, ID  
  - Set account name to **Displaygram LLC**
- [ ] Link **Braintree payouts** to Mercury account
- [ ] Deposit initial operating capital ($500–$1000 recommended)
- [ ] Enable notifications for deposits and transfers
- [ ] Add accountant or bookkeeper as read-only user
- [ ] Connect to **QuickBooks / Wave / Xero**

---

## 💳 2. Payment Processing (Braintree)
- [ ] Switch Firebase config to **Production keys**
  ```bash
  firebase functions:config:set \
    braintree.merchant_id="..." \
    braintree.public_key="..." \
    braintree.private_key="..." \
    braintree.environment="production"
  ```
- [ ] Test a real paid subscription checkout (not sandbox)
- [ ] Confirm Firestore updates on:
  - Company `plan`, `billing`, and `paymentStatus`
  - Webhook sync for successful payment + cancellations
- [ ] Verify add-on purchases and proration logic

---

## 🌐 3. Legal & Compliance Pages
- [ ] Create accounts at [https://termly.io](https://termly.io)
- [ ] Generate:
  - [ ] Privacy Policy  
  - [ ] Terms & Conditions  
  - [ ] Cookie Policy / Consent Banner  
  - [ ] Security & Data Protection Policy (optional)
- [ ] Add links to footer (`/privacy`, `/terms`, `/cookies`)
- [ ] Include © Displaygram LLC + Contact link in footer

---

## 💼 4. Accounting & Taxes
- [ ] Register at **NC Department of Revenue** for Sales & Use Tax (if SaaS taxable)
  - [https://www.ncdor.gov/taxes-forms/business-registration](https://www.ncdor.gov/taxes-forms/business-registration)
- [ ] Track all expenses + income via accounting software
- [ ] File **Annual Report** by April 15 each year ($200)
- [ ] Keep digital copies of:
  - EIN letter  
  - Articles of Organization  
  - Operating Agreement  
  - First bank statement  

---

## 🧰 5. Displaygram App Launch Prep
- [ ] Confirm plan tiers display correctly on Pricing Page
- [ ] Test:
  - [ ] Free → Paid plan upgrade  
  - [ ] Downgrade + Cancel flows  
  - [ ] Add-on adjustments  
- [ ] Check UI sync for BillingDashboard and CheckoutModal
- [ ] Verify Firestore security rules block over-limit user or connection creation

---

## 🔒 6. Compliance & Security
- [ ] Enable **Firebase App Check** for all client apps
- [ ] Restrict writes to billing fields (Firestore rules)
- [ ] Add HTTPS redirect and security headers on Firebase Hosting
- [ ] Optional: Register for a **DUNS Number** (credibility with vendors)

---

## 💬 7. Website & Branding
- [ ] Set up **support@displaygram.com** (Google Workspace or Zoho)
- [ ] Upload favicon & updated logo to splash page
- [ ] Include “Powered by Displaygram” on demo environments
- [ ] Add links to:
  - Pricing
  - Billing
  - Privacy / Terms
  - Contact

---

## 💡 8. Investor Readiness (Mercury + Braintree)
- [ ] Complete **Mercury Raise** application  
  [https://mercury.com/raise](https://mercury.com/raise)
- [ ] Join Mercury Community Slack
- [ ] Use Mercury dashboard for:
  - Runway & burn rate tracking  
  - Automated statements
- [ ] Create an “Investor Data Room” folder with:
  - Articles of Organization  
  - EIN Letter  
  - Bank verification letter (from Mercury)  
  - Latest financial snapshot (Braintree + QuickBooks export)
- [ ] Prepare 1-page Displaygram pitch summary (optional for later)

---

## 📈 9. Marketing & Outreach
- [ ] Register Google Analytics or Plausible for tracking
- [ ] Create **LinkedIn Company Page**
- [ ] Add short “About” description:
  > Displaygram helps beverage distributors and suppliers collaborate, share retail display data, and manage brand performance.
- [ ] Build initial outreach list (Healy Wholesale, New Belgium, Gallo, etc.)
- [ ] Plan early pilot program for 1–2 distributors

---

## 🗂️ 10. Document Storage
Keep these in a secure “Displaygram Legal” folder:
- EIN Letter (CP-575)
- Articles of Organization
- Operating Agreement
- Mercury Bank Welcome Letter
- First Invoice & Payment Receipt
- Termly-generated policies
- Annual Report PDFs

---

## ✅ Progress Tracking
| Area | Status |
|------|--------|
| LLC Formation | ✅ Complete |
| EIN / Taxes | ✅ Complete |
| Mercury Setup | ⬜ Pending |
| Braintree Live Keys | ⬜ Pending |
| Website Legal Pages | ⬜ In Progress |
| App Testing | ⬜ Ongoing |
| Investor Readiness | ⬜ Later Stage |

---

### 💬 Notes
This checklist is designed for *Displaygram LLC* (Fayetteville, NC).  
Keep it in your repository or Google Drive and mark items off as you complete them.
