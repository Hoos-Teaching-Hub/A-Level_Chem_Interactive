import { useEffect, useState } from 'react';

export type Role = 'student' | 'teacher';

const ROLE_STORAGE_KEY = 'chem.role';

export const getStoredRole = (): Role | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.sessionStorage.getItem(ROLE_STORAGE_KEY);
  return stored === 'student' || stored === 'teacher' ? stored : null;
};

export const setStoredRole = (role: Role) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(ROLE_STORAGE_KEY, role);
  window.dispatchEvent(new Event('role-change'));
};

export const clearStoredRole = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(ROLE_STORAGE_KEY);
  window.dispatchEvent(new Event('role-change'));
};

export const useRole = (): Role | null => {
  const [role, setRole] = useState<Role | null>(() => getStoredRole());

  useEffect(() => {
    const syncRole = () => setRole(getStoredRole());

    // Listen for both storage updates (cross-tab) and a local custom event
    // so role-aware UI updates immediately after a join/login in this tab.
    window.addEventListener('storage', syncRole);
    window.addEventListener('role-change', syncRole);

    return () => {
      window.removeEventListener('storage', syncRole);
      window.removeEventListener('role-change', syncRole);
    };
  }, []);

  return role;
};
