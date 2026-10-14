"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_CODES = exports.DeviceRestrictionMode = exports.ROLES_KEY = exports.REDIS_KEYS = void 0;
exports.REDIS_KEYS = {
    USER_SESSION_PREFIX: 'user_session:',
    ACTIVE_SESSION_PREFIX: 'session:active:',
    USER_DEVICE_PREFIX: 'user:device:',
    TOKEN_BLACKLIST_PREFIX: 'token:blacklist:',
    EXAM_SUBMISSION_LOCK_PREFIX: 'lock:exam:submit:',
    RATE_LIMIT_PREFIX: 'ratelimit:',
    STREAM_TOKEN_PREFIX: 'stream:token:',
    PROGRESS_BUFFER_PREFIX: 'buffer:progress:',
};
exports.ROLES_KEY = 'roles';
var DeviceRestrictionMode;
(function (DeviceRestrictionMode) {
    DeviceRestrictionMode["REPLACE"] = "REPLACE";
    DeviceRestrictionMode["BLOCK"] = "BLOCK";
})(DeviceRestrictionMode || (exports.DeviceRestrictionMode = DeviceRestrictionMode = {}));
exports.ERROR_CODES = {
    UNAUTHORIZED: 'AUTH_001',
    FORBIDDEN: 'AUTH_002',
    INVALID_CREDENTIALS: 'AUTH_003',
    DEVICE_SESSION_EXPIRED: 'AUTH_004',
    CONCURRENT_DEVICE_DETECTED: 'AUTH_005',
    DEVICE_REVOKED: 'AUTH_006',
    ACCOUNT_PENDING_APPROVAL: 'AUTH_007',
    ACCOUNT_BLOCKED: 'AUTH_008',
    TOKEN_EXPIRED: 'AUTH_009',
    COURSE_NOT_ENROLLED: 'COURSE_001',
    EXAM_ALREADY_SUBMITTED: 'EXAM_001',
    EXAM_NOT_FOUND: 'EXAM_002',
    STREAM_TOKEN_INVALID: 'STREAM_001',
};
//# sourceMappingURL=index.js.map