# Fitness Content Intelligence Platform (FCIP)

Welcome to the **Fitness Content Intelligence Platform (FCIP)**, an AI-powered ingestion and analysis engine designed to transform unstructured short-form and long-form video content (from social links like YouTube/Instagram/TikTok or direct uploads) into structured, actionable workout data.

This project is built for the **Antigravity AI Fitness Startup** to bridge the gap between social media fitness inspiration and structured execution in a personal training log.

---

## 🚀 Key Features

*   **Multimodal Ingestion Pipeline**: Ingests video payloads either via public URLs (YouTube, Instagram, TikTok) or direct file uploads (`.mp4`).
*   **Multimodal Exercise Extraction**: Leverages the Google Gemini API to analyze visual movements and audio tracks to extract exercise names, target muscles, equipment, timestamps, step-by-step instructions, and coaching cues.
*   **Temporal Localization**: Automatically identifies the precise start and end timestamps for each exercise segment in the video.
*   **Canonical Normalization**: Standardizes naming variations (e.g., "DB Bench Press" vs. "Dumbbell Flat Chest Press") against a canonical exercise library using vector semantic search and database matching.
*   **Interactive Review Workspace**: A side-by-side editing interface that displays the video player alongside the parsed exercise timeline, allowing users to verify, adjust, and correct AI outputs before logging.
*   **AI Workout Generator**: Generates custom multi-week training programs based on a user's library of saved exercises, tailored to specific goals and preferences.
*   **Observability & Tracking**: End-to-end telemetry and error reporting integrated with Sentry.

---

## 🛠️ Technology Stack

*   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
*   **Library**: [React 19](https://react.dev/)
*   **Styling**: Vanilla CSS (Tailored HSL theme, custom UI tokens)
*   **Database & Auth**: [Supabase](https://supabase.com/) (Auth, Postgres Database, Vector Store for Exercise Embeddings, SSR Integrations)
*   **Multimodal AI Engine**: [Google Gen AI SDK](https://github.com/google/generative-ai-js) (Gemini Models for video/audio processing)
*   **Observability**: [Sentry](https://sentry.io/) for server-side & client-side exception capture

---

## ⚙️ Project Structure

```
├── .agents/                    # Custom agent instructions, rules, and skills
├── docs/                       # Product requirements (PRD) and documentation
├── public/                     # Static assets (images, icons)
├── scratch/                    # Scratchpad files (e.g., database type generation scripts)
└── src/
    └── app/
        ├── api/
        │   ├── ingest/         # API Endpoint for parsing video URLs and uploads
        │   └── generate-program/# API Endpoint for program creation
        ├── auth/               # Authentication flows
        ├── ingest/             # Review Workspace frontend component
        ├── login/              # Log in client interface
        ├── onboarding/         # Onboarding wizard flow
        ├── DashboardClient.tsx # Main dashboard workspace UI
        ├── globals.css         # Custom styling system and CSS variables
        ├── layout.tsx          # Root layout
        └── page.tsx            # Entry point
```

---

## 🏃 Getting Started

### 1. Prerequisites

Ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v18+ recommended)
*   [Supabase CLI](https://supabase.com/docs/guides/cli) (if running migrations or generating local types)

### 2. Environment Setup

Create a `.env.local` file in the root directory. You can use the following template:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
SUPABASE_DB_PASSWORD=your-supabase-db-password

# Google Gemini API Configuration
GEMINI_API_KEY=your-gemini-api-key

# Sentry Configuration (Optional/Build)
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

### 3. Installation

Install all required node packages:

```bash
npm install
```

### 4. Database Type Generation

To keep TypeScript types strictly in sync with the Supabase schema, run:

```bash
npm run gen:types
```

### 5. Running the Development Server

Start the local server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🔬 Observability & Architecture Rules

*   **Sentry Logging**: Every database mutation, transaction, and third-party API request (such as Gemini file uploads and query executions) is wrapped in error handling and reported using `Sentry.captureException` to ensure system observability.
*   **Type Safety**: Always compile with full TypeScript compliance using the generated Supabase types. Do not use loose types or bypass schemas.
