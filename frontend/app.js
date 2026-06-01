const API_BASE =
  localStorage.getItem("personal-card-api") ||
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:4000"
    : "");

const fallbackProfile = {
  name: "林知行",
  title: "全栈产品工程师",
  location: "上海 · 远程协作",
  tagline: "把复杂想法做成清晰、可靠、好用的数字产品。",
  summary: "前端已加载，后端未连接时会显示这份备用资料。",
  avatarInitials: "LZ",
  availability: "离线预览模式",
  contacts: [],
  links: [],
  skills: ["产品策略", "前端界面", "Node.js API"],
  services: [],
  stats: []
};

const iconMap = {
  Email: "✉",
  Phone: "☎",
  WeChat: "微",
  Link: "•"
};

const byId = (id) => document.getElementById(id);
const form = byId("card-form");
let editingSlug = "";

const showOnly = (...ids) => {
  [
    "home-view",
    "form-view",
    "profile-view",
    "panel-view",
    "empty-view"
  ].forEach((id) => {
    byId(id).hidden = !ids.includes(id);
  });
};

const fillList = (id, items, render) => {
  byId(id).replaceChildren(...items.map(render));
};

const createAnchor = (className, href, text) => {
  const anchor = document.createElement("a");
  anchor.className = className;
  anchor.href = href;
  anchor.textContent = text;
  if (href.startsWith("http")) {
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
  }
  return anchor;
};

const showNotice = () => {
  if (!document.querySelector(".notice")) {
    const template = byId("error-template");
    document.body.appendChild(template.content.cloneNode(true));
  }
};

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "请求失败");
  }
  return payload;
};

const renderProfile = (profile, slug = "") => {
  document.title = `${profile.name} | 个人名片`;
  byId("avatar").textContent = profile.avatarInitials || profile.name?.slice(0, 2) || "--";
  byId("availability").textContent = profile.availability || "开放交流";
  byId("name").textContent = profile.name;
  byId("title").textContent = [profile.title, profile.location].filter(Boolean).join(" · ");
  byId("tagline").textContent = profile.tagline;
  byId("summary").textContent = profile.summary;
  byId("location").textContent = profile.location;

  fillList("contacts", profile.contacts || [], (contact) => {
    const anchor = createAnchor("contact", contact.href, `${iconMap[contact.type] || "•"} ${contact.label}`);
    anchor.title = contact.type;
    return anchor;
  });

  fillList("links", profile.links || [], (link) => createAnchor("link", link.href, link.label));

  fillList("skills", profile.skills || [], (skill) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = skill;
    return chip;
  });

  fillList("services", profile.services || [], (service) => {
    const item = document.createElement("article");
    item.className = "service";
    item.innerHTML = `<strong></strong><p></p>`;
    item.querySelector("strong").textContent = service.name;
    item.querySelector("p").textContent = service.detail;
    return item;
  });

  fillList("stats", profile.stats || [], (stat) => {
    const item = document.createElement("div");
    item.className = "stat";
    item.innerHTML = `<strong></strong><span></span>`;
    item.querySelector("strong").textContent = stat.value;
    item.querySelector("span").textContent = stat.label;
    return item;
  });

  const ownerActions = byId("owner-actions");
  ownerActions.replaceChildren();
  if (slug) {
    ownerActions.append(
      createAnchor("secondary-action", `/edit/${slug}`, "编辑这张名片"),
      createAnchor("secondary-action", "/", "创建我的名片")
    );
  }
};

const parseLines = (value, mapper) =>
  String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|").map((part) => part.trim()))
    .map(mapper)
    .filter(Boolean);

const parseCommaList = (value) =>
  String(value || "")
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);

const serializeLines = (items, mapper) => (items || []).map(mapper).join("\n");

const profileFromForm = () => {
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  return {
    name,
    title: String(data.get("title") || "").trim(),
    location: String(data.get("location") || "").trim(),
    availability: String(data.get("availability") || "").trim(),
    tagline: String(data.get("tagline") || "").trim(),
    summary: String(data.get("summary") || "").trim(),
    avatarInitials: name.slice(0, 2).toUpperCase(),
    skills: parseCommaList(data.get("skills")),
    contacts: parseLines(data.get("contacts"), ([type, label, href]) =>
      label ? { type: type || "Link", label, href: href || "#" } : null
    ),
    links: parseLines(data.get("links"), ([label, href]) => (label ? { label, href: href || "#" } : null)),
    services: parseLines(data.get("services"), ([nameValue, detail]) =>
      nameValue ? { name: nameValue, detail: detail || "" } : null
    ),
    stats: parseLines(data.get("stats"), ([value, label]) => (value ? { value, label: label || "" } : null))
  };
};

