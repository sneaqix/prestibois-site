/* ==========================================================================
   SCRIPT DE PRESTI'BOIS, sans bibliothèque
   --------------------------------------------------------------------------
     1. menu du téléphone
     2. filtres de la galerie
     3. visionneuse de photos
     4. curseur avant / après
   Sans JS : menu déplié, toutes les photos visibles, avant et après côte à côte.
   ========================================================================== */

/* 1. MENU ------------------------------------------------------------------- */
const boutonMenu = document.querySelector('.menu-bouton');
const menu = document.getElementById('menu');

if (boutonMenu && menu) {
  const afficherMenu = (ouvrir) => {
    menu.classList.toggle('est-ouvert', ouvrir);
    boutonMenu.setAttribute('aria-expanded', String(ouvrir));
    boutonMenu.textContent = ouvrir ? 'Fermer' : 'Menu';
  };
  boutonMenu.addEventListener('click', () => afficherMenu(!menu.classList.contains('est-ouvert')));
  menu.addEventListener('click', (evenement) => {
    if (evenement.target.closest('a')) afficherMenu(false);
  });
  document.addEventListener('click', (evenement) => {
    if (!evenement.target.closest('.entete')) afficherMenu(false);
  });
  boutonMenu.closest('.entete').addEventListener('focusout', (evenement) => {
    const suivant = evenement.relatedTarget;
    if (suivant && !suivant.closest('.entete')) afficherMenu(false);
  });
  document.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape' && menu.classList.contains('est-ouvert')) {
      afficherMenu(false);
      boutonMenu.focus();
    }
  });
}


/* 2. FILTRES ---------------------------------------------------------------- */
const galerie = document.querySelector('[data-galerie]');

if (galerie) {
  const barreFiltres = document.querySelector('.filtres');
  const boutons = [...barreFiltres.querySelectorAll('button')];
  const cartes = [...galerie.children];
  const voirPlus = document.querySelector('.voir-plus');
  const bilan = document.querySelector('.filtres__bilan');
  const PAQUET = 16; // nombre de cartes ajoutées à chaque fois
  let choisies = cartes;
  let limite = PAQUET;

  const afficher = () => {
    const visibles = new Set(choisies.slice(0, limite));
    cartes.forEach((carte) => { carte.hidden = !visibles.has(carte); });
    voirPlus.hidden = choisies.length <= limite;
    bilan.textContent = `${choisies.length} réalisation${choisies.length > 1 ? 's' : ''}`;
  };

  // "famille-cuisines" ou "bois-noyer" ; tout autre texte = tout afficher
  const filtrer = (demande) => {
    const bouton = boutons.find((b) => b.dataset.filtre === demande) || boutons[0];
    const [genre, valeur] = bouton.dataset.filtre.split('-');
    choisies = cartes.filter((carte) => !genre || carte.dataset[genre] === valeur);
    boutons.forEach((b) => b.setAttribute('aria-pressed', String(b === bouton)));
    limite = PAQUET;
    afficher();
    // amène le filtre choisi dans la bande, sans faire bouger la page
    barreFiltres.scrollLeft = Math.max(0, bouton.offsetLeft - 20);
  };

  boutons.forEach((bouton) => {
    bouton.addEventListener('click', () => {
      filtrer(bouton.dataset.filtre);
      const ancre = bouton.dataset.filtre ? `#${bouton.dataset.filtre}` : window.location.pathname;
      window.history.replaceState(null, '', ancre);
    });
  });

  voirPlus.addEventListener('click', () => {
    const premiereNouvelle = choisies[limite];
    limite += PAQUET;
    afficher();
    premiereNouvelle.querySelector('a').focus();
  });

  barreFiltres.hidden = false;
  filtrer(window.location.hash.slice(1));
  window.addEventListener('hashchange', () => filtrer(window.location.hash.slice(1)));
}


/* 3. VISIONNEUSE ------------------------------------------------------------ */
// Sans <dialog> (vieux téléphone), le lien ouvre simplement la photo.
const liensPhotos = [...document.querySelectorAll('a[data-serie]')];

