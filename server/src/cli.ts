import { buildControlPlaneApp } from "./http/app.js";
import { loadServerConfig } from "./config/index.js";

const config = loadServerConfig();
const app = await buildControlPlaneApp(config);

try {
  await app.listen({
    host: config.host,
    port: config.port
  });

  console.log(`mobile-viewer server listening on http://${config.host}:${config.port}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
