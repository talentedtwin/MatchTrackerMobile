import { ClerkProvider } from '@clerk/nextjs';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  // Note: The notification scheduler is now handled by Vercel Cron Jobs
  // See: /api/cron/check-matches endpoint

  return (
    <ClerkProvider>
      <Component {...pageProps} />
    </ClerkProvider>
  );
}

export default MyApp;
