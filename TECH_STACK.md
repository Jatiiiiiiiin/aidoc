# Technology Stack

This document outlines the core technologies, libraries, and frameworks used to build the **Cobebyte Sol. AI Docs Generator**. The application is designed to be highly performant, visually premium, and maintainable.

## 🏗 Core Architecture
*   **[Next.js](https://nextjs.org/) (v16.2.6)**: The React framework for the web. We are utilizing the App Router (`src/app`) for server-side rendering (SSR), static site generation, and optimized client delivery.
*   **[React](https://react.dev/) (v19.2.4)**: The underlying library for building user interfaces, leveraging React Server Components and modern hooks.
*   **[TypeScript](https://www.typescriptlang.org/) (v5)**: Enforces strict static typing across the application for robust, error-free development.

## 🎨 Styling & UI
*   **[Tailwind CSS](https://tailwindcss.com/) (v4)**: Utility-first CSS framework used for responsive, highly customized styling. We use the latest v4 release which integrates directly with PostCSS.
*   **[Lucide React](https://lucide.dev/)**: Clean, beautiful, and customizable SVG icons used throughout the dashboard and documentation viewer.
*   **UI Utility Libraries**: 
    *   `clsx` & `tailwind-merge`: For dynamic, conflict-free class name construction.
    *   `class-variance-authority` (CVA): For managing scalable UI component variants.

## 🗄 Backend & Data
*   **[Supabase](https://supabase.com/) (`@supabase/supabase-js`)**: Our open-source Firebase alternative utilized as a Backend-as-a-Service (BaaS) for PostgreSQL database storage and document version tracking.
*   **[Zod](https://zod.dev/)**: TypeScript-first schema declaration and validation library. Used to enforce strict type-safety on API responses and AI-generated documentation schemas (`src/lib/schema.ts`).

## 📄 Documentation Features
*   **[Fumadocs](https://fumadocs.vercel.app/)**: (`fumadocs-core`, `fumadocs-ui`) Provides the underlying documentation architecture and structured layout handling.
*   **[docx](https://docx.js.org/)**: Advanced library used for dynamically generating rich Word (`.docx`) files from our internal document schemas directly in the client browser.
*   **[FileSaver.js](https://github.com/eligrey/FileSaver.js/)**: Triggers the native browser download prompt for exported documents.

## ⚙️ Build Tools & Linting
*   **ESLint (v9)**: Ensures code quality and standardizes formatting alongside Next.js's integrated configurations.
*   **Geist Font**: We utilize Vercel's *Geist Sans* and *Geist Mono* fonts (via `next/font/google`) for a clean, minimalist typography experience.
