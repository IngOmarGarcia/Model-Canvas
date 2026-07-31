import type { UserRole } from '@/db/schema/enums';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    id?: string;
    role: UserRole;
    organizationId: string;
    /** Capacitación activa del usuario; null si el facilitador aún no creó ninguna. */
    trainingSessionId: string | null;
    mustChangePassword: boolean;
    fullName: string;
    username: string;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      organizationId: string;
      trainingSessionId: string | null;
      mustChangePassword: boolean;
      fullName: string;
      username: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole;
    organizationId: string;
    trainingSessionId: string | null;
    mustChangePassword: boolean;
    fullName: string;
    username: string;
  }
}
