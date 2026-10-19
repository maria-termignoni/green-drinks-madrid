// Lógica de la web de Green Drinks Madrid.
// Los encuentros vienen de data/eventos.json, que se genera cada día desde la base
// "Eventos Green Drinks Madrid" de Notion (ver scripts/actualizar-desde-notion.mjs).
//   proximo → la tarjeta «Próximo encuentro»
//   pasados → la lista «Encuentros pasados» (más reciente primero)

const fmtCorta = new Intl.DateTimeFormat('es-ES', {day:'2-digit', month:'short', year:'numeric'});
const fmtLarga = new Intl.DateTimeFormat('es-ES', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
const fmtDia = new Intl.DateTimeFormat('es-ES', {weekday:'long'});
const fmtMes = new Intl.DateTimeFormat('es-ES', {month:'short'});
const fecha = d => new Date(d + 'T12:00');
const mayus = s => s.charAt(0).toUpperCase() + s.slice(1);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dominio = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };

let pasados = [];

// ---------- Próximo encuentro ----------
function pintarProximo(p) {
  const t = document.getElementById('proximo');
  if (!t) return;
  if (!p) {
    t.innerHTML = `
      <div class="ticket-top"><div><span class="ticket-label">Próximo encuentro</span>
        <div style="font-weight:500;margin-top:.1rem">Fecha por anunciar</div></div></div>
      <div class="ticket-body">
        <h3 id="next-title">Estamos preparando el próximo</h3>
        <p style="margin:.6rem 0 1.2rem;color:var(--muted)">Suscríbete a la newsletter y te avisamos en cuanto tengamos fecha y ponente.</p>
        <a class="btn btn-green" href="#unete">Avisadme</a>
      </div>`;
    return;
  }
  const f = fecha(p.fecha);
  const titulo = p.titulo
    ? esc(p.titulo)
    : `${esc(p.tema || 'Charla')} <small style="display:block;font-family:var(--body);text-transform:none;font-size:.8rem;font-weight:500;color:var(--green-dark);margin-top:.3rem">Título de la charla por confirmar</small>`;
  const reservar = p.inscripcion
    ? `<a class="btn btn-green" href="${esc(p.inscripcion)}" target="_blank" rel="noopener">Reservar sitio</a>`
    : `<a class="btn btn-green" href="#" data-placeholder="El enlace de inscripción estará disponible muy pronto.">Reservar sitio</a>`;
  t.innerHTML = `
    <div class="ticket-top">
      <div>
        <span class="ticket-label">Próximo encuentro</span>
        <div style="font-weight:500;margin-top:.1rem">${mayus(fmtDia.format(f))}, desde las ${esc(p.hora)}</div>
      </div>
      <div class="date-badge"><b>${f.getDate()}</b><span>${fmtMes.format(f).replace('.', '').toUpperCase()}</span></div>
    </div>
    <div class="ticket-body">
      <h3 id="next-title">${titulo}</h3>
      <div class="speaker">
        ${p.foto ? `<img src="${esc(p.foto)}" alt="${esc(p.nombre)}" width="76" height="76">` : ''}
        <p class="who"><strong>${esc(p.nombre)}</strong>${p.cargo ? '<br>' + esc(p.cargo) : ''}</p>
      </div>
      <ul class="meta">
        <li><svg><use href="#i-cal"/></svg><span>${mayus(fmtLarga.format(f))}, desde las ${esc(p.hora)}</span></li>
        <li><svg><use href="#i-pin"/></svg><span><a href="https://maps.google.com/?q=Anubis+Cocteleria+Calle+Trafalgar+10+Madrid" target="_blank" rel="noopener">Anubis Coctelería</a>, C/ Trafalgar 10, Madrid</span></li>
        <li><svg><use href="#i-mic"/></svg><span>Charla corta, preguntas y networking</span></li>
      </ul>
      ${reservar}
      <p class="ticket-note">Es gratis. Las plazas son limitadas.</p>
    </div>`;
}

// ---------- Encuentros pasados ----------
const cards = document.getElementById('cards');
const filtros = document.getElementById('filtros');
const more = document.getElementById('cardsMore'), VISIBLES = 4;
let filtro = 'all', abierto = false;

