import { handle } from "hono/cloudflare-pages";
import app from "../src/Hono.js";

export const onRequest = handle(app);
