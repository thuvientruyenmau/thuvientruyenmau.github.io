// ====== Cấu hình ======
const mangaPerPage = 6; // 6 truyện / trang
const REGISTRY_URL = 'data/registry.json';

// ====== State ======
let allManga = [];      // gộp từ tất cả repo con
let filteredManga = []; // sau khi search
let currentPage = 1;

// ====== Utils ======
function $(id) { return document.getElementById(id); }

function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function encodeParam(s) { return encodeURIComponent(s); }
function decodeParam(s) { return decodeURIComponent(s); }

// ====== Trang chủ ======
async function initIndex() {
  await loadAllMangaFromRegistry();
  renderList();
  renderPagination();
}

async function loadAllMangaFromRegistry() {
  try {
    const res = await fetch(REGISTRY_URL, { cache: 'no-cache' });
    const registry = await res.json();

    const tasks = registry.map(async lib => {
      try {
        const r = await fetch(lib.mangaListUrl, { cache: 'no-cache' });
        const list = await r.json();
        // Chuẩn hóa từng item
        list.forEach(item => {
          // YÊU CẦU: item.cover & item.chaptersJson phải là URL tuyệt đối (http...)
          allManga.push({
            id: item.id,
            title: item.title,
            cover: item.cover,
            chaptersJson: item.chaptersJson,
            libraryId: lib.id,
            libraryName: lib.name
          });
        });
      } catch (e) {
        console.warn('Không tải được manga.json của', lib.name, e);
      }
    });

    await Promise.all(tasks);
    // Mặc định: hiển thị tất cả
    filteredManga = [...allManga];
  } catch (e) {
    console.error('Lỗi tải registry.json:', e);
  }
}

function renderList() {
  const grid = $('manga-grid');
  grid.innerHTML = '';

  // phân trang
  const total = filteredManga.length;
  const totalPages = Math.max(1, Math.ceil(total / mangaPerPage));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * mangaPerPage;
  const end = start + mangaPerPage;
  const pageItems = filteredManga.slice(start, end);

  pageItems.forEach(m => {
    const aHref = `detail.html?title=${encodeParam(m.title)}&cover=${encodeParam(m.cover)}&chapters=${encodeParam(m.chaptersJson)}`;

    const card = document.createElement('div');
    card.className = 'manga-card';
    card.innerHTML = `
      <a href="${aHref}" target="_blank" rel="noopener">
        <img src="${m.cover}" alt="${m.title}" loading="lazy"/>
      </a>
      <h3 title="${m.title}">${m.title}</h3>
    `;
    grid.appendChild(card);
  });

  renderPagination();
}

function renderPagination() {
  const pagination = $('pagination');
  const total = filteredManga.length;
  const totalPages = Math.max(1, Math.ceil(total / mangaPerPage));

  // Nút prev/next + số trang đang xem
  const prevDisabled = currentPage <= 1 ? 'disabled' : '';
  const nextDisabled = currentPage >= totalPages ? 'disabled' : '';

  pagination.innerHTML = `
    <button ${prevDisabled} onclick="goPage(${currentPage - 1})">« Trước</button>
    <span>Trang ${currentPage} / ${totalPages}</span>
    <button ${nextDisabled} onclick="goPage(${currentPage + 1})">Sau »</button>
  `;
}

function goPage(p) {
  const totalPages = Math.max(1, Math.ceil(filteredManga.length / mangaPerPage));
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  // Cuộn về đầu trang để UX tốt
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderList();
}

// ====== Tìm kiếm ======
function searchManga() {
  const q = $('searchInput').value.trim().toLowerCase();
  if (!q) {
    clearSearch();
    return;
  }
  filteredManga = allManga.filter(m => m.title.toLowerCase().includes(q));
  currentPage = 1;
  $('clearBtn').style.display = 'inline-block';
  renderList();
}

function clearSearch() {
  $('searchInput').value = '';
  filteredManga = [...allManga];
  currentPage = 1;
  $('clearBtn').style.display = 'none';
  renderList();
}

// ====== Trang chi tiết ======
async function initDetail() {
  const container = $('manga-detail');

  const title = getParam('title') ? decodeParam(getParam('title')) : '';
  const cover = getParam('cover') ? decodeParam(getParam('cover')) : '';
  const chaptersUrl = getParam('chapters') ? decodeParam(getParam('chapters')) : '';

  if (!chaptersUrl) {
    container.innerHTML = `<p>Không tìm thấy dữ liệu chap.</p>`;
    return;
  }

  try {
    const r = await fetch(chaptersUrl, { cache: 'no-cache' });
    const data = await r.json();

    const displayTitle = title || data.title || 'Chi tiết truyện';
    const displayCover = cover || data.cover || '';

    let listHtml = '';
    if (Array.isArray(data.chapters)) {
      // YÊU CẦU: url chap nên là URL tuyệt đối (https://username.github.io/...)
      listHtml = data.chapters.map((c, idx) => {
        const name = c.name || `Chap ${idx + 1}`;
        const url = c.url || '#';
        return `<li><a href="${url}" target="_blank" rel="noopener">${name}</a></li>`;
      }).join('');
    } else {
      listHtml = '<li>Chưa có chap.</li>';
    }

    container.innerHTML = `
      <img src="${displayCover}" alt="${displayTitle}"/>
      <h2>${displayTitle}</h2>
      <ul class="chapter-list">${listHtml}</ul>
    `;
  } catch (e) {
    console.error('Lỗi tải chapters.json:', e);
    container.innerHTML = `<p>Lỗi tải dữ liệu chap.</p>`;
  }
}

// để dùng trong HTML inline onclick
window.initIndex = initIndex;
window.searchManga = searchManga;
window.clearSearch = clearSearch;
window.goPage = goPage;
window.initDetail = initDetail;
