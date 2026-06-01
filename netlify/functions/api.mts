import { getDeployStore, getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import crypto from "node:crypto";

type Contact = {
  type: string;
  label: string;
  href: string;
};

type CardProfile = {
  name: string;
  title: string;
  location: string;
  tagline: string;
  summary: string;
  avatarInitials: string;
  availability: string;
  contacts: Contact[];
  links: { label: string; href: string }[];
  skills: string[];
  services: { name: string; detail: string }[];
  stats: { value: string; label: string }[];
};

type Card = {
  slug: string;
  editPasswordHash: string;
  profile: CardProfile;
  createdAt: string;
  updatedAt: string;
};

const defaultProfile: CardProfile = {
  name: "林知行",
  title: "全栈产品工程师",
  location: "上海 · 远程协作",
  tagline: "把复杂想法做成清晰、可靠、好用的数字产品。",
  summary:
    "专注于产品原型、前后端工程、自动化流程和数据可视化。擅长把模糊需求拆成可落地的系统，并用简洁界面承载高密度信息。",
  avatarInitials: "LZ",
  availability: "接受 2026 年 Q3 项目咨询",
  contacts: [
    { type: "Email", label: "hello@example.com", href: "mailto:hello@example.com" },
    { type: "Phone", label: "+86 138 0000 0000", href: "tel:+8613800000000" },
    { type: "WeChat", label: "lin-product", href: "#wechat" }
  ],
  links: [
    { label: "作品集", href: "https://example.com/portfolio" },
    { label: "GitHub", href: "https://github.com/example" },
    { label: "LinkedIn", href: "https://linkedin.com/in/example" }
  ],
  skills: ["产品策略", "React / Vue", "Node.js API", "数据看板", "自动化工作流", "体验设计"],
  services: [
    { name: "MVP 快速搭建", detail: "从需求梳理到上线验证，适合早期产品和内部工具。" },
    { name: "前后端架构咨询", detail: "梳理接口边界、权限模型、数据结构和部署路径。" },
    { name: "效率系统定制", detail: "把重复流程自动化，接入表格、文档、通知和业务系统。" }
  ],
  stats: [
    { value: "8+", label: "年产品工程经验" },
    { value: "35", label: "交付项目" },
    { value: "4.9", label: "客户平均评分" }
  ]
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });

const hashPassword = (password: unknown) =>
  crypto.createHash("sha256").update(String(password || ""), "utf8").digest("hex");

const makeSlug = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

const makeInitials = (name: unknown) => {
  const clean = String(name || "").trim();
  if (!clean) return "ME";
  const ascii = clean.match(/[a-zA-Z]/g);
  if (ascii && ascii.length >= 2) return `${ascii[0]}${ascii[1]}`.toUpperCase();
  return clean.slice(0, 2).toUpperCase();
};

function normalizeList<T>(items: unknown, mapper: (item: any) => T | null) {
  return Array.isArray(items) ? items.map(mapper).filter(Boolean) as T[] : [];
}
  Array.isArray(items) ? items.map(mapper).filter(Boolean) as T[] : [];

const normalizeProfile = (input: any): CardProfile => {
  const profile = input && typeof input === "object" ? input : {};
  const name = String(profile.name || "").trim();

  return {
    name,
    title: String(profile.title || "").trim(),
    location: String(profile.location || "").trim(),
    tagline: String(profile.tagline || "").trim(),
    summary: String(profile.summary || "").trim(),
    avatarInitials: String(profile.avatarInitials || makeInitials(name)).trim().slice(0, 4),
    availability: String(profile.availability || "开放交流").trim(),
    contacts: normalizeList(profile.contacts, (contact) =>
      contact?.label
        ? {
            type: String(contact.type || "Link").trim(),
            label: String(contact.label || "").trim(),
            href: String(contact.href || "#").trim()
          }
        : null
    ),
    links: normalizeList(profile.links, (link) =>
      link?.label ? { label: String(link.label).trim(), href: String(link.href || "#").trim() } : null
    ),
    skills: normalizeList(profile.skills, (skill) => String(skill || "").trim()).filter(Boolean),
    services: normalizeList(profile.services, (service) =>
      service?.name
        ? { name: String(service.name).trim(), detail: String(service.detail || "").trim() }
        : null
    ),
    stats: normalizeList(profile.stats, (stat) =>
      stat?.value ? { value: String(stat.value).trim(), label: String(stat.label || "").trim() } : null
    )
  };
};