if (liensPhotos.length && typeof document.createElement('dialog').showModal === 'function') {
  const fenetre = document.createElement('dialog');
  fenetre.className = 'visionneuse';
  fenetre.setAttribute('aria-labelledby', 'visionneuse-titre');
  fenetre.innerHTML = `
    <div class="visionneuse__haut"><p id="visionneuse-titre"></p><button type="button" data-fermer>Fermer</button></div>
    <img class="visionneuse__image" alt="">
    <div class="visionneuse__bas">
      <button type="button" data-aller="-1" aria-label="Photo précédente">‹</button>
      <span aria-live="polite"></span>
      <button type="button" data-aller="1" aria-label="Photo suivante">›</button>
    </div>`;
  document.body.append(fenetre);

  const photo = fenetre.querySelector('img');
  const titre = fenetre.querySelector('p');
  const compteur = fenetre.querySelector('span');
  const [precedente, suivante] = fenetre.querySelectorAll('[data-aller]');
  const fermer = fenetre.querySelector('[data-fermer]');
  let serie = [];
  let rang = 0;
  let origine = null;
  let departX = null;

  const montrer = (demande) => {
    rang = Math.max(0, Math.min(serie.length - 1, demande));
    photo.src = serie[rang];
    photo.alt = `${titre.textContent}, photo ${rang + 1} sur ${serie.length}`;
    compteur.textContent = `${rang + 1} / ${serie.length}`;
    // un bouton désactivé perd le focus : on le donne d'abord à "Fermer"
    const actif = document.activeElement;
    if ((actif === precedente && rang === 0) || (actif === suivante && rang === serie.length - 1)) fermer.focus();
    precedente.disabled = rang === 0;
    suivante.disabled = rang === serie.length - 1;
  };

  liensPhotos.forEach((lien) => {
    lien.addEventListener('click', (evenement) => {
      evenement.preventDefault();
      origine = lien;
      serie = JSON.parse(lien.dataset.serie);
      titre.textContent = lien.dataset.titre;
      fenetre.showModal();
      document.documentElement.classList.add('sans-defilement');
      montrer(0);
      fermer.focus();
    });
  });

  fermer.addEventListener('click', () => fenetre.close());
  [precedente, suivante].forEach((bouton) => {
    bouton.addEventListener('click', () => montrer(rang + Number(bouton.dataset.aller)));
  });
  fenetre.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'ArrowLeft') montrer(rang - 1);
    if (evenement.key === 'ArrowRight') montrer(rang + 1);
  });
  // Glissement du doigt (un pincement pour zoomer ne change pas de photo)
  photo.addEventListener('touchstart', (evenement) => {
    departX = evenement.touches.length === 1 ? evenement.touches[0].clientX : null;
  }, { passive: true });
  photo.addEventListener('touchend', (evenement) => {
    if (departX === null) return;
    const ecart = evenement.changedTouches[0].clientX - departX;
    if (Math.abs(ecart) > 50) montrer(rang + (ecart < 0 ? 1 : -1));
    departX = null;
  }, { passive: true });
  fenetre.addEventListener('close', () => {
    document.documentElement.classList.remove('sans-defilement');
    if (origine) origine.focus({ preventScroll: true });
  });
}


/* 4. AVANT / APRÈS ---------------------------------------------------------- */
document.querySelectorAll('.comparer').forEach((bloc) => {
  const trait = document.createElement('span');
  trait.className = 'comparer__trait';
  trait.setAttribute('aria-hidden', 'true');

  // Un vrai curseur, invisible, par-dessus : marche au doigt, à la souris et au clavier
  const curseur = document.createElement('input');
  curseur.type = 'range';
  curseur.min = '0';
  curseur.max = '100';
  curseur.value = '50';
  curseur.className = 'comparer__curseur';
  curseur.setAttribute('aria-label', `${bloc.dataset.titre} : part de la photo « avant »`);

  curseur.addEventListener('input', () => bloc.style.setProperty('--position', `${curseur.value}%`));
  bloc.append(trait, curseur);
  bloc.classList.add('est-active');
});

