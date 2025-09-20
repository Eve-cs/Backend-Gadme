import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 100 requests
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // 🔑 สำคัญ: อย่าจับ preflight (OPTIONS) ไม่งั้น CORS จะไม่ถูกใส่ header
  skip: (req) =>
    req.method === "OPTIONS" || req.path === "/healthz" || req.path === "/",
});

export default limiter;
