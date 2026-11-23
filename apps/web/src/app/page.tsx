import { serverConfig } from "@/lib/config";

// Placeholder until the landing page (Stage 2+). Proves the web deploys.
export default function HomePage() {
  return (
    <main>
      <h1>{serverConfig.PLATFORM_NAME}</h1>
      <p>Laboratory information system. Coming soon.</p>
    </main>
  );
}