const validateProfile = (profile: CardProfile) => {
  if (!profile.name || !profile.title || !profile.tagline) {
    return "姓名、职位和个人签名必填。";
  }
  if (profile.name.length > 40 || profile.title.length > 80 || profile.tagline.length > 120) {
    return "姓名、职位或个人签名过长。";
  }
  return "";
};

const getCardsStore = () => {
  const isProduction = (globalThis as any).Netlify?.context?.deploy?.context === "production";
  return isProduction
    ? getStore("personal-cards", { consistency: "strong" })
    : getDeployStore("personal-cards");
};

const ensureDefaultCard = async () => {
  const store = getCardsStore();
  const existing = await store.get("linzhixing", { type: "json" }) as Card | null;
  if (existing) return;

  const now = new Date().toISOString();
  await store.setJSON("linzhixing", {
    slug: "linzhixing",
    editPasswordHash: hashPassword("123456"),
    profile: defaultProfile,
    createdAt: now,
    updatedAt: now
  });
};

const getCard = async (slug: string) => {
  await ensureDefaultCard();
  return await getCardsStore().get(slug, { type: "json" }) as Card | null;
};

const publicCard = (card: Card) => ({
  slug: card.slug,
  profile: card.profile,
  createdAt: card.createdAt,
  updatedAt: card.updatedAt
});

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, "") || "/";
  const cardMatch = path.match(/^\/cards\/([^/]+)$/);

  try {
    if (req.method === "GET" && path === "/health") {
      return jsonResponse({ ok: true, service: "personal-card-api" });
    }

    if (req.method === "GET" && path === "/profile") {
      return jsonResponse(defaultProfile);
    }

    if (req.method === "GET" && path === "/cards") {
      await ensureDefaultCard();
      const { blobs } = await getCardsStore().list();
      const cards = await Promise.all(
        blobs.map(async (blob) => {
          const card = await getCardsStore().get(blob.key, { type: "json" }) as Card | null;
          return card ? publicCard(card) : null;
        })
      );
      return jsonResponse({ cards: cards.filter(Boolean) });
    }

    if (req.method === "GET" && cardMatch) {
      const slug = makeSlug(decodeURIComponent(cardMatch[1]));
      const card = await getCard(slug);
      if (!card) return jsonResponse({ error: "CARD_NOT_FOUND", message: "名片不存在。" }, 404);
      return jsonResponse(publicCard(card));
    }

    if (req.method === "POST" && path === "/cards") {
      await ensureDefaultCard();
      const body = await req.json();
      const profile = normalizeProfile(body.profile);
      const validationError = validateProfile(profile);
      const password = String(body.editPassword || "").trim();
      const slug = makeSlug(body.slug || profile.name) || `card-${Date.now()}`;

      if (validationError) return jsonResponse({ error: "INVALID_PROFILE", message: validationError }, 400);
      if (password.length < 6) return jsonResponse({ error: "WEAK_PASSWORD", message: "编辑密码至少 6 位。" }, 400);
      if (await getCardsStore().get(slug, { type: "json" })) {
        return jsonResponse({ error: "SLUG_EXISTS", message: "这个访问路径已被使用。" }, 409);
      }

      const now = new Date().toISOString();
      const card: Card = {
        slug,
        editPasswordHash: hashPassword(password),
        profile,
        createdAt: now,
        updatedAt: now
      };
      await getCardsStore().setJSON(slug, card);
      return jsonResponse(publicCard(card), 201);
    }

    if (req.method === "PUT" && cardMatch) {
      const slug = makeSlug(decodeURIComponent(cardMatch[1]));
      const card = await getCard(slug);
      if (!card) return jsonResponse({ error: "CARD_NOT_FOUND", message: "名片不存在。" }, 404);

      const body = await req.json();
      if (hashPassword(body.editPassword) !== card.editPasswordHash) {
        return jsonResponse({ error: "INVALID_PASSWORD", message: "编辑密码不正确。" }, 403);
      }

      const profile = normalizeProfile(body.profile);
      const validationError = validateProfile(profile);
      if (validationError) return jsonResponse({ error: "INVALID_PROFILE", message: validationError }, 400);

      const updatedCard: Card = { ...card, profile, updatedAt: new Date().toISOString() };
      await getCardsStore().setJSON(slug, updatedCard);
      return jsonResponse(publicCard(updatedCard));
    }

    return jsonResponse({ error: "NOT_FOUND", message: "API route not found." }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "SERVER_ERROR";
    return jsonResponse({ error: message, message: "服务暂时不可用。" }, 500);
  }
};

export const config: Config = {
  path: "/api/*"
};
