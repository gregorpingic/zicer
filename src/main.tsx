import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import PhoneApp from './remote/PhoneApp';
import './styles.css';

// Nova verzija aplikacije provjerava se pri pokretanju i svaki put kad se aplikacija vrati u prvi plan
// (instalirana aplikacija na mobitelu inače može danima raditi sa starom verzijom).
registerSW({
  immediate: true,
  onRegisteredSW(_url, r) {
    if (!r) return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void r.update();
    });
  },
});

const isPhone = () => location.hash.startsWith('#mobitel');

/** #mobitel… otvara upravljač za mobitel, sve ostalo glavnu aplikaciju. */
function Root() {
  const [phone, setPhone] = useState(isPhone);
  useEffect(() => {
    const h = () => setPhone(isPhone());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  return phone ? (
    <PhoneApp
      onLeave={() => {
        history.replaceState(null, '', location.pathname + location.search);
        setPhone(false);
      }}
    />
  ) : (
    <App />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
