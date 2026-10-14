export declare const REDIS_KEYS: {
    readonly USER_SESSION_PREFIX: "user_session:";
    readonly ACTIVE_SESSION_PREFIX: "session:active:";
    readonly USER_DEVICE_PREFIX: "user:device:";
    readonly TOKEN_BLACKLIST_PREFIX: "token:blacklist:";
    readonly EXAM_SUBMISSION_LOCK_PREFIX: "lock:exam:submit:";
    readonly RATE_LIMIT_PREFIX: "ratelimit:";
    readonly STREAM_TOKEN_PREFIX: "stream:token:";
    readonly PROGRESS_BUFFER_PREFIX: "buffer:progress:";
};
export declare const ROLES_KEY = "roles";
export declare enum DeviceRestrictionMode {
    REPLACE = "REPLACE",
    BLOCK = "BLOCK"
}
export declare const ERROR_CODES: {
    readonly UNAUTHORIZED: "AUTH_001";
    readonly FORBIDDEN: "AUTH_002";
    readonly INVALID_CREDENTIALS: "AUTH_003";
    readonly DEVICE_SESSION_EXPIRED: "AUTH_004";
    readonly CONCURRENT_DEVICE_DETECTED: "AUTH_005";
    readonly DEVICE_REVOKED: "AUTH_006";
    readonly ACCOUNT_PENDING_APPROVAL: "AUTH_007";
    readonly ACCOUNT_BLOCKED: "AUTH_008";
    readonly TOKEN_EXPIRED: "AUTH_009";
    readonly COURSE_NOT_ENROLLED: "COURSE_001";
    readonly EXAM_ALREADY_SUBMITTED: "EXAM_001";
    readonly EXAM_NOT_FOUND: "EXAM_002";
    readonly STREAM_TOKEN_INVALID: "STREAM_001";
};
