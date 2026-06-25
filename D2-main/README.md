# KESCO Summer Internship 2026 — Dashboard

> **"Kar rahe hain aapki duniya roshan!"**  
> An interactive project tracking dashboard for KESCO's Summer Internship 2026, built with React + Tailwind CSS.

---

## Features

- **Real-time clock** on the Dashboard header
- **Project overview**: 4 internship projects with progress tracking
- **Charts**: Bar, Line, and Pie charts via Recharts — per project and on the overview
- **Keyboard navigation** in the Projects list (↑ ↓ to browse, Enter to open, Esc to go back)
- **Per-project detail view** with tabs: Overview · Daily Updates · Files
- **PPT Upload**: Upload `.pptx`, `.ppt`, or `.pdf` per project — opens a preview/link
- **Glassmorphism UI** with KESCO yellow/gold theme, responsive card layouts

---

## Project Structure

```
kesco-dashboard/
├── public/
│   └── index.html              # HTML shell with Google Fonts
├── src/
│   ├── data/
│   │   └── projects.js         # All project data, team members, activity feed
│   ├── components/
│   │   ├── KescoLogo.jsx       # SVG logo with केस्को branding
│   │   ├── Sidebar.jsx         # Left navigation (Dashboard / Projects + user card)
│   │   ├── Dashboard.jsx       # Overview page: KPIs, charts, activity table
│   │   └── Projects.jsx        # Project list + detail view with PPT upload
│   ├── App.jsx                 # Root layout (Sidebar + view switcher)
│   ├── index.js                # React entry point
│   └── index.css               # Tailwind directives + scrollbar styling
├── tailwind.config.js          # Custom KESCO color tokens + font families
├── postcss.config.js
├── package.json
└── README.md
```

---

## Setup & Running Locally

### Prerequisites
- **Node.js** v18+ ([download](https://nodejs.org/))
- **npm** v9+ (comes with Node)

### Steps

```bash
# 1. Clone or extract the project
cd kesco-dashboard

# 2. Install dependencies
npm install

# 3. Start the development server
npm start
```

The app opens at **http://localhost:3000** automatically.

---

## File Placement Guide

Place these files exactly as shown:

```
kesco-dashboard/
├── package.json            ← root
├── tailwind.config.js      ← root
├── postcss.config.js       ← root
├── public/
│   └── index.html          ← inside public/
└── src/
    ├── index.js            ← inside src/
    ├── index.css           ← inside src/
    ├── App.jsx             ← inside src/
    ├── data/
    │   └── projects.js     ← create src/data/ folder
    └── components/
        ├── KescoLogo.jsx   ← create src/components/ folder
        ├── Sidebar.jsx
        ├── Dashboard.jsx
        └── Projects.jsx
```

---

## How to Add / Modify Projects

Open `src/data/projects.js` and edit the `PROJECTS` array.

Each project object contains:

| Field | Type | Description |
|---|---|---|
| `id` | number | Unique identifier |
| `name` | string | Full project name |
| `shortName` | string | 2–4 letter abbreviation (shown on charts) |
| `status` | string | `"In Progress"` / `"Completed"` / `"Not Started"` |
| `members` | string[] | Team member names |
| `objective` | string | One-sentence project goal |
| `workingOn` | string[] | Current task bullets |
| `methodology` | string[] | Approach steps |
| `deliverables` | string[] | Expected outputs |
| `progress` | number | 0–100 (percentage) |
| `updates` | object[] | Daily update entries (date, title, desc, member, time) |
| `chartData` | object | `bar`, `line`, and/or `pie` data arrays for Recharts |

---

## Where to Upload PPTs

1. Navigate to **Projects** tab
2. Click any project to open its detail view
3. Click the **"Upload PPT"** button (top-right, yellow button)
4. In the modal, click the dashed upload zone or the modal area
5. Select `.pptx`, `.ppt`, or `.pdf`

The file is stored in browser memory for the session. The **Files tab** inside the project shows the uploaded file and a preview link.

> **Note:** To persist PPTs across sessions, integrate a backend (Firebase Storage, Supabase, AWS S3) and update `handlePptUpload` in `Projects.jsx` to upload the file and store the URL.

---

## Customizing Data

### Adding a new update to a project
In `src/data/projects.js`, add to the `updates` array of the relevant project:

```js
{
  date: "2026-06-11",
  title: "New finding",
  desc: "Detailed description of what was done.",
  member: "Riya Singh",
  time: "10:30 AM",
}
```

### Changing chart data
Edit `chartData.bar`, `chartData.line`, or `chartData.pie` in the project object.

---

## Build for Production

```bash
npm run build
```

Creates an optimized `build/` folder ready to deploy.

---

## Deployment Options

### Option A — Vercel (Recommended, free)

```bash
npm install -g vercel
vercel
```

Follow the prompts. Your dashboard will be live at `https://kesco-dashboard.vercel.app`.

### Option B — Netlify (free)

1. `npm run build`
2. Drag the `build/` folder into [netlify.com/drop](https://netlify.com/drop)

### Option C — GitHub Pages

```bash
npm install --save-dev gh-pages
```

Add to `package.json`:
```json
"homepage": "https://yourusername.github.io/kesco-dashboard",
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d build"
}
```

Then:
```bash
npm run deploy
```

### Option D — Local Network (office deployment)

```bash
npm run build
npx serve -s build -l 3000
```

Share `http://<your-ip>:3000` with the team on the same network.

---

## Tech Stack

| Library | Purpose |
|---|---|
| React 18 | UI framework |
| Tailwind CSS | Utility-first styling |
| Recharts | Bar, Line, Pie charts |
| Lucide React | Icons |
| date-fns | Date formatting |
| Plus Jakarta Sans / Inter | Typography |

---

## Extending the Dashboard

| Feature | How to add |
|---|---|
| **Real-time data sync** | Connect `projects.js` to Firebase Firestore or a REST API |
| **Authentication** | Add Firebase Auth or Supabase Auth before rendering `<App />` |
| **Export to Excel** | Use `xlsx` npm package on the dashboard data |
| **Email/WhatsApp alerts** | Trigger via a Node.js backend when progress updates |
| **PPT persistence** | Upload to Firebase Storage; store URL in Firestore |

---

## License

For internal use by KESCO Summer Internship 2026 team only.

---

*Powering Lives. Energizing Future. — KESCO*
# KESCO-Dashboard
# dashboard
# dashboard
# dashboard
