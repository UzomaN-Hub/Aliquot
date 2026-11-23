import { serverConfig } from "@/lib/config";

// Placeholder until the landing page (Stage 17). Proves tokens and fonts load.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-5">
      <h1 className="font-serif text-hero-sm tracking-headline md:text-hero">
        {serverConfig.PLATFORM_NAME}
        <span className="text-eosin">.</span>
      </h1>
      <p className="text-body-lg text-ink-secondary">Laboratory information system. Coming soon.</p>
    </main>
  );
}
