// Cloudflare Pages Functions entry point. The dashboard's "Connect to Git"
// flow for this project deploys it as Pages (not a standalone Worker), so
// the Hono app needs this catch-all file instead of a plain `export default`
// Worker — same app, same routes, just adapted to how Pages Functions wires
// requests in. See ../src/index.ts for the actual app/routes.
import { handle } from 'hono/cloudflare-pages';
import app from '../src/index';

export const onRequest = handle(app);
