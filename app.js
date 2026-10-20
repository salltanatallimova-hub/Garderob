const DEFAULT_BOXES = [
  { id: 'tops', name: 'Верх', hint: 'Блузки, топы и рубашки', icon: '✿' },
  { id: 'bottoms', name: 'Низ', hint: 'Брюки, юбки и джинсы', icon: '♡' },
  { id: 'dresses', name: 'Платья', hint: 'Для любого настроения', icon: '✧' },
  { id: 'shoes', name: 'Обувь', hint: 'От кед до каблуков', icon: '⌁' },
  { id: 'accessories', name: 'Аксессуары', hint: 'Финальные детали', icon: '◇' },
  { id: 'outerwear', name: 'Верхняя одежда', hint: 'Для уютных дней', icon: '☼' },
];
const DEFAULT_ITEMS = [];
const readStore = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
let BOXES = [...DEFAULT_BOXES, ...readStore('wardrobe-custom-boxes-v1', [])];
let items = readStore('wardrobe-items-v1', DEFAULT_ITEMS);
let cart = readStore('wardrobe-cart-v1', []);
let activeBox = null;
let currentPage = 1;
const pageSize = 20;
const $ = (s) => document.querySelector(s);
const persist = () => { try { localStorage.setItem('wardrobe-items-v1', JSON.stringify(items)); localStorage.setItem('wardrobe-cart-v1', JSON.stringify(cart)); } catch { toast('В хранилище браузера не хватило места. Попробуй фото поменьше.'); } };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2500); }
function renderBoxes() {
  const interior = $('.closet-interior');
  interior.innerHTML = Array.from({ length: Math.ceil(BOXES.length / 2) }, (_, row) => {
    const cards = BOXES.slice(row * 2, row * 2 + 2).map((box) => { const count = items.filter((i) => i.box === box.id).length; return `<article class="box-card" data-box="${box.id}" tabindex="0" role="button" aria-label="Открыть коробку ${esc(box.name)}"><div class="box-lid"></div><div class="box-ribbon"></div><div class="box-deco">${box.icon}</div><div class="box-label"><div><strong>${esc(box.name)}</strong><span>${esc(box.hint)}</span></div><span class="box-count">${count} вещей</span></div></article>`; }).join('');
    return `${row ? '<div class="shelf-board"><span></span></div>' : ''}<div class="shelf-row ${row === 1 ? 'second-row' : row > 1 ? 'third-row' : ''}">${cards}</div>`;
  }).join('');
  document.querySelectorAll('.box-card').forEach((card) => { card.addEventListener('click', () => openBox(card.dataset.box)); card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openBox(card.dataset.box); }); });
  $('#total-count').textContent = `${items.length} ${plural(items.length, ['вещь', 'вещи', 'вещей'])}`;
  $('#box-count').textContent = `${BOXES.length} коробок`;
  $('#cart-count').textContent = cart.length;
}
function plural(n, forms) { const n10 = n % 10, n100 = n % 100; return n10 === 1 && n100 !== 11 ? forms[0] : n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14) ? forms[1] : forms[2]; }
function openBox(id) { activeBox = id; currentPage = 1; const box = BOXES.find((b) => b.id === id); $('#modal-title').textContent = box.name; $('#modal-subtitle').textContent = `${box.hint} · нажми на вещь, чтобы добавить её в корзину`; $('.upload-button').classList.remove('hidden'); $('#overlay').classList.add('open'); $('#overlay').setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; renderItems(); }
function closeModal() { $('#overlay').classList.remove('open'); $('#overlay').setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
function renderItems() {
  const list = items.filter((i) => activeBox ? i.box === activeBox : cart.includes(i.id)); const pages = Math.max(1, Math.ceil(list.length / pageSize)); currentPage = Math.min(currentPage, pages); const shown = list.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  $('#page-indicator').textContent = `${currentPage} / ${pages}`; $('#prev-page').disabled = currentPage <= 1; $('#next-page').disabled = currentPage >= pages;
  $('#item-grid').innerHTML = shown.length ? shown.map((item) => `<article class="item-card ${cart.includes(item.id) ? 'selected' : ''}" data-item="${item.id}"><div class="item-photo">${item.image ? `<img src="${item.image}" alt="${esc(item.name)}">` : `<span class="item-placeholder">${BOXES.find((b) => b.id === item.box)?.icon || '♡'}</span>`}</div><div class="item-info"><div><strong>${esc(item.name)}</strong><br><small>${esc(item.note || 'Моя вещь')}</small></div><button class="delete-item" data-delete="${item.id}" aria-label="Удалить ${esc(item.name)}">×</button></div></article>`).join('') : `<div class="empty-state"><span class="item-placeholder">♡</span><b>Здесь пока пусто</b><span>Нажми «Добавить вещь», чтобы загрузить первое фото</span></div>`;
  document.querySelectorAll('.item-card').forEach((card) => card.addEventListener('click', (e) => { if (e.target.closest('.delete-item')) return; toggleCart(card.dataset.item); renderItems(); }));
  document.querySelectorAll('.delete-item').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); removeItem(btn.dataset.delete); }));
}
function toggleCart(id) { if (cart.includes(id)) { cart = cart.filter((x) => x !== id); toast('Вещь убрана из корзины'); } else { cart.push(id); toast('Вещь добавлена в корзину'); } persist(); renderBoxes(); }
function removeItem(id) { items = items.filter((i) => i.id !== id); cart = cart.filter((x) => x !== id); persist(); renderBoxes(); renderItems(); toast('Вещь удалена из гардероба'); }
function addBox() { const name = prompt('Как назовём новую коробку?'); if (!name?.trim()) return; const id = `custom-${Date.now()}`; const box = { id, name: name.trim(), hint: 'Твои любимые вещи', icon: '♡' }; BOXES.push(box); localStorage.setItem('wardrobe-custom-boxes-v1', JSON.stringify(BOXES.filter((b) => !DEFAULT_BOXES.some((d) => d.id === b.id))));
  const interior = $('.closet-interior'); const group = document.createElement('div'); group.className = 'shelf-row extra-shelf'; group.innerHTML = `<article class="box-card" data-box="${id}" tabindex="0" role="button" aria-label="Открыть коробку ${esc(box.name)}"><div class="box-lid"></div><div class="box-ribbon"></div><div class="box-deco">♡</div><div class="box-label"><div><strong>${esc(box.name)}</strong><span>${esc(box.hint)}</span></div><span class="box-count">0 вещей</span></div></article>`; const board = document.createElement('div'); board.className = 'shelf-board'; board.innerHTML = '<span></span>'; interior.append(board, group); const card = group.querySelector('.box-card'); card.addEventListener('click', () => openBox(id)); card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openBox(id); }); $('#box-count').textContent = `${BOXES.length} коробок`; toast('Новая коробка добавлена на полку'); }
