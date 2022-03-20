import config from "./config.js";
import server from "./server.js";
import { logger } from "./util.js";

// server.listen(3000).on("listening", () => console.log("server running..."));
server
  .listen(config.port)
  .on("listening", () => logger.info(`server running at ${config.port}.. .`));

//para não quebrar caso um erro não tratado aconteça
// uncaughtException => throw
// unhandledRejection => Promises
process.on("uncaughtException", (error) =>
  logger.error(`unhandledRejection happened: ${error.stack || error}`)
);

process.on("unhandledRejection", (error) =>
  logger.error(`unhandledRejection happened: ${error.stack || error}`)
);
