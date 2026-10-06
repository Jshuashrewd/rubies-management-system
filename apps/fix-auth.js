const fs = require("fs");
const path = "api/src/middleware/auth.ts";
let s = fs.readFileSync(path, "utf8");
const start = s.indexOf("export async function requireAuth");
const end = s.indexOf("/** Use after requireAuth", start);
if (start === -1 || end === -1) throw new Error("Could not find requireAuth section");
const replacement = `export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  void (async () => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new HttpApiError("unauthorized", "Missing or malformed Authorization header.");
    }
    const token = header.slice("Bearer ".length);
    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new HttpApiError("unauthorized", "Invalid or expired token.");
    }
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new HttpApiError("unauthorized", "User no longer exists.");
    }
    req.user = { id: user.id, role: user.role };
    next();
  })().catch(next);
}`;
fs.writeFileSync(path, s.slice(0,start) + replacement + s.slice(end));
console.log("requireAuth updated successfully");
