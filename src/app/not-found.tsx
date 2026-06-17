import React from "react";
import Link from "next/link";
import { ChevronLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <div className="flex flex-col items-center max-w-md p-8 border border-border-subtle rounded-xl bg-surface-1 shadow-2xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary opacity-10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-secondary opacity-10 rounded-full blur-3xl pointer-events-none" />

        <div className="p-3 mb-6 bg-surface-2 rounded-full border border-border-subtle inline-flex items-center justify-center relative z-10">
          <Compass className="w-8 h-8 text-primary" />
        </div>
        
        <h1 className="text-6xl font-extrabold tracking-tight text-foreground mb-4 relative z-10">
          404
        </h1>
        
        <h2 className="text-xl font-semibold text-foreground mb-3 relative z-10">
          Page Not Found
        </h2>
        
        <p className="text-text-muted mb-8 leading-relaxed relative z-10">
          The document or page you are looking for doesn't exist or has been moved. Please check the URL or return to the dashboard.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium transition-colors bg-primary text-foreground rounded-md hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background relative z-10"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}

// sync doc pipeline