const fillForm = (profile, slug = "") => {
  form.reset();
  form.elements.slug.value = slug;
  form.elements.name.value = profile.name || "";
  form.elements.title.value = profile.title || "";
  form.elements.location.value = profile.location || "";
  form.elements.availability.value = profile.availability || "";
  form.elements.tagline.value = profile.tagline || "";
  form.elements.summary.value = profile.summary || "";
  form.elements.skills.value = (profile.skills || []).join(", ");
  form.elements.contacts.value = serializeLines(
    profile.contacts,
    (contact) => `${contact.type || "Link"} | ${contact.label || ""} | ${contact.href || "#"}`
  );
  form.elements.links.value = serializeLines(profile.links, (link) => `${link.label || ""} | ${link.href || "#"}`);
  form.elements.services.value = serializeLines(
    profile.services,
    (service) => `${service.name || ""} | ${service.detail || ""}`
  );
  form.elements.stats.value = serializeLines(profile.stats, (stat) => `${stat.value || ""} | ${stat.label || ""}`);
};

const showHome = () => {
  document.title = "创建个人名片";
  showOnly("home-view");
};

const showEmpty = () => {
  document.title = "名片不存在";
  showOnly("empty-view");
};

const showCard = async (slug) => {
  showOnly("profile-view", "panel-view");
  try {
    const card = await requestJson(`/api/cards/${encodeURIComponent(slug)}`);
    renderProfile(card.profile, card.slug);
  } catch (error) {
    console.warn(error);
    showEmpty();
  }
};

const showCreate = async () => {
  document.title = "创建我的个人名片";
  editingSlug = "";
  byId("form-eyebrow").textContent = "创建名片";
  byId("form-title").textContent = "创建我的个人名片";
  byId("form-description").textContent = "生成后会得到一个公开访问地址，编辑时需要填写编辑密码。";
  byId("submit-button").textContent = "创建名片";
  byId("slug-input").disabled = false;
  byId("form-message").textContent = "";
  fillForm(fallbackProfile, "");
  form.elements.editPassword.value = "";
  showOnly("form-view");
};

const showEdit = async (slug) => {
  document.title = "编辑个人名片";
  editingSlug = slug;
  byId("form-eyebrow").textContent = "编辑名片";
  byId("form-title").textContent = "编辑个人名片";
  byId("form-description").textContent = "输入创建时设置的编辑密码，保存后公开名片会立即更新。";
  byId("submit-button").textContent = "保存修改";
  byId("slug-input").disabled = true;
  byId("form-message").textContent = "";
  showOnly("form-view");
  try {
    const card = await requestJson(`/api/cards/${encodeURIComponent(slug)}`);
    fillForm(card.profile, card.slug);
    form.elements.editPassword.value = "";
  } catch (error) {
    console.warn(error);
    showEmpty();
  }
};

const route = async () => {
  const path = window.location.pathname;
  if (path === "/" || path === "/index.html") {
    showHome();
    return;
  }
  if (path === "/create") {
    await showCreate();
    return;
  }
  if (path.startsWith("/u/")) {
    await showCard(decodeURIComponent(path.replace("/u/", "")));
    return;
  }
  if (path.startsWith("/edit/")) {
    await showEdit(decodeURIComponent(path.replace("/edit/", "")));
    return;
  }

  showEmpty();
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = byId("form-message");
  const profile = profileFromForm();
  const editPassword = form.elements.editPassword.value;
  const slug = form.elements.slug.value.trim();

  message.textContent = "正在保存...";
  try {
    const card = editingSlug
      ? await requestJson(`/api/cards/${encodeURIComponent(editingSlug)}`, {
          method: "PUT",
          body: JSON.stringify({ editPassword, profile })
        })
      : await requestJson("/api/cards", {
          method: "POST",
          body: JSON.stringify({ slug, editPassword, profile })
        });

    message.textContent = `保存成功，公开地址：/u/${card.slug}`;
    window.history.pushState({}, "", `/u/${card.slug}`);
    await showCard(card.slug);
  } catch (error) {
    message.textContent = error.message;
  }
});

window.addEventListener("popstate", route);
document.addEventListener("click", (event) => {
  const anchor = event.target.closest("a");
  if (!anchor || anchor.target || anchor.origin !== window.location.origin) {
    return;
  }
  event.preventDefault();
  window.history.pushState({}, "", anchor.pathname);
  route();
});

route().catch((error) => {
  console.warn(error);
  renderProfile(fallbackProfile);
  showOnly("profile-view", "panel-view");
  showNotice();
});
