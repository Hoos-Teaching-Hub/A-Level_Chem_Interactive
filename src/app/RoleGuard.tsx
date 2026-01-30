import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useRole, type Role } from './roleStore';

type RoleGuardProps = {
  blockedRoles: Role[];
  redirectTo: string;
  children: ReactNode;
};

export function RoleGuard({ blockedRoles, redirectTo, children }: RoleGuardProps) {
  const role = useRole();

  // We only redirect when a known role is explicitly blocked. This lets
  // unauthenticated users reach the teacher login, while preventing students
  // from visiting teacher-only routes after they join.
  if (role && blockedRoles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
