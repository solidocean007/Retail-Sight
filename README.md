# Displaygram.com - Instant Retail Image Archiving and Tracking

## Description

Displaygram.com is a specialized platform designed for sharing and archiving retail displays. It's a valuable tool for sales teams to track and manage displays and coordinate with their teams efficiently. The platform serves as a dynamic display tracker, allowing retailers or suppliers to view and manage displays in real-time, with customizable permissions for different users.

## Features

- **Display Posting:** Capture and post images of retail displays in stores.
- **Location Tagging:** Assign each display a store name and address, integrated with Google Maps API for accurate location tagging.
- **Rich Descriptions:** Add detailed descriptions to each display post, along with hashtags for easy searching and categorization.

## Technologies Used

- **Framework:** React with Vite for an optimized development experience.
- **Language:** TypeScript for scalable and maintainable codebase.
- **Authentication:** Firebase Authentication for secure user management.
- **Database:** Firestore for efficient, real-time back-end storage.
- **API Integration:** Google Maps API for enhanced location functionalities in posts.

## Future Plans

(Outline any upcoming features, improvements, or expansions you plan for Displaygram.com)

## Getting Started

To explore and utilize Displaygram.com:

- **View Posts:** Visit [displaygram.com](https://displaygram.com) to see existing retail display posts.
- **Create an Account:** Sign up with your company email to start creating and managing your display posts.
- **Join an Existing Team:** If your company is already registered, contact your admin to get set up with an account.

## Contributing

Public contributions are not open at this time. Stay tuned for future updates regarding community contributions.

## License

This project is under the [MIT License](LICENSE.md).

## Contact

For support, queries, or feedback, please reach out to [clintonwilliams007@gmail.com](mailto:clintonwilliams007@gmail.com).

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
   parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
   },
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
