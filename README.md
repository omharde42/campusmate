# CampusMate — Student Helpdesk Demo

A React + Vite frontend inspired by the CampusMate preview: student landing page, topic cards, chatbot demo, noticeboard, helpdesk tickets, login/signup UI, accessibility settings, and dark/light themes.

## Features
- Responsive landing page based on the existing CampusMate preview
- Login/signup demo UI
- Student dashboard
- CampusMate chatbot with sample local responses
- Noticeboard search and category filters
- Demo ticket creation saved in browser localStorage
- Demo admin notice replacement flow
- Dark/light theme toggle
- Larger text, high contrast, and reduce-motion accessibility settings
- Mobile responsive navigation

## Important prototype limitations
This is a **frontend demo**, not a production helpdesk:
- Authentication is simulated and stored in localStorage. Do not use real passwords.
- Chat responses are local sample logic, not a live AI service.
- Notices are fictional demo data.
- Tickets are saved only in the browser and are not sent to college staff.
- Admin publishing is a local browser simulation.
- No Firebase or Supabase credentials are configured.

Before production, connect Firebase Authentication, Supabase/PostgreSQL, server-side authorization, approved college documents, and a secure backend API. Never put service-role keys or private AI API keys in frontend code.

## Run locally
Install Node.js (LTS), then in the project folder:

```bash
npm install
npm run dev
```

Open the local URL shown by Vite.

Build for deployment:

```bash
npm run build
```

The output is in `dist/`.

## Upload to GitHub
1. Create a new repository on GitHub, for example `campusmate`.
2. Upload the contents of this folder (not the ZIP itself if you want GitHub to show individual files).
3. Commit the files.
4. For Vercel, import the repository. Build command: `npm run build`; output directory: `dist`.

## Project layout
```text
campusmate/
├── index.html
├── package.json
├── README.md
└── src/
    ├── App.jsx
    ├── main.jsx
    └── styles.css
```
