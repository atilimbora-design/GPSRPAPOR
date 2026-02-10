export declare const hashPassword: (password: string) => Promise<string>;
export declare const verifyPassword: (password: string, hash: string) => Promise<boolean>;
export declare const encrypt: (text: string) => {
    encrypted: string;
    iv: string;
    tag: string;
};
export declare const decrypt: (encryptedData: {
    encrypted: string;
    iv: string;
    tag: string;
}) => string;
export declare const generateSecureToken: (length?: number) => string;
export declare const generateSecurePassword: (length?: number) => string;
export declare const hashData: (data: string) => string;
export declare const createHMAC: (data: string, secret?: string) => string;
export declare const verifyHMAC: (data: string, signature: string, secret?: string) => boolean;
export declare const encryptJSON: (data: any) => string;
export declare const decryptJSON: (encryptedString: string) => any;
export declare const generateUUID: () => string;
export declare const sanitizeInput: (input: string) => string;
export declare const generateSessionId: () => string;
export declare const maskSensitiveData: (data: string, visibleChars?: number) => string;
//# sourceMappingURL=encryption.d.ts.map