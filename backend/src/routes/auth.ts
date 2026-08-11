import { Hono } from "hono";
import { sign } from "hono/jwt";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminUsers } from "../db/schema";
import { verifyPassword } from "../lib/password";
import { createRateLimiter } from "../lib/rate-limit";
import type { Bindings, Variables } from "../types";

// 5 tentativas a cada 5 minutos por IP
const loginLimiter = createRateLimiter(5, 5 * 60 * 1000);

const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

export const authRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .post("/login", async (c) => {
    const ip =
      c.req.header("cf-connecting-ip") ??
      c.req.header("x-forwarded-for") ??
      "local";

    if (!loginLimiter.check(ip)) {
      return c.json(
        { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." },
        429
      );
    }

    const body = await c.req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "E-mail ou senha inválidos." }, 401);
    }

    const db = c.get("db");
    const [user] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, parsed.data.email.toLowerCase()))
      .limit(1);

    // Mesma verificação de hash para usuário inexistente (não vazar se o e-mail existe)
    const hashToCheck =
      user?.passwordHash ??
      "00000000000000000000000000000000:100000:" + "0".repeat(64);
    const ok = await verifyPassword(parsed.data.password, hashToCheck);

    if (!user || !ok) {
      return c.json({ error: "E-mail ou senha inválidos." }, 401);
    }

    const now = Math.floor(Date.now() / 1000);
    const token = await sign(
      { sub: String(user.id), email: user.email, iat: now, exp: now + 2 * 60 * 60 },
      c.env.JWT_SECRET
    );

    return c.json({ token, email: user.email, expiresIn: 7200 });
  });

export default authRoutes;
