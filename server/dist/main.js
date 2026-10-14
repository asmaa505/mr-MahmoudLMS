"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const helmet_1 = require("helmet");
const compression_1 = require("compression");
const app_module_1 = require("./app.module");
const transform_interceptor_1 = require("./common/interceptors/transform.interceptor");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('port', 5000);
    const apiPrefix = configService.get('apiPrefix', 'api/v1');
    const allowedOrigins = configService.get('allowedOrigins', ['http://localhost:3000']);
    app.setGlobalPrefix(apiPrefix);
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        crossOriginEmbedderPolicy: false,
    }));
    app.use((0, compression_1.default)());
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
                callback(null, true);
            }
            else {
                callback(new Error(`Origin ${origin} not permitted by CORS policy`));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'x-device-fingerprint',
            'Range',
            'X-Requested-With',
        ],
        exposedHeaders: [
            'Content-Range',
            'Accept-Ranges',
            'Content-Length',
            'Content-Type',
        ],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
        validationError: {
            target: false,
            value: false,
        },
    }));
    app.useGlobalInterceptors(new transform_interceptor_1.TransformInterceptor());
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter());
    app.enableShutdownHooks();
    await app.listen(port);
    logger.log(`================================================================`);
    logger.log(` Physics LMS Backend Server is running successfully!`);
    logger.log(` Platform: Prof. Mahmoud El-Shahat Physics Platform`);
    logger.log(` Port: ${port}`);
    logger.log(` API Endpoint: http://localhost:${port}/${apiPrefix}`);
    logger.log(`================================================================`);
}
bootstrap();
//# sourceMappingURL=main.js.map