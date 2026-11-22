/* ==========================================================================
   LibraArchive — Directory Index Engine (Search, Filter, Sort, Viewer & KV Likes)
   ========================================================================== */

(function () {
  "use strict";

  const LIKED_STORAGE_KEY = "libraarchive_liked_slugs";

  /* ------------------------------------------------------------------------
     Crisp Solid White File-Explorer SVG Icons
     ------------------------------------------------------------------------ */
  const ICONS = {
    folder: `<svg width="15" height="15" viewBox="0 0 16 16" fill="#e5e5e5" aria-hidden="true"><path d="M1.5 2A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5V5a1.5 1.5 0 0 0-1.5-1.5H7.71l-1.5-1.5H1.5z"/></svg>`,
    file: `<svg width="15" height="15" viewBox="0 0 16 16" fill="#e5e5e5" aria-hidden="true"><path d="M3 1h6.5L13 4.5V15H3V1zm6 1v3h3L9 2zM5 7v1h6V7H5zm0 2.5v1h6v-1H5zm0 2.5v1h4v-1H5z"/></svg>`,
    heart: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
    heartFilled: `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
  };

  function getEntryIcon(type) {
    const t = String(type || "").toLowerCase();
    if (t.includes("guide") || t.includes("toolkit") || t.includes("workbook")) {
      return ICONS.folder;
    }
    return ICONS.file;
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
     LocalStorage Helpers for Visitor Likes (Unchanged)
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
      // Ignore storage errors
    }
  }

  /* ------------------------------------------------------------------------
     Cloudflare KV Likes API with Graceful Local Fallback (Unchanged)
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
     Page 1: Full-Width Directory Index (index.html)
     ------------------------------------------------------------------------ */
  async function initDirectoryIndex() {
    const tbody = document.getElementById("dir-table-body");
    if (!tbody) return;

    const searchInput = document.getElementById("search-input");
    const gradeSelect = document.getElementById("grade-select");
    const subjectSelect = document.getElementById("subject-select");
    const breadcrumbSubject = document.getElementById("breadcrumb-subject");
    const statusCount = document.getElementById("dir-status-count");
    const sortButtons = document.querySelectorAll(".sort-btn");

    let allResources = [];
    let likesMap = {};
    let activeSubject = "All";
    let activeGrade = "All";
    let searchQuery = "";
    let sortKey = "title"; // "title" | "grade" | "likes"
    let sortDir = "asc";   // "asc" | "desc"

    // Allow linking directly to a subject directory via ?subject=Mathematics
    const initialParams = new URLSearchParams(window.location.search);
    if (initialParams.get("subject")) {
      activeSubject = initialParams.get("subject");
    }

    try {
      allResources = await loadResources();
    } catch {
      tbody.innerHTML = `
        <tr class="dir-empty-row">
          <td colspan="6">Unable to load <code>resources.json</code>. Serve via HTTP or Cloudflare Pages.</td>
        </tr>`;
      return;
    }

    const uniqueSubjects = [...new Set(allResources.map((r) => r.subject).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
    const uniqueGrades = [...new Set(allResources.map((r) => r.grade).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );

    uniqueSubjects.forEach((subj) => {
      const opt = document.createElement("option");
      opt.value = subj;
      opt.textContent = subj;
      subjectSelect.appendChild(opt);
    });
    if (uniqueSubjects.includes(activeSubject)) {
      subjectSelect.value = activeSubject;
    } else {
      activeSubject = "All";
    }

    uniqueGrades.forEach((grade) => {
      const opt = document.createElement("option");
      opt.value = grade;
      opt.textContent = grade;
      gradeSelect.appendChild(opt);
    });

    function updateBreadcrumb() {
      if (!breadcrumbSubject) return;
      if (activeSubject === "All") {
        breadcrumbSubject.innerHTML = "";
      } else {
        breadcrumbSubject.innerHTML = `
          <span class="breadcrumb-sep">/</span>
          <span class="breadcrumb-current">${escapeHTML(activeSubject)}</span>`;
      }
    }

    function updateSortIndicators() {
      sortButtons.forEach((btn) => {
        const key = btn.dataset.sort;
        const indicator = btn.querySelector(".sort-indicator");
        const isActive = key === sortKey;
        btn.classList.toggle("active-sort", isActive);
        if (indicator) {
          indicator.textContent = isActive ? (sortDir === "asc" ? "↑" : "↓") : "⇅";
        }
      });
    }

    function renderRows() {
      updateBreadcrumb();
      updateSortIndicators();

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

      filtered.sort((a, b) => {
        let cmp = 0;
        if (sortKey === "likes") {
          cmp = (likesMap[a.slug] ?? 0) - (likesMap[b.slug] ?? 0);
        } else if (sortKey === "grade") {
          cmp = String(a.grade).localeCompare(String(b.grade), undefined, { numeric: true });
        } else {
          cmp = String(a.title).localeCompare(String(b.title));
        }
        return sortDir === "asc" ? cmp : -cmp;
      });

      if (statusCount) {
        statusCount.textContent = `${filtered.length} item${filtered.length === 1 ? "" : "s"} (${allResources.length} total in index)`;
      }

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr class="dir-empty-row">
            <td colspan="6">
              No matching files found in this directory.
              <a href="#" id="reset-dir-filters">Reset filters</a>
            </td>
          </tr>`;
        const resetLink = document.getElementById("reset-dir-filters");
        if (resetLink) {
          resetLink.addEventListener("click", (e) => {
            e.preventDefault();
            searchQuery = "";
            activeSubject = "All";
            activeGrade = "All";
            searchInput.value = "";
            subjectSelect.value = "All";
            gradeSelect.value = "All";
            renderRows();
          });
        }
        return;
      }

      tbody.innerHTML = filtered
        .map((item) => {
          const liked = isSlugLiked(item.slug);
          const count = likesMap[item.slug] ?? 0;
          const driveDirect = `https://drive.google.com/file/d/${encodeURIComponent(item.drive_id)}/view`;

          return `
            <tr>
              <td class="col-name">
                <a class="file-entry-link" href="resource.html?slug=${encodeURIComponent(item.slug)}">
                  ${getEntryIcon(item.type)}
                  <span>${escapeHTML(item.title)}</span>
                </a>
                <span class="file-entry-sub">Author: ${escapeHTML(item.author)}${
                  item.description ? ` &mdash; ${escapeHTML(item.description)}` : ""
                }</span>
              </td>
              <td class="col-meta">${escapeHTML(item.grade)}</td>
              <td class="col-meta">
                <a href="index.html?subject=${encodeURIComponent(item.subject)}" data-filter-subject="${escapeHTML(item.subject)}">${escapeHTML(item.subject)}</a>
              </td>
              <td class="col-meta">${escapeHTML(item.type)}</td>
              <td class="col-meta">
                <span class="like-badge-inline ${liked ? "is-liked" : ""}">
                  ${liked ? ICONS.heartFilled : ICONS.heart}
                  <span>${count}</span>
                </span>
              </td>
              <td class="col-meta">
                <a href="${driveDirect}" target="_blank" rel="noopener noreferrer">Open in Drive</a>
              </td>
            </tr>`;
        })
        .join("");
    }

    renderRows();
    likesMap = await fetchLikesMap(allResources.map((r) => r.slug));
    renderRows();

    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderRows();
    });

    gradeSelect.addEventListener("change", (e) => {
      activeGrade = e.target.value;
      renderRows();
    });

    subjectSelect.addEventListener("change", (e) => {
      activeSubject = e.target.value;
      renderRows();
    });

    tbody.addEventListener("click", (e) => {
      const subjLink = e.target.closest("[data-filter-subject]");
      if (!subjLink) return;
      e.preventDefault();
      activeSubject = subjLink.dataset.filterSubject;
      subjectSelect.value = activeSubject;
      renderRows();
    });

    sortButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const clickedKey = btn.dataset.sort;
        if (sortKey === clickedKey) {
          sortDir = sortDir === "asc" ? "desc" : "asc";
        } else {
          sortKey = clickedKey;
          sortDir = clickedKey === "likes" ? "desc" : "asc";
        }
        renderRows();
      });
    });
  }

  /* ------------------------------------------------------------------------
     Page 2: Resource Viewer (resource.html?slug=...)
     ------------------------------------------------------------------------ */
  async function initResourceViewer() {
    const container = document.getElementById("viewer-container");
    if (!container) return;

    const breadcrumbDynamic = document.getElementById("viewer-breadcrumb-dynamic");
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");

    if (!slug) {
      container.innerHTML = `
        <div class="dir-section">
          <p>No file slug specified. <a href="index.html">Return to /Browse</a>.</p>
        </div>`;
      return;
    }

    let resources = [];
    try {
      resources = await loadResources();
    } catch {
      container.innerHTML = `
        <div class="dir-section">
          <p>Unable to load <code>resources.json</code>.</p>
        </div>`;
      return;
    }

    const resource = resources.find((r) => r.slug === slug);
    if (!resource) {
      container.innerHTML = `
        <div class="dir-section">
          <p>404: File <code>${escapeHTML(slug)}</code> not found in index. <a href="index.html">Return to /Browse</a>.</p>
        </div>`;
      return;
    }

    document.title = `${resource.title} — LibraArchive`;

    if (breadcrumbDynamic) {
      breadcrumbDynamic.innerHTML = `
        <span class="breadcrumb-sep">/</span>
        <a href="index.html?subject=${encodeURIComponent(resource.subject)}">${escapeHTML(resource.subject)}</a>
        <span class="breadcrumb-sep">/</span>
        <span class="breadcrumb-current">${escapeHTML(resource.title)}</span>`;
    }

    const driveId = encodeURIComponent(resource.drive_id);
    const previewUrl = `https://drive.google.com/file/d/${driveId}/preview`;
    const directUrl = `https://drive.google.com/file/d/${driveId}/view`;

    const likesMap = await fetchLikesMap([resource.slug]);
    let currentLikes = likesMap[resource.slug] ?? 0;
    let liked = isSlugLiked(resource.slug);

    container.innerHTML = `
      <div class="viewer-meta-strip">
        <div class="viewer-meta-info">
          <span>${ICONS.file} <strong>${escapeHTML(resource.title)}</strong></span>
          <span>Grade: <strong>${escapeHTML(resource.grade)}</strong></span>
          <span>Subject: <strong>${escapeHTML(resource.subject)}</strong></span>
          <span>Type: <strong>${escapeHTML(resource.type)}</strong></span>
          <span>Author: <strong>${escapeHTML(resource.author)}</strong></span>
        </div>
        <div class="viewer-meta-actions">
          <button type="button" id="like-toggle-btn" class="btn-flat ${liked ? "liked" : ""}" aria-pressed="${liked}">
            <span id="like-btn-icon">${liked ? ICONS.heartFilled : ICONS.heart}</span>
            <span id="like-btn-label">${liked ? "Liked" : "Like"}</span>
            <span>(<span id="like-btn-count">${currentLikes}</span>)</span>
          </button>
          <a class="btn-flat" href="${directUrl}" target="_blank" rel="noopener noreferrer">Open in Google Drive ↗</a>
        </div>
      </div>

      <iframe
        class="drive-iframe-full"
        src="${previewUrl}"
        title="${escapeHTML(resource.title)}"
        allow="autoplay"
        loading="lazy"
      ></iframe>`;

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
      likeLabel.textContent = liked ? "Liked" : "Like";
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
    initDirectoryIndex();
    initResourceViewer();
    initContributeFormEmbed();
  });
})();