function addImages(files) {
  const box = BOXES.find((b) => b.id === activeBox); [...files].forEach((file) => { if (!file.type.startsWith('image/')) return; const reader = new FileReader(); reader.onload = () => { const image = reader.result; const suggested = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '); const name = prompt('Добавь подпись к вещи:', suggested) || box.name; items.push({ id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`, box: activeBox, name: name.trim() || box.name, note: '', image }); persist(); renderBoxes(); renderItems(); }; reader.readAsDataURL(file); });
}
function buildLook() {
  const occasion = $('#occasion-input').value.trim() || document.querySelector('.occasion.active')?.dataset.occasion || 'на каждый день';
  const catalog = items; const outfit = [];
  const preferred = occasion.toLowerCase().includes('работ') ? ['tops', 'bottoms', 'shoes', 'accessories'] : occasion.toLowerCase().includes('меропр') || occasion.toLowerCase().includes('свидан') ? ['dresses', 'shoes', 'accessories'] : occasion.toLowerCase().includes('отдых') || occasion.toLowerCase().includes('поезд') ? ['tops', 'bottoms', 'shoes', 'accessories'] : ['tops', 'bottoms', 'shoes', 'outerwear'];
  preferred.forEach((id) => { const found = catalog.find((item) => item.box === id && !outfit.some((x) => x.id === item.id)); if (found) outfit.push(found); });
  const missing = preferred.filter((id) => !outfit.some((x) => x.box === id)).map((id) => BOXES.find((b) => b.id === id).name.toLowerCase());
  const suggestions = missing.length ? `Добавь в гардероб ${missing.join(', ')} — так образ станет завершённее.` : 'Попробуй добавить украшения, сумку или лёгкий слой сверху, чтобы образ заиграл по-новому.';
  const result = $('#look-result'); result.classList.remove('hidden'); result.innerHTML = `<strong>Образ ${esc(occasion.toLowerCase())}</strong><div class="look-items">${outfit.length ? outfit.map((item) => `<span class="look-chip">${esc(item.name)}${cart.includes(item.id) ? '' : `<button data-look-add="${item.id}" aria-label="Добавить ${esc(item.name)} в корзину">＋</button>`}</span>`).join('') : '<span class="look-chip">Пока нет вещей для подбора</span>'}</div><div class="look-tip">✦ Подсказка стилиста: ${esc(suggestions)}</div>`;
  result.querySelectorAll('[data-look-add]').forEach((btn) => btn.addEventListener('click', () => { if (!cart.includes(btn.dataset.lookAdd)) cart.push(btn.dataset.lookAdd); persist(); renderBoxes(); buildLook(); toast('Вещь добавлена в корзину'); }));
}
document.querySelectorAll('.occasion').forEach((btn) => btn.addEventListener('click', () => { document.querySelectorAll('.occasion').forEach((b) => b.classList.remove('active')); btn.classList.add('active'); $('#occasion-input').value = btn.dataset.occasion; }));
$('#build-look').addEventListener('click', buildLook); $('#close-modal').addEventListener('click', closeModal); $('#overlay').addEventListener('click', (e) => { if (e.target === $('#overlay')) closeModal(); }); document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
$('#file-input').addEventListener('change', (e) => { if (e.target.files.length) addImages(e.target.files); e.target.value = ''; });
$('#prev-page').addEventListener('click', () => { currentPage--; renderItems(); }); $('#next-page').addEventListener('click', () => { currentPage++; renderItems(); });
$('#add-box-btn').addEventListener('click', addBox);
$('#cart-button').addEventListener('click', () => { if (!cart.length) return toast('Корзина пока пуста — выбери вещи в коробках'); activeBox = null; currentPage = 1; $('#modal-title').textContent = 'Моя корзина'; $('#modal-subtitle').textContent = `${cart.length} выбранных ${plural(cart.length, ['вещь', 'вещи', 'вещей'])} · нажми на вещь, чтобы убрать её`; $('.upload-button').classList.add('hidden'); $('#overlay').classList.add('open'); $('#overlay').setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; renderItems(); });
$('#footer-year').textContent = new Date().getFullYear(); renderBoxes();
