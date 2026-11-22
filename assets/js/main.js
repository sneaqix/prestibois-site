/* ==========================================================================
   SCRIPT DE PRESTI'BOIS, sans bibliothèque
   --------------------------------------------------------------------------
     1. menu du téléphone
     2. filtres de la galerie
     3. visionneuse de photos
     4. curseur avant / après
     5. carnet de croquis
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


/* 5. CARNET DE CROQUIS ------------------------------------------------------ */
const reglages = document.getElementById('reglages');

if (reglages) {
  // Valeurs de départ et bornes de chaque meuble, en centimètres : [départ, minimum, maximum]
  const MEUBLES = {
    bibliotheque: { nom: 'Bibliothèque', largeur: [180, 40, 400], hauteur: [220, 80, 300], profondeur: [32, 20, 60], modules: 3 },
    placard: { nom: 'Placard ou dressing', largeur: [200, 50, 400], hauteur: [240, 100, 300], profondeur: [60, 30, 80], modules: 4 },
    buffet: { nom: 'Buffet ou meuble TV', largeur: [180, 60, 300], hauteur: [70, 35, 120], profondeur: [45, 30, 70], modules: 3 },
    table: { nom: 'Table', largeur: [200, 60, 400], hauteur: [76, 40, 110], profondeur: [95, 50, 130], modules: 0 },
    bureau: { nom: 'Bureau', largeur: [140, 80, 260], hauteur: [75, 60, 120], profondeur: [70, 45, 100], modules: 0 },
  };
  const TAILLE_PERSONNE = 175;

  const dessin = document.getElementById('dessin');
  const resume = document.getElementById('resume');
  const envoyer = document.getElementById('envoyer');
  const laque = document.getElementById('laque');
  const champs = {};
  ['largeur', 'hauteur', 'profondeur', 'modules'].forEach((nom) => { champs[nom] = document.getElementById(nom); });

  const choisi = (nom) => reglages.querySelector(`input[name="${nom}"]:checked`);

  const changerMeuble = () => {
    const meuble = MEUBLES[choisi('type').value];
    ['largeur', 'hauteur', 'profondeur'].forEach((nom) => {
      const [depart, minimum, maximum] = meuble[nom];
      Object.assign(champs[nom], { min: minimum, max: maximum, value: depart });
    });
    if (meuble.modules) champs.modules.value = meuble.modules;
    document.getElementById('bloc-modules').hidden = !meuble.modules;
  };

  const lireEtat = () => {
    const bois = choisi('bois');
    const finition = choisi('finition').value;
    const estLaque = finition === 'laqué';
    return {
      type: choisi('type').value,
      L: Number(champs.largeur.value),
      H: Number(champs.hauteur.value),
      P: Number(champs.profondeur.value),
      colonnes: Number(champs.modules.value),
      bois: bois.value,
      finition,
      estLaque,
      teinte: estLaque ? laque.value : bois.dataset.teinte,
      veine: estLaque ? laque.value : bois.dataset.veine,
    };
  };

  // Petites fonctions qui écrivent du SVG
  const ENCRE = '#4a3426';
  const rect = (x, y, l, h, fond, plus = '') =>
    `<rect x="${x}" y="${y}" width="${Math.max(0, l)}" height="${Math.max(0, h)}" fill="${fond}" stroke="${ENCRE}" stroke-width="1.5" ${plus}/>`;
  const forme = (points, fond) =>
    `<polygon points="${points.map((p) => p.join(',')).join(' ')}" fill="${fond}" stroke="${ENCRE}" stroke-width="1.5" stroke-linejoin="round"/>`;
  const ligne = (x1, y1, x2, y2, plus = '') =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ENCRE}" stroke-width="1.5" ${plus}/>`;

  const dessiner = (etat) => {
    const { type, L, H, P, colonnes, teinte, veine } = etat;
    const SOL = 365;
    // Échelle : le meuble, sa profondeur et la personne tiennent dans le dessin
    const s = Math.min(540 / (L + 0.4 * P + 75), 315 / Math.max(H + 0.3 * P, TAILLE_PERSONNE));
    const [l, h, dx, dy] = [L * s, H * s, 0.4 * P * s, 0.3 * P * s];
    const x = (640 - (l + dx + 75 * s)) / 2;
    const y = SOL - h;
    const bois = 'url(#bois)';

    // Une boîte en perspective : dessus, côté, face
    const boite = (bx, by, bl, bh) =>
      forme([[bx, by], [bx + dx, by - dy], [bx + bl + dx, by - dy], [bx + bl, by]], bois)
      + forme([[bx + bl, by], [bx + bl + dx, by - dy], [bx + bl + dx, by + bh - dy], [bx + bl, by + bh]], bois)
      + forme([[bx + bl, by], [bx + bl + dx, by - dy], [bx + bl + dx, by + bh - dy], [bx + bl, by + bh]], 'rgba(40,20,10,.22)')
      + rect(bx, by, bl, bh, bois);

    let meuble = '';
    const ep = Math.max(3, 3 * s); // épaisseur des planches

    if (type === 'bibliotheque') {
      meuble = boite(x, y, l, h);
      const largeurCase = (l - ep) / colonnes;
      const rayons = Math.max(1, Math.round(H / 40));
      const hauteurCase = (h - ep) / rayons;
      for (let c = 0; c < colonnes; c += 1) {
        for (let r = 0; r < rayons; r += 1) {
          meuble += rect(x + ep + c * largeurCase, y + ep + r * hauteurCase, largeurCase - ep, hauteurCase - ep, 'rgba(40,20,10,.42)');
        }
      }
    } else if (type === 'placard' || type === 'buffet') {
      meuble = boite(x, y, l, h);
      const porte = l / colonnes;
      for (let c = 0; c < colonnes; c += 1) {
        const px = x + c * porte;
        meuble += rect(px + ep, y + ep, porte - 2 * ep, h - 2 * ep, 'rgba(255,255,255,.1)');
        if (type === 'placard') {
          const poignee = c % 2 ? px + 2.5 * ep : px + porte - 2.5 * ep;
          meuble += ligne(poignee, y + h * 0.43, poignee, y + h * 0.57, 'style="stroke-width:3"');
        } else {
          meuble += ligne(px + ep, y + h / 2, px + porte - ep, y + h / 2);
          [0.26, 0.74].forEach((part) => {
            meuble += ligne(px + porte * 0.38, y + h * part, px + porte * 0.62, y + h * part, 'style="stroke-width:3"');
          });
        }
      }
    } else {
      const plateau = 4.5 * s;
      const pied = 7 * s;
      // pieds du fond, puis de devant, puis plateau
      const piedFond = (px) => rect(px + dx, y + plateau - dy, pied, h - plateau, bois);
      if (type === 'table') meuble += piedFond(x) + piedFond(x + l - pied);
      else meuble += piedFond(x);
      meuble += rect(x, y + plateau, pied, h - plateau, bois);
      if (type === 'table') {
        meuble += rect(x + l - pied, y + plateau, pied, h - plateau, bois);
      } else {
        const caisson = Math.min(48, L * 0.36) * s;
        const haut = h - plateau;
        meuble += boite(x + l - caisson, y + plateau, caisson, haut);
        for (let t = 0; t < 3; t += 1) {
          const ty = y + plateau + (t * haut) / 3;
          meuble += rect(x + l - caisson + ep, ty + ep / 2, caisson - 2 * ep, haut / 3 - ep, 'rgba(255,255,255,.1)');
          meuble += ligne(x + l - caisson * 0.65, ty + haut / 6, x + l - caisson * 0.35, ty + haut / 6, 'style="stroke-width:3"');
        }
      }
      meuble += boite(x, y, l, plateau);
    }

    // Verni : un reflet
    const reflet = etat.finition === 'verni'
      ? forme([[x + 2, y - 1], [x + dx, y - dy + 1], [x + dx + l * 0.3, y - dy + 1], [x + l * 0.3, y - 1]], 'rgba(255,255,255,.38)')
      : '';

    // La personne, pour l'échelle
    const px = x + l + dx + 45 * s;
    const haut = SOL - TAILLE_PERSONNE * s;
    const personne = `<g fill="none" stroke="#8a7665" stroke-width="2" stroke-linecap="round">
      <circle cx="${px}" cy="${haut + 12 * s}" r="${11 * s}"/>
      <path d="M${px} ${haut + 25 * s}V${haut + 95 * s}M${px - 20 * s} ${haut + 85 * s}L${px} ${haut + 36 * s}L${px + 20 * s} ${haut + 85 * s}M${px - 16 * s} ${SOL}L${px} ${haut + 95 * s}L${px + 16 * s} ${SOL}"/></g>`;

    // Les cotes
    const mot = 'fill="#4a3426" font-family="system-ui, sans-serif" font-size="22" font-weight="700" text-anchor="middle"';
    const cotes = ligne(x, 385, x + l, 385) + ligne(x, 379, x, 391) + ligne(x + l, 379, x + l, 391)
      + `<text x="${x + l / 2}" y="415" ${mot}>${L} cm</text>`
      + ligne(x - 14, y, x - 14, SOL) + ligne(x - 20, y, x - 8, y) + ligne(x - 20, SOL, x - 8, SOL)
      + `<text transform="translate(${x - 25} ${y + h / 2}) rotate(-90)" ${mot}>${H} cm</text>`;

    // Le veinage
    const motif = `<defs><pattern id="bois" width="46" height="120" patternUnits="userSpaceOnUse">
      <rect width="46" height="120" fill="${teinte}"/>
      <g fill="none" stroke="${veine}" stroke-opacity=".45">
        <path d="M6 0C10 30 2 70 6 120"/><path d="M17 0C13 40 22 80 17 120"/>
        <path d="M29 0C35 34 25 78 29 120"/><path d="M40 0C37 50 43 74 40 120"/></g></pattern></defs>`;

    dessin.innerHTML = motif + ligne(20, SOL, 620, SOL, 'stroke-dasharray="4 5"') + meuble + reflet + personne + cotes;
  };

  const decrire = (etat) => {
    const morceaux = [MEUBLES[etat.type].nom, `L ${etat.L} x H ${etat.H} x P ${etat.P} cm`];
    if (MEUBLES[etat.type].modules) morceaux.push(`${etat.colonnes} colonne${etat.colonnes > 1 ? 's' : ''}`);
    const couleur = laque.options[laque.selectedIndex].text.toLowerCase();
    morceaux.push(etat.bois.toLowerCase(), etat.estLaque ? `laqué ${couleur}` : etat.finition);
    return morceaux.join(', ');
  };

  const message = () => {
    const precision = document.getElementById('precision').value.trim();
    return `Bonjour, voici mon projet, esquissé sur votre site : ${decrire(lireEtat())}.`
      + (precision ? ` Précision : ${precision}` : '');
  };

  const actualiser = () => {
    const etat = lireEtat();
    ['largeur', 'hauteur', 'profondeur'].forEach((nom) => {
      document.getElementById(`sortie-${nom}`).textContent = `${champs[nom].value} cm`;
    });
    document.getElementById('sortie-modules').textContent = champs.modules.value;
    document.getElementById('bloc-laque').hidden = !etat.estLaque;
    dessiner(etat);
    const texte = decrire(etat);
    resume.textContent = texte;
    dessin.setAttribute('aria-label', `Croquis : ${texte}. Silhouette de 1 m 75 pour l'échelle.`);
    envoyer.href = `sms:${envoyer.dataset.tel}?&body=${encodeURIComponent(message())}`;
    document.getElementById('copie-etat').textContent = '';
  };

  reglages.addEventListener('submit', (evenement) => evenement.preventDefault());
  reglages.addEventListener('input', (evenement) => {
    if (evenement.target.name === 'type') changerMeuble();
    actualiser();
  });

  document.getElementById('copier').addEventListener('click', async () => {
    const annonce = document.getElementById('copie-etat');
    try {
      await navigator.clipboard.writeText(message());
      annonce.textContent = 'Description copiée.';
    } catch (erreur) {
      annonce.textContent = `À copier : ${message()}`;
    }
  });

  // reset : le bouton "retour" du navigateur peut garder d'anciens choix
  reglages.reset();
  changerMeuble();
  actualiser();
}
