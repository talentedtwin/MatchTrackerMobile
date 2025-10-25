import { ClerkProvider } from '@clerk/nextjs';
import { useEffect } from 'react';
import '../styles/globals.css';
import { startNotificationScheduler } from '../lib/matchNotificationScheduler.js';

let schedulerTask = null;

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Start the notification scheduler when the app loads
    if (!schedulerTask) {
      schedulerTask = startNotificationScheduler();
      console.log('Match notification scheduler started');
    }

    // Cleanup on unmount (though this rarely happens in Next.js)
    return () => {
      if (schedulerTask) {
        schedulerTask.stop();
        schedulerTask = null;
      }
    };
  }, []);

  return (
    <ClerkProvider>
      <Component {...pageProps} />
    </ClerkProvider>
  );
}

export default MyApp;
