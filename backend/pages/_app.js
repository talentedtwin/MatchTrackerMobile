import { ClerkProvider } from '@clerk/nextjs';
import { useEffect } from 'react';
import '../styles/globals.css';
import { startNotificationScheduler } from '../lib/matchNotificationScheduler.js';

let schedulerTask = null;

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Start the notification scheduler when the app loads
    if (!schedulerTask) {
      try {
        schedulerTask = startNotificationScheduler();
        console.log('Match notification scheduler started');
      } catch (error) {
        console.error('Failed to start notification scheduler:', error);
        // Continue app execution even if scheduler fails
      }
    }

    // Cleanup on unmount (though this rarely happens in Next.js)
    return () => {
      if (schedulerTask) {
        try {
          schedulerTask.stop();
          schedulerTask = null;
        } catch (error) {
          console.error('Error stopping scheduler:', error);
        }
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
