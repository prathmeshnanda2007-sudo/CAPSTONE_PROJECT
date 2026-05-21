import app from './app';
import logger from './utils/logger';
import { pingRedis } from './config/redis';

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  logger.info(`Server listening on port ${PORT}`);
  // Verify Redis connectivity at startup (non-blocking)
  await pingRedis();
});
