const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 4000);
const PROFILE_FILE = path.join(__dirname, "data", "profile.json");
const CARDS_FILE = path.join(__dirname, "data", "cards.json");

process.stdout.on("error", () => {});
process.stderr.on("error", () => {});

const log = (message) => {
  try {
    console.log(message);
  } catch {
    // Some desktop launchers close stdout after detaching the process.
  }
};

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(payload, null, 2));
};

const readJson = async (file) => JSON.parse(await fs.readFile(file, "utf8"));

const writeJson = async (file, payload) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const readProfile = async () => readJson(PROFILE_FILE);

const hashPassword = (password) =>
  crypto.createHash("sha256").update(String(password || ""), "utf8").digest("hex");

const makeSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

const makeInitials = (name) => {
  const clean = String(name || "").trim();
  if (!clean) {
    return "ME";
  }
  const ascii = clean.match(/[a-zA-Z]/g);
  if (ascii && ascii.length >= 2) {
    return `${ascii[0]}${ascii[1]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
};

const normalizeList = (items, mapper) => (Array.isArray(items) ? items.map(mapper).filter(Boolean) : []);

const normalizeProfile = (input) => {
  const profile = input && typeof input === "object" ? input : {};
  const name = String(profile.name || "").trim();
  const title = String(profile.title || "").trim();
  const location = String(profile.location || "").trim();

  return {
    name,
    title,
    location,
    tagline: String(profile.tagline || "").trim(),
    summary: String(profile.summary || "").trim(),
    avatarInitials: String(profile.avatarInitials || makeInitials(name)).trim().slice(0, 4),
    availability: String(profile.availability || "开放交流").trim(),
    contacts: normalizeList(profile.contacts, (contact) => {
      if (!contact || !contact.label) {
        return null;
      }
      return {
        type: String(contact.type || "Link").trim(),
        label: String(contact.label || "").trim(),
        href: String(contact.href || "#").trim()
      };
    }),
    links: normalizeList(profile.links, (link) => {
      if (!link || !link.label) {
        return null;
      }
      return {
        label: String(link.label || "").trim(),
        href: String(link.href || "#").trim()
      };
    }),
    skills: normalizeList(profile.skills, (skill) => String(skill || "").trim()).filter(Boolean),
    services: normalizeList(profile.services, (service) => {
      if (!service || !service.name) {
        return null;
      }
      return {
        name: String(service.name || "").trim(),
        detail: String(service.detail || "").trim()
      };
    }),
    stats: normalizeList(profile.stats, (stat) => {
      if (!stat || !stat.value) {
        return null;
      }
      return {
        value: String(stat.value || "").trim(),
        label: String(stat.label || "").trim()
      };
    })
  };
};

const validateProfile = (profile) => {
  if (!profile.name || !profile.title || !profile.tagline) {
    return "姓名、职位和个人签名必填。";
  }
  if (profile.name.length > 40 || profile.title.length > 80 || profile.tagline.length > 120) {
    return "姓名、职位或个人签名过长。";
  }
  return "";
};

const readCards = async () => {
  try {
    return await readJson(CARDS_FILE);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    const defaultProfile = normalizeProfile(await readProfile());
    const cards = {
      linzhixing: {
        slug: "linzhixing",
        editPasswordHash: hashPassword("123456"),
        profile: defaultProfile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
    await writeJson(CARDS_FILE, cards);
    return cards;
  }
};

const readBody = async (req) =>
  new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        req.destroy();
        reject(new Error("REQUEST_BODY_TOO_LARGE"));
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("INVALID_JSON"));
      }
    });
    req.on("error", reject);
  });

const publicCard = (card) => ({
  slug: card.slug,
  profile: card.profile,
  createdAt: card.createdAt,
  updatedAt: card.updatedAt
});

const requestHandler = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const cardMatch = url.pathname.match(/^\/api\/cards\/([^/]+)$/);

  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, { ok: true, service: "personal-card-api" });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/profile") {
      sendJson(res, 200, await readProfile());
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/cards") {
      const cards = await readCards();
      sendJson(res, 200, {
        cards: Object.values(cards).map(publicCard)
      });
      return;
    }

    if (req.method === "GET" && cardMatch) {
      const cards = await readCards();
      const slug = makeSlug(decodeURIComponent(cardMatch[1]));
      const card = cards[slug];
      if (!card) {
        sendJson(res, 404, { error: "CARD_NOT_FOUND", message: "名片不存在。" });
        return;
      }
      sendJson(res, 200, publicCard(card));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/cards") {
      const body = await readBody(req);
      const cards = await readCards();
      const profile = normalizeProfile(body.profile);
      const validationError = validateProfile(profile);
      const password = String(body.editPassword || "").trim();
      const requestedSlug = makeSlug(body.slug || profile.name);
      const slug = requestedSlug || `card-${Date.now()}`;

      if (validationError) {
        sendJson(res, 400, { error: "INVALID_PROFILE", message: validationError });
        return;
      }
      if (password.length < 6) {
        sendJson(res, 400, { error: "WEAK_PASSWORD", message: "编辑密码至少 6 位。" });
        return;
      }
      if (cards[slug]) {
        sendJson(res, 409, { error: "SLUG_EXISTS", message: "这个访问路径已被使用。" });
        return;
      }

      const now = new Date().toISOString();
      cards[slug] = {
        slug,
        editPasswordHash: hashPassword(password),
        profile,
        createdAt: now,
        updatedAt: now
      };
      await writeJson(CARDS_FILE, cards);
      sendJson(res, 201, publicCard(cards[slug]));
      return;
    }

    if (req.method === "PUT" && cardMatch) {
      const body = await readBody(req);
      const cards = await readCards();
      const slug = makeSlug(decodeURIComponent(cardMatch[1]));
      const card = cards[slug];
      if (!card) {
        sendJson(res, 404, { error: "CARD_NOT_FOUND", message: "名片不存在。" });
        return;
      }
      if (hashPassword(body.editPassword) !== card.editPasswordHash) {
        sendJson(res, 403, { error: "INVALID_PASSWORD", message: "编辑密码不正确。" });
        return;
      }

      const profile = normalizeProfile(body.profile);
      const validationError = validateProfile(profile);
      if (validationError) {
        sendJson(res, 400, { error: "INVALID_PROFILE", message: validationError });
        return;
      }

      cards[slug] = {
        ...card,
        profile,
        updatedAt: new Date().toISOString()
      };
      await writeJson(CARDS_FILE, cards);
      sendJson(res, 200, publicCard(cards[slug]));
      return;
    }

    sendJson(res, 404, {
      error: "NOT_FOUND",
      message: "Use /api/cards, /api/cards/:slug, /api/profile or /api/health."
    });
  } catch (error) {
    const statusCode = error.message === "INVALID_JSON" ? 400 : 500;
    sendJson(res, statusCode, {
      error: error.message || "SERVER_ERROR",
      message: statusCode === 400 ? "请求数据不是有效 JSON。" : "服务暂时不可用。"
    });
  }
};

if (process.argv.includes("--check")) {
  Promise.all([readProfile(), readCards()])
    .then(([profile, cards]) => {
      if (!profile.name || !Array.isArray(profile.contacts)) {
        throw new Error("Profile data must include name and contacts.");
      }
      if (!cards.linzhixing || !cards.linzhixing.profile.name) {
        throw new Error("Cards data must include the default card.");
      }
      console.log("Backend check passed.");
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
} else {
  http.createServer(requestHandler).listen(PORT, () => {
    log(`Personal card API running at http://localhost:${PORT}`);
  });
}
