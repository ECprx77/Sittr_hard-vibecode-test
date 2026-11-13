import { config } from './config.js';
import { createApp } from './app.js';

const app = createApp();

export default app;

if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`Sittr API http://localhost:${config.port}`);
  });
}
