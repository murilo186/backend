const config = require("../config");

class Logger {
  static log(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    };

    if (config.app.env === "development") {
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, meta);
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  static info(message, meta = {}) {
    this.log("info", message, meta);
  }

  static error(message, meta = {}) {
    this.log("error", message, meta);
  }

  static warn(message, meta = {}) {
    this.log("warn", message, meta);
  }

  static debug(message, meta = {}) {
    if (config.app.env === "development") {
      this.log("debug", message, meta);
    }
  }

  static http(req, res, next) {
    const start = Date.now();
    const originalSend = res.send;

    res.send = function(data) {
      const duration = Date.now() - start;
      Logger.info(`${req.method} ${req.url}`, {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get("User-Agent"),
        ip: req.ip || req.connection.remoteAddress
      });

      return originalSend.call(this, data);
    };

    next();
  }
}

module.exports = Logger;