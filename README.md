# Displaygram.com - Instant Retail Image Archiving and Tracking

## Description

Displaygram.com is a collaborative platform for sales teams, suppliers, and distributors to capture, archive, and share retail display images. It enables companies to create and manage goals for specific stores, allowing team members to submit posts tied to those goals. Suppliers can view posts from connected distributors for shared brands in their portfolio, with robust role-based permissions ensuring each user sees only the relevant data. The platform supports dynamic account management, goal importing (e.g., Gallo API), and company-specific user onboarding to make field execution visible across an entire network.  Suppliers can view posts from connected distributors for shared brands in their portfolio, with robust role-based permissions ensuring each user sees only the relevant data. Team members and partners can also provide direct feedback and start discussions on individual displays, helping capture not only the ‘what’ but also the ‘why’ of execution.

## 🌟 Key Features

- 📸 **Post Creation:** Capture and post images of retail displays, tagging them with location and goal details.
- 🗺 **Store Selection:** Assign each post to a store using Google Maps API for accurate tagging.
- 🎯 **Goal Tracking:** Attach posts to company or supplier goals (e.g., Gallo wine programs) for streamlined reporting.
- 🧑‍🤝‍🧑 **Team Collaboration:** Users can view and interact with posts from others in their company or supplier network.
- 🔐 **Permissions & Roles:** Role-based access for admins, sales reps, and suppliers to control what each user sees and can do.
- 💬 **Feedback & Discussion**: Posts can receive direct comments from teammates, suppliers, or distributors. This enables real-time feedback, Q&A, and discussion on each display.
- 🎁 **Recognition & Rewards** (Planned): Companies may optionally attach prizes, shout-outs, or incentives to displays that meet goals or stand out for creativity.

🔁 Real-Time Collaboration
💬 Commenting System: Users can add, like, and delete comments on posts. Comment modals show timestamps and dynamically update.

❤️ Like Comments: Tap the heart to show appreciation. Liked by you = ❤️, otherwise 🤍.

👥 User Attribution: Comment usernames are clickable for deeper insights.

📊 Advanced Goal Tracking
📈 Track post submissions across accounts and users.

🧮 Auto-calculates completion percentage.

🎯 Set per-user submission quotas.

🗂 Admin view of user and account progress via toggleable tables.

🧠 Smart Account Management

🔍 Use the multi-account selector to assign goals to stores across your company.

📝 If no accounts exist, users can manually create one on the fly — not ideal, but useful in a pinch.

⚠️ Built-in fuzzy matching helps prevent accidental duplicates when entering store info.

📦 Paginated, searchable account tables for fast setup.

✅ Select/deselect all accounts with one click.

🖼 Post Detail Viewer
🔎 View full post details in a blur-up modal.

💬 Interact with comments in-context from the post view.

⚡ Cached and lazy-loaded for performance.

---

🆕 User Onboarding & Access Control

- 🚪 Invite-Based Access (Preferred)

- New users are invited by existing admins to join their company as either a Distributor or Supplier.

- Invite links pre-fill company and user type during signup for seamless onboarding.

- Users gain full access immediately after signup if invited.

📝 Fallback: Request Access Form

- If a user signs up without an invite, they must complete a Request Access form:

- Select whether they are a Distributor or Supplier.

- Provide company details and contact info.

- Submit the form for review.

- Request details are emailed to the platform admin and saved in Firestore for developer dashboard review.

🎯 Free Tier Limitations

- Distributors (Free Tier):

- Up to 5 users.

- 1 Supplier connection.

- Limited access to goal tracking and post analytics.

Suppliers (Free Tier):

- 1 Distributor connection.

- 1 user.

- Limited dashboard insights and no bulk goal import.

- Upgrade options will allow larger teams, multiple supplier/distributor connections, and advanced analytics.

----

## 🛠 Technologies

- **Frontend:** React + TypeScript (Vite for fast dev builds)
- **Authentication:** Firebase Auth (Google OAuth)
- **Database:** Firestore (real-time updates and role-based data security)
- **API Integrations:**
  - (depracated) Google Maps API for store geolocation.  We import customer info instead. 
  - Gallo API for program and goal syncing.
- **IndexedDB:** Client-side caching for offline post creation.

---

## Future Plans as described in the new section above havent been really done yet. The info below kinda mirrors those.

- redesign how companies and users are created.  Rethink how new users and companies join.  
- Build a supplier side dashboard.  Allow suppliers to view posts from connected distributors that post brands they both have in  their portfolio.
- Rename gallo goals and all related logic to something more generic but specific to allow goals to be imported from else where. Integration importing goals....

## Getting Started

To explore and utilize Displaygram.com:

- **View Posts:** Visit [displaygram.com](https://displaygram.com) to see existing retail display posts.
- **Create an Account:** Sign up with your company email to start creating and managing your display posts.
- **Join an Existing Team:** If your company is already registered, contact your admin to get set up with an account.

## Production Hosting Deployment

Production Firebase web configuration belongs in
`front-end/.env.production.local`, which is intentionally ignored by Git. Start
from `front-end/.env.production.example` and obtain the current Firebase Web API
key from the authorized production deployment environment.

Deploy Hosting with:

```bash
firebase deploy --only hosting --project retail-sight
```

The Firebase Hosting predeploy hook validates that the configured key can start
Google OAuth for `displaygram.com`, verifies that the OAuth client belongs to
the `retail-sight` project, and then creates a fresh production build. An
expired, missing, or wrong-project key stops the deployment before upload.

When the Firebase Web API key is rotated, update only
`front-end/.env.production.local` on authorized deployment machines and rerun
the deployment. Do not add a production API-key fallback to application source.

## Contributing

Public contributions are not open at this time. Stay tuned for future updates regarding community contributions.

## Contact

For support, queries, or feedback, please reach out to [clintonwilliams007@gmail.com](mailto:clintonwilliams007@gmail.com).

