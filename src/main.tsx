import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { startUpdater } from './core/updater';
import App from './App';
import PhoneApp from './remote/PhoneApp';
import './styles.css';

startUpdater();

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
