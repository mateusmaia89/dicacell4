import '../styles/globals.css';
import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    const onMove = (e) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      document.documentElement.style.setProperty('--mx', `${x*100}%`);
      document.documentElement.style.setProperty('--my', `${y*100}%`);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    onMove({ clientX: window.innerWidth*0.7, clientY: window.innerHeight*0.3 });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);
  return <Component {...pageProps} />;
}
