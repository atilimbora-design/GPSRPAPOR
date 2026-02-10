import { Request, Response, NextFunction } from 'express';
import { User } from '@/models';
import { JwtPayload } from '@/types';
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload & {
                dbUser?: User;
            };
        }
    }
}
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireOwnershipOrAdmin: (userIdParam?: string) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requirePersonnel: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAnyRole: (...roles: Array<"personnel" | "admin">) => (req: Request, res: Response, next: NextFunction) => void;
export declare enum Permission {
    USER_READ = "user:read",
    USER_CREATE = "user:create",
    USER_UPDATE = "user:update",
    USER_DELETE = "user:delete",
    USER_MANAGE_ROLES = "user:manage_roles",
    LOCATION_READ_OWN = "location:read_own",
    LOCATION_READ_ALL = "location:read_all",
    LOCATION_CREATE = "location:create",
    MESSAGE_READ_OWN = "message:read_own",
    MESSAGE_READ_ALL = "message:read_all",
    MESSAGE_CREATE = "message:create",
    MESSAGE_DELETE = "message:delete",
    REPORT_READ = "report:read",
    REPORT_CREATE = "report:create",
    REPORT_DELETE = "report:delete",
    SYSTEM_ADMIN = "system:admin",
    SYSTEM_MONITOR = "system:monitor"
}
export declare const hasPermission: (role: "personnel" | "admin", permission: Permission) => boolean;
export declare const requirePermission: (...permissions: Permission[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const generateToken: (user: User) => string;
export declare const generateRefreshToken: (user: User) => string;
export declare const verifyRefreshToken: (token: string) => number;
export declare const logAuthAttempt: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map