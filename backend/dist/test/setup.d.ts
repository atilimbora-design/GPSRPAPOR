declare global {
    namespace jest {
        interface Matchers<R> {
            toBeValidUUID(): R;
            toBeValidDate(): R;
        }
    }
}
export declare const createTestUser: (overrides?: any) => Promise<import("@/models").User>;
export declare const createTestLocation: (userId: number, overrides?: any) => Promise<import("@/models").Location>;
export declare const createTestMessage: (senderId: number, overrides?: any) => Promise<import("@/models").Message>;
export declare const generateTestJWT: (userId: number, role?: string) => any;
//# sourceMappingURL=setup.d.ts.map