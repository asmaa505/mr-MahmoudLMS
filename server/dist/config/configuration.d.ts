declare const _default: () => {
    port: number;
    nodeEnv: string;
    apiPrefix: string;
    allowedOrigins: string[];
    database: {
        url: string | undefined;
    };
    redis: {
        host: string;
        port: number;
        password: string;
        db: number;
        keyPrefix: string;
    };
    jwt: {
        accessSecret: string;
        accessExpiresIn: string;
        refreshSecret: string;
        refreshExpiresIn: string;
    };
    security: {
        deviceRestrictionMode: string;
        streamSecretKey: string;
        signedUrlExpirationSeconds: number;
        videoStoragePath: string;
    };
};
export default _default;
