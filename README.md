# Displaygram.com - Instant Retail Image Archiving and Tracking

## Description

Displaygram.com is a collaborative platform for sales teams, suppliers, and distributors to capture, archive, and share retail display images. It enables companies to create and manage goals for specific stores, allowing team members to submit posts tied to those goals. Suppliers can view posts from connected distributors for shared brands in their portfolio, with robust role-based permissions ensuring each user sees only the relevant data. The platform supports dynamic account management, goal importing (e.g., Gallo API), and company-specific user onboarding to make field execution visible across an entire network.

## 🌟 Key Features

- 📸 **Post Creation:** Capture and post images of retail displays, tagging them with location and goal details.
- 🗺 **Store Selection:** Assign each post to a store using Google Maps API for accurate tagging.
- 🎯 **Goal Tracking:** Attach posts to company or supplier goals (e.g., Gallo wine programs) for streamlined reporting.
- 🧑‍🤝‍🧑 **Team Collaboration:** Users can view and interact with posts from others in their company or supplier network.
- 🔐 **Permissions & Roles:** Role-based access for admins, sales reps, and suppliers to control what each user sees and can do.

---

## 🛠 Technologies

- **Frontend:** React + TypeScript (Vite for fast dev builds)
- **Authentication:** Firebase Auth (Google OAuth)
- **Database:** Firestore (real-time updates and role-based data security)
- **API Integrations:**
  - (depracated) Google Maps API for store geolocation.  We import customer info instead. 
  - Gallo API for program and goal syncing.
- **IndexedDB:** Client-side caching for offline post creation.

---

## Future Plans

- redesign how companies and users are created.  Rethink how new users and companies join.  
- Build a supplier side dashboard.  Allow suppliers to view posts from connected distributors that post brands they both have in  their portfolio.
- Rename gallo goals and all related logic to something more generic but specific to allow goals to be imported from else where. Integration importing goals....

## Getting Started

To explore and utilize Displaygram.com:

- **View Posts:** Visit [displaygram.com](https://displaygram.com) to see existing retail display posts.
- **Create an Account:** Sign up with your company email to start creating and managing your display posts.
- **Join an Existing Team:** If your company is already registered, contact your admin to get set up with an account.

## Contributing

Public contributions are not open at this time. Stay tuned for future updates regarding community contributions.

## Contact

For support, queries, or feedback, please reach out to [clintonwilliams007@gmail.com](mailto:clintonwilliams007@gmail.com).

