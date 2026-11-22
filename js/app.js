/* ==========================================================================
   LibraArchive — Vanilla JS Engine (Icons, Search/Filters, Drive Viewer & Likes)
   ========================================================================== */

(function () {
  "use strict";

  const LIKED_STORAGE_KEY = "libraarchive_liked_slugs";

  /* ------------------------------------------------------------------------
     Crisp Inline SVG Study Icons
     ------------------------------------------------------------------------ */
  const ICONS = {
    books: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    apple: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/></svg>`,
    blackboard: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 16h20"/><path d="M8 20l2-4"/><path d="M16 20l-2-4"/><path d="M7 9h5"/><path d="M7 12h8"/></svg>`,
    ruler: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg>`,
    pencil: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`,
    heart: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
    heartFilled: `<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
    external: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`
  };

  function getSubjectIcon(subject) {
    const key = String(subject || "").toLowerCase();
    if (key.includes("math") || key.includes("calc") || key.includes("algebra")) return ICONS.ruler;
    if (key.includes("bio") || key.includes("chem") || key.includes("health")) return ICONS.apple;
    if (key.includes("phys") || key.includes("comp") || key.includes("science")) return ICONS.blackboard;
    if (key.includes("hist") || key.includes("gov") || key.includes("econ")) return ICONS.pencil;
    return ICONS.books;
  }

  function escapeHTML(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ------------------------------------------------------------------------
     LocalStorage Helpers for Visitor Likes
     ------------------------------------------------------------------------ */
  function getLikedSlugs() {
    try {
      const raw = localStorage.getItem(LIKED_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function isSlugLiked(slug) {
    return getLikedSlugs().includes(slug);
  }

  function setSlugLiked(slug, liked) {
    try {
      const current = new Set(getLikedSlugs());
      if (liked) {
        current.add(slug);
      } else {
        current.delete(slug);
      }
      localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify([...current]));
    } catch {
      // Ignore storage quota or private-mode errors
    }
  }

  /* ------------------------------------------------------------------------
     Cloudflare KV Likes API with Graceful Local Fallback (0 Likes)
     ------------------------------------------------------------------------ */
  async function fetchLikesMap(slugs) {
    const fallback = {};
    slugs.forEach((s) => {
      fallback[s] = isSlugLiked(s) ? 1 : 0;
    });

    if (window.location.protocol === "file:" || slugs.length === 0) {
      return fallback;
    }

    try {
      const query = encodeURIComponent(slugs.join(","));
      const res = await fetch(`/api/likes?slugs=${query}`, { headers: { Accept: "application/json" } });
      if (!res.ok) return fallback;
      const data = await res.json();
      if (data && typeof data.likes === "object") {
        slugs.forEach((s) => {
          const remoteCount = Number(data.likes[s]);
          fallback[s] = Number.isFinite(remoteCount) ? Math.max(0, remoteCount) : 0;
        });
      }
      return fallback;
    } catch {
      return fallback;
    }
  }

  async function toggleResourceLike(slug, currentCount) {
    const alreadyLiked = isSlugLiked(slug);
    const nextLiked = !alreadyLiked;
    const optimisticCount = Math.max(0, currentCount + (nextLiked ? 1 : -1));

    setSlugLiked(slug, nextLiked);

    if (window.location.protocol === "file:") {
      return { liked: nextLiked, count: optimisticCount };
    }

    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ slug, action: nextLiked ? "like" : "unlike" })
      });
      if (!res.ok) {
        return { liked: nextLiked, count: optimisticCount };
      }
      const data = await res.json();
      const serverCount = Number(data.likes);
      return {
        liked: nextLiked,
        count: Number.isFinite(serverCount) ? Math.max(0, serverCount) : optimisticCount
      };
    } catch {
      return { liked: nextLiked, count: optimisticCount };
    }
  }

  /* ------------------------------------------------------------------------
     Shared Data Loader
     ------------------------------------------------------------------------ */
  async function loadResources() {
    const res = await fetch("./resources.json");
    if (!res.ok) {
      throw new Error(`Failed to load resources.json (${res.status})`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  /* ------------------------------------------------------------------------
     Mobile Navigation Toggle
     ------------------------------------------------------------------------ */
  function initNavigation() {
    const toggle = document.getElementById("nav-toggle");
    const links = document.getElementById("nav-links");
    if (!toggle || !links) return;

    toggle.addEventListener("click", () => {
      const isOpen = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  /* ------------------------------------------------------------------------
     Page 1: Home / Browse (index.html)
     ------------------------------------------------------------------------ */
  async function initBrowsePage() {
    const grid = document.getElementById("resource-grid");
    if (!grid) return;

    const searchInput = document.getElementById("search-input");
    const gradeSelect = document.getElementById("grade-select");
    const subjectPillsContainer = document.getElementById("subject-pills");
    const resultsCount = document.getElementById("results-count");
    const statTotal = document.getElementById("stat-total-resources");
    const statSubjects = document.getElementById("stat-total-subjects");

    let allResources = [];
    let likesMap = {};
    let activeSubject = "All";
    let activeGrade = "All";
    let searchQuery = "";

    try {
      allResources = await loadResources();
    } catch (err) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>Unable to load resources.json</h3>
          <p>If you opened this file directly via <code>file://</code>, serve the folder over HTTP (or deploy to Cloudflare Pages) so the browser can fetch <code>resources.json</code>.</p>
        </div>`;
      return;
    }

    // Update hero stats
    const uniqueSubjects = [...new Set(allResources.map((r) => r.subject).filter(Boolean))];
    const uniqueGrades = [...new Set(allResources.map((r) => r.grade).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );

    if (statTotal) statTotal.textContent = String(allResources.length);
    if (statSubjects) statSubjects.textContent = String(uniqueSubjects.length);

    // Populate Grade dropdown
    uniqueGrades.forEach((grade) => {
      const opt = document.createElement("option");
      opt.value = grade;
      opt.textContent = grade;
      gradeSelect.appendChild(opt);
    });

    // Populate Subject pills
    const pillSubjects = ["All", ...uniqueSubjects];
    subjectPillsContainer.innerHTML = pillSubjects
      .map(
        (subj) => `
        <button
          type="button"
          class="pill-btn ${subj === "All" ? "active" : ""}"
          data-subject="${escapeHTML(subj)}"
        >
          ${subj !== "All" ? getSubjectIcon(subj) : ""}
          <span>${escapeHTML(subj)}</span>
        </button>`
      )
      .join("");

    function renderCards() {
      const q = searchQuery.trim().toLowerCase();
      const filtered = allResources.filter((item) => {
        const matchesSubject = activeSubject === "All" || item.subject === activeSubject;
        const matchesGrade = activeGrade === "All" || item.grade === activeGrade;
        const haystack = [item.title, item.subject, item.grade, item.type, item.author, item.description]
          .join(" ")
          .toLowerCase();
        const matchesQuery = !q || haystack.includes(q);
        return matchesSubject && matchesGrade && matchesQuery;
      });

      resultsCount.textContent = `Showing ${filtered.length} of ${allResources.length} study resource${allResources.length === 1 ? "" : "s"}`;

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div class="empty-state">
            <h3>No matching study resources found</h3>
            <p>Try clearing a filter or searching for a broader topic keyword.</p>
            <button type="button" class="btn btn-secondary" id="reset-filters-btn">Reset All Filters</button>
          </div>`;
        const resetBtn = document.getElementById("reset-filters-btn");
        if (resetBtn) {
          resetBtn.addEventListener("click", () => {
            searchQuery = "";
            activeSubject = "All";
            activeGrade = "All";
            searchInput.value = "";
            gradeSelect.value = "All";
            subjectPillsContainer.querySelectorAll(".pill-btn").forEach((btn) => {
              btn.classList.toggle("active", btn.dataset.subject === "All");
            });
            renderCards();
          });
        }
        return;
      }

      grid.innerHTML = filtered
        .map((item) => {
          const liked = isSlugLiked(item.slug);
          const count = likesMap[item.slug] ?? 0;
          return `
            <a class="resource-card" href="resource.html?slug=${encodeURIComponent(item.slug)}">
              <div class="card-top">
                <span class="subject-badge" data-subject="${escapeHTML(item.subject)}">
                  ${getSubjectIcon(item.subject)}
                  <span>${escapeHTML(item.subject)}</span>
                </span>
                <span class="grade-tag">${escapeHTML(item.grade)}</span>
              </div>
              <h2 class="card-title">${escapeHTML(item.title)}</h2>
              <p class="card-desc">${escapeHTML(item.description || "")}</p>
              <div class="card-footer">
                <div class="card-meta-left">
                  <span class="card-type">${escapeHTML(item.type)}</span>
                  <span>By ${escapeHTML(item.author)}</span>
                </div>
                <span class="like-pill ${liked ? "is-liked" : ""}" data-like-slug="${escapeHTML(item.slug)}">
                  ${liked ? ICONS.heartFilled : ICONS.heart}
                  <span>${count}</span>
                </span>
              </div>
            </a>`;
        })
        .join("");
    }

    // Initial render immediately with 0 fallback, then hydrate KV like counts
    renderCards();
    likesMap = await fetchLikesMap(allResources.map((r) => r.slug));
    renderCards();

    // Event listeners
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderCards();
    });

    gradeSelect.addEventListener("change", (e) => {
      activeGrade = e.target.value;
      renderCards();
    });

    subjectPillsContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".pill-btn");
      if (!btn) return;
      activeSubject = btn.dataset.subject;
      subjectPillsContainer.querySelectorAll(".pill-btn").forEach((el) => {
        el.classList.toggle("active", el === btn);
      });
      renderCards();
    });
  }

  /* ------------------------------------------------------------------------
     Page 2: Resource Viewer (resource.html?slug=...)
     ------------------------------------------------------------------------ */
  async function initResourceViewer() {
    const container = document.getElementById("viewer-container");
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");

    if (!slug) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No resource specified</h3>
          <p>Select a study guide or set of notes from the archive to view it here.</p>
          <a class="btn btn-primary" href="index.html">Browse Resources</a>
        </div>`;
      return;
    }

    let resources = [];
    try {
      resources = await loadResources();
    } catch {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Unable to load resources.json</h3>
          <p>Please serve this site over HTTP or deploy to Cloudflare Pages to load resource metadata.</p>
        </div>`;
      return;
    }

    const resource = resources.find((r) => r.slug === slug);
    if (!resource) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Resource not found</h3>
          <p>We couldn't find a study resource matching "<code>${escapeHTML(slug)}</code>".</p>
          <a class="btn btn-primary" href="index.html">Return to Library</a>
        </div>`;
      return;
    }

    document.title = `${resource.title} — LibraArchive`;

    const driveId = encodeURIComponent(resource.drive_id);
    const previewUrl = `https://drive.google.com/file/d/${driveId}/preview`;
    const directUrl = `https://drive.google.com/file/d/${driveId}/view`;

    const likesMap = await fetchLikesMap([resource.slug]);
    let currentLikes = likesMap[resource.slug] ?? 0;
    let liked = isSlugLiked(resource.slug);

    container.innerHTML = `
      <div class="viewer-header-card">
        <div class="viewer-badges">
          <span class="subject-badge" data-subject="${escapeHTML(resource.subject)}">
            ${getSubjectIcon(resource.subject)}
            <span>${escapeHTML(resource.subject)}</span>
          </span>
          <span class="grade-tag">${escapeHTML(resource.grade)}</span>
          <span class="grade-tag">${escapeHTML(resource.type)}</span>
        </div>
        <h1>${escapeHTML(resource.title)}</h1>
        <p class="viewer-byline">Contributed by <strong>${escapeHTML(resource.author)}</strong>${
          resource.description ? ` &mdash; ${escapeHTML(resource.description)}` : ""
        }</p>
        <div class="viewer-actions">
          <button type="button" id="like-toggle-btn" class="like-btn ${liked ? "liked" : ""}" aria-pressed="${liked}">
            <span id="like-btn-icon">${liked ? ICONS.heartFilled : ICONS.heart}</span>
            <span id="like-btn-label">${liked ? "Liked" : "Helpful"}</span>
            <span>(<span id="like-btn-count">${currentLikes}</span>)</span>
          </button>
          <a class="btn btn-secondary" href="${directUrl}" target="_blank" rel="noopener noreferrer">
            ${ICONS.external}
            <span>Open in Google Drive</span>
          </a>
        </div>
      </div>

      <div class="drive-frame-wrapper">
        <div class="drive-frame-bar">
          <span>Document Preview &bull; Google Drive Viewer</span>
          <span>Trouble loading? Use "Open in Google Drive" above</span>
        </div>
        <iframe
          class="drive-iframe"
          src="${previewUrl}"
          title="${escapeHTML(resource.title)}"
          allow="autoplay"
          loading="lazy"
        ></iframe>
      </div>`;

    const likeBtn = document.getElementById("like-toggle-btn");
    const likeIcon = document.getElementById("like-btn-icon");
    const likeLabel = document.getElementById("like-btn-label");
    const likeCountEl = document.getElementById("like-btn-count");

    likeBtn.addEventListener("click", async () => {
      likeBtn.disabled = true;
      const result = await toggleResourceLike(resource.slug, currentLikes);
      liked = result.liked;
      currentLikes = result.count;

      likeBtn.classList.toggle("liked", liked);
      likeBtn.setAttribute("aria-pressed", String(liked));
      likeIcon.innerHTML = liked ? ICONS.heartFilled : ICONS.heart;
      likeLabel.textContent = liked ? "Liked" : "Helpful";
      likeCountEl.textContent = String(currentLikes);
      likeBtn.disabled = false;
    });
  }

  /* ------------------------------------------------------------------------
     Page 3: Google Form Embed Helper (contribute.html)
     ------------------------------------------------------------------------ */
  function initContributeFormEmbed() {
    const iframe = document.getElementById("google-form-iframe");
    const notice = document.getElementById("form-placeholder-notice");
    if (!iframe || !notice) return;

    const src = iframe.getAttribute("src") || "";
    if (src && !src.includes("[YOUR_GOOGLE_FORM_EMBED_URL]")) {
      notice.hidden = true;
      iframe.hidden = false;
    }
  }

  /* ------------------------------------------------------------------------
     Bootstrap
     ------------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initBrowsePage();
    initResourceViewer();
    initContributeFormEmbed();
  });
})();