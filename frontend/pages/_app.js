// pages/_app.js
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuthStore } from '../store';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    initAuth();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <Component {...pageProps} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            backdropFilter: 'blur(20px)',
            fontFamily: 'var(--font-body)',
          },
          success: { iconTheme: { primary: '#6771f1', secondary: '#fff' } },
        }}
      />
    </ThemeProvider>
  );
}