function pintarPasados() {
  cards.innerHTML = pasados.map((e, i) => `
    <button type="button" class="card" data-cat="${esc(e.cat)}" data-i="${i}" aria-haspopup="dialog">
      <time datetime="${e.fecha}">${fmtCorta.format(fecha(e.fecha)).replace('.', '').toLowerCase()}</time>
      ${e.foto ? `<img src="${esc(e.foto)}" alt="" width="88" height="88">` : '<span></span>'}
      <span class="txt"><h3>${esc(e.titulo)}</h3><span class="who">${esc(e.nombre)}</span></span>
      <span class="theme">${esc(e.tema)}</span>
      <svg><use href="#i-arrow"/></svg>
    </button>`).join('');

  // Un filtro por cada temática que aparece en la lista, en orden de aparición
  const temas = [];
  pasados.forEach(e => { if (e.cat && !temas.some(t => t.cat === e.cat)) temas.push({cat: e.cat, tema: e.tema}); });
  filtros.innerHTML = [{cat:'all', tema:'Todos'}, ...temas].map(t =>
    `<button class="chip" aria-pressed="${t.cat === filtro}" data-filter="${esc(t.cat)}">${esc(t.tema)}</button>`).join('');
  aplicarFiltro();
}

function aplicarFiltro() {
  let n = 0, total = 0;
  cards.querySelectorAll('.card').forEach(c => {
    const ok = filtro === 'all' || c.dataset.cat === filtro;
    if (ok) total++;
    c.hidden = !ok || (!abierto && ++n > VISIBLES);
  });
  more.hidden = total <= VISIBLES;
  more.textContent = abierto ? 'Ver menos' : `Ver más encuentros (${total - VISIBLES})`;
  more.setAttribute('aria-expanded', abierto);
}

filtros.addEventListener('click', ev => {
  const chip = ev.target.closest('.chip'); if (!chip) return;
  filtro = chip.dataset.filter; abierto = false;
  filtros.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c === chip));
  aplicarFiltro();
});
more.addEventListener('click', () => {
  abierto = !abierto; aplicarFiltro();
  if (!abierto) document.getElementById('archivo').scrollIntoView({behavior:'smooth'});
});

// Ficha ampliada de cada encuentro
const dlg = document.getElementById('evento');
cards.addEventListener('click', ev => {
  const card = ev.target.closest('.card'); if (!card) return;
  const e = pasados[card.dataset.i];
  const foto = dlg.querySelector('.dlg-photo');
  foto.hidden = !e.foto; foto.src = e.foto || ''; foto.alt = e.nombre;
  dlg.querySelector('.dlg-date').textContent = fmtLarga.format(fecha(e.fecha));
  dlg.querySelector('.dlg-theme').textContent = e.tema;
  dlg.querySelector('.dlg-title').textContent = e.titulo;
  dlg.querySelector('.dlg-name').textContent = e.nombre;
  dlg.querySelector('.dlg-role').textContent = e.cargo || '';
  dlg.querySelector('.dlg-charla').textContent = e.charla || '';
  dlg.querySelector('.dlg-bio').textContent = e.bio || '';
  dlg.querySelector('.dlg-links').innerHTML =
    (e.web ? `<a class="btn btn-green" href="${esc(e.web)}" target="_blank" rel="noopener">Visitar ${esc(dominio(e.web))}</a>` : '') +
    (e.linkedin ? `<a class="btn btn-outline" href="${esc(e.linkedin)}" target="_blank" rel="noopener"><svg width="16" height="16"><use href="#i-in"/></svg> LinkedIn</a>` : '');
  dlg.showModal();
});
dlg.querySelector('.dlg-close').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', ev => { if (ev.target === dlg) dlg.close(); });

// Cargar los datos
fetch('data/eventos.json', {cache: 'no-store'})
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(datos => {
    pasados = datos.pasados || [];
    pintarProximo(datos.proximo);
    pintarPasados();
  })
  .catch(err => {
    console.error('No se pudieron cargar los encuentros', err);
    cards.innerHTML = '<p style="padding:1.2rem .5rem;color:var(--on-dark-soft)">No hemos podido cargar los encuentros. Prueba a recargar la página.</p>';
    more.hidden = true;
  });

// ---------- Resto de la página ----------
// Menú móvil
const toggle = document.querySelector('.menu-toggle'), menu = document.getElementById('menu');
if (toggle && menu) {
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));
}

// Newsletter (provisional hasta conectar Brevo)
document.getElementById('newsForm').addEventListener('submit', e => {
  e.preventDefault();
  e.target.outerHTML = '<p class="form-ok">¡Gracias! Te escribiremos antes del próximo encuentro. 🌱</p>';
});

// Enlaces pendientes (también los que se pintan después, como el de la tarjeta)
document.addEventListener('click', e => {
  const a = e.target.closest('[data-placeholder]'); if (!a) return;
  e.preventDefault(); alert(a.dataset.placeholder || 'Enlace pendiente de añadir.');
});

// Aparición al hacer scroll
const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting){ x.target.classList.add('in'); io.unobserve(x.target); } }), {threshold:.12});
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

document.getElementById('year').textContent = new Date().getFullYear();
