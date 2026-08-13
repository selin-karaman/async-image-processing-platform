import winston from 'winston';
import ecsFormat from '@elastic/ecs-winston-format';
import { errorLogger as errorLoggerFunction, logger as requestLoggerFunction } from 'express-winston';

const logger = winston.createLogger({
  level: 'info',
  format: ecsFormat({ convertReqRes: true }),
  transports: new winston.transports.Console(),
});

const errorLogger = errorLoggerFunction({
  winstonInstance: logger,
  format: ecsFormat({ convertReqRes: true }),
});

const requestLogger = requestLoggerFunction({
  winstonInstance: logger,
  format: ecsFormat({ convertReqRes: true }),
  msg: 'HTTP {{req.method}} {{res.statusCode}} {{req.url}} - {{res.responseTime}}ms',
});

export { logger, errorLogger, requestLogger };
