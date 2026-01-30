import type { ReactNode } from 'react';
import { useRole, type Role } from './roleStore';

type RoleGateProps = {
  blockedRoles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
};

export function RoleGate({ blockedRoles, children, fallback = null }: RoleGateProps) {
  const role = useRole();

  // UI gating mirrors the route guard rules so teacher-only UI isn't rendered
  // for students, even if a component is mounted in the wrong place.
  if (role && blockedRoles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
