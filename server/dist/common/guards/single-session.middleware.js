"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSingleSessionMiddleware = createSingleSessionMiddleware;
function createSingleSessionMiddleware(redisClient) {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user || !user.id) {
                return res.status(401).json({
                    success: false,
                    statusCode: 401,
                    message: 'غير مصرح بالوصول: يرجى تسجيل الدخول أولاً.',
                    errorCode: 'AUTH_001',
                });
            }
            if (user.role === 'ADMIN' || user.role === 'TEACHER') {
                return next();
            }
            const headerSessionId = req.headers['x-session-id']?.trim();
            const incomingSessionId = headerSessionId || user.sessionId;
            if (!incomingSessionId) {
                return res.status(401).json({
                    success: false,
                    statusCode: 401,
                    message: 'معرف الجلسة غير صالح أو مفقود. يرجى تسجيل الدخول مجدداً.',
                    errorCode: 'AUTH_004',
                });
            }
            const redisKey = `user_session:${user.id}`;
            const activeSessionId = await redisClient.get(redisKey);
            if (!activeSessionId || activeSessionId !== incomingSessionId) {
                return res.status(401).json({
                    success: false,
                    statusCode: 401,
                    message: 'تم تسجيل الدخول من جهاز آخر. تم إنهاء جلستك الحالية.',
                    errorCode: 'AUTH_005',
                });
            }
            return next();
        }
        catch (error) {
            console.error('Error in singleSessionMiddleware:', error);
            return res.status(500).json({
                success: false,
                statusCode: 500,
                message: 'حدث خطأ أثناء التحقق من جلسة الجهاز',
            });
        }
    };
}
//# sourceMappingURL=single-session.middleware.js.map