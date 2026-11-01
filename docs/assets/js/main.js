(() => {
  const PAGES = { accueil: 'Accueil', neufs: 'Véhicules neufs', occasions: 'Occasions', catalogue: 'Tous les véhicules', rachat: 'Rachat & reprise', contact: 'Contact' };
  const CATALOGUE = { neufs: 'neuf', occasions: 'occasion', catalogue: 'tous' };
  const TITRE = { neuf: 'Véhicules neufs', occasion: 'Occasions', tous: 'Tous les véhicules' };
  const INTRO = {
    neuf: "Modèles sortis d'usine, disponibles à la concession.",
    occasion: 'Véhicules inspectés avant la vente. Kilométrage et état affichés.',
    tous: 'Tout le stock du Caracas, neuf et occasion.',
  };
  const TYPE = { neuf: 'Neuf', occasion: 'Occasion' };
  const STATUT = { disponible: 'Disponible', reserve: 'Réservé', vendu: 'Vendu' };
  const ETAT = { neuf: 'Neuf', excellent: 'Excellent', bon: 'Bon', correct: 'Correct' };
  const CAT = { super: 'Supercar', sportive: 'Sportive', coupe: 'Coupé', berline: 'Berline', suv: 'SUV', moto: 'Moto', utilitaire: 'Utilitaire', autre: 'Autre' };
  const prix = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 });
  const nombre = new Intl.NumberFormat('fr-FR');

  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, txt) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  };
  const km = v => nombre.format(v.kilometrage || 0) + ' km';
  const cat = v => CAT[v.categorie] || v.categorie;
  const enLigne = v => v.publie !== false;
  const nomV = v => [v.marque, v.modele].filter(Boolean).join(' ');
  const specsV = v => [v.annee && String(v.annee), v.kilometrage != null && v.kilometrage !== '' && km(v), v.places && v.places + ' places'].filter(Boolean);

  let vehicules = [];
  let typeCourant = 'neuf';
  let pageCourante = null;
  let retour = 'accueil';

  /* Menu mobile */
  const nav = $('#nav');
  const toggle = $('.nav-toggle');
  const setMenu = open => {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  };
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* Briques communes */
  function visuel(v) {
    const nodes = [];
    if (v.image) {
      const img = el('img');
      img.src = v.image;
      img.alt = nomV(v);
      img.loading = 'lazy';
      img.onerror = () => img.replaceWith(placeholder(v));
      nodes.push(img);
    } else {
      nodes.push(placeholder(v));
    }
    nodes.push(el('span', 'badge badge-' + v.type, TYPE[v.type]));
    if (v.statut === 'reserve' || v.statut === 'vendu') nodes.push(el('span', 'badge badge-statut', STATUT[v.statut]));
    return nodes;
  }
  function placeholder(v) {
    const s = el('span', 'carte-ph', v.modele);
    s.setAttribute('aria-hidden', 'true');
    return s;
  }
  function remplirSpecs(dl, paires) {
    dl.replaceChildren(...paires.map(([k, val]) => {
      const d = el('div');
      d.append(el('dt', null, k), el('dd', null, String(val)));
      return d;
    }));
  }

  function carte(v) {
    const a = el('article', 'carte');
    const vis = el('div', 'carte-visuel');
    vis.append(...visuel(v));
    const corps = el('div', 'carte-corps');
    const specs = el('ul', 'carte-specs');
    specsV(v).forEach(s => specs.append(el('li', null, s)));
    const bas = el('div', 'carte-bas');
    const lien = el('a', 'lien', 'Voir');
    lien.href = '#' + v.id;
    lien.setAttribute('aria-label', `Voir la fiche ${nomV(v)}`);
    bas.append(el('p', 'prix', prix.format(v.prix)), lien);
    corps.append(el('p', 'carte-marque', [v.marque, cat(v)].filter(Boolean).join(' · ')), el('h3', 'carte-modele', v.modele), specs, bas);
    a.append(vis, corps);
    return a;
  }

  /* Accueil : carrousel des véhicules mis en avant + derniers arrivages */
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function slide(v, i, n) {
    const s = el('article', 'slide');
    s.setAttribute('aria-roledescription', 'diapositive');
    s.setAttribute('aria-label', `${i + 1} sur ${n} : ${nomV(v)}`);
    const texte = el('div', 'slide-texte');
    const specs = el('ul', 'slide-specs');
    [cat(v), ...specsV(v)].forEach(x => specs.append(el('li', null, x)));
    const actions = el('div', 'hero-actions');
    const voir = el('a', 'btn', 'Voir la fiche');
    voir.href = '#' + v.id;
    const tout = el('a', 'btn btn-ghost', 'Tout le catalogue');
    tout.href = '#catalogue';
    actions.append(voir, tout);
    texte.append(
      el('p', 'eyebrow', `À la une · ${TYPE[v.type]}`),
      el('div', 'slide-nom'),
      specs,
      el('p', 'prix slide-prix', prix.format(v.prix)),
      actions,
    );
    texte.querySelector('.slide-nom').append(el('p', 'fiche-marque', v.marque || TYPE[v.type]), el('h2', 'slide-titre', v.modele));
    const vis = el('div', 'slide-visuel');
    vis.append(...visuel(v));
    s.append(texte, vis);
    return s;
  }

  function rendreCarrousel(liste) {
    const piste = $('#car-piste');
    const points = $('#car-points');
    const n = liste.length;
    if (!n) {
      piste.replaceChildren(el('p', 'vide', 'Aucun véhicule à la une pour le moment.'));
      $('.car-ctrl').hidden = true;
      return;
    }
    piste.replaceChildren(...liste.map((v, i) => slide(v, i, n)));
    let index = 0;
    const slides = [...piste.children];
    const maj = () => {
      slides.forEach((s, i) => { s.inert = i !== index; });
      [...points.children].forEach((b, i) => b.setAttribute('aria-current', String(i === index)));
      $('#car-compteur').textContent = `${String(index + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
    };
    const aller = i => {
      index = (i + n) % n;
      piste.scrollTo({ left: index * piste.clientWidth, behavior: reduit ? 'auto' : 'smooth' });
      maj();
    };
    points.replaceChildren(...liste.map((v, i) => {
      const b = el('button', 'car-point');
      b.type = 'button';
      b.setAttribute('aria-label', `Afficher ${nomV(v)}`);
      b.addEventListener('click', () => aller(i));
      return b;
    }));
    $('#car-prec').addEventListener('click', () => aller(index - 1));
    $('#car-suiv').addEventListener('click', () => aller(index + 1));
    $('#carrousel').addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') aller(index - 1);
      if (e.key === 'ArrowRight') aller(index + 1);
    });
    let attente;
    piste.addEventListener('scroll', () => {
      clearTimeout(attente);
      attente = setTimeout(() => {
        if (!piste.clientWidth) return;
        const i = Math.round(piste.scrollLeft / piste.clientWidth);
        if (i !== index) { index = i; maj(); }
      }, 80);
    });
    addEventListener('resize', () => { piste.scrollLeft = index * piste.clientWidth; });
    if (n > 1) $('.car-ctrl').hidden = false; else $('.car-ctrl').hidden = true;
    maj();

    /* Défilement automatique, en pause au survol, au focus ou si l'accueil est caché */
    if (reduit || n < 2) return;
    let pause = false;
    const zone = $('#carrousel');
    zone.addEventListener('mouseenter', () => { pause = true; });
    zone.addEventListener('mouseleave', () => { pause = false; });
    zone.addEventListener('focusin', () => { pause = true; });
    zone.addEventListener('focusout', () => { pause = false; });
    setInterval(() => {
      if (!pause && !document.hidden && piste.clientWidth) aller(index + 1);
    }, 6000);
  }

  function rendreAccueil() {
    const dispo = vehicules.filter(v => v.statut !== 'vendu' && enLigne(v));
    rendreCarrousel(dispo.filter(v => v.en_avant));
    const recents = [...dispo].sort((a, b) => (b.arrivee || '').localeCompare(a.arrivee || '')).slice(0, 6);
    $('#arrivages').replaceChildren(...recents.map(carte));
  }

  /* Catalogue */
  const form = $('#filtres');
  function remplirCategories() {
    const presentes = Object.keys(CAT).filter(c => vehicules.some(v => v.categorie === c));
    const sel = $('#f-categorie');
    const garde = sel.value;
    sel.replaceChildren(sel.options[0]);
    sel.value = garde;
    sel.append(...presentes.map(c => { const o = el('option', null, CAT[c]); o.value = c; return o; }));
  }
  function rendreCatalogue() {
    if (!vehicules.length) return;
    const q = $('#f-recherche').value.trim().toLowerCase();
    const c = $('#f-categorie').value;
    const max = Number($('#f-prix').value) || Infinity;
    const cacherVendus = $('#f-vendus').checked;
    const ordres = {
      'prix-asc': (a, b) => a.prix - b.prix,
      'prix-desc': (a, b) => b.prix - a.prix,
      recent: (a, b) => b.annee - a.annee || a.kilometrage - b.kilometrage,
    };
    const liste = vehicules
      .filter(v => enLigne(v) && (typeCourant === 'tous' || v.type === typeCourant)
        && (!c || v.categorie === c)
        && v.prix <= max
        && (!cacherVendus || v.statut !== 'vendu')
        && (!q || nomV(v).toLowerCase().includes(q)))
      .sort(ordres[$('#f-tri').value]);

    $('#cat-compte').textContent = `${liste.length} véhicule${liste.length > 1 ? 's' : ''}`;
    const grille = $('#cat-grille');
    if (liste.length) {
      grille.replaceChildren(...liste.map(carte));
    } else {
      const vide = el('div', 'vide-bloc');
      const b = el('button', 'btn btn-ghost btn-sm', 'Réinitialiser les filtres');
      b.type = 'button';
      b.addEventListener('click', reinitialiser);
      vide.append(el('p', null, 'Aucun véhicule ne correspond à ces critères.'), b);
      grille.replaceChildren(vide);
    }
  }
  function reinitialiser() {
    form.reset();
    rendreCatalogue();
  }
  form.addEventListener('input', rendreCatalogue);
  form.addEventListener('change', rendreCatalogue);
  form.addEventListener('submit', e => e.preventDefault());
  $('#f-reset').addEventListener('click', reinitialiser);

  function afficherCatalogue(page) {
    pageCourante = page;
    typeCourant = CATALOGUE[page];
    montrerVue('catalogue');
    marquerNav(page);
    $('#cat-titre').textContent = TITRE[typeCourant];
    $('#cat-intro').textContent = INTRO[typeCourant];
    document.querySelectorAll('.segment a').forEach(a => {
      if (a.getAttribute('href') === '#' + page) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    rendreCatalogue();
  }

  /* Fiche détail */
  const dlg = $('#fiche-vehicule');
  function ouvrirFiche(v) {
    ficheCourante = v;
    $('#dlg-visuel').replaceChildren(...visuel(v));
    $('#dlg-marque').textContent = [v.marque, cat(v)].filter(Boolean).join(' · ');
    $('#dlg-titre').textContent = v.modele;
    $('#dlg-desc').textContent = v.description || '';
    remplirSpecs($('#dlg-specs'), [
      ['Type', TYPE[v.type]], ['Année', v.annee || '—'], ['Kilométrage', v.kilometrage != null && v.kilometrage !== '' ? km(v) : '—'],
      ['État', ETAT[v.etat] || v.etat || '—'], ['Places', v.places || '—'], ['Statut', STATUT[v.statut] || v.statut],
    ].filter(([, val]) => val !== '—'));
    $('#dlg-prix').textContent = prix.format(v.prix);
    $('#dlg-ref').textContent = 'Réf. ' + v.id.toUpperCase();
    $('#dlg-cta').textContent = v.statut === 'disponible' ? 'Réserver ce véhicule' : 'Être prévenu d\'un modèle similaire';
    if (!dlg.open) dlg.showModal();
  }
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  $('.dlg-fermer').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => {
    if (vehicules.some(v => v.id === location.hash.slice(1))) history.replaceState(null, '', '#' + retour);
  });

  /* Espace employé (coquille vide : connexion et données à brancher) */
  const ventesApercu = [];
  const rachatsApercu = [];
  const contratsApercu = [];
  const pointagesApercu = [];
  /* Journal des modifications (Historique) */
  const journalApercu = [];
  /* En ligne, les mentions « Aperçu : … » des messages n'ont plus lieu d'être */
  const sansApercu = t => (EN_LIGNE ? t.replace(/ ?Aperçu : [^.]*\./, '').trim() : t);
  const journal = (section, action, detail) => { journalApercu.unshift({ date: new Date(), par: identifiant || 'Aperçu', section, action, detail: detail || '' }); planifierSync(); };
  let nomBadge = '';
  const fmtHeure = d => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const fmtDuree = ms => { const m = Math.max(0, Math.round(ms / 60000)); return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`; };
  const serviceOuvert = nom => pointagesApercu.find(x => !x.fin && x.nom.toLowerCase() === nom.toLowerCase());
  let sousVentes = 'vehicule';
  const ESPACE = {
    espace: {
      titre: 'Tableau de bord', intro: "Vue d'ensemble de l'activité du Caracas.",
      tableau: true,
    },
    'espace-ventes': {
      titre: 'Ventes', intro: 'Chaque vente conclue, avec le vendeur et le mode de paiement.',
      tuiles: ['Ventes du mois', "Chiffre d'affaires du mois", 'Marge du mois'],
      formulaire: 'vente',
      onglets: [{ id: 'vehicule', nom: 'Vente véhicule' }, { id: 'contrat', nom: 'Vente de contrat' }],
      registresContrat: [{
        titre: 'Registre des contrats', vide: 'Aucun contrat vendu.',
        colonnes: () => ['Date', 'Client', 'Véhicule', 'Vendeur', 'Prix', 'Statut', ...(estResponsable() ? ['Validation'] : [])],
        note: () => {
          const n = contratsApercu.filter(v => v.statut === 'attente').length;
          return estResponsable() && n ? `${n} contrat${n > 1 ? 's' : ''} à valider` : '';
        },
        lignes: () => contratsApercu.map(v => {
          const cells = [fmtDate(v.date), v.client, v.vehicule, v.vendeur || '—', prix.format(v.prix), celluleStatut(v)];
          if (estResponsable()) cells.push(actionsVente(v));
          return cells;
        }),
      }],
      registres: [{
        titre: 'Registre des ventes', vide: 'Aucune vente enregistrée.',
        colonnes: () => ['Date', 'Client', 'Véhicule', 'Type', 'Plaque', 'Vendeur', 'Prix', ...(estResponsable() ? ['Bénéfice'] : []), 'Statut', ...(estResponsable() ? ['Validation'] : [])],
        note: () => {
          const n = ventesApercu.filter(v => v.statut === 'attente').length;
          return estResponsable() && n ? `${n} vente${n > 1 ? 's' : ''} à valider` : '';
        },
        lignes: () => ventesApercu.map(v => {
          const cells = [fmtDate(v.date), v.client, v.vehicule, { neuf: 'Neuf', occasion: 'Occasion' }[v.categorie] || '—', v.plaque, v.vendeur || '—', prix.format(v.prix), ...(estResponsable() ? [prix.format(v.benefice || 0)] : []), celluleStatut(v)];
          if (estResponsable()) cells.push(actionsVente(v));
          return cells;
        }),
      }],
    },
    'espace-rachats': {
      titre: 'Rachats', intro: "Véhicules rachetés aux particuliers, de l'offre à l'entrée en stock.",
      calculateur: true,
      formulaire: 'rachat',
      reserve: true,
      tuiles: ['Rachats du mois', 'Montant racheté du mois'],
      registres: [{
        titre: 'Registre des rachats', colonnes: ['Photo', 'Date', 'Client', 'Modèle', 'Plaque', 'Prix de rachat', 'Prix de revente', 'Marge', 'Réf. stock', 'Enregistré par', 'Catalogue'], vide: 'Aucun rachat enregistré.',
        lignes: () => rachatsApercu.map(r => [vignette(r), fmtDate(r.date), r.client, r.modele, r.plaque, prix.format(r.prix), prix.format(r.revente), texteMarge(r.revente, r.prix), r.ref.toUpperCase(), r.par, publication(vehicules.find(x => x.id === r.ref), 'espace-rachats')]),
      }],
    },
    'espace-stock': {
      stockManuel: true,
      titre: 'Stock', intro: 'Les véhicules du parc. Ceux marqués « en vente » apparaîtront dans le catalogue public.',
      tuiles: ['Véhicules en stock', 'Valeur du stock', 'Réservés'],
      registres: [{
        titre: 'Parc', colonnes: () => ['Réf.', 'Véhicule', 'Type', 'Origine', ...(estResponsable() ? ["Prix d'achat"] : []), 'Prix de vente', ...(estResponsable() ? ['Marge'] : []), 'Statut', 'Arrivée', 'Catalogue', ...(estResponsable() ? ['Supprimer'] : [])], vide: 'Aucun véhicule en stock pour le moment.',
        lignes: () => [...vehicules].sort((a, b) => (b.arrivee || '').localeCompare(a.arrivee || '')).map(v => [
          v.id.toUpperCase(), nomV(v), TYPE[v.type], v.rachat ? 'Rachat' : v.stockInitial ? 'Ajout manuel' : 'Concession',
          ...(estResponsable() ? [v.prixAchat ? prix.format(v.prixAchat) : '—'] : []), prix.format(v.prix), ...(estResponsable() ? [v.prixAchat ? texteMarge(v.prix, v.prixAchat) : '—'] : []), STATUT[v.statut] || v.statut,
          v.arrivee ? new Date(v.arrivee + 'T12:00').toLocaleDateString('fr-FR') : '—',
          publication(v, 'espace-stock'),
          ...(estResponsable() ? [boutonSuppression(v)] : []),
        ]),
      }],
    },
    'espace-paie': {
      titre: 'Paie', intro: 'Salaire = heures badgées (15 h max par semaine, remboursées par l’État) × taux horaire du grade + commission du grade sur le bénéfice de chaque vente validée.',
      paie: true,
    },
    'espace-depenses': {
      titre: 'Dépenses', intro: "Achats et frais de la concession, avec la part déductible selon les plafonds hebdomadaires du Code du travail et du commerce.",
      reserve: true,
      messageReserve: 'Les dépenses sont gérées par les managers et la direction.',
      formulaire: 'depense',
      plafonds: true,
      tuiles: [
        { label: 'Dépenses du mois', valeur: () => prix.format(depensesMois().reduce((t, x) => t + x.montant, 0)), note: () => `${depensesMois().length} dépense(s)` },
        { label: 'Déductible cette semaine', valeur: () => { calculerDeductible(); return prix.format(depensesSemaine().reduce((t, x) => t + (x.deductible || 0), 0)); }, note: () => 'Selon les plafonds' },
        { label: 'Plus gros poste du mois', valeur: () => {
          const t = {};
          depensesMois().forEach(x => { t[x.categorie] = (t[x.categorie] || 0) + x.montant; });
          const top = Object.entries(t).sort((a, b) => b[1] - a[1])[0];
          return top ? prix.format(top[1]) : '—';
        }, note: () => {
          const t = {};
          depensesMois().forEach(x => { t[x.categorie] = (t[x.categorie] || 0) + x.montant; });
          const top = Object.entries(t).sort((a, b) => b[1] - a[1])[0];
          return top ? top[0] : 'Aucune donnée';
        } },
      ],
      registres: [{ titre: 'Registre des dépenses', colonnes: ['Date', 'Catégorie', 'Libellé', 'Montant', 'Déductible', 'Justificatif', 'Saisi par', ''], vide: 'Aucune dépense enregistrée.', lignes: () => lignesDepenses() }],
    },
    'espace-compta': {
      titre: 'Comptabilité', intro: "Toutes les entrées et sorties d'argent : ventes et contrats validés, rachats, paies, dépenses et écritures manuelles.",
      reserve: true,
      messageReserve: 'La comptabilité est réservée aux managers et à la direction.',
      compta: true,
    },
    'espace-parametres': {
      titre: 'Paramètres', intro: "Réglages de l'entreprise utilisés dans tout l'espace employé.",
      reglages: [
        { titre: 'Entreprise', champs: [['Nom', 'Le Caracas'], ['Adresse', 'Sandy Shores, Blaine County'], ['Téléphone en jeu', ''], ['Horaires', '']] },
        { titre: 'Ventes', champs: [['Devise', '$']] },
        { titre: 'Paie', champs: [['Taux horaire par défaut', ''], ['Jour de paie', '']] },
      ],
      marge: true,
      remuneration: true,
      prixVehicules: true,
    },
    'espace-badgeuse': {
      titre: 'Badgeuse', intro: 'Prise et fin de service. Les heures servent au calcul de la paie.',
      badgeuse: true,
    },
    'espace-historique': {
      titre: 'Historique', intro: 'Les semaines passées avec leur résumé et leur dossier IRS, les sauvegardes des données et le journal des modifications.',
      reserve: true,
      messageReserve: "L'historique est réservé aux managers et à la direction.",
      historique: true,
    },
    'espace-equipe': {
      titre: 'Équipe', intro: 'Les membres du Caracas : identité, téléphone, RIB et rôle. La roue crantée devant chaque employé permet de modifier sa fiche.',
      tuiles: [
        { label: 'Employés', valeur: () => String(equipeVisible().length), note: () => `${equipeVisible().filter(e => POSTES.find(p => p.id === e.poste && p.responsable)).length} responsable(s)` },
        { label: 'En service maintenant', valeur: () => String(equipeVisible().filter(e => serviceOuvert(nomComplet(e))).length), note: () => 'Selon la badgeuse' },
        { label: 'Embauches du mois', valeur: () => { const m = new Date(); return String(equipeVisible().filter(e => e.embauche.getMonth() === m.getMonth() && e.embauche.getFullYear() === m.getFullYear()).length); }, note: () => 'Ajoutés ce mois-ci' },
      ],
      equipe: true,
      registres: [
        {
          titre: 'Postes', colonnes: ['Poste', 'Rémunération', 'Commission', 'Salaire max', 'Accès'], vide: 'Aucun poste défini.',
          lignes: () => postesVisibles().map(x => [x.nom, x.fixe ? `${prix.format(x.fixe)} / semaine (fixe)` : prix.format(x.taux) + ' / h', x.sansCommission ? 'Non commissionné' : x.commission + ' %', x.max ? prix.format(x.max) + ' / semaine' : '—', niveau(x.id) >= 2 ? 'Direction (accès du patron)' : x.responsable ? 'Responsable : valide les ventes, voit le détail des calculs' : 'Employé']),
        },
      ],
    },
    'espace-comptes': {
      titre: 'Comptes', intro: "Un compte par employé de l'Équipe : identifiant et mot de passe. À la connexion, le compte donne le nom et le rôle de la fiche, utilisés dans toutes les sections.",
      comptes: true,
    },
  };
  let connecte = false;
  let identifiant = '';
  try {
    identifiant = sessionStorage.getItem('caracas-apercu') || '';
    connecte = !!identifiant;
  } catch (e) { /* stockage indisponible */ }
  const setConnecte = v => {
    connecte = !!v;
    identifiant = v || '';
    try { v ? sessionStorage.setItem('caracas-apercu', v) : sessionStorage.removeItem('caracas-apercu'); } catch (e) { /* ignoré */ }
  };
  /* Compte connecté (null = mode aperçu, quand aucun compte n'existe) */
  let compteConnecte = null;
  $('#form-connexion').addEventListener('submit', async e => {
    e.preventDefault();
    const id = $('#c-id').value.trim();
    const mdp = $('#c-mdp').value;
    $('#c-mdp').value = '';
    const msg = $('#c-message');
    if (id.length < 2) {
      msg.textContent = 'Entre ton identifiant.';
      $('#c-id').focus();
      return;
    }
    if (EN_LIGNE) {
      if (!sb) { msg.textContent = 'Connexion au serveur en cours, réessaie dans un instant.'; return; }
      msg.textContent = 'Connexion…';
      const m = await connexionEnLigne(id, mdp);
      if (m) { msg.textContent = m; return; }
    } else if (comptesApercu.length) {
      const c = comptesApercu.find(x => x.identifiant.toLowerCase() === id.toLowerCase());
      const emp = c && equipeApercu.find(x => x.id === c.employeId);
      const ok = c && emp && (await hacher(mdp, c.sel)) === c.hash;
      if (!ok) { msg.textContent = 'Identifiant ou mot de passe incorrect.'; return; }
      if (!c.actif) { msg.textContent = 'Ce compte est désactivé. Contacte la direction.'; return; }
      c.derniere = new Date();
      compteConnecte = c;
      posteApercu = emp.poste;
      selPoste.value = emp.poste;
      setConnecte(nomComplet(emp));
      journal('Comptes', 'Connexion', c.identifiant);
    } else {
      compteConnecte = null;
      setConnecte(id);
    }
    msg.textContent = '';
    majRole();
    location.hash = '#espace';
  });
  $('#deconnexion').addEventListener('click', async () => {
    if (compteConnecte) journal('Comptes', 'Déconnexion', compteConnecte.identifiant);
    if (EN_LIGNE && sb) {
      await synchroniser();
      await sb.auth.signOut();
      setConnecte('');
      location.hash = '#employes';
      location.reload();
      return;
    }
    compteConnecte = null;
    setConnecte('');
    employeOuvert = null;
    location.hash = '#employes';
  });

  let horlogeTimer = null;

  /* Postes du Caracas (commission en % ; responsable = valide les ventes et voit le détail des calculs) */
  /* max = salaire maximum par semaine ; fixe = salaire fixe par semaine (comptable, non commissionné) ;
     cache = compte admin invisible dans les listes d'employés */
  const POSTES = [
    { id: 'admin', nom: 'Admin', commission: 0, taux: 0, max: 0, responsable: true, cache: true },
    { id: 'patron', nom: 'Patron', commission: 70, taux: 1100, max: 100000, responsable: true },
    { id: 'copatron', nom: 'Co-patron', commission: 70, taux: 1100, max: 90000, responsable: true },
    { id: 'comptable', nom: 'Comptable', commission: 0, taux: 0, fixe: 60000, max: 60000, responsable: true, sansCommission: true },
    { id: 'manager', nom: 'Manager', commission: 60, taux: 950, max: 75000, responsable: true },
    { id: 'vendeur', nom: 'Vendeur', commission: 40, taux: 800, max: 60000 },
    { id: 'stagiaire', nom: 'Stagiaire', commission: 30, taux: 650, max: 60000 },
  ];
  /* Niveau d'accès : admin > patron et comptable (mêmes accès) > les autres */
  const NIVEAU = { admin: 3, patron: 2, comptable: 2 };
  const niveau = id => NIVEAU[id] || 1;
  const estCache = e => e.poste === 'admin';
  const equipeVisible = () => equipeApercu.filter(e => !estCache(e));
  const postesVisibles = () => POSTES.filter(p => !p.cache);
  const appliquerPostes = l => (l || []).forEach(o => {
    const p = POSTES.find(x => x.id === o.id);
    if (p) ['taux', 'commission', 'max', 'fixe'].forEach(k => { if (o[k] >= 0) p[k] = o[k]; });
  });
  const etatPostes = () => POSTES.map(p => ({ id: p.id, taux: p.taux, commission: p.commission, max: p.max, fixe: p.fixe }));
  const ICONE_ROUE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
  /* Taux horaire du grade et gain d'un pointage (heures × taux) */
  const tauxDe = id => (POSTES.find(x => x.id === id) || {}).taux || 0;
  /* Seules les 15 premières heures badgées de chaque employé par semaine (lundi → dimanche) sont rémunérées */
  const dureeMs = x => (x.fin || new Date()) - x.debut;
  const msPaye = x => {
    const k = lundi(x.debut).getTime();
    const avant = pointagesApercu.filter(y => y !== x && memeNom(y.nom, x.nom) && y.debut < x.debut && lundi(y.debut).getTime() === k)
      .reduce((t, y) => t + dureeMs(y), 0);
    return Math.max(0, Math.min(dureeMs(x), SUBVENTION_HEURES * 3600000 - avant));
  };
  const gain = x => Math.round(msPaye(x) / 3600000 * tauxDe(x.poste));
  const fmtChrono = ms => {
    const t = Math.max(0, Math.floor(ms / 1000));
    const p2 = v => String(v).padStart(2, '0');
    return `${p2(Math.floor(t / 3600))}:${p2(Math.floor(t / 60) % 60)}:${p2(t % 60)}`;
  };
  /* Poste simulé dans l'aperçu, en attendant les vrais comptes */
  let posteApercu = 'vendeur';
  const posteCourant = () => POSTES.find(x => x.id === posteApercu);
  const estResponsable = () => !!posteCourant().responsable;
  const fmtDate = d => d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const pageEspace = () => (ESPACE[location.hash.slice(1)] ? location.hash.slice(1) : 'espace');
  const selPoste = $('#esp-poste');
  postesVisibles().forEach(x => { const o = el('option', null, x.nom); o.value = x.id; selPoste.append(o); });
  selPoste.value = posteApercu;
  function majRole() {
    $('#esp-qui').textContent = `${identifiant || 'Aperçu'} · ${posteCourant().nom}${compteConnecte ? '' : ' (aperçu)'}`;
    $('.role-apercu').hidden = !!compteConnecte;
  }
  /* Garde la session alignée sur le compte et la fiche Équipe (rôle ou nom modifiés, compte supprimé ou désactivé) */
  function syncCompte() {
    if (!compteConnecte) return;
    const c = comptesApercu.find(x => x.id === compteConnecte.id);
    const emp = c && equipeApercu.find(x => x.id === c.employeId);
    if (!c || !emp || !c.actif) {
      compteConnecte = null;
      if (EN_LIGNE && sb) { sb.auth.signOut().then(() => { setConnecte(''); location.hash = '#employes'; location.reload(); }); return; }
      majRole();
      return;
    }
    compteConnecte = c;
    posteApercu = emp.poste;
    selPoste.value = emp.poste;
    if (identifiant !== nomComplet(emp)) setConnecte(nomComplet(emp));
    majRole();
  }
  selPoste.addEventListener('change', () => {
    posteApercu = selPoste.value;
    majRole();
    rendreEspace(pageEspace());
  });
  majRole();

  /* Validation des ventes par le responsable */
  function pastille(v) {
    const libelle = { attente: 'En attente', validee: 'Validée', refusee: 'Refusée' }[v.statut];
    const s = el('span', 'pastille pastille-' + v.statut, libelle);
    if (v.decisionLe) s.title = `${libelle} le ${fmtDate(v.decisionLe)}`;
    return s;
  }
  function actionsVente(v) {
    if (v.statut !== 'attente') return v.decisionLe ? fmtDate(v.decisionLe) : '—';
    const d = el('div', 'actions-ligne');
    const ok = el('button', 'btn btn-mini', 'Valider');
    ok.type = 'button';
    ok.setAttribute('aria-label', `Valider la vente à ${v.client}`);
    ok.addEventListener('click', () => decider(v, 'validee'));
    const non = el('button', 'btn btn-mini btn-ghost', 'Refuser');
    non.type = 'button';
    non.setAttribute('aria-label', `Refuser la vente à ${v.client}`);
    non.addEventListener('click', () => decider(v, 'refusee'));
    d.append(ok, non);
    return d;
  }
  const CAT_ACHAT_NEUF = 'Achat véhicule neuf (coût garage)';
  function decider(v, statut) {
    v.statut = statut;
    v.decisionLe = new Date();
    /* Vente de neuf validée : le coût d'achat du garage (85 % du prix neuf) part en dépense automatique */
    if (statut === 'validee' && v.categorie === 'neuf' && v.cout > 0 && !v.depenseAuto) {
      depensesApercu.unshift({ n: depensesApercu.length, date: new Date(), categorie: CAT_ACHAT_NEUF, libelle: `${v.vehicule} · ${v.plaque} · ${v.client}`, montant: v.cout, par: identifiant, lien: 'neuf' });
      v.depenseAuto = true;
    }
    journal('Ventes', statut === 'validee' ? 'Validation' : 'Refus', `${'plaque' in v ? 'Vente' : 'Contrat'} ${v.vehicule} · ${v.client} · ${prix.format(v.prix)}`);
    rendreEspace('espace-ventes');
  }

  /* Calculateur de rachat : (prix neuf + customisation) × taux. Taux par défaut repris du tableur CEM. */
  const TAUX_RACHAT = 60;
  const CAT_PRIX = {
    classics: 'Classique', commercial: 'Commercial', compacts: 'Compacte', coupes: 'Coupé', cycles: 'Vélo',
    industrial: 'Industriel', motorcycles: 'Moto', muscle: 'Muscle', offroad: 'Tout-terrain', sedans: 'Berline',
    service: 'Service', sports: 'Sport', super: 'Super', suvs: 'SUV', utility: 'Utilitaire', vans: 'Van', autres: 'Autre',
  };
  /* Liste des prix neufs (onglet BDD du tableur CEM), chargée une seule fois */
  let prixNeufs = null;
  const chargerPrixNeufs = () => prixNeufs || (prixNeufs = fetch('data/prix-neufs.json')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(d => { prixNeufsCache = d; return d; })
    .catch(() => { prixNeufs = null; return []; }));
  let prixNeufsCache = null;
  /* Pièces de customisation : % du prix neuf par niveau (formules IFS du tableur CEM, onglet Reprise). */
  const PIECES = [
    { id: 'moteur', nom: 'Moteur', taux: [15, 20, 25, 30, 35] },
    { id: 'freins', nom: 'Freins', taux: [7.5, 12.5, 17.5, 20] },
    { id: 'transmission', nom: 'Transmission', taux: [10, 15, 20, 25, 30] },
    { id: 'turbo', nom: 'Turbo', taux: [20] },
  ];
  function calculateurRachat() {
    const f = $('#tpl-calcul').content.firstElementChild.cloneNode(true);
    const veh = f.querySelector('#r-vehicule');
    const liste = f.querySelector('#r-liste');
    const neuf = f.querySelector('#r-neuf');
    const taux = f.querySelector('#r-taux');
    const full = f.querySelector('#r-full');
    const totalCustom = f.querySelector('#r-custom');
    const res = f.querySelector('#r-resultat');
    const detail = f.querySelector('#r-detail');
    taux.value = TAUX_RACHAT;
    const voitTout = estResponsable();
    if (!voitTout) {
      taux.closest('.champ').hidden = true;
      detail.hidden = true;
      f.querySelector('.custom-total').hidden = true;
    }

    /* Véhicule : suggestions + prix neuf automatique */
    let base = [];
    let prixAuto = '';
    chargerPrixNeufs().then(d => {
      base = d;
      liste.replaceChildren(...d.map(x => {
        const o = el('option', null, `${CAT_PRIX[x.c] || x.c} · ${prix.format(x.p)}`);
        o.value = x.n;
        return o;
      }));
    });
    veh.addEventListener('input', () => {
      const saisie = veh.value.trim().toLowerCase();
      const x = base.find(v => v.n.toLowerCase() === saisie);
      if (x && (!neuf.value || neuf.value === prixAuto)) {
        neuf.value = x.p;
        prixAuto = String(x.p);
      }
    });

    /* Options de custom : une liste par pièce */
    const selects = PIECES.map(pc => {
      const ch = el('div', 'champ');
      const lab = el('label', null, pc.nom + (pc.aConfirmer ? ' (taux à confirmer)' : ''));
      lab.htmlFor = 'r-' + pc.id;
      const s = el('select');
      s.id = 'r-' + pc.id;
      const rien = el('option', null, 'Rien');
      rien.value = '0';
      s.append(rien);
      pc.taux.forEach((t, i) => {
        const nom = pc.taux.length > 1 ? `${pc.nom} ${i + 1}` : pc.nom;
        const o = el('option', null, voitTout ? `${nom} · ${t.toLocaleString('fr-FR')} %` : nom);
        o.value = String(t);
        o.dataset.nom = nom;
        s.append(o);
      });
      ch.append(lab, s);
      f.querySelector('#r-options').append(ch);
      return s;
    });
    let estFull = false;
    const btnDevis = f.querySelector('#r-devis');
    btnDevis.addEventListener('click', ouvrirDevis);
    const btnDiscord = el('button', 'btn btn-ghost btn-sm', 'Copier pour Discord');
    btnDiscord.type = 'button';
    btnDiscord.addEventListener('click', () => { if (devisCourant) copierTexte(discordDevis(devisCourant), btnDiscord); });
    btnDevis.after(btnDiscord);
    full.addEventListener('click', () => {
      estFull = !estFull;
      full.setAttribute('aria-pressed', String(estFull));
      selects.forEach(s => { s.disabled = estFull; });
      calculer();
    });

    const calculer = () => {
      const n = Math.max(0, Number(neuf.value) || 0);
      const t = Math.min(100, Math.max(0, Number(taux.value) || 0));
      let c = 0;
      const lignes = [];
      if (estFull) {
        c = n;
        if (n) lignes.push('Full custom');
      } else {
        selects.forEach(s => {
          const pct = Number(s.value);
          if (!pct) return;
          const v = Math.round(n * pct / 100);
          c += v;
          lignes.push(`${s.selectedOptions[0].dataset.nom} ${prix.format(v)}`);
        });
      }
      totalCustom.textContent = prix.format(c);
      if (!n) {
        res.textContent = '—';
        detail.textContent = 'Entre le prix neuf pour calculer.';
        devisCourant = null;
        btnDevis.disabled = true;
        btnDiscord.disabled = true;
        return;
      }
      const r = Math.round((n + c) * t / 100);
      devisCourant = {
        vehicule: veh.value.trim(),
        neuf: n,
        custom: c,
        taux: t,
        options: estFull ? ['Full custom'] : selects.filter(s => Number(s.value)).map(s => s.selectedOptions[0].dataset.nom),
        prix: r,
      };
      btnDevis.disabled = false;
      btnDiscord.disabled = false;
      res.textContent = prix.format(r);
      detail.textContent = (veh.value.trim() ? veh.value.trim() + ' : ' : '')
        + `(${prix.format(n)} + ${prix.format(c)} de custom) × ${t} % = ${prix.format(r)}`
        + (lignes.length ? '. Custom : ' + lignes.join(', ') + '.' : '');
    };
    f.addEventListener('input', calculer);
    f.addEventListener('change', calculer);
    f.addEventListener('submit', e => e.preventDefault());
    calculer();
    return f;
  }

  /* Devis de rachat : fenêtre client puis image JPEG générée sur un canvas */
  let devisCourant = null;
  const dlgDevis = $('#dlg-devis');
  const formDevis = $('#form-devis');
  const dNom = $('#d-nom');
  const dTel = $('#d-tel');
  const dMsg = $('#d-message');
  function ouvrirDevis() {
    if (!devisCourant) return;
    $('#devis-resume').textContent = `${devisCourant.vehicule || 'Véhicule non précisé'} · offre de rachat ${prix.format(devisCourant.prix)}`;
    dMsg.textContent = '';
    dMsg.className = 'form-message';
    [dNom, dTel].forEach(i => i.removeAttribute('aria-invalid'));
    dlgDevis.showModal();
    dNom.focus();
  }
  $('#d-annuler').addEventListener('click', () => dlgDevis.close());
  dlgDevis.addEventListener('click', e => { if (e.target === dlgDevis) dlgDevis.close(); });
  formDevis.addEventListener('submit', async e => {
    e.preventDefault();
    const nom = dNom.value.trim();
    const tel = dTel.value.trim();
    const okNom = nom.length >= 3;
    const okTel = /^[0-9 +().-]{3,20}$/.test(tel);
    dNom.setAttribute('aria-invalid', String(!okNom));
    dTel.setAttribute('aria-invalid', String(!okTel));
    if (!okNom || !okTel) {
      dMsg.className = 'form-message erreur';
      dMsg.textContent = 'À compléter : ' + [!okNom && 'le nom et prénom', !okTel && 'le téléphone (chiffres, espaces ou tirets)'].filter(Boolean).join(', ') + '.';
      (okNom ? dTel : dNom).focus();
      return;
    }
    const bouton = $('#d-valider');
    bouton.disabled = true;
    dMsg.className = 'form-message';
    dMsg.textContent = 'Préparation du devis…';
    try {
      const date = new Date();
      const blob = await dessinerDevis({ ...devisCourant, client: nom, tel, date });
      const jour = date.toISOString().slice(0, 10);
      const slug = nom.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      await enregistrerFichier(blob, `devis-rachat-${slug}-${jour}.jpg`);
      dlgDevis.close();
      formDevis.reset();
      const m = $('#r-devis-msg');
      if (m) m.textContent = `Devis de ${nom} téléchargé.`;
    } catch (err) {
      const code = err && err.code;
      dMsg.className = 'form-message erreur';
      dMsg.textContent = code === 'declined' ? 'Téléchargement annulé.'
        : code === 'rate_limited' ? 'Une fenêtre de téléchargement est déjà ouverte. Réessaie dans un instant.'
          : "Le téléchargement n'est pas disponible ici.";
    } finally {
      bouton.disabled = false;
    }
  });

  async function enregistrerFichier(blob, nom) {
    if (window.claude && window.claude.use) {
      const dl = await window.claude.use('downloads');
      if (!dl) throw { code: 'unavailable' };
      return dl.save({ filename: nom, data: blob });
    }
    const url = URL.createObjectURL(blob);
    const a = el('a');
    a.href = url;
    a.download = nom;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return { status: 'saved' };
  }

  async function dessinerDevis(d) {
    /* Bannière paysage pour la direction : lisible d'un coup d'œil */
    const W = 1600, H = 640;
    const css = getComputedStyle(document.documentElement);
    const k = n => css.getPropertyValue('--' + n).trim();
    const C = { sable: k('sable'), clair: k('sable-clair'), fonce: k('sable-fonce'), huile: k('huile'), huile2: k('huile-2'), panneau: k('panneau'), rouille: k('rouille'), alamo: k('alamo'), trait: k('trait') };
    const F = {
      titre: '"Ultra", "Rockwell Extra Bold", Georgia, serif',
      label: '"Barlow Condensed", "Arial Narrow", sans-serif',
      texte: '"Barlow", system-ui, sans-serif',
      data: '"Overpass Mono", ui-monospace, monospace',
    };
    try {
      await Promise.all([`64px ${F.titre}`, `700 24px ${F.label}`, `600 30px ${F.texte}`, `400 22px ${F.data}`].map(f => document.fonts.load(f)));
    } catch (e) { /* polices de secours */ }
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const x = cv.getContext('2d');
    const texte = (t, px, py, font, color, opts = {}) => {
      x.font = font;
      x.fillStyle = color;
      x.textAlign = opts.align || 'left';
      x.letterSpacing = opts.espace || '0px';
      if (opts.max) {
        let s = t;
        while (x.measureText(s).width > opts.max && s.length > 3) s = s.slice(0, -2);
        t = s === t ? t : s.trim() + '…';
      }
      x.fillText(t, px, py);
      x.letterSpacing = '0px';
      return x.measureText(t).width;
    };
    const label = (t, px, py, color = C.huile2) => texte(t.toUpperCase(), px, py, `700 22px ${F.label}`, color, { espace: '3px' });
    /* Plus grande taille de police (≤ depart) qui tient dans maxW */
    const ajuster = (t, famille, maxW, depart, mini) => {
      let taille = depart;
      x.font = `${taille}px ${famille}`;
      while (x.measureText(t).width > maxW && taille > mini) { taille -= 2; x.font = `${taille}px ${famille}`; }
      return taille;
    };
    const p2 = v => String(v).padStart(2, '0');
    const dt = d.date;
    const ref = `DV-${dt.getFullYear()}${p2(dt.getMonth() + 1)}${p2(dt.getDate())}-${p2(dt.getHours())}${p2(dt.getMinutes())}${p2(dt.getSeconds())}`;

    /* Fond */
    x.fillStyle = C.clair;
    x.fillRect(0, 0, W, H);

    /* Bandeau gauche : identité + références */
    const G = 380;
    x.fillStyle = C.huile;
    x.fillRect(0, 0, G, H);
    x.fillStyle = C.panneau;
    x.fillRect(G, 0, 10, H);
    x.fillRect(50, 56, 72, 72);
    x.fillStyle = C.rouille;
    x.beginPath();
    x.arc(86, 98, 17, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = C.huile;
    x.beginPath();
    x.moveTo(50, 128); x.lineTo(50, 110); x.lineTo(66, 110); x.lineTo(72, 102); x.lineTo(92, 102);
    x.lineTo(98, 110); x.lineTo(122, 110); x.lineTo(122, 128); x.closePath();
    x.fill();
    texte('CARACAS', 140, 108, `${ajuster('CARACAS', F.titre, G - 175, 46, 24)}px ${F.titre}`, C.sable);
    texte('SANDY SHORES', 142, 138, `700 20px ${F.label}`, C.panneau, { espace: '4px' });
    texte('DEMANDE', 50, 250, `700 46px ${F.label}`, C.sable, { espace: '4px' });
    texte('DE RACHAT', 50, 298, `700 46px ${F.label}`, C.panneau, { espace: '4px' });
    texte(ref, 50, 380, `400 22px ${F.data}`, C.sable);
    texte(dt.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }), 50, 414, `400 22px ${F.data}`, C.sable);
    label('Établi par', 50, 500, C.panneau);
    texte(`${identifiant} (${posteCourant().nom})`, 50, 540, `600 30px ${F.texte}`, C.sable, { max: G - 90 });

    /* Centre : véhicule, custom, client */
    const X = G + 60;
    const D = W - 470;
    const maxC = D - X - 40;
    label('Véhicule', X, 88);
    const nomVeh = d.vehicule || 'Véhicule non précisé';
    texte(nomVeh, X, 160, `${ajuster(nomVeh, F.titre, maxC, 64, 36)}px ${F.titre}`, C.huile, { max: maxC });
    texte(`Prix neuf ${prix.format(d.neuf)}`, X, 205, `400 24px ${F.data}`, C.huile2);

    label('Customisation', X, 270);
    const puces = d.options.length ? d.options : ['Aucune'];
    let px = X;
    let py = 290;
    x.lineWidth = 3;
    puces.forEach(t => {
      x.font = `700 26px ${F.label}`;
      x.letterSpacing = '2px';
      const w = x.measureText(t.toUpperCase()).width + 36;
      x.letterSpacing = '0px';
      if (px + w > X + maxC) { px = X; py += 62; }
      const plein = t === 'Full custom';
      x.fillStyle = plein ? C.panneau : C.sable;
      x.fillRect(px, py, w, 48);
      x.strokeStyle = C.huile;
      x.strokeRect(px, py, w, 48);
      texte(t.toUpperCase(), px + 18, py + 34, `700 26px ${F.label}`, C.huile, { espace: '2px' });
      px += w + 14;
    });
    texte(`Total custom ${prix.format(d.custom)}`, X, py + 92, `400 24px ${F.data}`, C.huile2);

    /* Client */
    const cy = 500;
    x.strokeStyle = C.trait;
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(X, cy - 40);
    x.lineTo(X + maxC, cy - 40);
    x.stroke();
    label('Client', X, cy);
    texte(d.client, X, cy + 50, `600 34px ${F.texte}`, C.huile, { max: maxC });
    texte('Tél. ' + d.tel, X, cy + 92, `400 26px ${F.data}`, C.huile2);

    /* Droite : prix de rachat + case de validation */
    x.fillStyle = C.panneau;
    x.fillRect(D, 0, W - D, H);
    x.fillStyle = C.huile;
    x.fillRect(D, 0, 6, H);
    label('Prix de rachat', D + 50, 250, C.huile);
    let taille = 96;
    x.font = `${taille}px ${F.titre}`;
    while (x.measureText(prix.format(d.prix)).width > W - D - 90 && taille > 50) { taille -= 4; x.font = `${taille}px ${F.titre}`; }
    texte(prix.format(d.prix), D + 50, 362, `${taille}px ${F.titre}`, C.huile);
    texte(`Neuf + custom × ${d.taux} %`, D + 50, 410, `400 22px ${F.data}`, C.huile);


    return new Promise((ok, ko) => cv.toBlob(b => (b ? ok(b) : ko({ code: 'bad_request' })), 'image/jpeg', 0.92));
  }

  /* Paramètres : prix neufs des véhicules (managers et +). Les changements s'appliquent au calculateur. */
  const MAX_LIGNES_PRIX = 60;
  function panneauPrix() {
    const p = el('div', 'panneau');
    const tete = el('div', 'panneau-tete');
    const compte = el('p', 'panneau-note pv-compte');
    compte.hidden = true;
    tete.append(el('h2', 'panneau-titre', 'Prix des véhicules'), compte);

    const barre = el('div', 'form-grille pv-barre');
    const champ = (texte, ctrl) => {
      const d = el('div', 'champ');
      const l = el('label', null, texte);
      l.htmlFor = ctrl.id;
      d.append(l, ctrl);
      return d;
    };
    const recherche = el('input');
    recherche.id = 'pv-recherche';
    recherche.type = 'search';
    recherche.placeholder = 'Nom du véhicule';
    recherche.autocomplete = 'off';
    const filtreCat = el('select');
    filtreCat.id = 'pv-cat';
    const optCat = (sel, vide) => {
      if (vide) { const o = el('option', null, vide); o.value = ''; sel.append(o); }
      Object.entries(CAT_PRIX).forEach(([k, v]) => { const o = el('option', null, v); o.value = k; sel.append(o); });
    };
    optCat(filtreCat, 'Toutes');
    barre.append(champ('Rechercher', recherche), champ('Catégorie', filtreCat));

    const info = el('p', 'pv-info');
    const defil = el('div', 'tableau-defil');
    const table = el('table', 'tableau pv-table');
    const thead = el('thead');
    const trh = el('tr');
    ['Véhicule', 'Catégorie', 'Prix neuf ($)', ''].forEach(t => { const th = el('th', null, t); th.scope = 'col'; trh.append(th); });
    thead.append(trh);
    const tbody = el('tbody');
    table.append(thead, tbody);
    defil.append(table);

    /* Ajout d'un véhicule */
    const ajout = el('form', 'form-grille pv-ajout');
    ajout.noValidate = true;
    const aNom = el('input'); aNom.id = 'pv-nom'; aNom.type = 'text'; aNom.autocomplete = 'off'; aNom.placeholder = 'ex. Sultan RS Classic';
    const aCat = el('select'); aCat.id = 'pv-ncat'; optCat(aCat);
    const aPrix = el('input'); aPrix.id = 'pv-prix'; aPrix.type = 'number'; aPrix.min = '0'; aPrix.step = '500'; aPrix.inputMode = 'numeric';
    const aBtn = el('button', 'btn btn-sm', 'Ajouter le véhicule'); aBtn.type = 'submit';
    ajout.append(champ('Nouveau véhicule', aNom), champ('Catégorie', aCat), champ('Prix neuf ($)', aPrix), aBtn);
    const msg = el('p', 'form-message pv-message');
    msg.setAttribute('role', 'status');

    p.append(tete, barre, info, defil, ajout, msg);

    let base = [];
    const majCompte = () => {
      const n = base.filter(x => x.modifie || x.ajoute).length;
      compte.hidden = !n;
      compte.textContent = `${n} modification${n > 1 ? 's' : ''} (aperçu)`;
    };
    const afficher = () => {
      const q = recherche.value.trim().toLowerCase();
      const cat = filtreCat.value;
      const liste = base.filter(x => (!cat || x.c === cat) && (!q || x.n.toLowerCase().includes(q)));
      info.textContent = liste.length > MAX_LIGNES_PRIX
        ? `${liste.length} véhicules trouvés : les ${MAX_LIGNES_PRIX} premiers sont affichés, affine la recherche pour voir les autres.`
        : `${liste.length} véhicule${liste.length > 1 ? 's' : ''} trouvé${liste.length > 1 ? 's' : ''}.`;
      tbody.replaceChildren(...liste.slice(0, MAX_LIGNES_PRIX).map(x => {
        const tr = el('tr');
        const td = c => { const t = el('td'); if (c instanceof Node) t.append(c); else t.textContent = c; return t; };
        const inp = el('input', 'pv-input');
        inp.type = 'number';
        inp.min = '0';
        inp.step = '500';
        inp.value = x.p;
        inp.setAttribute('aria-label', `Prix neuf de ${x.n}`);
        const etat = el('span');
        const majEtat = () => {
          etat.replaceChildren();
          if (x.ajoute) etat.append(el('span', 'pastille pastille-validee', 'Ajouté'));
          else if (x.modifie) etat.append(el('span', 'pastille pastille-attente', `Avant : ${prix.format(x.p0)}`));
        };
        inp.addEventListener('change', () => {
          const v = Math.round(Number(inp.value));
          if (!(v >= 0) || inp.value === '') { inp.value = x.p; return; }
          if (x.p0 === undefined) x.p0 = x.p;
          journal('Paramètres', 'Prix modifié', `${x.n} : ${prix.format(x.p)} → ${prix.format(v)}`);
          x.p = v;
          x.modifie = x.p !== x.p0;
          majEtat();
          majCompte();
        });
        majEtat();
        tr.append(td(x.n), td(CAT_PRIX[x.c] || x.c), td(inp), td(etat));
        return tr;
      }));
    };
    recherche.addEventListener('input', afficher);
    filtreCat.addEventListener('change', afficher);
    ajout.addEventListener('submit', e => {
      e.preventDefault();
      const nom = aNom.value.trim();
      const v = Math.round(Number(aPrix.value));
      if (nom.length < 2 || !(v > 0)) {
        msg.className = 'form-message pv-message erreur';
        msg.textContent = 'Indique le nom du véhicule et un prix neuf supérieur à 0.';
        return;
      }
      if (base.some(x => x.n.toLowerCase() === nom.toLowerCase())) {
        msg.className = 'form-message pv-message erreur';
        msg.textContent = `« ${nom} » existe déjà : modifie son prix dans la liste.`;
        recherche.value = nom;
        afficher();
        return;
      }
      base.push({ n: nom, p: v, c: aCat.value, ajoute: true });
      journal('Paramètres', 'Véhicule ajouté à la liste des prix', `${nom} · ${prix.format(v)}`);
      msg.className = 'form-message pv-message succes';
      msg.textContent = sansApercu(`${nom} ajouté à ${prix.format(v)}. Il est proposé dans le calculateur. Aperçu : rien n'est enregistré pour l'instant.`);
      ajout.reset();
      recherche.value = nom;
      filtreCat.value = '';
      afficher();
      majCompte();
    });

    info.textContent = 'Chargement de la liste…';
    chargerPrixNeufs().then(d => { base = d; afficher(); majCompte(); });
    return p;
  }

  /* Badgeuse : liée à l'identifiant connecté. Employé : badge + ses pointages. Direction : + historique par employé, corrections. */
  const memeNom = (a, b) => a.toLowerCase() === b.toLowerCase();
  const versChamp = d => {
    const p2 = v => String(v).padStart(2, '0');
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
  };
  let employeOuvert = null;

  function panneauBadge() {
    const p = el('div', 'panneau badgeuse');
    const o = serviceOuvert(identifiant);
    const miens = pointagesApercu.filter(x => memeNom(x.nom, identifiant));
    const dernier = miens.find(x => x.fin);
    const ref = o || dernier;
    const maintenant = new Date();
    const duMois = miens.filter(x => x.debut.getMonth() === maintenant.getMonth() && x.debut.getFullYear() === maintenant.getFullYear());

    const tete = el('div', 'badge-tete');
    tete.append(el('p', 'badgeuse-jour', `${identifiant} · ${posteCourant().nom} · ${prix.format(tauxDe(posteApercu))} / h`));
    if (estResponsable()) {
      const roue = el('button', 'roue');
      roue.type = 'button';
      roue.title = 'Taux horaires par grade';
      roue.setAttribute('aria-label', 'Modifier les taux horaires par grade');
      roue.innerHTML = ICONE_ROUE;
      roue.addEventListener('click', ouvrirTaux);
      tete.append(roue);
    }

    const cases = el('div', 'badge-heures');
    const ajoutCase = (label, valeur, cls) => {
      const d = el('div', 'badge-case' + (cls ? ' ' + cls : ''));
      const v = el('p', 'badgeuse-heure', valeur);
      d.append(el('p', 'tuile-label', label), v);
      cases.append(d);
      return v;
    };
    ajoutCase('Début de service', ref ? fmtHeure(ref.debut) : '—');
    ajoutCase('Fin de service', ref && ref.fin ? fmtHeure(ref.fin) : '—');
    const chrono = ajoutCase(o ? 'Temps de service' : 'Dernier service', ref ? fmtChrono((ref.fin || maintenant) - ref.debut) : '—', 'badge-chrono');
    const argent = ajoutCase(o ? 'Gagné ce service' : 'Gagné', ref ? prix.format(gain(ref)) : '—', 'badge-argent');
    if (o) {
      horlogeTimer = setInterval(() => {
        chrono.textContent = fmtChrono(new Date() - o.debut);
        argent.textContent = prix.format(gain(o));
      }, 1000);
    }

    const etat = el('p', 'badgeuse-etat' + (o ? ' en-service' : ''),
      (o ? `En service depuis ${fmtHeure(o.debut)}` : 'Hors service')
      + ` · Ce mois : ${fmtDuree(duMois.reduce((t, x) => t + ((x.fin || maintenant) - x.debut), 0))} · ${prix.format(duMois.reduce((t, x) => t + gain(x), 0))}`
      + (msSem => ` · Heures rémunérées cette semaine : ${fmtDuree(msSem)} / ${SUBVENTION_HEURES} h${msSem >= SUBVENTION_HEURES * 3600000 ? ' (plafond atteint : les heures suivantes ne sont plus payées)' : ''}`)(
        (subventionSemaine(periodeSemaine(0)).liste.find(e => memeNom(e.nom, identifiant)) || { msSub: 0 }).msSub));
    etat.setAttribute('role', 'status');
    const debut = el('button', 'btn', 'Prendre mon service');
    debut.type = 'button';
    debut.disabled = !!o;
    debut.addEventListener('click', () => {
      pointagesApercu.unshift({ nom: identifiant, poste: posteApercu, debut: new Date(), fin: null });
      journal('Badgeuse', 'Prise de service', identifiant);
      rendreEspace('espace-badgeuse');
    });
    const fin = el('button', 'btn btn-ghost', 'Fin de service');
    fin.type = 'button';
    fin.disabled = !o;
    fin.addEventListener('click', () => {
      const s = serviceOuvert(identifiant);
      if (s) { s.fin = new Date(); journal('Badgeuse', 'Fin de service', `${identifiant} · ${fmtDuree(s.fin - s.debut)}`); }
      rendreEspace('espace-badgeuse');
    });
    const actions = el('div', 'hero-actions');
    actions.append(debut, fin);
    p.append(tete, cases, actions, etat);
    if (o && new Date() - o.debut > SEUIL_OUBLI) p.append(el('p', 'note-reserve', `Service ouvert depuis plus de 10 h : as-tu oublié de badger ta fin de service ? Clique sur « Fin de service », ou demande à la direction de corriger l'heure.`));
    return p;
  }

  /* Raccourci badgeuse dans la barre latérale : badger depuis n'importe quelle page */
  function majBadgeRapide() {
    const o = identifiant && serviceOuvert(identifiant);
    const etat = $('#br-etat');
    etat.textContent = o ? `En service depuis ${fmtHeure(o.debut)} · ${fmtDuree(new Date() - o.debut)}` : 'Hors service';
    etat.classList.toggle('en-service', !!o);
    const b = $('#br-bouton');
    b.textContent = o ? 'Fin de service' : 'Prendre mon service';
    b.classList.toggle('btn-ghost', !!o);
  }
  $('#br-bouton').addEventListener('click', () => {
    if (!identifiant) return;
    const o = serviceOuvert(identifiant);
    if (o) { o.fin = new Date(); journal('Badgeuse', 'Fin de service', `${identifiant} · ${fmtDuree(o.fin - o.debut)}`); } else { pointagesApercu.unshift({ nom: identifiant, poste: posteApercu, debut: new Date(), fin: null }); journal('Badgeuse', 'Prise de service', identifiant); }
    rendreEspace(pageEspace());
  });
  setInterval(() => { if (connecte) majBadgeRapide(); }, 30000);

  /* Roue crantée (direction) : taux horaires par grade */
  const dlgTaux = $('#dlg-taux');
  const POSTES_HORAIRES = () => POSTES.filter(x => !x.cache && !x.fixe);
  function ouvrirTaux() {
    $('#taux-liste').replaceChildren(...POSTES_HORAIRES().map(x => {
      const d = el('div', 'champ taux-ligne');
      const l = el('label', null, x.nom);
      l.htmlFor = 'taux-' + x.id;
      const i = el('input');
      i.id = 'taux-' + x.id;
      i.type = 'number';
      i.min = '0';
      i.step = '50';
      i.inputMode = 'numeric';
      i.value = x.taux;
      const u = el('span', 'taux-unite', '$ / heure');
      d.append(l, i, u);
      return d;
    }));
    $('#taux-message').textContent = '';
    dlgTaux.showModal();
  }
  $('#taux-annuler').addEventListener('click', () => dlgTaux.close());
  dlgTaux.addEventListener('click', e => { if (e.target === dlgTaux) dlgTaux.close(); });
  $('#form-taux').addEventListener('submit', e => {
    e.preventDefault();
    const valeurs = POSTES_HORAIRES().map(x => Number($('#taux-' + x.id).value));
    if (valeurs.some(v => !(v >= 0) || !Number.isFinite(v))) {
      $('#taux-message').className = 'form-message erreur';
      $('#taux-message').textContent = 'Chaque taux doit être un nombre positif.';
      return;
    }
    POSTES_HORAIRES().forEach((x, i) => { x.taux = Math.round(valeurs[i]); });
    journal('Paie', 'Taux horaires modifiés', POSTES_HORAIRES().map(x => `${x.nom} ${prix.format(x.taux)}`).join(', '));
    dlgTaux.close();
    rendreEspace(pageEspace());
  });

  function tableau(colonnes, lignes, vide) {
    const defil = el('div', 'tableau-defil');
    const table = el('table', 'tableau');
    const tr = el('tr');
    colonnes.forEach(c => { const th = el('th', null, c); th.scope = 'col'; tr.append(th); });
    const thead = el('thead');
    thead.append(tr);
    const tbody = el('tbody');
    if (lignes.length) {
      lignes.forEach(cells => {
        const l = el('tr');
        cells.forEach(x => { const td = el('td'); if (x instanceof Node) td.append(x); else td.textContent = x; l.append(td); });
        tbody.append(l);
      });
    } else {
      const l = el('tr');
      const td = el('td', 'tableau-vide', vide);
      td.colSpan = colonnes.length;
      l.append(td);
      tbody.append(l);
    }
    table.append(thead, tbody);
    defil.append(table);
    return defil;
  }
  function panneauAvec(titre, contenu, extra) {
    const p = el('div', 'panneau');
    const tete = el('div', 'panneau-tete');
    tete.append(el('h2', 'panneau-titre', titre));
    if (extra) tete.append(extra);
    p.append(tete, contenu);
    return p;
  }

  function mesPointages() {
    const miens = pointagesApercu.filter(x => memeNom(x.nom, identifiant));
    return panneauAvec('Mes pointages', tableau(['Date', 'Début', 'Fin', 'Durée', 'Gagné'], miens.map(x => [
      x.debut.toLocaleDateString('fr-FR'), fmtHeure(x.debut),
      x.fin ? fmtHeure(x.fin) : el('span', 'pastille pastille-validee', 'En service'),
      fmtDuree((x.fin || new Date()) - x.debut), prix.format(gain(x)),
    ]), 'Aucun pointage pour le moment.'));
  }

  function historiqueBadgeuse() {
    const maintenant = new Date();
    const parEmp = {};
    pointagesApercu.forEach(x => {
      const k = Object.keys(parEmp).find(n => memeNom(n, x.nom)) || x.nom;
      (parEmp[k] = parEmp[k] || []).push(x);
    });
    const duMois = x => x.debut.getMonth() === maintenant.getMonth() && x.debut.getFullYear() === maintenant.getFullYear();
    const total = l => l.reduce((t, x) => t + ((x.fin || maintenant) - x.debut), 0);
    const noms = Object.keys(parEmp).sort((a, b) => a.localeCompare(b, 'fr'));
    const liste = panneauAvec('Historique par employé', tableau(['Employé', 'Services du mois', 'Heures du mois', 'Gagné du mois', 'Heures au total', 'État'], noms.map(n => {
      const l = parEmp[n];
      const nom = el('button', 'lien-nom', n);
      nom.type = 'button';
      nom.title = 'Voir le détail des pointages';
      if (employeOuvert && memeNom(employeOuvert, n)) nom.setAttribute('aria-current', 'true');
      nom.addEventListener('click', () => { employeOuvert = n; rendreEspace('espace-badgeuse'); });
      return [nom, String(l.filter(duMois).length), fmtDuree(total(l.filter(duMois))), prix.format(l.filter(duMois).reduce((t, x) => t + gain(x), 0)), fmtDuree(total(l)),
        l.some(x => !x.fin) ? el('span', 'pastille pastille-validee', 'En service') : el('span', 'pastille pastille-attente', 'Hors service')];
    }), 'Aucun employé n’a encore badgé.'));
    const blocs = [liste];

    const cle = employeOuvert && noms.find(n => memeNom(n, employeOuvert));
    if (cle) {
      const fermer = el('button', 'btn btn-mini btn-ghost', 'Fermer');
      fermer.type = 'button';
      fermer.addEventListener('click', () => { employeOuvert = null; rendreEspace('espace-badgeuse'); });
      const msg = el('p', 'form-message pv-message');
      msg.setAttribute('role', 'status');
      const lignes = parEmp[cle].map(x => {
        const inDebut = el('input', 'pv-input champ-heure');
        inDebut.type = 'datetime-local';
        inDebut.value = versChamp(x.debut);
        inDebut.setAttribute('aria-label', `Début du service du ${x.debut.toLocaleDateString('fr-FR')}`);
        const inFin = el('input', 'pv-input champ-heure');
        inFin.type = 'datetime-local';
        inFin.value = x.fin ? versChamp(x.fin) : '';
        inFin.setAttribute('aria-label', `Fin du service du ${x.debut.toLocaleDateString('fr-FR')}`);
        const enr = el('button', 'btn btn-mini', 'Enregistrer');
        enr.type = 'button';
        enr.disabled = true;
        [inDebut, inFin].forEach(i => i.addEventListener('input', () => { enr.disabled = false; }));
        enr.addEventListener('click', () => {
          const d = new Date(inDebut.value);
          const f = inFin.value ? new Date(inFin.value) : null;
          if (isNaN(d) || (f && (isNaN(f) || f <= d))) {
            msg.className = 'form-message pv-message erreur';
            msg.textContent = 'La fin doit être après le début.';
            return;
          }
          x.debut = d;
          x.fin = f;
          x.corrige = { par: identifiant, le: new Date() };
          journal('Badgeuse', 'Pointage corrigé', `${x.nom} · ${fmtDate(d)} → ${f ? fmtDate(f) : 'en cours'}`);
          pointagesApercu.sort((a, b) => b.debut - a.debut);
          rendreEspace('espace-badgeuse');
        });
        const suppr = el('button', 'btn btn-mini btn-ghost', 'Supprimer');
        suppr.type = 'button';
        let armee = false;
        suppr.addEventListener('click', () => {
          if (!armee) { armee = true; suppr.textContent = 'Confirmer'; suppr.className = 'btn btn-mini btn-danger'; return; }
          pointagesApercu.splice(pointagesApercu.indexOf(x), 1);
          journal('Badgeuse', 'Pointage supprimé', `${x.nom} · ${fmtDate(x.debut)}`);
          rendreEspace('espace-badgeuse');
        });
        const actions = el('div', 'actions-ligne');
        actions.append(enr, suppr);
        const etat = x.corrige ? el('span', 'pastille pastille-attente', 'Corrigé') : '';
        if (etat) etat.title = `Corrigé par ${x.corrige.par} le ${fmtDate(x.corrige.le)}`;
        return [inDebut, inFin, fmtDuree((x.fin || maintenant) - x.debut), prix.format(gain(x)), etat || '—', actions];
      });
      const detail = panneauAvec(`Pointages de ${cle}`, tableau(['Début', 'Fin', 'Durée', 'Gagné', 'Correction', 'Actions'], lignes, 'Aucun pointage.'), fermer);
      detail.append(msg);
      blocs.push(detail);
    }
    return blocs;
  }

  /* Paie : salaire = heures badgées × taux du grade + commission du grade × bénéfice des ventes validées */
  const PART_COUT_CONCESSION = 85; /* coût d'un véhicule neuf pour la concession : 85 % du prix neuf (tableur CEM) */
  const paiesApercu = [];
  let periodePaie = 'semaine';
  let employePaie = null;
  let ongletPaie = 'ma';
  /* Coût d'une vente : occasion = prix d'achat (rachat déjà en dépense) ; neuf = 85 % du prix neuf (dépense ajoutée à la validation) */
  function beneficeVente(nomVehicule, prixVente, categorie) {
    const n = (nomVehicule || '').trim().toLowerCase();
    const st = categorie !== 'neuf' && vehicules.find(v => nomV(v).toLowerCase() === n && v.prixAchat);
    if (st) return { cout: st.prixAchat, source: "prix d'achat (stock)" };
    const ref = (prixNeufsCache || []).find(x => x.n.toLowerCase() === n);
    if (ref) return { cout: Math.round(ref.p * PART_COUT_CONCESSION / 100), source: `prix concession (${PART_COUT_CONCESSION} % du neuf)` };
    return { cout: Math.round(prixVente * PART_COUT_CONCESSION / 100), source: `estimé (${PART_COUT_CONCESSION} % du prix)` };
  }
  const commissionDe = id => (POSTES.find(x => x.id === id) || {}).commission || 0;
  /* Calcule la paie de chaque employé sur une période */
  function calculerPaie(per) {
    const dans = d => d >= per.debut && d < per.fin;
    const emp = {};
    const fiche = nom => {
      const k = Object.keys(emp).find(n => memeNom(n, nom)) || nom;
      return emp[k] = emp[k] || { nom: k, poste: null, ms: 0, salaireHoraire: 0, fixe: 0, ventes: [], benefice: 0, commission: 0, primes: 0, listePrimes: [], attente: 0 };
    };
    /* Tous les employés de l'équipe apparaissent, même sans activité sur la période */
    equipeVisible().forEach(e => { fiche(nomComplet(e)).posteEquipe = e.poste; });
    pointagesApercu.filter(x => dans(x.debut)).forEach(x => {
      const f = fiche(x.nom);
      f.ms += (x.fin || new Date()) - x.debut;
      f.salaireHoraire += gain(x);
      f.poste = f.poste || x.poste;
    });
    [...ventesApercu.map(v => ({ ...v, genre: 'Véhicule' })), ...contratsApercu.map(v => ({ ...v, genre: 'Contrat' }))]
      .filter(v => v.vendeur && dans(v.date)).forEach(v => {
        const f = fiche(v.vendeur);
        f.poste = f.poste || v.poste;
        if (v.statut !== 'validee') { if (v.statut === 'attente') f.attente += 1; return; }
        const taux = commissionDe(v.poste);
        const com = Math.max(0, Math.round(v.benefice * taux / 100));
        f.ventes.push({ ...v, taux, com });
        f.benefice += v.benefice;
        f.commission += com;
      });
    primesApercu.filter(p => dans(p.semaine)).forEach(p => {
      const f = fiche(p.nom);
      f.primes += p.montant;
      f.listePrimes.push(p);
    });
    /* Nombre de semaines de la période (salaire fixe et salaire max sont hebdomadaires) */
    const nbSem = per.cle ? 1 : Math.max(1, semainesConnues().filter(p => p.debut >= per.debut && p.debut < per.fin).length);
    return Object.values(emp).map(f => {
      f.poste = f.posteEquipe || f.poste || 'vendeur';
      const P = POSTES.find(p => p.id === f.poste) || {};
      f.fixe = P.fixe ? P.fixe * nbSem : 0;
      /* Salaire max (CTC art. 40) sur heures + fixe + commissions ; les primes (art. 41) s'ajoutent en plus */
      f.brut = f.salaireHoraire + f.fixe + f.commission;
      f.plafond = P.max ? P.max * nbSem : 0;
      f.plafonne = !!f.plafond && f.brut > f.plafond;
      f.total = (f.plafonne ? f.plafond : f.brut) + f.primes;
      f.paye = paiesApercu.find(p => p.cle === per.cle && memeNom(p.nom, f.nom));
      return f;
    }).filter(f => f.poste !== 'admin').sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }

  function periodeSemaine(decalage) {
    const debut = lundi(new Date());
    debut.setDate(debut.getDate() + 7 * decalage);
    const fin = new Date(debut);
    fin.setDate(fin.getDate() + 7);
    const dernier = new Date(fin);
    dernier.setDate(dernier.getDate() - 1);
    return { debut, fin, libelle: `du ${debut.toLocaleDateString('fr-FR')} au ${dernier.toLocaleDateString('fr-FR')}`, cle: 'S|' + debut.toISOString().slice(0, 10) };
  }

  function boutonsSegment(label, options, actif, choisir, classe) {
    const seg = el('div', 'segment sous-onglets' + (classe ? ' ' + classe : ''));
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', label);
    options.forEach(([id, nom]) => {
      const b = el('button', null, nom);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(actif === id));
      b.addEventListener('click', () => choisir(id));
      seg.append(b);
    });
    return seg;
  }
  const tuile = (label, valeur, note) => {
    const d = el('div', 'tuile');
    d.append(el('p', 'tuile-label', label), el('p', 'tuile-valeur', valeur), el('p', 'tuile-note', note));
    return d;
  };
  const vide = () => ({ ms: 0, salaireHoraire: 0, fixe: 0, ventes: [], benefice: 0, commission: 0, primes: 0, listePrimes: [], brut: 0, plafond: 0, plafonne: false, total: 0, attente: 0, poste: posteApercu });
  const etatPaiement = f => {
    if (!f.paye) return f.total > 0 ? el('span', 'pastille pastille-attente', 'À payer') : '—';
    const s = el('span', 'pastille pastille-validee', 'Payé');
    s.title = `Payé ${prix.format(f.paye.montant)} par ${f.paye.par} le ${fmtDate(f.paye.le)}`;
    return s;
  };
  function ligneEmploye(f, per) {
    const nom = el('button', 'lien-nom', f.nom);
    nom.type = 'button';
    nom.title = 'Voir le détail';
    const ouvert = employePaie && employePaie.cle === per.cle && memeNom(employePaie.nom, f.nom);
    if (ouvert) nom.setAttribute('aria-current', 'true');
    nom.addEventListener('click', () => { employePaie = ouvert ? null : { nom: f.nom, cle: per.cle }; rendreEspace('espace-paie'); });
    let action = etatPaiement(f);
    if (!f.paye && f.total > 0) {
      action = el('button', 'btn btn-mini', 'Marquer payé');
      action.type = 'button';
      action.setAttribute('aria-label', `Marquer la paie de ${f.nom} (${per.libelle}) comme payée`);
      action.addEventListener('click', () => {
        paiesApercu.push({ cle: per.cle, nom: f.nom, montant: f.total, le: new Date(), par: identifiant });
        journal('Paie', 'Paie marquée payée', `${f.nom} · ${per.libelle} · ${prix.format(f.total)}`);
        depensesApercu.unshift({
          n: depensesApercu.length, date: new Date(), categorie: 'Salaires',
          libelle: `Paie ${f.nom} · ${per.libelle}`, montant: f.total, par: identifiant, lien: 'paie',
        });
        rendreEspace('espace-paie');
      });
    }
    return [nom, (POSTES.find(x => x.id === f.poste) || {}).nom || f.poste, fmtDuree(f.ms), f.fixe ? `${prix.format(f.fixe)} (fixe)` : prix.format(f.salaireHoraire),
      String(f.ventes.length) + (f.attente ? ` (+${f.attente} en attente)` : ''), prix.format(f.benefice),
      f.fixe && !f.commission ? '—' : `${prix.format(f.commission)} (${commissionDe(f.poste)} %)`, f.primes ? prix.format(f.primes) : '—', celluleTotal(f), action, docsPaie(f, per)];
  }
  function docsPaie(f, per) {
    const d = el('div', 'actions-ligne');
    d.append(boutonFichePaie(f, per), boutonDiscord(() => discordPaie(f, per)));
    return d;
  }
  function detailEmploye(f, per) {
    const fermer = el('button', 'btn btn-mini btn-ghost', 'Fermer');
    fermer.type = 'button';
    fermer.addEventListener('click', () => { employePaie = null; rendreEspace('espace-paie'); });
    return panneauAvec(`Commissions de ${f.nom} · ${per.libelle}`, tableau(['Date', 'Type', 'Vente', 'Prix', 'Coût', 'Bénéfice', 'Commission'], f.ventes.map(v => [
      fmtDate(v.date), v.genre, v.vehicule, prix.format(v.prix), v.cout != null ? `${prix.format(v.cout)} · ${v.source}` : '—',
      prix.format(v.benefice), `${prix.format(v.com)} (${v.taux} %)`,
    ]), 'Aucune vente validée sur la semaine.'), fermer);
  }
  const COLS_EMPLOYES = ['Employé', 'Grade', 'Heures', 'Salaire', 'Ventes validées', 'Bénéfice', 'Commission', 'Primes', 'Total', 'Paiement', 'Documents'];
  function celluleTotal(f) {
    if (!f.plafonne) return prix.format(f.total);
    const d = el('div', 'actions-ligne');
    const p = el('span', 'pastille pastille-attente', 'Plafond');
    p.title = `Brut ${prix.format(f.brut)}, plafonné au salaire max du rôle (${prix.format(f.plafond)})`;
    d.append(el('span', null, prix.format(f.total)), p);
    return d;
  }

  function blocsPaie() {
    const blocs = [];
    const direction = estResponsable() && ongletPaie === 'employes';
    if (estResponsable()) blocs.push(boutonsSegment('Paie', [['ma', 'Ma paie'], ['employes', 'Paies des employés']], ongletPaie, id => { ongletPaie = id; rendreEspace('espace-paie'); }));
    blocs.push(boutonsSegment('Période de paie', [['semaine', 'Semaine en cours'], ['precedentes', 'Semaines précédentes']], periodePaie,
      id => { periodePaie = id; employePaie = null; rendreEspace('espace-paie'); }, 'periode-onglets'));

    /* Semaine en cours : vue complète */
    if (periodePaie === 'semaine') {
      const per = periodeSemaine(0);
      const fiches = calculerPaie(per);
      blocs.push(el('p', 'calcul-detail paie-periode', `Semaine ${per.libelle}. Seules les ventes validées comptent pour la commission.`));
      const t = el('div', 'tuiles');
      if (!direction) {
        const f = fiches.find(x => memeNom(x.nom, identifiant)) || vide();
        t.append(
          tuile('Heures pointées', fmtDuree(f.ms), `${prix.format(tauxDe(f.poste))} / h`),
          f.fixe ? tuile('Salaire fixe', prix.format(f.fixe), 'Comptable : salaire fixe, non commissionné') : tuile('Salaire horaire', prix.format(f.salaireHoraire), '15 h max / semaine × taux du grade'),
          tuile('Commissions', prix.format(f.commission), `${commissionDe(f.poste)} % du bénéfice · ${f.ventes.length} vente(s) validée(s)`),
          tuile('Total de la semaine', prix.format(f.total), [f.primes ? `dont ${prix.format(f.primes)} de primes` : '', f.plafonne ? `plafonné au salaire max (${prix.format(f.plafond)})` : '', f.paye ? `payé le ${fmtDate(f.paye.le)}` : 'pas encore payé'].filter(Boolean).join(' · ')),
        );
        blocs.push(t);
        const docs = el('div', 'actions-ligne histo-actions');
        docs.append(boutonFichePaie(f, per, 'Télécharger ma fiche de paie'), boutonDiscord(() => discordPaie({ ...f, nom: f.nom || identifiant }, per), 'Copier pour Discord'));
        blocs.push(docs);
        if (f.attente) blocs.push(el('p', 'note-reserve', `${f.attente} vente(s) en attente de validation : elles compteront une fois validées.`));
        blocs.push(panneauAvec('Mes commissions', tableau(['Date', 'Type', 'Vente', 'Prix', 'Bénéfice', 'Commission'], f.ventes.map(v => [
          fmtDate(v.date), v.genre, v.vehicule, prix.format(v.prix), prix.format(v.benefice), `${prix.format(v.com)} (${v.taux} %)`,
        ]), 'Aucune vente validée cette semaine.')));
        return blocs;
      }
      const somme = k => fiches.reduce((s, f) => s + f[k], 0);
      t.append(
        tuile('Masse salariale', prix.format(somme('total')), `${fiches.length} employé(s)`),
        tuile('Salaires horaires', prix.format(somme('salaireHoraire')), fmtDuree(somme('ms')) + ' pointées'),
        tuile('Commissions', prix.format(somme('commission')), `Sur ${prix.format(somme('benefice'))} de bénéfice`),
        tuile('Reste à payer', prix.format(fiches.filter(f => !f.paye).reduce((s, f) => s + f.total, 0)), `${fiches.filter(f => !f.paye && f.total > 0).length} paie(s) en attente`),
      );
      blocs.push(t, panneauAvec('Paie par employé', tableau(COLS_EMPLOYES, fiches.map(f => ligneEmploye(f, per)), 'Aucun pointage ni vente cette semaine.')));
      const f = employePaie && employePaie.cle === per.cle && fiches.find(x => memeNom(x.nom, employePaie.nom));
      if (f) blocs.push(detailEmploye(f, per));
      blocs.push(panneauPrimes(per, fiches));
      return blocs;
    }

    /* Semaines précédentes : un bloc par semaine, 4 dernières semaines */
    blocs.push(el('p', 'calcul-detail paie-periode', 'Les 4 dernières semaines terminées, de la plus récente à la plus ancienne.'));
    for (let n = 1; n <= 4; n += 1) {
      const per = periodeSemaine(-n);
      const fiches = calculerPaie(per);
      if (!direction) {
        const f = fiches.find(x => memeNom(x.nom, identifiant)) || vide();
        blocs.push(panneauAvec(`Semaine ${per.libelle}`, tableau(['Heures', 'Salaire horaire', 'Ventes validées', 'Commissions', 'Total', 'Paiement', 'Documents'],
          f.ms || f.ventes.length ? [[fmtDuree(f.ms), prix.format(f.salaireHoraire), String(f.ventes.length), prix.format(f.commission), prix.format(f.total), etatPaiement(f), docsPaie({ ...f, nom: f.nom || identifiant }, per)]] : [],
          'Aucun pointage ni vente cette semaine.')));
        continue;
      }
      const total = fiches.reduce((s, f) => s + f.total, 0);
      const reste = fiches.filter(f => !f.paye).reduce((s, f) => s + f.total, 0);
      const note = el('p', 'panneau-note ' + (reste ? '' : 'pv-compte'), reste ? `Reste à payer ${prix.format(reste)}` : `Masse salariale ${prix.format(total)}`);
      blocs.push(panneauAvec(`Semaine ${per.libelle}`, tableau(COLS_EMPLOYES, fiches.map(f => ligneEmploye(f, per)), 'Aucun pointage ni vente cette semaine.'), fiches.length ? note : null));
      const f = employePaie && employePaie.cle === per.cle && fiches.find(x => memeNom(x.nom, employePaie.nom));
      if (f) blocs.push(detailEmploye(f, per));
    }
    return blocs;
  }

  /* Données de démonstration (fictives) : employés, 5 semaines de pointages, ventes, contrats, rachats, dépenses et paies */
  let demoChargee = false;
  async function chargerDemo() {
    const liste = (await chargerPrixNeufs()).filter(x => x.p >= 15000 && x.p <= 400000 && x.c !== 'autres' && x.c !== 'cycles');
    if (!liste.length) return false;
    let graine = 20261031;
    const r = n => { graine = (graine * 1103515245 + 12345) % 2147483648; return Math.floor(graine / 2147483648 * n); };
    const choisir = t => t[r(t.length)];
    const plaque = () => Array.from({ length: 8 }, (_, i) => (i === 2 || i === 3 || i === 4 ? 'ABCDEFGHJKLMNPRSTUVWXYZ' : '0123456789')[r(i === 2 || i === 3 || i === 4 ? 23 : 10)]).join('');
    const EMP = [['Marco Delgado', 'patron'], ['Lena Ruiz', 'copatron'], ['Tyrell Brooks', 'manager'], ['Sam Okafor', 'vendeur'], ['Jade Ortiz', 'vendeur'], ['Nico Varga', 'stagiaire']];
    const VENDEURS = EMP.filter(e => e[1] !== 'patron');
    const RESP = EMP.filter(e => ['patron', 'copatron', 'manager'].includes(e[1]));
    const CLIENTS = ['Travis Cole', 'Maria Santos', 'Dwayne Fisher', 'Chloe Martin', 'Victor Hale', 'Rosa Jimenez', 'Kenji Mori', 'Amber Lane', 'Omar Haddad', 'Lucy Blake', 'Diego Ramos', 'Hank Weller'];
    EMP.forEach(([nom, poste], i) => {
      const [prenom, ...reste] = nom.split(' ');
      equipeApercu.push({ demo: true, id: 'demo-' + i, prenom, nom: reste.join(' '), poste, tel: '555-' + String(1000 + r(9000)), rib: `LS${String(10000000 + r(90000000))}`, embauche: periodeSemaine(-6 + Math.min(i, 5)).debut, par: 'Marco Delgado' });
    });
    for (const e of equipeApercu.filter(x => x.demo)) {
      const sel = nouveauSel();
      comptesApercu.push({ demo: true, id: 'cpt-' + e.id, employeId: e.id, identifiant: identifiantPropose(e), sel, hash: await hacher(MDP_DEMO, sel), mdp: MDP_DEMO, actif: true, creeLe: e.embauche, par: 'Marco Delgado', derniere: null });
    }
    const maintenant = new Date();
    const aDate = (base, jour, h, m) => { const d = new Date(base); d.setDate(d.getDate() + jour); d.setHours(h, m, 0, 0); return d; };

    for (let w = 4; w >= 0; w -= 1) {
      const lundiW = periodeSemaine(-w).debut;
      const jourMax = w === 0 ? (maintenant.getDay() + 6) % 7 : 6;
      /* Pointages */
      EMP.forEach(([nom, poste]) => {
        const jours = new Set();
        const n = 3 + r(3);
        for (let i = 0; i < n; i += 1) jours.add(r(jourMax + 1));
        jours.forEach(j => {
          const debut = aDate(lundiW, j, 14 + r(6), r(4) * 15);
          if (debut > maintenant) return;
          let fin = new Date(debut.getTime() + (2 + r(4)) * 3600000 + r(4) * 900000);
          if (fin > maintenant) fin = new Date(maintenant.getTime() - 600000);
          if (fin <= debut) return;
          pointagesApercu.push({ demo: true, nom, poste, debut, fin });
        });
      });
      /* Ventes de véhicules */
      const nbVentes = 4 + r(4);
      for (let i = 0; i < nbVentes; i += 1) {
        const [vendeur, poste] = choisir(VENDEURS);
        const v = choisir(liste);
        const date = aDate(lundiW, r(jourMax + 1), 15 + r(7), r(60));
        if (date > maintenant) continue;
        const px = Math.round(v.p * (1 + r(6) / 100) / 100) * 100;
        const cout = Math.round(v.p * PART_COUT_CONCESSION / 100);
        const statut = w > 0 ? (r(10) < 9 ? 'validee' : 'refusee') : (r(3) ? 'validee' : 'attente');
        ventesApercu.push({ demo: true, vendeur, poste, date, client: choisir(CLIENTS), vehicule: v.n, plaque: plaque(), prix: px, cout, source: `prix concession (${PART_COUT_CONCESSION} % du neuf)`, benefice: px - cout, statut, decisionLe: statut !== 'attente' ? new Date(date.getTime() + 3600000) : undefined });
      }
      /* Contrats */
      const nbContrats = 1 + r(2);
      for (let i = 0; i < nbContrats; i += 1) {
        const [vendeur, poste] = choisir(VENDEURS);
        const v = choisir(liste);
        const date = aDate(lundiW, r(jourMax + 1), 15 + r(7), r(60));
        if (date > maintenant) continue;
        const px = CONTRAT_BASE + Math.round(v.p * CONTRAT_TAUX / 100);
        const statut = w > 0 || r(2) ? 'validee' : 'attente';
        contratsApercu.push({ demo: true, vendeur, poste, date, client: choisir(CLIENTS), vehicule: v.n, prix: px, cout: null, source: 'contrat (sans coût)', benefice: px, statut, decisionLe: statut !== 'attente' ? new Date(date.getTime() + 3600000) : undefined });
      }
      /* Rachats → stock (+ dépense non déductible) */
      const nbRachats = 1 + r(2);
      for (let i = 0; i < nbRachats; i += 1) {
        const [par] = choisir(RESP);
        const v = choisir(liste.filter(x => x.p <= 250000));
        const date = aDate(lundiW, r(jourMax + 1), 14 + r(8), r(60));
        if (date > maintenant) continue;
        const options = [];
        let custom = 0;
        if (r(4) === 0) { options.push('Full custom'); custom = v.p; } else {
          PIECES.forEach(pc => { if (r(2)) { const niv = r(pc.taux.length); custom += Math.round(v.p * pc.taux[niv] / 100); options.push(pc.taux.length > 1 ? `${pc.nom} ${niv + 1}` : pc.nom); } });
        }
        const achat = Math.round((v.p + custom) * TAUX_RACHAT / 100);
        const pl = plaque();
        const client = choisir(CLIENTS);
        const stock = mettreEnStock({ modele: v.n, prixAchat: achat, prix: prixAvecMarge(achat), plaque: pl, photo: '', options, date });
        stock.demo = true;
        if (w > 0) stock.publie = true;
        rachatsApercu.push({ demo: true, date, client, modele: v.n, prix: achat, revente: stock.prix, ref: stock.id, plaque: pl, par, photo: null });
        depensesApercu.push({ demo: true, date, categorie: CAT_RACHAT, libelle: `${v.n} · ${pl} · ${client}`, montant: achat, par, lien: stock.id });
      }
      /* Dépenses courantes */
      const dep = (jour, categorie, libelle, montant, par) => {
        const date = aDate(lundiW, jour, 12, 0);
        if (date <= maintenant) depensesApercu.push({ demo: true, date, categorie, libelle, montant, par });
      };
      dep(0, 'Loyer des locaux', 'Loyer hebdomadaire', 15000, 'Marco Delgado');
      dep(Math.min(jourMax, 2), 'Réparations de véhicules', 'Entretien atelier', 800 + r(18) * 100, 'Tyrell Brooks');
      dep(Math.min(jourMax, 4), 'Repas fournis aux salariés', 'Repas équipe', 1500 + r(20) * 100, 'Lena Ruiz');
      if (w % 2 === 0) dep(Math.min(jourMax, 3), 'Avocat inscrit au barreau', 'Contrats de travail', 5000, 'Marco Delgado');
      if (w === 2) dep(5, 'Comptable déclaré au gouvernement', 'Déclaration hebdomadaire', 3000, 'Marco Delgado');
      if (w === 3) dep(1, 'Essence', 'Carburant dépanneuse', 900, 'Tyrell Brooks');
    }
    /* Paies des semaines passées (sauf une, laissée à payer) */
    for (let w = 1; w <= 4; w += 1) {
      const per = periodeSemaine(-w);
      const le = new Date(per.fin.getTime() + 20 * 3600000);
      calculerPaie(per).forEach(f => {
        if (w === 1 && f.nom === 'Nico Varga') return;
        paiesApercu.push({ demo: true, cle: per.cle, nom: f.nom, montant: f.total, le, par: 'Marco Delgado' });
        depensesApercu.push({ demo: true, date: le, categorie: 'Salaires', libelle: `Paie ${f.nom} · ${per.libelle}`, montant: f.total, par: 'Marco Delgado', lien: 'paie' });
      });
    }
    /* Fonds de caisse à l'ouverture */
    const ouverture = periodeSemaine(-4).debut;
    ouverture.setHours(9, 0, 0, 0);
    ecrituresApercu.push({ demo: true, date: ouverture, sens: 'entree', categorie: 'Solde de départ', libelle: "Fonds de caisse à l'ouverture", montant: 500000, par: 'Marco Delgado' });
    /* Ordre chronologique inverse */
    [pointagesApercu, ventesApercu, contratsApercu, rachatsApercu].forEach(t => t.sort((a, b) => (b.debut || b.date) - (a.debut || a.date)));
    depensesApercu.sort((a, b) => a.date - b.date).forEach((x, i) => { x.n = i; });
    depensesApercu.reverse();
    /* Dossiers RH : CDI signés, un CDD qui se termine, un stagiaire sans contrat signé, une sanction */
    equipeApercu.filter(e => e.demo).forEach((e, i) => {
      e.rh = { contrat: 'CDI', debut: e.embauche, finCDD: null, signe: new Date(e.embauche.getTime() + 2 * JOUR_MS), aSigner: false, sanctions: [] };
      if (i === 3) e.rh.sanctions.push({ date: aDate(periodeSemaine(-2).debut, 2, 15, 0), type: 'Avertissement', motif: 'Retards répétés à la prise de service malgré un rappel oral', par: 'Tyrell Brooks' });
      if (i === 4) {
        const d = new Date(Date.now() - 13.5 * JOUR_MS);
        Object.assign(e.rh, { contrat: 'CDD', debut: d, finCDD: new Date(d.getTime() + 15 * JOUR_MS), signe: new Date(d.getTime() + JOUR_MS) });
      }
      if (i === 5) e.rh.signe = null;
    });
    /* Demandes de réservation venues du site */
    const dispos = vehicules.filter(v => enLigne(v) && v.statut === 'disponible');
    if (dispos[0]) reservationsApercu.push({ demo: true, id: 'rs-demo-1', date: new Date(Date.now() - 2 * 3600000), vehiculeId: dispos[0].id, vehicule: nomV(dispos[0]), prix: dispos[0].prix, type: 'reservation', nom: 'Kenji Mori', tel: '555-0177', message: 'Dispo ce soir après 21 h', statut: 'nouvelle' });
    if (dispos[1]) reservationsApercu.push({ demo: true, id: 'rs-demo-2', date: new Date(Date.now() - 30 * 3600000), vehiculeId: dispos[1].id, vehicule: nomV(dispos[1]), prix: dispos[1].prix, type: 'reservation', nom: 'Chloe Martin', tel: '555-0123', message: '', statut: 'refusee', par: 'Lena Ruiz', le: new Date(Date.now() - 26 * 3600000) });
    /* Subventions de l'État reçues pour les semaines S-4 à S-2 */
    for (let w = 4; w >= 2; w -= 1) recevoirSubvention(periodeSemaine(-w), 'Marco Delgado', new Date(periodeSemaine(-w).fin.getTime() + 2 * 86400000 + 15 * 3600000), true);
    for (let w = 4; w >= 1; w -= 1) {
      const per = periodeSemaine(-w);
      cloturesApercu.push({ demo: true, cle: per.cle, le: new Date(per.fin.getTime() + 21 * 3600000), par: 'Marco Delgado', bilan: bilanSemaine(per) });
    }
    demoChargee = true;
    rendreAccueil();
    rendreCatalogue();
    return true;
  }
  function effacerDemo() {
    [pointagesApercu, ventesApercu, contratsApercu, rachatsApercu, depensesApercu, paiesApercu, ecrituresApercu, cloturesApercu, equipeApercu, comptesApercu, reservationsApercu, primesApercu, vehicules].forEach(t => {
      for (let i = t.length - 1; i >= 0; i -= 1) if (t[i].demo) t.splice(i, 1);
    });
    demoChargee = false;
    remplirCategories();
    rendreAccueil();
    rendreCatalogue();
  }
  const majBoutonsDemo = () => {
    if (EN_LIGNE) return;
    $('#demo-charger').hidden = demoChargee;
    $('#demo-effacer').hidden = !demoChargee;
  };
  $('#demo-charger').addEventListener('click', async () => {
    const b = $('#demo-charger');
    b.disabled = true;
    b.textContent = 'Chargement…';
    await chargerDemo();
    journal('Données', 'Données fictives chargées');
    b.disabled = false;
    b.textContent = 'Charger des données fictives';
    majBoutonsDemo();
    rendreEspace(pageEspace());
  });
  $('#demo-effacer').addEventListener('click', () => {
    effacerDemo();
    journal('Données', 'Données fictives effacées');
    majBoutonsDemo();
    rendreEspace(pageEspace());
  });

  /* Marge sur les reventes d'occasion (réglable dans Paramètres) */
  let MARGE_REVENTE = 25;
  const prixAvecMarge = achat => Math.round(achat * (1 + MARGE_REVENTE / 100) / 100) * 100;
  const texteMarge = (vente, achat) => {
    const m = vente - achat;
    return `${prix.format(m)} (${achat ? Math.round(m / achat * 1000) / 10 : 0} %)`.replace('.', ',');
  };
  /* Paramètres (direction) : rémunération par rôle */
  function panneauRemuneration() {
    const champ = (valeur, label, desactive) => {
      const i = el('input', 'pv-input');
      i.type = 'number';
      i.min = '0';
      i.step = '50';
      i.inputMode = 'numeric';
      i.value = valeur || 0;
      i.disabled = !!desactive;
      i.setAttribute('aria-label', label);
      return i;
    };
    const entrees = postesVisibles().map(p => ({
      p,
      taux: champ(p.taux, `Taux horaire ${p.nom}`, p.fixe),
      commission: champ(p.commission, `Commission ${p.nom} (%)`, p.sansCommission),
      max: champ(p.max, `Salaire max ${p.nom}`),
      fixe: p.fixe ? champ(p.fixe, `Salaire fixe ${p.nom}`) : null,
    }));
    const msg = el('p', 'form-message');
    msg.setAttribute('role', 'status');
    const b = el('button', 'btn btn-sm', 'Enregistrer');
    b.type = 'button';
    b.addEventListener('click', () => {
      const lire = i => Math.round(Number(i.value));
      if (entrees.some(x => [x.taux, x.commission, x.max, x.fixe].filter(Boolean).some(i => !(lire(i) >= 0)) || lire(x.commission) > 100)) {
        msg.className = 'form-message erreur';
        msg.textContent = 'Chaque valeur doit être un nombre positif (commission entre 0 et 100 %).';
        return;
      }
      entrees.forEach(x => {
        if (!x.p.fixe) x.p.taux = lire(x.taux);
        if (!x.p.sansCommission) x.p.commission = lire(x.commission);
        x.p.max = lire(x.max);
        if (x.fixe) x.p.fixe = lire(x.fixe);
      });
      journal('Paramètres', 'Rémunération par rôle', postesVisibles().map(p => `${p.nom} : ${p.fixe ? prix.format(p.fixe) + ' fixe' : prix.format(p.taux) + '/h'}, ${p.sansCommission ? 'sans commission' : p.commission + ' %'}, max ${prix.format(p.max)}`).join(' · '));
      rendreEspace('espace-parametres');
      const m = $('#esp-corps .remu-message');
      if (m) { m.className = 'form-message succes remu-message'; m.textContent = 'Rémunération enregistrée. Elle s’applique aux paies calculées.'; }
    });
    msg.classList.add('remu-message');
    const pied = el('div', 'form-pied');
    pied.append(msg, b);
    const p = panneauAvec('Rémunération par rôle', tableau(['Rôle', 'Taux horaire ($/h)', 'Commission (%)', 'Salaire max / semaine ($)', 'Salaire fixe / semaine ($)'],
      entrees.map(x => [x.p.nom, x.taux, x.commission, x.max, x.fixe || '—']), ''));
    p.append(el('p', 'calcul-detail panneau-pied', 'Le salaire max plafonne heures + salaire fixe + commissions de la semaine ; les primes (CTC art. 41) s’ajoutent en plus. Le comptable a un salaire fixe et n’est pas commissionné.'), pied);
    return p;
  }

  /* ---------- Primes selon le Code du travail et du commerce (art. 41) ----------
     41-1 hebdomadaire : enveloppe = % du chiffre d'affaires de la semaine selon sa tranche ; 33 % des salariés au plus ; 5 000 $ max par salarié.
     41-2 exceptionnelle mensuelle : toutes les 4 semaines complètes, enveloppe = % du bénéfice net des 4 semaines selon sa tranche (avec maximum),
     bénéfice net positif et d'au moins 5 000 $, un versement par mois, à répartir entre les salariés. */
  const primesApercu = [];
  let primeArmee = null;
  const PRIME_HEBDO = { tranches: [[10000, 50], [50000, 30], [100000, 10], [300000, 1], [Infinity, 0.5]], parSalarie: 5000, partSalaries: 33 };
  const PRIME_MENSUELLE = { minimum: 5000, tranches: [[150000, 30, 45000], [300000, 17, 51000], [600000, 10, 60000], [900000, 8, 72000], [Infinity, 6.5, 91000]] };
  const typePrime = p => p.type || 'hebdo';
  const caPeriode = per => [...ventesApercu, ...contratsApercu].filter(v => v.statut === 'validee' && v.date >= per.debut && v.date < per.fin).reduce((t, v) => t + v.prix, 0);
  function enveloppeHebdo(per) {
    const ca = caPeriode(per);
    const [, taux] = PRIME_HEBDO.tranches.find(([haut]) => ca <= haut);
    return { ca, taux, montant: ca > 0 ? Math.floor(ca * taux / 100) : 0 };
  }
  /* Bloc mensuel : les 4 semaines complètes qui précèdent la semaine de la paie */
  function enveloppeMensuelle(perPaie) {
    const debut = new Date(perPaie.debut.getTime() - 28 * JOUR_MS);
    const livre = grandLivre().filter(x => x.date >= debut && x.date < perPaie.debut);
    const t = totaux(livre);
    const benefice = t.entree - t.sortie;
    if (benefice < PRIME_MENSUELLE.minimum) return { debut, fin: perPaie.debut, benefice, taux: 0, montant: 0 };
    const [, taux, max] = PRIME_MENSUELLE.tranches.find(([haut]) => benefice <= haut);
    return { debut, fin: perPaie.debut, benefice, taux, max, montant: Math.min(max, Math.floor(benefice * taux / 100)) };
  }
  function panneauPrimes(per, fiches) {
    const hebdo = enveloppeHebdo(per);
    const mens = enveloppeMensuelle(per);
    const bloc = per.cle;
    const duBloc = primesApercu.filter(p => typePrime(p) === 'mensuelle' && p.bloc === bloc);
    const dernierAutre = primesApercu.filter(p => typePrime(p) === 'mensuelle' && p.bloc !== bloc).map(p => new Date(p.semaine)).sort((x, y) => y - x)[0];
    const mensuelleAutorisee = !dernierAutre || per.debut - dernierAutre >= 28 * JOUR_MS;
    const semaine = primesApercu.filter(p => typePrime(p) === 'hebdo' && p.semaine >= per.debut && p.semaine < per.fin);
    const utiliseHebdo = semaine.reduce((t, p) => t + p.montant, 0);
    const beneficiaires = new Set(semaine.map(p => p.nom.toLowerCase()));
    const maxBeneficiaires = Math.floor(fiches.length * PRIME_HEBDO.partSalaries / 100);
    const utiliseMens = duBloc.reduce((t, p) => t + p.montant, 0);

    const info = el('div', 'resume-grille');
    const carte = (titre, lignes) => {
      const dl = el('dl', 'specs resume-specs');
      lignes.forEach(([k, v]) => { const d = el('div'); d.append(el('dt', null, k), el('dd', null, v)); dl.append(d); });
      return panneauAvec(titre, dl);
    };
    info.append(
      carte('Prime hebdomadaire · art. 41-1', [
        ["Chiffre d'affaires de la semaine", prix.format(hebdo.ca)],
        ['Enveloppe', `${prix.format(hebdo.montant)} (${String(hebdo.taux).replace('.', ',')} % du CA)`],
        ['Déjà accordé', prix.format(utiliseHebdo)],
        ['Reste', prix.format(Math.max(0, hebdo.montant - utiliseHebdo))],
        ['Bénéficiaires', `${beneficiaires.size} / ${maxBeneficiaires} (33 % des salariés)`],
        ['Maximum par salarié', prix.format(PRIME_HEBDO.parSalarie)],
      ]),
      carte('Prime exceptionnelle mensuelle · art. 41-2', [
        ['Période', `du ${jour(mens.debut)} au ${jour(new Date(mens.fin - 1))} (4 semaines)`],
        ['Bénéfice net', prix.format(mens.benefice)],
        ['Enveloppe', mens.montant ? `${prix.format(mens.montant)} (${String(mens.taux).replace('.', ',')} %, max ${prix.format(mens.max)})` : 'Aucune (bénéfice < 5 000 $)'],
        ['Déjà répartie', prix.format(utiliseMens)],
        ['Reste', prix.format(Math.max(0, mens.montant - utiliseMens))],
        ['Disponible', mensuelleAutorisee ? 'Oui' : `Non : déjà versée le mois dernier (${jour(dernierAutre)})`],
      ]),
    );

    const f = el('form', 'form-grille');
    f.noValidate = true;
    const ch = (label, input) => { const d = el('div', 'champ'); const l = el('label', null, label); l.htmlFor = input.id; d.append(l, input); f.append(d); return input; };
    const type = el('select');
    type.id = 'pr-type';
    type.innerHTML = '<option value="hebdo">Hebdomadaire (art. 41-1)</option><option value="mensuelle">Exceptionnelle mensuelle (art. 41-2)</option>';
    const sel = el('select');
    sel.id = 'pr-employe';
    fiches.forEach(x => { const o = el('option', null, `${x.nom} · ${nomPoste(x.poste)}`); o.value = x.nom; sel.append(o); });
    const montant = el('input');
    montant.id = 'pr-montant';
    montant.type = 'number';
    montant.min = '0';
    montant.step = '100';
    montant.inputMode = 'numeric';
    const motif = el('input');
    motif.id = 'pr-motif';
    motif.placeholder = 'ex. Objectif de ventes atteint';
    motif.autocomplete = 'off';
    ch('Type de prime', type);
    ch('Employé', sel);
    ch('Montant ($)', montant);
    ch('Motif (obligatoire)', motif);
    const msg = el('p', 'form-message');
    msg.setAttribute('role', 'status');
    const b = el('button', 'btn btn-sm', 'Accorder la prime');
    b.type = 'submit';
    const pied = el('div', 'form-pied');
    pied.append(msg, b);
    f.addEventListener('submit', ev => {
      ev.preventDefault();
      const x = fiches.find(y => y.nom === sel.value);
      const m = Math.round(Number(montant.value));
      const refus = t => { msg.className = 'form-message erreur'; msg.textContent = t; };
      if (!x) return refus('Choisis un employé.');
      if (x.paye) return refus('Paie déjà versée cette semaine : la prime ne peut plus être ajoutée.');
      if (!(m > 0)) return refus('Indique un montant.');
      if (motif.value.trim().length < 5) return refus('Une prime doit être motivée par écrit (5 caractères minimum).');
      if (type.value === 'hebdo') {
        const dejaLui = semaine.filter(p => memeNom(p.nom, x.nom)).reduce((t, p) => t + p.montant, 0);
        if (dejaLui + m > PRIME_HEBDO.parSalarie) return refus(`Art. 41-1 : 5 000 $ maximum par salarié et par semaine (déjà ${prix.format(dejaLui)}).`);
        if (!beneficiaires.has(x.nom.toLowerCase()) && beneficiaires.size >= maxBeneficiaires) return refus(`Art. 41-1 : la prime ne peut aller qu'à 33 % des salariés, soit ${maxBeneficiaires} sur ${fiches.length}.`);
        if (utiliseHebdo + m > hebdo.montant) return refus(`Art. 41-1 : enveloppe de la semaine dépassée (reste ${prix.format(Math.max(0, hebdo.montant - utiliseHebdo))} sur ${prix.format(hebdo.montant)}).`);
      } else {
        if (!mensuelleAutorisee) return refus('Art. 41-2 : un seul versement par mois ; la prime exceptionnelle a déjà été versée il y a moins de 4 semaines.');
        if (!mens.montant) return refus('Art. 41-2 : pas de prime exceptionnelle, le bénéfice net des 4 dernières semaines est inférieur à 5 000 $.');
        if (utiliseMens + m > mens.montant) return refus(`Art. 41-2 : enveloppe dépassée (reste ${prix.format(Math.max(0, mens.montant - utiliseMens))} sur ${prix.format(mens.montant)}).`);
      }
      primesApercu.unshift({ id: 'pr-' + Date.now().toString(36), type: type.value, ...(type.value === 'mensuelle' ? { bloc } : {}), nom: x.nom, semaine: per.debut, montant: m, motif: motif.value.trim(), par: identifiant, le: new Date() });
      journal('Paie', type.value === 'hebdo' ? 'Prime hebdomadaire accordée' : 'Prime exceptionnelle accordée', `${x.nom} · ${prix.format(m)} · ${motif.value.trim()} · ${per.libelle}`);
      rendreEspace('espace-paie');
    });
    const lignes = primesApercu.filter(p => p.semaine >= per.debut && p.semaine < per.fin).map(p => {
      const t = typePrime(p) === 'hebdo' ? 'Hebdo (41-1)' : 'Exceptionnelle (41-2)';
      const payee = fiches.some(x => memeNom(x.nom, p.nom) && x.paye);
      if (payee) return [p.nom, t, prix.format(p.montant), p.motif, p.par, fmtDate(p.le), el('span', 'pastille pastille-validee', 'Versée')];
      const arme = primeArmee === p;
      const k = el('button', 'btn btn-mini' + (arme ? ' btn-danger' : ' btn-ghost'), arme ? 'Confirmer' : 'Retirer');
      k.type = 'button';
      k.addEventListener('click', () => {
        if (!arme) { primeArmee = p; } else { primesApercu.splice(primesApercu.indexOf(p), 1); primeArmee = null; journal('Paie', 'Prime retirée', `${p.nom} · ${prix.format(p.montant)} · ${p.motif}`); }
        rendreEspace('espace-paie');
      });
      return [p.nom, t, prix.format(p.montant), p.motif, p.par, fmtDate(p.le), k];
    });
    const p = panneauAvec(`Primes · semaine ${per.libelle}`, tableau(['Employé', 'Type', 'Montant', 'Motif', 'Accordée par', 'Le', ''], lignes, 'Aucune prime cette semaine.'));
    p.append(info, f, el('p', 'calcul-detail panneau-pied', 'Code du travail et du commerce, art. 41. Les primes s’ajoutent au salaire (hors salaire max) et ne peuvent pas être versées en liquide.'), pied);
    return p;
  }

  function panneauMarge() {
    const corps = el('form', 'form-grille marge-form');
    corps.noValidate = true;
    const ch = el('div', 'champ');
    const l = el('label', null, 'Marge sur les reventes (%)');
    l.htmlFor = 'pm-marge';
    const i = el('input');
    i.id = 'pm-marge';
    i.type = 'number';
    i.min = '0';
    i.max = '500';
    i.step = '1';
    i.inputMode = 'numeric';
    i.value = MARGE_REVENTE;
    ch.append(l, i);
    const b = el('button', 'btn btn-sm', 'Enregistrer');
    b.type = 'submit';
    const ex = el('p', 'calcul-detail marge-exemple');
    const majEx = () => {
      const m = Number(i.value);
      ex.textContent = m >= 0 ? `Exemple : rachat à 40 000 $ → annonce à ${prix.format(Math.round(40000 * (1 + m / 100) / 100) * 100)}. Enregistrer recalcule aussi le prix des occasions en vente.` : '';
    };
    i.addEventListener('input', majEx);
    majEx();
    corps.append(ch, b, ex);
    corps.addEventListener('submit', e => {
      e.preventDefault();
      const m = Number(i.value);
      if (!(m >= 0 && m <= 500)) { ex.textContent = 'Indique une marge entre 0 et 500 %.'; return; }
      MARGE_REVENTE = Math.round(m);
      /* Recalcule le prix des annonces d'occasion issues de rachats (véhicules non vendus) */
      let n = 0;
      vehicules.filter(v => v.rachat && v.prixAchat && v.statut !== 'vendu').forEach(v => {
        const p = prixAvecMarge(v.prixAchat);
        if (p !== v.prix) n += 1;
        v.prix = p;
        const r = rachatsApercu.find(x => x.ref === v.id);
        if (r) r.revente = p;
      });
      journal('Paramètres', 'Marge sur les occasions', `${MARGE_REVENTE} % · ${n} annonce(s) d'occasion recalculée(s)`);
      rendreAccueil();
      rendreCatalogue();
      rendreEspace('espace-parametres');
      const ex2 = $('#esp-corps .marge-exemple');
      if (ex2) ex2.textContent = `Marge enregistrée : ${MARGE_REVENTE} %. ${n} annonce(s) d'occasion mise(s) à jour, ainsi que les prochains rachats.`;
    });
    return panneauAvec('Marge sur les occasions', corps);
  }

  /* Dépenses : catégories et plafonds déductibles par semaine (Code du travail et du commerce de San Andreas) */
  const CATEGORIES_DEPENSES = [
    { nom: "Achat de véhicule pour l'entreprise", plafond: 50000, maxVehicules: 1 },
    { nom: 'Loyer des locaux', plafond: 15000 },
    { nom: 'Réparations de véhicules', plafond: 2000 },
    { nom: 'Soins et prestations médicales', plafond: 3000 },
    { nom: 'Repas fournis aux salariés', plafond: 3000 },
    { nom: 'Avocat inscrit au barreau', plafond: 10000 },
    { nom: 'Comptable déclaré au gouvernement', plafond: 3000 },
    { nom: 'Salaires', total: true, regle: 'art. 40 et suivants' },
    { nom: 'Dons', regle: 'art. 50 et suivants' },
  ];
  const depensesApercu = [];
  const CAT_RACHAT = 'Rachat de véhicule';
  const catDepense = nom => CATEGORIES_DEPENSES.find(c => c.nom.toLowerCase() === (nom || '').trim().toLowerCase());
  const lundi = d => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  };
  const cleSemaine = d => lundi(d).toISOString().slice(0, 10);
  /* Part déductible de chaque dépense, en appliquant les plafonds semaine par semaine dans l'ordre des dates */
  function calculerDeductible() {
    const usage = {};
    [...depensesApercu].sort((a, b) => a.date - b.date || a.n - b.n).forEach(x => {
      const c = catDepense(x.categorie);
      if (!c || x.categorie === CAT_RACHAT) { x.deductible = 0; x.regle = 'Non déductible'; return; }
      if (c.total) { x.deductible = x.montant; x.regle = ''; return; }
      if (!c.plafond) { x.deductible = null; x.regle = c.regle; return; }
      const k = cleSemaine(x.date) + '|' + c.nom;
      const u = usage[k] = usage[k] || { montant: 0, vehicules: 0 };
      if (c.maxVehicules && u.vehicules >= c.maxVehicules) { x.deductible = 0; x.regle = '1 véhicule par semaine'; return; }
      x.deductible = Math.max(0, Math.min(x.montant, c.plafond - u.montant));
      u.montant += x.deductible;
      if (c.maxVehicules) u.vehicules += 1;
      x.regle = x.deductible < x.montant ? 'Plafond atteint' : '';
    });
  }
  const depensesSemaine = () => {
    const k = cleSemaine(new Date());
    return depensesApercu.filter(x => cleSemaine(x.date) === k);
  };
  const depensesMois = () => {
    const m = new Date();
    return depensesApercu.filter(x => x.date.getMonth() === m.getMonth() && x.date.getFullYear() === m.getFullYear());
  };

  function cellDeductible(x) {
    if (x.deductible === null) return el('span', 'pastille pastille-attente', 'Selon ' + x.regle);
    const d = el('div', 'actions-ligne');
    d.append(el('span', null, prix.format(x.deductible)));
    if (x.regle) d.append(el('span', 'pastille ' + (x.deductible ? 'pastille-attente' : 'pastille-refusee'), x.regle));
    return d;
  }

  function panneauPlafonds() {
    calculerDeductible();
    const semaine = depensesSemaine();
    const debut = lundi(new Date());
    const fin = new Date(debut);
    fin.setDate(fin.getDate() + 6);
    const lignes = CATEGORIES_DEPENSES.map(c => {
      const l = semaine.filter(x => catDepense(x.categorie) === c);
      const depense = l.reduce((t, x) => t + x.montant, 0);
      if (c.total) return [c.nom, 'Sans plafond', prix.format(depense), prix.format(depense), '—'];
      if (!c.plafond) return [c.nom, 'Selon ' + c.regle, prix.format(depense), '—', '—'];
      const deduit = l.reduce((t, x) => t + (x.deductible || 0), 0);
      const reste = c.plafond - deduit;
      const plafondTxt = c.maxVehicules ? `${c.maxVehicules} véhicule, ${prix.format(c.plafond)} max` : prix.format(c.plafond);
      return [c.nom, plafondTxt, prix.format(depense), prix.format(deduit),
        reste <= 0 ? el('span', 'pastille pastille-refusee', 'Plafond atteint') : prix.format(reste)];
    });
    const p = panneauAvec(`Plafonds déductibles · semaine du ${debut.toLocaleDateString('fr-FR')} au ${fin.toLocaleDateString('fr-FR')}`,
      tableau(['Catégorie', 'Plafond / semaine', 'Dépensé', 'Déductible', 'Reste déductible'], lignes, ''));
    return p;
  }

  function formulaireDepense() {
    const f = $('#tpl-depense').content.firstElementChild.cloneNode(true);
    const date = f.querySelector('#de-date');
    const cat = f.querySelector('#de-cat');
    const libelle = f.querySelector('#de-libelle');
    const montant = f.querySelector('#de-montant');
    const aide = f.querySelector('#de-aide');
    const msg = f.querySelector('#de-message');
    const justif = champFichier(f.querySelector('#de-justif'), f.querySelector('#de-zone'), f.querySelector('#de-apercu'), f.querySelector('#de-retirer'), msg);
    date.value = new Date().toISOString().slice(0, 10);
    f.querySelector('#de-liste').replaceChildren(...CATEGORIES_DEPENSES.map(c => {
      const o = el('option', null, c.total ? 'Déductible en totalité' : c.plafond ? `Déductible jusqu'à ${prix.format(c.plafond)} / semaine` : 'Selon ' + c.regle);
      o.value = c.nom;
      return o;
    }));
    cat.addEventListener('input', () => {
      const c = catDepense(cat.value);
      aide.textContent = !cat.value.trim() ? ''
        : c ? (c.total ? 'Déductible en totalité, sans plafond.' : c.plafond ? `Déductible jusqu'à ${prix.format(c.plafond)} par semaine${c.maxVehicules ? ' (1 véhicule maximum)' : ''}.` : `Déductibilité selon les ${c.regle}.`)
          : 'Catégorie libre : dépense enregistrée comme non déductible.';
    });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const manque = [];
      const verifier = (champ, ok, nom) => {
        champ.setAttribute('aria-invalid', String(!ok));
        if (!ok) manque.push(nom);
      };
      verifier(date, !!date.value, 'la date');
      verifier(cat, cat.value.trim().length >= 2, 'la catégorie');
      verifier(libelle, libelle.value.trim().length >= 2, 'le libellé');
      verifier(montant, Number(montant.value) > 0, 'le montant');
      if (manque.length) {
        msg.className = 'form-message erreur';
        msg.textContent = 'À compléter : ' + manque.join(', ') + '.';
        f.querySelector('[aria-invalid="true"]').focus();
        return;
      }
      const c = catDepense(cat.value);
      depensesApercu.unshift({
        n: depensesApercu.length, date: new Date(date.value + 'T12:00'), categorie: c ? c.nom : cat.value.trim(),
        libelle: libelle.value.trim(), montant: Math.round(Number(montant.value)), par: identifiant, justif: justif.url(),
      });
      journal('Dépenses', 'Ajout', `${libelle.value.trim()} · ${prix.format(Math.round(Number(montant.value)))}`);
      rendreEspace('espace-depenses');
      const m = $('#de-message');
      m.className = 'form-message succes';
      m.textContent = sansApercu("Dépense ajoutée. Aperçu : elle disparaît si la page est rechargée.");
    });
    return f;
  }

  let depenseASupprimer = null;
  let depenseEnEdition = null;
  const estPatron = () => niveau(posteApercu) >= 2;
  function celluleJustif(x) {
    if (!x.justif) return '—';
    return vignetteImage({
      src: x.justif, alt: `Justificatif : ${x.libelle}`, info: `${x.libelle} · ${prix.format(x.montant)} · ${x.date.toLocaleDateString('fr-FR')}`,
      label: `Voir le justificatif de ${x.libelle}`, avertissement: 'Le justificatif sera retiré de cette dépense.',
      supprimer: estPatron() ? () => { URL.revokeObjectURL(x.justif); x.justif = null; journal('Dépenses', 'Justificatif supprimé', x.libelle); rendreEspace('espace-depenses'); } : null,
    });
  }
  function ligneEdition(x) {
    const champ = (type, valeur, label) => {
      const i = el('input', 'pv-input');
      i.type = type;
      i.value = valeur;
      i.setAttribute('aria-label', label);
      return i;
    };
    const d = champ('date', versChamp(x.date).slice(0, 10), 'Date de la dépense');
    const c = champ('text', x.categorie, 'Catégorie');
    c.setAttribute('list', 'de-liste-edit');
    const listeCat = el('datalist');
    listeCat.id = 'de-liste-edit';
    listeCat.append(...CATEGORIES_DEPENSES.map(k => { const o = el('option'); o.value = k.nom; return o; }));
    const cc = el('div');
    cc.append(c, listeCat);
    const l = champ('text', x.libelle, 'Libellé');
    l.classList.add('pv-libelle');
    const m = champ('number', x.montant, 'Montant');
    m.min = '0';
    m.step = '100';
    /* Justificatif : remplacer ou retirer */
    const j = el('div', 'actions-ligne');
    let nouveau = x.justif;
    const f = el('input');
    f.type = 'file';
    f.accept = 'image/*';
    f.className = 'fichier-mini';
    f.setAttribute('aria-label', 'Remplacer le justificatif');
    f.addEventListener('change', () => {
      const fic = f.files[0];
      if (fic && fic.type.startsWith('image/') && fic.size <= 10 * 1024 * 1024) nouveau = URL.createObjectURL(fic);
    });
    j.append(f);
    if (x.justif) {
      const r = el('button', 'btn btn-mini btn-ghost', 'Retirer');
      r.type = 'button';
      r.addEventListener('click', () => { nouveau = null; r.textContent = 'Retiré'; r.disabled = true; });
      j.append(r);
    }
    const ok = el('button', 'btn btn-mini', 'Enregistrer');
    ok.type = 'button';
    ok.addEventListener('click', () => {
      const montant = Math.round(Number(m.value));
      if (!d.value || c.value.trim().length < 2 || l.value.trim().length < 2 || !(montant > 0)) {
        ok.textContent = 'Champs incomplets';
        return;
      }
      const k = catDepense(c.value);
      journal('Dépenses', 'Modification', `${x.libelle} · ${prix.format(x.montant)} → ${l.value.trim()} · ${prix.format(montant)}`);
      x.date = new Date(d.value + 'T12:00');
      x.categorie = k ? k.nom : c.value.trim();
      x.libelle = l.value.trim();
      x.montant = montant;
      if (nouveau !== x.justif && x.justif) URL.revokeObjectURL(x.justif);
      x.justif = nouveau;
      x.modifie = { par: identifiant, le: new Date() };
      depenseEnEdition = null;
      rendreEspace('espace-depenses');
    });
    const annuler = el('button', 'btn btn-mini btn-ghost', 'Annuler');
    annuler.type = 'button';
    annuler.addEventListener('click', () => { depenseEnEdition = null; rendreEspace('espace-depenses'); });
    const actions = el('div', 'actions-ligne');
    actions.append(ok, annuler);
    return [d, cc, l, m, '—', j, x.par, actions];
  }
  function lignesDepenses() {
    calculerDeductible();
    return [...depensesApercu].sort((a, b) => b.date - a.date || b.n - a.n).map(x => {
      if (depenseEnEdition === x) return ligneEdition(x);
      const par = x.modifie ? el('span', null, x.par) : x.par;
      if (x.modifie) {
        par.append(' ', el('span', 'pastille pastille-attente', 'Modifié'));
        par.title = `Modifié par ${x.modifie.par} le ${fmtDate(x.modifie.le)}`;
      }
      const debut = [x.date.toLocaleDateString('fr-FR'), x.categorie, x.libelle, prix.format(x.montant), cellDeductible(x), celluleJustif(x), par];
      if (x.lien) return [...debut, el('span', 'pastille pastille-attente', x.lien === 'paie' ? 'Auto · paie' : x.lien === 'neuf' ? 'Auto · vente neuf' : 'Auto · ' + x.lien.toUpperCase())];
      const actions = el('div', 'actions-ligne');
      if (estPatron()) {
        const mod = el('button', 'btn btn-mini btn-ghost', 'Modifier');
        mod.type = 'button';
        mod.setAttribute('aria-label', `Modifier la dépense ${x.libelle}`);
        mod.addEventListener('click', () => { depenseEnEdition = x; depenseASupprimer = null; rendreEspace('espace-depenses'); });
        actions.append(mod);
      }
      const b = el('button', 'btn btn-mini ' + (depenseASupprimer === x ? 'btn-danger' : 'btn-ghost'), depenseASupprimer === x ? 'Confirmer' : 'Supprimer');
      b.type = 'button';
      b.setAttribute('aria-label', `Supprimer la dépense ${x.libelle}`);
      b.addEventListener('click', () => {
        if (depenseASupprimer !== x) { depenseASupprimer = x; } else { depensesApercu.splice(depensesApercu.indexOf(x), 1); depenseASupprimer = null; journal('Dépenses', 'Suppression', `${x.libelle} · ${prix.format(x.montant)}`); }
        rendreEspace('espace-depenses');
      });
      actions.append(b);
      return [...debut, actions];
    });
  }

  /* Champ fichier image réutilisable : aperçu, retrait, contrôle (image ≤ 10 Mo) */
  function champFichier(input, zone, apercu, retirer, msg) {
    let url = null;
    const vider = () => {
      if (url) URL.revokeObjectURL(url);
      url = null;
      input.value = '';
      zone.hidden = true;
    };
    retirer.addEventListener('click', () => { vider(); input.focus(); });
    input.addEventListener('change', () => {
      if (url) URL.revokeObjectURL(url);
      url = null;
      zone.hidden = true;
      const fic = input.files[0];
      if (!fic) return;
      if (!fic.type.startsWith('image/') || fic.size > 10 * 1024 * 1024) {
        msg.className = 'form-message erreur';
        msg.textContent = 'Le fichier doit être une image (capture d’écran) de 10 Mo maximum.';
        input.value = '';
        return;
      }
      msg.textContent = '';
      url = URL.createObjectURL(fic);
      apercu.src = url;
      zone.hidden = false;
    });
    return { url: () => url };
  }

  /* Photos (rachats, justificatifs) : vignette dans les registres, grand format dans une fenêtre */
  const dlgPhoto = $('#dlg-photo');
  const btnSuppr = $('#photo-supprimer');
  let photoOuverte = null;
  let confirmer = false;
  $('#photo-fermer').addEventListener('click', () => dlgPhoto.close());
  dlgPhoto.addEventListener('close', () => { photoOuverte = null; });
  btnSuppr.addEventListener('click', () => {
    if (!photoOuverte || !photoOuverte.supprimer) return;
    if (!confirmer) {
      confirmer = true;
      btnSuppr.textContent = 'Confirmer la suppression';
      $('#photo-info').textContent = photoOuverte.avertissement;
      return;
    }
    const action = photoOuverte.supprimer;
    dlgPhoto.close();
    action();
  });
  dlgPhoto.addEventListener('click', e => { if (e.target === dlgPhoto) dlgPhoto.close(); });
  /* o : { src, alt, info, label, avertissement, supprimer (fonction ou null) } */
  function vignetteImage(o) {
    const b = el('button', 'vignette');
    b.type = 'button';
    b.setAttribute('aria-label', o.label);
    const img = el('img');
    img.src = o.src;
    img.alt = '';
    b.append(img);
    b.addEventListener('click', () => {
      const g = $('#photo-grande');
      g.src = o.src;
      g.alt = o.alt;
      photoOuverte = o;
      confirmer = false;
      btnSuppr.textContent = 'Supprimer la photo';
      btnSuppr.hidden = !o.supprimer;
      $('#photo-info').textContent = o.info;
      dlgPhoto.showModal();
    });
    return b;
  }
  function vignette(r) {
    if (!r.photo) return '—';
    return vignetteImage({
      src: r.photo, alt: `${r.modele}, plaque ${r.plaque}`, info: `${r.modele} · ${r.plaque} · ${r.client}`,
      label: `Agrandir la photo du ${r.modele}`, avertissement: 'La photo sera retirée de ce rachat et de son annonce.',
      supprimer: estResponsable() ? () => {
        URL.revokeObjectURL(r.photo);
        r.photo = null;
        journal('Rachats', 'Photo supprimée', `${r.modele} · ${r.plaque}`);
        const enStock = vehicules.find(x => x.id === r.ref);
        if (enStock) {
          enStock.image = '';
          rendreAccueil();
          rendreCatalogue();
        }
        rendreEspace('espace-rachats');
      } : null,
    });
  }

  /* Publication au catalogue : contrôlée par les responsables */
  function publication(v, page) {
    if (!v) return '—';
    const d = el('div', 'actions-ligne');
    d.append(el('span', 'pastille ' + (enLigne(v) ? 'pastille-validee' : 'pastille-attente'), enLigne(v) ? 'En ligne' : 'Non publié'));
    if (estResponsable() && v.statut !== 'vendu') {
      const b = el('button', 'btn btn-mini' + (enLigne(v) ? ' btn-ghost' : ''), enLigne(v) ? 'Retirer' : 'Publier');
      b.type = 'button';
      b.setAttribute('aria-label', `${enLigne(v) ? 'Retirer du catalogue' : 'Publier dans le catalogue'} : ${nomV(v)}`);
      b.addEventListener('click', () => {
        v.publie = !enLigne(v);
        journal('Stock', v.publie ? 'Publié au catalogue' : 'Retiré du catalogue', `${v.id.toUpperCase()} · ${nomV(v)}`);
        rendreAccueil();
        rendreCatalogue();
        rendreEspace(page);
      });
      d.append(b);
    }
    return d;
  }

  /* Suppression d'une ligne du stock (responsables, confirmation en deux clics) */
  let aSupprimer = null;
  let minuteurSuppr = null;
  function boutonSuppression(v) {
    const confirme = aSupprimer === v.id;
    const b = el('button', 'btn btn-mini ' + (confirme ? 'btn-danger' : 'btn-ghost'), confirme ? 'Confirmer' : 'Supprimer');
    b.type = 'button';
    b.setAttribute('aria-label', (confirme ? 'Confirmer la suppression de ' : 'Supprimer du stock : ') + `${nomV(v)} (${v.id.toUpperCase()})`);
    b.addEventListener('click', () => {
      clearTimeout(minuteurSuppr);
      if (aSupprimer !== v.id) {
        aSupprimer = v.id;
        minuteurSuppr = setTimeout(() => { aSupprimer = null; if (pageEspace() === 'espace-stock') rendreEspace('espace-stock'); }, 5000);
      } else {
        aSupprimer = null;
        const i = vehicules.indexOf(v);
        if (i >= 0) vehicules.splice(i, 1);
        journal('Stock', 'Véhicule supprimé', `${v.id.toUpperCase()} · ${nomV(v)}`);
        remplirCategories();
        rendreAccueil();
        rendreCatalogue();
      }
      rendreEspace('espace-stock');
      if (!aSupprimer) {
        const n = $('#esp-corps .panneau-tete');
        if (n) {
          const m = el('p', 'panneau-note pv-compte', `${v.id.toUpperCase()} supprimé du stock`);
          n.querySelector('.panneau-titre').after(m);
        }
      }
    });
    return b;
  }

  /* Rachat → stock (non publié tant qu'un responsable ne clique pas sur Publier) */
  const CAT_CATALOGUE = {
    super: 'super', sports: 'sportive', muscle: 'sportive', coupes: 'coupe', classics: 'coupe', sedans: 'berline', compacts: 'berline',
    suvs: 'suv', offroad: 'suv', motorcycles: 'moto', cycles: 'moto', vans: 'utilitaire', utility: 'utilitaire',
    commercial: 'utilitaire', industrial: 'utilitaire', service: 'utilitaire', autres: 'autre',
  };
  const prochaineRef = () => 'cc-' + String(vehicules.reduce((m, v) => Math.max(m, Number((v.id.match(/\d+/) || [0])[0])), 0) + 1).padStart(3, '0');
  const dateArrivee = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  /* Ajout manuel au stock (direction) : véhicules déjà possédés, sans dépense (ils étaient là avant la compta) */
  function formulaireStock() {
    chargerPrixNeufs();
    const f = el('form', 'panneau form-vente');
    f.noValidate = true;
    const tete = el('div', 'panneau-tete');
    tete.append(el('h2', 'panneau-titre', 'Ajouter un véhicule au stock'));
    const g = el('div', 'form-grille');
    const champ = (id, label, input) => { input.id = id; const d = el('div', 'champ'); const l = el('label', null, label); l.htmlFor = id; d.append(l, input); g.append(d); return input; };
    const modele = champ('st-modele', 'Modèle', el('input'));
    modele.setAttribute('list', 'st-liste');
    modele.autocomplete = 'off';
    const liste = el('datalist');
    liste.id = 'st-liste';
    (prixNeufsCache || []).forEach(x => { const o = el('option', null, prix.format(x.p)); o.value = x.n; liste.append(o); });
    g.append(liste);
    const type = champ('st-type', 'Type', el('select'));
    type.innerHTML = '<option value="occasion">Occasion</option><option value="neuf">Neuf</option>';
    const vente = champ('st-prix', 'Prix de vente ($)', el('input'));
    const achat = champ('st-achat', "Prix d'achat ($, facultatif)", el('input'));
    [vente, achat].forEach(i => { i.type = 'number'; i.min = '0'; i.step = '100'; i.inputMode = 'numeric'; });
    const plaque = champ('st-plaque', 'Plaque (facultatif)', el('input'));
    plaque.className = 'plaque-input';
    plaque.maxLength = 8;
    plaque.addEventListener('input', () => { plaque.value = plaque.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ''); });
    const pub = el('label', 'case');
    const coche = el('input');
    coche.type = 'checkbox';
    coche.checked = true;
    pub.append(coche, ' Publier dans le catalogue');
    g.append(pub);
    const remplir = () => {
      const ref = (prixNeufsCache || []).find(x => x.n.toLowerCase() === modele.value.trim().toLowerCase());
      if (ref && type.value === 'neuf') { if (!vente.value) vente.value = ref.p; if (!achat.value) achat.value = Math.round(ref.p * PART_COUT_CONCESSION / 100); }
    };
    modele.addEventListener('change', remplir);
    type.addEventListener('change', remplir);
    const msg = el('p', 'form-message');
    msg.id = 'st-message';
    msg.setAttribute('role', 'status');
    const b = el('button', 'btn', 'Ajouter au stock');
    b.type = 'submit';
    const pied = el('div', 'form-pied');
    pied.append(msg, b);
    f.append(tete, g, el('p', 'calcul-detail panneau-pied', "Pour le stock que le Caracas possède déjà : aucune dépense n'est créée. Les rachats, eux, passent par la page Rachats."), pied);
    f.addEventListener('submit', ev => {
      ev.preventDefault();
      msg.className = 'form-message erreur';
      if (modele.value.trim().length < 2 || !(Number(vente.value) > 0)) { msg.textContent = 'Indique au moins le modèle et le prix de vente.'; return; }
      const ref = (prixNeufsCache || []).find(x => x.n.toLowerCase() === modele.value.trim().toLowerCase());
      const v = {
        id: prochaineRef(), type: type.value, marque: '', modele: modele.value.trim(),
        categorie: ref ? CAT_CATALOGUE[ref.c] || 'autre' : 'autre',
        prix: Math.round(Number(vente.value)), prixAchat: Number(achat.value) > 0 ? Math.round(Number(achat.value)) : undefined,
        plaque: plaque.value.trim() || undefined, etat: '', image: '',
        description: type.value === 'neuf' ? 'Véhicule neuf disponible au Caracas.' : "Véhicule d'occasion du Caracas.",
        statut: 'disponible', en_avant: false, stockInitial: true, publie: coche.checked, arrivee: dateArrivee(new Date()),
      };
      vehicules.push(v);
      journal('Stock', 'Véhicule ajouté manuellement', `${v.id.toUpperCase()} · ${v.modele} · ${TYPE[v.type]} · ${prix.format(v.prix)}`);
      remplirCategories();
      rendreAccueil();
      rendreCatalogue();
      rendreEspace('espace-stock');
      const m = $('#st-message');
      if (m) { m.className = 'form-message succes'; m.textContent = `${v.modele} ajouté au stock (réf. ${v.id.toUpperCase()})${v.publie ? ' et publié au catalogue' : ''}.`; }
    });
    return f;
  }
  function mettreEnStock(r) {
    const max = vehicules.reduce((m, v) => Math.max(m, Number((v.id.match(/\d+/) || [0])[0])), 0);
    const ref = (prixNeufsCache || []).find(x => x.n.toLowerCase() === r.modele.toLowerCase());
    const aujourdhui = r.date || new Date();
    const v = {
      id: 'cc-' + String(max + 1).padStart(3, '0'),
      type: 'occasion', marque: '', modele: r.modele,
      categorie: ref ? CAT_CATALOGUE[ref.c] || 'autre' : 'autre',
      prix: r.prix, prixAchat: r.prixAchat, etat: '', image: r.photo || '',
      description: r.options && r.options.length ? 'Véhicule repris par le Caracas. Customisation : ' + r.options.join(', ') + '.' : 'Véhicule repris par le Caracas.',
      statut: 'disponible', en_avant: false, rachat: true, publie: false,
      arrivee: `${aujourdhui.getFullYear()}-${String(aujourdhui.getMonth() + 1).padStart(2, '0')}-${String(aujourdhui.getDate()).padStart(2, '0')}`,
    };
    vehicules.push(v);
    remplirCategories();
    rendreAccueil();
    rendreCatalogue();
    return v;
  }

  /* Formulaire du registre des rachats (managers et +) */
  function formulaireRachat() {
    const f = $('#tpl-rachat').content.firstElementChild.cloneNode(true);
    const client = f.querySelector('#ra-client');
    const modele = f.querySelector('#ra-modele');
    const montant = f.querySelector('#ra-prix');
    const plaque = f.querySelector('#ra-plaque');
    const msg = f.querySelector('#ra-message');
    const revente = f.querySelector('#ra-revente');
    const aideMarge = f.querySelector('#ra-marge');
    let optionsCalc = [];
    let reventeManuelle = false;
    const majMarge = () => {
      const a = Number(montant.value);
      const v = Number(revente.value);
      aideMarge.textContent = a > 0 && v > 0 ? `Marge : ${texteMarge(v, a)}` : `Prix de revente calculé avec ${MARGE_REVENTE} % de marge.`;
    };
    montant.addEventListener('input', () => {
      if (!reventeManuelle) revente.value = Number(montant.value) > 0 ? prixAvecMarge(Number(montant.value)) : '';
      majMarge();
    });
    revente.addEventListener('input', () => { reventeManuelle = revente.value !== ''; majMarge(); });
    majMarge();
    f.querySelector('#ra-reprendre').addEventListener('click', () => {
      if (!devisCourant) {
        msg.className = 'form-message erreur';
        msg.textContent = "Fais d'abord le calcul dans le calculateur au-dessus.";
        return;
      }
      if (devisCourant.vehicule) modele.value = devisCourant.vehicule;
      montant.value = devisCourant.prix;
      revente.value = prixAvecMarge(devisCourant.prix);
      reventeManuelle = false;
      majMarge();
      optionsCalc = devisCourant.options;
      msg.className = 'form-message';
      msg.textContent = 'Calcul repris : modèle, prix de rachat et prix de revente avec la marge. Ajuste si besoin.';
    });
    const photo = f.querySelector('#ra-photo');
    const apercu = f.querySelector('#ra-apercu');
    const zone = f.querySelector('#ra-zone');
    let photoUrl = null;
    f.querySelector('#ra-retirer').addEventListener('click', () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoUrl = null;
      photo.value = '';
      zone.hidden = true;
      photo.focus();
    });
    photo.addEventListener('change', () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoUrl = null;
      zone.hidden = true;
      const fichier = photo.files[0];
      if (!fichier) return;
      const ok = fichier.type.startsWith('image/') && fichier.size <= 10 * 1024 * 1024;
      photo.setAttribute('aria-invalid', String(!ok));
      if (!ok) {
        msg.className = 'form-message erreur';
        msg.textContent = 'La photo doit être une image de 10 Mo maximum.';
        photo.value = '';
        return;
      }
      msg.textContent = '';
      photoUrl = URL.createObjectURL(fichier);
      apercu.src = photoUrl;
      zone.hidden = false;
    });
    chargerPrixNeufs().then(d => {
      f.querySelector('#ra-liste').replaceChildren(...d.map(x => { const o = el('option'); o.value = x.n; return o; }));
    });
    plaque.addEventListener('input', () => { plaque.value = plaque.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ''); });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const manque = [];
      const verifier = (champ, ok, nom) => {
        champ.setAttribute('aria-invalid', String(!ok));
        if (!ok) manque.push(nom);
      };
      verifier(client, client.value.trim().length >= 3, 'le nom du client');
      verifier(modele, modele.value.trim().length >= 2, 'le modèle');
      verifier(montant, Number(montant.value) > 0, 'le prix de rachat');
      verifier(plaque, /^[A-Z0-9 ]{2,8}$/.test(plaque.value.trim()), 'la plaque (2 à 8 lettres ou chiffres)');
      verifier(revente, Number(revente.value) > 0, 'le prix de revente');
      if (manque.length) {
        msg.className = 'form-message erreur';
        msg.textContent = 'À compléter : ' + manque.join(', ') + '.';
        f.querySelector('[aria-invalid="true"]').focus();
        return;
      }
      const nomModele = modele.value.trim();
      const v = mettreEnStock({ modele: nomModele, prixAchat: Number(montant.value), prix: Number(revente.value), plaque: plaque.value.trim(), photo: photoUrl, options: optionsCalc });
      rachatsApercu.unshift({ date: new Date(), client: client.value.trim(), modele: nomModele, prix: Number(montant.value), revente: v.prix, ref: v.id, plaque: plaque.value.trim(), par: identifiant, photo: photoUrl });
      depensesApercu.unshift({
        n: depensesApercu.length, date: new Date(), categorie: CAT_RACHAT,
        libelle: `${nomModele} · ${plaque.value.trim()} · ${client.value.trim()}`,
        montant: Number(montant.value), par: identifiant, lien: v.id,
      });
      journal('Rachats', 'Nouveau rachat', `${nomModele} · ${plaque.value.trim()} · ${client.value.trim()} · ${prix.format(Number(montant.value))} (${v.id.toUpperCase()})`);
      rendreEspace('espace-rachats');
      const m = $('#ra-message');
      m.className = 'form-message succes';
      m.textContent = sansApercu(`Rachat enregistré et ajouté au stock (réf. ${v.id.toUpperCase()}). Le prix de rachat est ajouté aux dépenses (non déductible). Il n'est pas encore dans le catalogue : clique sur « Publier » quand il est prêt. Aperçu : tout disparaît si la page est rechargée.`);
    });
    return f;
  }

  /* Formulaire de vente de contrat : prix = 5 000 $ + 10 % du prix neuf du véhicule */
  const CONTRAT_BASE = 5000;
  const CONTRAT_TAUX = 10;
  function formulaireContrat() {
    const f = $('#tpl-contrat').content.firstElementChild.cloneNode(true);
    const client = f.querySelector('#co-client');
    const veh = f.querySelector('#co-vehicule');
    const montant = f.querySelector('#co-prix');
    const detail = f.querySelector('#co-detail');
    const msg = f.querySelector('#co-message');
    detail.hidden = !estResponsable();
    let base = [];
    let choisi = null;
    chargerPrixNeufs().then(d => {
      base = d;
      f.querySelector('#co-liste').replaceChildren(...d.map(x => {
        const o = el('option', null, `${CAT_PRIX[x.c] || x.c} · neuf ${prix.format(x.p)}`);
        o.value = x.n;
        return o;
      }));
    });
    const calculer = () => {
      const saisie = veh.value.trim().toLowerCase();
      choisi = base.find(x => x.n.toLowerCase() === saisie) || null;
      if (!choisi) {
        montant.value = '';
        detail.textContent = '';
        return;
      }
      const p = CONTRAT_BASE + Math.round(choisi.p * CONTRAT_TAUX / 100);
      montant.value = prix.format(p);
      montant.dataset.valeur = p;
      detail.textContent = `${prix.format(CONTRAT_BASE)} + ${CONTRAT_TAUX} % de ${prix.format(choisi.p)} = ${prix.format(p)}`;
    };
    veh.addEventListener('input', calculer);
    f.addEventListener('submit', e => {
      e.preventDefault();
      calculer();
      const manque = [];
      const verifier = (champ, ok, nom) => {
        champ.setAttribute('aria-invalid', String(!ok));
        if (!ok) manque.push(nom);
      };
      verifier(client, client.value.trim().length >= 3, 'le nom du client');
      verifier(veh, !!choisi, 'un véhicule de la liste');
      if (manque.length) {
        msg.className = 'form-message erreur';
        msg.textContent = 'À compléter : ' + manque.join(', ') + '.';
        f.querySelector('[aria-invalid="true"]').focus();
        return;
      }
      contratsApercu.unshift({ vendeur: identifiant, poste: posteApercu, benefice: Number(montant.dataset.valeur), cout: null, source: 'contrat (sans coût)', date: new Date(), client: client.value.trim(), vehicule: choisi.n, prix: Number(montant.dataset.valeur), statut: 'attente' });
      journal('Ventes', 'Nouveau contrat', `${choisi.n} · ${client.value.trim()} · ${prix.format(Number(montant.dataset.valeur))}`);
      rendreEspace('espace-ventes');
      const m = $('#co-message');
      m.className = 'form-message succes';
      m.textContent = sansApercu("Contrat ajouté au registre, en attente de validation par un responsable. Aperçu : il disparaît si la page est rechargée.");
    });
    return f;
  }

  /* Formulaire de vente (aperçu : les ventes restent en mémoire, rien n'est enregistré) */
  function formulaireVente() {
    chargerPrixNeufs(); /* nécessaire pour le coût concession (bénéfice des ventes) */
    const f = $('#tpl-vente').content.firstElementChild.cloneNode(true);
    const client = f.querySelector('#v-client');
    const sel = f.querySelector('#v-vehicule');
    const plaque = f.querySelector('#v-plaque');
    const montant = f.querySelector('#v-prix');
    const msg = f.querySelector('#v-message');
    const type = f.querySelector('#v-type');
    const aide = f.querySelector('#v-aide');
    const majAide = () => {
      const c = beneficeVente(sel.value, Number(montant.value) || 0, type.value);
      aide.textContent = type.value === 'neuf'
        ? (sel.value.trim() ? `Coût d'achat pour le garage : ${prix.format(c.cout)} (${c.source}). Il sera ajouté automatiquement aux dépenses à la validation de la vente.` : 'Neuf : le coût d\'achat (85 % du prix neuf) est ajouté aux dépenses à la validation.')
        : "Occasion : le prix de rachat est déjà dans les dépenses, aucune dépense n'est ajoutée.";
    };
    const nomVehicule = nomV;
    const liste = f.querySelector('#v-vehicules-liste');
    vehicules.filter(v => v.statut !== 'vendu').forEach(v => {
      const o = el('option', null, `${TYPE[v.type]} · ${prix.format(v.prix)}`);
      o.value = nomVehicule(v);
      liste.append(o);
    });
    let prixAuto = '';
    sel.addEventListener('input', () => {
      const saisie = sel.value.trim().toLowerCase();
      const v = vehicules.find(x => x.statut !== 'vendu' && nomVehicule(x).toLowerCase() === saisie);
      if (v && (!montant.value || montant.value === prixAuto)) {
        montant.value = v.prix;
        prixAuto = String(v.prix);
      }
      if (v) type.value = v.type === 'neuf' ? 'neuf' : 'occasion';
      majAide();
    });
    type.addEventListener('change', majAide);
    montant.addEventListener('input', majAide);
    majAide();
    plaque.addEventListener('input', () => { plaque.value = plaque.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ''); });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const manque = [];
      const verifier = (champ, ok, nom) => {
        champ.setAttribute('aria-invalid', String(!ok));
        if (!ok) manque.push(nom);
      };
      verifier(client, client.value.trim().length >= 3, 'le nom du client');
      verifier(sel, sel.value.trim().length >= 2, 'le véhicule');
      verifier(plaque, /^[A-Z0-9 ]{2,8}$/.test(plaque.value.trim()), 'la plaque (2 à 8 lettres ou chiffres)');
      verifier(montant, Number(montant.value) > 0, 'le prix');
      if (manque.length) {
        msg.className = 'form-message erreur';
        msg.textContent = 'À compléter : ' + manque.join(', ') + '.';
        f.querySelector('[aria-invalid="true"]').focus();
        return;
      }
      const cout = beneficeVente(sel.value, Number(montant.value), type.value);
      ventesApercu.unshift({ categorie: type.value, vendeur: identifiant, poste: posteApercu, date: new Date(), client: client.value.trim(), vehicule: sel.value.trim(), plaque: plaque.value.trim(), prix: Number(montant.value), cout: cout.cout, source: cout.source, benefice: Number(montant.value) - cout.cout, statut: 'attente' });
      journal('Ventes', 'Nouvelle vente', `${sel.value.trim()} · ${client.value.trim()} · ${prix.format(Number(montant.value))}`);
      rendreEspace('espace-ventes');
      const m = $('#v-message');
      m.className = 'form-message succes';
      m.textContent = sansApercu("Vente ajoutée au registre, en attente de validation par un responsable. Aperçu : elle n'est pas encore enregistrée et disparaît si la page est rechargée.");
    });
    return f;
  }
  /* Comptabilité : grand livre construit à partir des ventes/contrats validés, des dépenses et des écritures manuelles */
  const ecrituresApercu = [];
  const CATEGORIES_ECRITURES = ['Solde de départ', 'Apport', 'Vente de pièces', 'Remboursement', 'Retrait', 'Régularisation'];
  let periodeCompta = 'semaine';
  let ecritureASupprimer = null;
  function periodeCompte() {
    if (periodeCompta === 'semaine') return periodeSemaine(0);
    if (periodeCompta === 'precedente') return periodeSemaine(-1);
    if (periodeCompta === 'mois') {
      const m = new Date();
      const debut = new Date(m.getFullYear(), m.getMonth(), 1);
      return { debut, fin: new Date(m.getFullYear(), m.getMonth() + 1, 1), libelle: debut.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) };
    }
    return { debut: new Date(0), fin: new Date(8.64e15), libelle: 'depuis le début' };
  }
  /* Toutes les écritures dans l'ordre chronologique, avec le solde cumulé */
  function grandLivre() {
    calculerDeductible();
    const l = [
      ...ventesApercu.filter(v => v.statut === 'validee').map(v => ({ date: v.date, libelle: `${v.vehicule}${v.plaque ? ' · ' + v.plaque : ''} · ${v.client}`, categorie: 'Vente véhicule', origine: 'Vente', entree: v.prix, sortie: 0, par: v.vendeur })),
      ...contratsApercu.filter(v => v.statut === 'validee').map(v => ({ date: v.date, libelle: `Contrat ${v.vehicule} · ${v.client}`, categorie: 'Vente de contrat', origine: 'Contrat', entree: v.prix, sortie: 0, par: v.vendeur })),
      ...depensesApercu.map(x => ({ date: x.date, libelle: x.libelle, categorie: x.categorie, origine: x.lien === 'paie' ? 'Paie' : x.lien === 'neuf' ? 'Achat neuf' : x.lien ? 'Rachat' : 'Dépense', entree: 0, sortie: x.montant, deductible: x.deductible || 0, par: x.par })),
      ...ecrituresApercu.map(x => ({ date: x.date, libelle: x.libelle, categorie: x.categorie, origine: x.lien === 'subvention' ? 'Subvention' : 'Écriture', entree: x.sens === 'entree' ? x.montant : 0, sortie: x.sens === 'sortie' ? x.montant : 0, par: x.par, ecriture: x })),
    ].sort((a, b) => a.date - b.date);
    let solde = 0;
    l.forEach(x => { solde += x.entree - x.sortie; x.solde = solde; });
    return l;
  }
  const totaux = l => l.reduce((t, x) => ({ entree: t.entree + x.entree, sortie: t.sortie + x.sortie, deductible: t.deductible + (x.deductible || 0) }), { entree: 0, sortie: 0, deductible: 0 });
  const montantSigne = m => el('span', m < 0 ? 'montant-negatif' : null, prix.format(m));

  function formulaireEcriture() {
    const f = $('#tpl-ecriture').content.firstElementChild.cloneNode(true);
    const date = f.querySelector('#ec-date');
    const sens = f.querySelector('#ec-sens');
    const cat = f.querySelector('#ec-cat');
    const libelle = f.querySelector('#ec-libelle');
    const montant = f.querySelector('#ec-montant');
    const msg = f.querySelector('#ec-message');
    date.value = new Date().toISOString().slice(0, 10);
    f.querySelector('#ec-liste').replaceChildren(...CATEGORIES_ECRITURES.map(c => { const o = el('option'); o.value = c; return o; }));
    f.addEventListener('submit', e => {
      e.preventDefault();
      const manque = [];
      const verifier = (champ, ok, nom) => {
        champ.setAttribute('aria-invalid', String(!ok));
        if (!ok) manque.push(nom);
      };
      verifier(date, !!date.value, 'la date');
      verifier(cat, cat.value.trim().length >= 2, 'la catégorie');
      verifier(libelle, libelle.value.trim().length >= 2, 'le libellé');
      verifier(montant, Number(montant.value) > 0, 'le montant');
      if (manque.length) {
        msg.className = 'form-message erreur';
        msg.textContent = 'À compléter : ' + manque.join(', ') + '.';
        f.querySelector('[aria-invalid="true"]').focus();
        return;
      }
      ecrituresApercu.push({
        date: new Date(date.value + 'T12:00'), sens: sens.value, categorie: cat.value.trim(),
        libelle: libelle.value.trim(), montant: Math.round(Number(montant.value)), par: identifiant,
      });
      journal('Comptabilité', 'Écriture ajoutée', `${sens.value === 'entree' ? 'Entrée' : 'Sortie'} · ${libelle.value.trim()} · ${prix.format(Math.round(Number(montant.value)))}`);
      rendreEspace('espace-compta');
      const m = $('#ec-message');
      m.className = 'form-message succes';
      m.textContent = sansApercu("Écriture ajoutée. Aperçu : elle disparaît si la page est rechargée.");
    });
    return f;
  }

  /* Fichiers proposés au visiteur : téléchargement claude.ai, sinon fenêtre de secours (copier le contenu ou lien direct) */
  const dlgExport = $('#dlg-export');
  let exportEnCours = null;
  $('#export-fermer').addEventListener('click', () => dlgExport.close());
  $('#export-copier').addEventListener('click', async () => {
    const zone = $('#export-texte');
    const m = $('#export-message');
    let ok = false;
    try { await navigator.clipboard.writeText(zone.value); ok = true; } catch (e) { /* presse-papiers bloqué */ }
    if (!ok) {
      zone.focus();
      zone.select();
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    }
    m.className = 'form-message ' + (ok ? 'succes' : 'erreur');
    m.textContent = ok ? exportEnCours.copie : 'Copie automatique bloquée : le texte est sélectionné, fais Ctrl+C.';
  });
  $('#export-fichier').addEventListener('click', () => {
    if (!exportEnCours) return;
    const a = el('a');
    a.href = `data:${exportEnCours.type};charset=utf-8,` + encodeURIComponent(exportEnCours.contenu);
    a.download = exportEnCours.nom;
    document.body.append(a);
    a.click();
    a.remove();
    const m = $('#export-message');
    m.className = 'form-message';
    m.textContent = "Si rien ne se télécharge, utilise « Copier ».";
  });
  /* o : { nom, contenu, type, titre, aide, texte (version à copier), copie (message après copie) } */
  async function offrirFichier(o, b, msg) {
    if (b) b.disabled = true;
    if (msg) msg.textContent = '';
    try {
      const r = await enregistrerFichier(new Blob([o.contenu], { type: o.type }), o.nom);
      if (msg) msg.textContent = r && r.status === 'saved' ? 'Fichier enregistré.' : '';
    } catch (err) {
      if (err && err.code === 'declined') { if (msg) msg.textContent = 'Téléchargement annulé.'; } else if (err && err.code === 'rate_limited') { if (msg) msg.textContent = 'Une fenêtre de téléchargement est déjà ouverte.'; } else {
        exportEnCours = o;
        $('#export-fichier').hidden = false;
        $('#export-titre').textContent = o.titre;
        $('#export-aide').textContent = o.aide;
        $('#export-texte').value = o.texte;
        $('#export-message').textContent = '';
        dlgExport.showModal();
      }
    } finally {
      if (b) b.disabled = false;
    }
  }
  /* Tableau → CSV (séparateur ; pour Excel) ou texte tabulé à coller dans un tableur */
  function offrirTableau(titre, nom, entetes, donnees, b, msg) {
    const champ = v => /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
    const csv = [entetes, ...donnees].map(l => l.map(champ).join(';')).join('\r\n');
    const tsv = [entetes, ...donnees].map(l => l.map(v => String(v).replace(/[\t\r\n]+/g, ' ')).join('\t')).join('\n');
    return offrirFichier({
      nom, contenu: '\ufeff' + csv, type: 'text/csv', titre, texte: tsv, copie: 'Tableau copié. Colle-le dans ton tableur (Ctrl+V).',
      aide: "Le téléchargement n'est pas disponible ici. Copie le tableau puis colle-le dans Google Sheets ou Excel (cellule A1) : les colonnes se placent toutes seules.",
    }, b, msg);
  }
  const exporterGrandLivre = (lignes, per, b, msg) => offrirTableau('Exporter le grand livre',
    `caracas-grand-livre-${per.debut.getTime() ? per.debut.toISOString().slice(0, 10) : 'complet'}.csv`,
    ['Date', 'Libellé', 'Catégorie', 'Origine', 'Entrée', 'Sortie', 'Solde', 'Par'],
    lignes.map(x => [x.date.toLocaleDateString('fr-FR'), x.libelle, x.categorie, x.origine, x.entree || '', x.sortie || '', x.solde, x.par || '']), b, msg);

  /* Résumé de la période : ventes, paies, rachats, badgeuse */
  function carteResume(titre, lignes, page, avant) {
    const dl = el('dl', 'specs resume-specs');
    lignes.forEach(([dt, dd]) => {
      const d = el('div');
      d.append(el('dt', null, dt), el('dd', null, dd));
      dl.append(d);
    });
    return panneauAvec(titre, dl, page ? lienEspace('Détail', page, avant) : null);
  }
  const avantLien = { 'espace-ventes': () => { sousVentes = 'vehicule'; }, 'espace-paie': () => { ongletPaie = 'employes'; } };
  function grilleResume(liste, liens) {
    const g = el('div', 'resume-grille');
    liste.forEach(b => g.append(carteResume(b.titre, b.lignes, liens ? b.page : null, avantLien[b.page])));
    return g;
  }
  const resumeCompta = per => grilleResume(donneesResume(per), true);
  function donneesResume(per) {
    const dans = d => d >= per.debut && d < per.fin;
    const compte = (l, s) => l.filter(v => v.statut === s).length;
    const somme = (l, k) => l.reduce((t, x) => t + (x[k] || 0), 0);

    const ventes = ventesApercu.filter(v => dans(v.date));
    const contrats = contratsApercu.filter(v => dans(v.date));
    const vOk = ventes.filter(v => v.statut === 'validee');
    const cOk = contrats.filter(v => v.statut === 'validee');

    const fiches = calculerPaie(per);
    const verse = depensesApercu.filter(x => x.lien === 'paie' && dans(x.date));

    const rachats = rachatsApercu.filter(r => dans(r.date));
    const enLigneR = rachats.filter(r => { const v = vehicules.find(x => x.id === r.ref); return v && enLigne(v); }).length;

    const pts = pointagesApercu.filter(x => dans(x.debut));
    const ms = pts.reduce((t, x) => t + ((x.fin || new Date()) - x.debut), 0);
    const noms = new Set(pts.map(x => x.nom.toLowerCase()));

    const bloc = (titre, lignes, page) => ({ titre, lignes, page });
    return [
      bloc('Ventes', [
        ['Véhicules vendus', `${vOk.length} · ${prix.format(somme(vOk, 'prix'))}`],
        ['Bénéfice véhicules', prix.format(somme(vOk, 'benefice'))],
        ['Contrats vendus', `${cOk.length} · ${prix.format(somme(cOk, 'prix'))}`],
        ["Chiffre d'affaires", prix.format(somme(vOk, 'prix') + somme(cOk, 'prix'))],
        ['En attente', String(compte(ventes, 'attente') + compte(contrats, 'attente'))],
        ['Refusées', String(compte(ventes, 'refusee') + compte(contrats, 'refusee'))],
      ], 'espace-ventes'),
      bloc('Paies', [
        ['Salaires horaires', prix.format(somme(fiches, 'salaireHoraire'))],
        ['Commissions', prix.format(somme(fiches, 'commission'))],
        ['Masse salariale due', prix.format(somme(fiches, 'total'))],
        ['Employés concernés', String(fiches.filter(f => f.total > 0).length)],
        ['Versé sur la période', `${prix.format(somme(verse, 'montant'))} (${verse.length})`],
        ['Meilleure paie', fiches.length ? (f => `${f.nom} · ${prix.format(f.total)}`)([...fiches].sort((a, b) => b.total - a.total)[0]) : '—'],
      ], 'espace-paie'),
      bloc('Rachats', [
        ['Véhicules rachetés', String(rachats.length)],
        ['Montant racheté', prix.format(somme(rachats, 'prix'))],
        ['Revente prévue', prix.format(somme(rachats, 'revente'))],
        ['Marge prévue', prix.format(somme(rachats, 'revente') - somme(rachats, 'prix'))],
        ['Publiés au catalogue', `${enLigneR} / ${rachats.length}`],
        ['Rachat moyen', rachats.length ? prix.format(Math.round(somme(rachats, 'prix') / rachats.length)) : '—'],
      ], 'espace-rachats'),
      bloc('Badgeuse', [
        ['Services', String(pts.length)],
        ['Heures pointées', fmtDuree(ms)],
        ['Employés ayant badgé', String(noms.size)],
        ['Coût des heures', prix.format(pts.reduce((t, x) => t + gain(x), 0))],
        ['Subvention État', (s => `${prix.format(s.total)} · ${fmtDuree(s.ms)}`)(subventionPeriode(per))],
        ['Service moyen', pts.length ? fmtDuree(ms / pts.length) : '—'],
        ['En service maintenant', String(pointagesApercu.filter(x => !x.fin).length)],
      ], 'espace-badgeuse'),
    ];
  }

  /* Subvention de l'État sur la badgeuse : les 15 premières heures badgées de chaque employé par semaine,
     au taux horaire du grade, remboursées à l'entreprise (entrée « Subvention État » une fois reçue) */
  const SUBVENTION_HEURES = 15;
  const CAT_SUBVENTION = 'Subvention État (badgeuse)';
  function subventionSemaine(per) {
    const par = {};
    pointagesApercu.filter(x => x.debut >= per.debut && x.debut < per.fin).sort((a, b) => a.debut - b.debut).forEach(x => {
      const k = x.nom.toLowerCase();
      const e = par[k] = par[k] || { nom: x.nom, ms: 0, msSub: 0, montant: 0 };
      e.ms += dureeMs(x);
      e.msSub += msPaye(x);
      e.montant += gain(x);
    });
    const liste = Object.values(par).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    return {
      liste, total: liste.reduce((t, e) => t + e.montant, 0), ms: liste.reduce((t, e) => t + e.msSub, 0),
      recu: ecrituresApercu.find(x => x.lien === 'subvention' && x.cle === per.cle),
    };
  }
  /* Total des semaines qui commencent dans la période */
  function subventionPeriode(per) {
    return semainesConnues().filter(p => p.debut >= per.debut && p.debut < per.fin).map(subventionSemaine)
      .reduce((t, s) => ({ total: t.total + s.total, ms: t.ms + s.ms }), { total: 0, ms: 0 });
  }
  function recevoirSubvention(per, par, date, demo) {
    const s = subventionSemaine(per);
    if (s.recu || !s.total) return;
    ecrituresApercu.push({
      ...(demo ? { demo: true } : {}), date: date || new Date(), sens: 'entree', categorie: CAT_SUBVENTION,
      libelle: `Remboursement badgeuse · semaine ${per.libelle} · ${fmtDuree(s.ms)}`, montant: s.total, par, lien: 'subvention', cle: per.cle,
    });
    if (!demo) journal('Comptabilité', "Subvention de l'État reçue", `${per.libelle} · ${prix.format(s.total)}`);
  }
  function panneauSubventions() {
    const lignes = [0, -1, -2, -3, -4].map(d => {
      const per = periodeSemaine(d);
      const s = subventionSemaine(per);
      let etat;
      if (s.recu) etat = el('span', 'pastille pastille-validee', `Reçue le ${jour(s.recu.date)}`);
      else if (d === 0) etat = el('span', 'pastille pastille-attente', 'Semaine en cours');
      else if (!s.total) etat = '—';
      else {
        etat = el('button', 'btn btn-mini', 'Marquer reçue');
        etat.type = 'button';
        etat.setAttribute('aria-label', `Marquer reçue la subvention de la semaine ${per.libelle}`);
        etat.addEventListener('click', () => { recevoirSubvention(per, identifiant); rendreEspace('espace-compta'); });
      }
      return [(d === 0 ? 'En cours · ' : '') + per.libelle.replace(/^du /, ''), fmtDuree(s.ms), String(s.liste.filter(e => e.msSub > 0).length), prix.format(s.total), etat];
    });
    const p = panneauAvec("Subvention de l'État (badgeuse)", tableau(['Semaine', 'Heures subventionnées', 'Employés', 'Montant', 'Remboursement'], lignes, ''));
    p.append(el('p', 'calcul-detail panneau-pied', `Les ${SUBVENTION_HEURES} premières heures badgées de chaque employé par semaine, au taux horaire de son grade. « Marquer reçue » ajoute l'entrée au grand livre.`));
    return p;
  }

  function blocsCompta() {
    const blocs = [];
    blocs.push(boutonsSegment('Période', [['semaine', 'Semaine en cours'], ['precedente', 'Semaine précédente'], ['mois', 'Mois en cours'], ['tout', 'Tout']], periodeCompta,
      id => { periodeCompta = id; ecritureASupprimer = null; rendreEspace('espace-compta'); }, 'periode-onglets'));
    const per = periodeCompte();
    const tout = grandLivre();
    const lignes = tout.filter(x => x.date >= per.debut && x.date < per.fin);
    const t = totaux(lignes);
    const solde = tout.length ? tout[tout.length - 1].solde : 0;
    const attente = [...ventesApercu, ...contratsApercu].filter(v => v.statut === 'attente' && v.date >= per.debut && v.date < per.fin).length;
    blocs.push(el('p', 'calcul-detail paie-periode', `Période : ${per.libelle}. Seules les ventes et contrats validés comptent comme entrées.`));

    const tuiles = el('div', 'tuiles');
    tuiles.append(
      tuile('Entrées', prix.format(t.entree), `${lignes.filter(x => x.entree).length} opération(s)`),
      tuile('Sorties', prix.format(t.sortie), `dont ${prix.format(t.deductible)} déductible`),
      tuile('Résultat', prix.format(t.entree - t.sortie), t.entree - t.sortie >= 0 ? 'Bénéfice' : 'Perte'),
      tuile('Solde de caisse', prix.format(solde), `Au ${new Date().toLocaleDateString('fr-FR')}`),
    );
    blocs.push(tuiles);
    if (attente) blocs.push(el('p', 'note-reserve', `${attente} vente(s) ou contrat(s) en attente de validation sur la période : non comptés.`));
    blocs.push(resumeCompta(per));
    blocs.push(panneauSubventions());

    /* Répartition par catégorie */
    const parCat = {};
    lignes.forEach(x => {
      const k = (x.entree ? 'E|' : 'S|') + x.categorie;
      parCat[k] = (parCat[k] || 0) + x.entree + x.sortie;
    });
    const rep = Object.entries(parCat).sort((a, b) => a[0][0].localeCompare(b[0][0]) || b[1] - a[1]).map(([k, m]) => {
      const entree = k[0] === 'E';
      const base = entree ? t.entree : t.sortie;
      return [k.slice(2), el('span', 'pastille ' + (entree ? 'pastille-validee' : 'pastille-refusee'), entree ? 'Entrée' : 'Sortie'), prix.format(m), (base ? Math.round(m / base * 1000) / 10 : 0).toString().replace('.', ',') + ' %'];
    });
    blocs.push(panneauAvec('Répartition par catégorie', tableau(['Catégorie', 'Sens', 'Montant', 'Part'], rep, 'Aucun mouvement sur la période.')));

    /* Bilan des 5 dernières semaines */
    const semaines = [0, -1, -2, -3, -4].map(d => {
      const p = periodeSemaine(d);
      const s = totaux(tout.filter(x => x.date >= p.debut && x.date < p.fin));
      const fin = tout.filter(x => x.date < p.fin);
      return [d === 0 ? 'En cours' : p.libelle.replace(/^du /, ''), prix.format(s.entree), prix.format(s.sortie), montantSigne(s.entree - s.sortie), prix.format(s.deductible), montantSigne(fin.length ? fin[fin.length - 1].solde : 0)];
    });
    blocs.push(panneauAvec('Bilan par semaine', tableau(['Semaine', 'Entrées', 'Sorties', 'Résultat', 'Déductible', 'Solde fin de semaine'], semaines, '')));

    blocs.push(formulaireEcriture());

    /* Grand livre de la période (plus récent en haut) */
    const exp = el('div', 'actions-ligne');
    const bExp = el('button', 'btn btn-sm btn-ghost', 'Exporter (CSV)');
    bExp.type = 'button';
    const mExp = el('span', 'calcul-detail');
    mExp.setAttribute('role', 'status');
    bExp.disabled = !lignes.length;
    bExp.addEventListener('click', () => exporterGrandLivre(lignes, per, bExp, mExp));
    exp.append(mExp, bExp);
    const gl = [...lignes].reverse().map(x => {
      const cells = [x.date.toLocaleDateString('fr-FR'), x.libelle, x.categorie, x.origine, x.entree ? prix.format(x.entree) : '', x.sortie ? prix.format(x.sortie) : '', montantSigne(x.solde), x.par || '—'];
      if (!x.ecriture || !estPatron()) return [...cells, ''];
      const e = x.ecriture;
      const b = el('button', 'btn btn-mini ' + (ecritureASupprimer === e ? 'btn-danger' : 'btn-ghost'), ecritureASupprimer === e ? 'Confirmer' : 'Supprimer');
      b.type = 'button';
      b.setAttribute('aria-label', `Supprimer l'écriture ${e.libelle}`);
      b.addEventListener('click', () => {
        if (ecritureASupprimer !== e) { ecritureASupprimer = e; } else { ecrituresApercu.splice(ecrituresApercu.indexOf(e), 1); ecritureASupprimer = null; journal('Comptabilité', 'Écriture supprimée', `${e.libelle} · ${prix.format(e.montant)}`); }
        rendreEspace('espace-compta');
      });
      return [...cells, b];
    });
    blocs.push(panneauAvec('Grand livre', tableau(['Date', 'Libellé', 'Catégorie', 'Origine', 'Entrée', 'Sortie', 'Solde', 'Par', ''], gl, 'Aucune écriture sur la période.'), exp));
    return blocs;
  }

  /* Tableau de bord : la semaine en cours en un coup d'œil, et ce qui attend la direction */
  const heure = d => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const lienEspace = (texte, page, avant) => {
    const a = el('a', 'lien', texte);
    a.href = '#' + page;
    if (avant) a.addEventListener('click', avant);
    return a;
  };
  function blocsTableau() {
    const blocs = [];
    const per = periodeSemaine(0);
    const dans = d => d >= per.debut && d < per.fin;
    const resp = estResponsable();
    blocs.push(el('p', 'calcul-detail paie-periode', `Semaine ${per.libelle}.`));

    const moi = calculerPaie(per).find(x => memeNom(x.nom, identifiant)) || vide();
    const service = identifiant && serviceOuvert(identifiant);
    const mesVentes = [...ventesApercu, ...contratsApercu].filter(v => v.vendeur && memeNom(v.vendeur, identifiant) && dans(v.date));
    const enVente = vehicules.filter(v => enLigne(v) && v.statut !== 'vendu').length;
    const t = el('div', 'tuiles');
    t.append(
      tuile('Mon service', service ? 'En service' : 'Hors service', service ? `Depuis ${heure(service.debut)} · ${fmtDuree(new Date() - service.debut)}` : 'Badge dans Badgeuse'),
      tuile('Ma paie de la semaine', prix.format(moi.total), `${fmtDuree(moi.ms)} pointées · ${prix.format(moi.commission)} de commissions`),
      tuile('Mes ventes', String(mesVentes.filter(v => v.statut === 'validee').length), `validée(s) · ${mesVentes.filter(v => v.statut === 'attente').length} en attente`),
      tuile('Véhicules en vente', String(enVente), 'Visibles dans le catalogue'),
    );
    blocs.push(t);

    if (!resp) {
      const l = [...ventesApercu.map(v => ({ ...v, genre: 'Véhicule' })), ...contratsApercu.map(v => ({ ...v, genre: 'Contrat' }))]
        .filter(v => v.vendeur && memeNom(v.vendeur, identifiant)).sort((a, b) => b.date - a.date).slice(0, 8);
      blocs.push(panneauAvec('Mes dernières ventes', tableau(['Date', 'Type', 'Véhicule', 'Client', 'Prix', 'Statut'],
        l.map(v => [fmtDate(v.date), v.genre, v.vehicule, v.client, prix.format(v.prix), celluleStatut(v)]), 'Aucune vente enregistrée à ton nom.')));
      blocs.push(panneauReservations());
      return blocs;
    }

    /* Direction : activité de l'entreprise */
    const ventesOk = [...ventesApercu, ...contratsApercu].filter(v => v.statut === 'validee' && dans(v.date));
    const rachats = rachatsApercu.filter(r => dans(r.date));
    const livre = grandLivre();
    const enService = pointagesApercu.filter(x => !x.fin).sort((a, b) => a.debut - b.debut);
    const te = el('div', 'tuiles');
    te.append(
      tuile("Chiffre d'affaires", prix.format(ventesOk.reduce((s, v) => s + v.prix, 0)), `${ventesOk.length} vente(s) et contrat(s) validé(s)`),
      tuile('Rachats', prix.format(rachats.reduce((s, r) => s + r.prix, 0)), `${rachats.length} véhicule(s) racheté(s)`),
      tuile('Solde de caisse', prix.format(livre.length ? livre[livre.length - 1].solde : 0), 'Voir Comptabilité'),
      tuile('Employés en service', String(enService.length), enService.length ? enService.map(x => x.nom).join(', ') : 'Personne pour le moment'),
    );
    blocs.push(el('h2', 'tableau-sous-titre', "L'entreprise cette semaine"), te);

    /* À traiter */
    const aFaire = [];
    const nVentes = ventesApercu.filter(v => v.statut === 'attente').length;
    const nContrats = contratsApercu.filter(v => v.statut === 'attente').length;
    const nonPublies = vehicules.filter(v => v.rachat && !enLigne(v) && v.statut !== 'vendu').length;
    const precedente = calculerPaie(periodeSemaine(-1)).filter(f => !f.paye && f.total > 0);
    if (nVentes) aFaire.push([`${nVentes} vente(s) à valider`, lienEspace('Ouvrir les ventes', 'espace-ventes', () => { sousVentes = 'vehicule'; })]);
    if (nContrats) aFaire.push([`${nContrats} contrat(s) à valider`, lienEspace('Ouvrir les contrats', 'espace-ventes', () => { sousVentes = 'contrat'; })]);
    if (nonPublies) aFaire.push([`${nonPublies} véhicule(s) racheté(s) pas encore publié(s) au catalogue`, lienEspace('Ouvrir le stock', 'espace-stock')]);
    if (precedente.length) aFaire.push([`${precedente.length} paie(s) de la semaine dernière à régler : ${prix.format(precedente.reduce((s, f) => s + f.total, 0))}`,
      lienEspace('Ouvrir la paie', 'espace-paie', () => { ongletPaie = 'employes'; periodePaie = 'precedentes'; employePaie = null; })]);
    const semPrec = periodeSemaine(-1);
    if (!clotureDe(semPrec.cle) && [...ventesApercu, ...depensesApercu, ...rachatsApercu].some(x => x.date >= semPrec.debut && x.date < semPrec.fin)) {
      aFaire.push([`Semaine précédente (${semPrec.libelle}) pas encore clôturée`, el('span', 'calcul-detail', 'Voir « Clôture de la semaine »')]);
    }
    equipeVisible().map(etatRH).filter(x => x.alerte).forEach(x => aFaire.push([x.alerte, lienEspace('Ouvrir l’équipe', 'espace-equipe')]));
    const nResa = reservationsApercu.filter(x => x.statut === 'nouvelle').length;
    if (nResa) aFaire.push([`${nResa} demande(s) de réservation à traiter`, el('span', 'calcul-detail', 'Voir « Demandes de réservation »')]);
    servicesOublies().forEach(x => aFaire.push([`${x.nom} en service depuis ${fmtDuree(new Date() - x.debut)} : badge de fin oublié ?`, boutonArretOubli(x)]));
    blocs.push(panneauAvec('À traiter', tableau(['Quoi', ''], aFaire, 'Rien à traiter pour le moment.')));
    blocs.push(panneauCloture());
    blocs.push(panneauReservations());

    blocs.push(panneauAvec('En service maintenant', tableau(['Employé', 'Grade', 'Depuis', 'Durée'],
      enService.map(x => [x.nom, (POSTES.find(p => p.id === x.poste) || {}).nom || '—', heure(x.debut), fmtDuree(new Date() - x.debut)]), 'Personne en service.')));

    blocs.push(panneauAvec('Dernières opérations', tableau(['Date', 'Origine', 'Libellé', 'Par', 'Montant'],
      livre.slice(-10).reverse().map(x => [x.date.toLocaleDateString('fr-FR'), x.origine, x.libelle, x.par || '—', montantSigne(x.entree - x.sortie)]),
      'Les ventes, rachats et mouvements de caisse apparaîtront ici.'), lienEspace('Grand livre', 'espace-compta')));
    return blocs;
  }

  /* ---------- Équipe : fiches employés (nom, prénom, téléphone 555-xxxx, RIB, rôle), modifiables par la direction ---------- */
  const equipeApercu = [];
  const nomComplet = e => `${e.prenom} ${e.nom}`;
  const RE_TEL = /^555-\d{4}$/;
  const dlgEmploye = $('#dlg-employe');
  const emChamps = { nom: $('#em-nom'), prenom: $('#em-prenom'), tel: $('#em-tel'), poste: $('#em-role'), rib: $('#em-rib') };
  let employeEdite = null;
  let retraitArme = false;
  const remplirRoles = () => emChamps.poste.replaceChildren(...POSTES.filter(p => !p.cache || posteApercu === 'admin').map(p => { const o = el('option', null, p.nom); o.value = p.id; return o; }));
  emChamps.tel.addEventListener('input', () => {
    const c = emChamps.tel.value.replace(/\D/g, '').slice(0, 7);
    emChamps.tel.value = c.length > 3 ? c.slice(0, 3) + '-' + c.slice(3) : c;
  });
  function ouvrirEmploye(e) {
    employeEdite = e || null;
    retraitArme = false;
    remplirRoles();
    $('#em-titre').textContent = e ? `Modifier ${nomComplet(e)}` : 'Nouvel employé';
    $('#em-valider').textContent = e ? 'Enregistrer' : 'Ajouter';
    const sup = $('#em-supprimer');
    sup.hidden = !(e && estPatron());
    sup.textContent = "Retirer de l'équipe";
    sup.className = 'btn btn-ghost';
    Object.entries(emChamps).forEach(([k, ch]) => { ch.value = e ? e[k] : k === 'poste' ? 'vendeur' : ''; ch.removeAttribute('aria-invalid'); });
    if (!e) emChamps.tel.value = '555-';
    $('#em-message').textContent = '';
    dlgEmploye.showModal();
    emChamps.nom.focus();
  }
  $('#em-annuler').addEventListener('click', () => dlgEmploye.close());
  $('#em-supprimer').addEventListener('click', () => {
    const sup = $('#em-supprimer');
    if (!retraitArme) { retraitArme = true; sup.textContent = 'Confirmer le retrait'; sup.className = 'btn btn-danger'; return; }
    equipeApercu.splice(equipeApercu.indexOf(employeEdite), 1);
    const cpt = comptesApercu.find(x => x.employeId === employeEdite.id);
    if (cpt && EN_LIGNE) rpc('supprimer_utilisateur', { p_user: cpt.userId }).catch(() => {});
    if (cpt) { comptesApercu.splice(comptesApercu.indexOf(cpt), 1); journal('Comptes', 'Compte supprimé', `${cpt.identifiant} (employé retiré de l'équipe)`); }
    journal('Équipe', "Employé retiré de l'équipe", nomComplet(employeEdite));
    dlgEmploye.close();
    rendreEspace('espace-equipe');
  });
  $('#form-employe').addEventListener('submit', ev => {
    ev.preventDefault();
    const v = {
      nom: emChamps.nom.value.trim(), prenom: emChamps.prenom.value.trim(), tel: emChamps.tel.value.trim(),
      poste: emChamps.poste.value, rib: emChamps.rib.value.trim().replace(/\s+/g, ' '),
    };
    const manque = [];
    const verifier = (k, ok, texte) => { emChamps[k].setAttribute('aria-invalid', String(!ok)); if (!ok) manque.push(texte); };
    verifier('nom', v.nom.length >= 2, 'le nom');
    verifier('prenom', v.prenom.length >= 2, 'le prénom');
    verifier('tel', RE_TEL.test(v.tel), 'le téléphone au format 555-xxxx');
    verifier('rib', v.rib.length >= 4, 'le RIB');
    const msg = $('#em-message');
    if (manque.length) {
      msg.className = 'form-message erreur';
      msg.textContent = 'À compléter : ' + manque.join(', ') + '.';
      dlgEmploye.querySelector('[aria-invalid="true"]').focus();
      return;
    }
    const doublon = equipeApercu.find(e => e !== employeEdite && memeNom(nomComplet(e), `${v.prenom} ${v.nom}`));
    if (doublon) {
      msg.className = 'form-message erreur';
      msg.textContent = `${v.prenom} ${v.nom} fait déjà partie de l'équipe.`;
      return;
    }
    if (employeEdite) {
      const LIB = { nom: 'nom', prenom: 'prénom', tel: 'téléphone', poste: 'rôle', rib: 'RIB' };
      const faits = Object.keys(LIB).filter(k => employeEdite[k] !== v[k])
        .map(k => k === 'poste' ? `rôle : ${nomPoste(employeEdite.poste)} → ${nomPoste(v.poste)}` : k === 'rib' ? 'RIB modifié' : `${LIB[k]} : ${employeEdite[k]} → ${v[k]}`);
      if (v.poste !== employeEdite.poste && rang(v.poste) < rang(employeEdite.poste)) { rhDe(employeEdite).aSigner = true; faits.push('promotion : nouveau contrat à signer'); }
      if (faits.length) {
        Object.assign(employeEdite, v, { modifie: { par: identifiant, le: new Date() } });
        journal('Équipe', 'Fiche modifiée', `${nomComplet(employeEdite)} · ${faits.join(' · ')}`);
      }
    } else {
      equipeApercu.push({ id: 'em-' + Date.now().toString(36), ...v, embauche: new Date(), par: identifiant });
      journal('Équipe', 'Employé ajouté', `${v.prenom} ${v.nom} · ${nomPoste(v.poste)} · ${v.tel}`);
    }
    dlgEmploye.close();
    rendreEspace('espace-equipe');
  });

  function blocEquipe() {
    const resp = estResponsable();
    const ordre = id => POSTES.findIndex(p => p.id === id);
    const liste = [...equipeVisible()].sort((a, b) => ordre(a.poste) - ordre(b.poste) || a.nom.localeCompare(b.nom, 'fr'));
    const lignes = liste.map(e => {
      const statut = serviceOuvert(nomComplet(e)) ? el('span', 'pastille pastille-validee', 'En service') : el('span', 'pastille', 'Hors service');
      if (!resp) return [e.nom, e.prenom, nomPoste(e.poste), e.tel, statut];
      const roue = el('button', 'roue roue-mini');
      roue.type = 'button';
      roue.title = 'Modifier la fiche';
      roue.setAttribute('aria-label', `Modifier la fiche de ${nomComplet(e)}`);
      roue.innerHTML = ICONE_ROUE;
      roue.addEventListener('click', () => ouvrirEmploye(e));
      const nom = e.modifie ? el('span', null, e.nom) : e.nom;
      if (e.modifie) {
        nom.append(' ', el('span', 'pastille pastille-attente', 'Modifié'));
        nom.title = `Modifié par ${e.modifie.par} le ${fmtDate(e.modifie.le)}`;
      }
      const c = compteDe(e);
      let compte = c ? (c.actif ? c.identifiant : `${c.identifiant} (désactivé)`) : '—';
      if (!c && peutGerer(e)) {
        compte = el('button', 'btn btn-mini btn-ghost', 'Créer le compte');
        compte.type = 'button';
        compte.addEventListener('click', () => ouvrirCompte(null, e));
      }
      const outils = el('div', 'actions-ligne');
      const dossier = el('button', 'btn btn-mini btn-ghost', 'Dossier');
      dossier.type = 'button';
      dossier.setAttribute('aria-label', `Dossier RH de ${nomComplet(e)}`);
      dossier.addEventListener('click', () => ouvrirRH(e));
      outils.append(roue, dossier);
      return [outils, nom, e.prenom, nomPoste(e.poste), e.tel, el('span', 'rib', e.rib), compte, celluleContrat(e), `${prix.format(tauxDe(e.poste))} / h`, jour(e.embauche), statut];
    });
    let extra = null;
    if (resp) {
      extra = el('button', 'btn btn-sm', '+ Ajouter un employé');
      extra.type = 'button';
      extra.addEventListener('click', () => ouvrirEmploye());
    }
    const cols = resp ? ['', 'Nom', 'Prénom', 'Rôle', 'Téléphone', 'RIB', 'Compte', 'Contrat', 'Taux horaire', 'Embauche', 'Statut'] : ['Nom', 'Prénom', 'Rôle', 'Téléphone', 'Statut'];
    return panneauAvec(`Membres de l'équipe · ${liste.length}`, tableau(cols, lignes, resp ? 'Aucun employé. Ajoute le premier avec « + Ajouter un employé ».' : 'Aucun employé enregistré.'), extra);
  }

  /* ---------- Comptes : un compte de connexion par fiche Équipe ; mot de passe stocké en empreinte SHA-256 salée ---------- */
  const comptesApercu = [];
  const MDP_DEMO = 'caracas';
  const RE_IDENTIFIANT = /^[a-z0-9._-]{3,30}$/i;
  const rang = id => POSTES.findIndex(p => p.id === id);
  const nouveauSel = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
  async function hacher(mdp, sel) {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sel + ':' + mdp));
    return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join('');
  }
  const identifiantPropose = e => `${e.prenom}.${e.nom}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.]+/g, '-');
  const compteDe = e => comptesApercu.find(c => c.employeId === e.id);
  /* La direction gère les comptes des rangs inférieurs ; le patron gère tous les comptes */
  const peutGerer = e => estResponsable() && !(estCache(e) && posteApercu !== 'admin')
    && (niveau(posteApercu) >= 2 ? niveau(posteApercu) >= niveau(e.poste) : niveau(e.poste) === 1 && rang(e.poste) > rang(posteApercu));

  const dlgCompte = $('#dlg-compte');
  const cp = { employe: $('#cp-employe'), id: $('#cp-id'), mdp: $('#cp-mdp'), mdp2: $('#cp-mdp2'), actif: $('#cp-actif') };
  let compteEdite = null;
  let suppCompteArme = false;
  function ouvrirCompte(c, employe) {
    compteEdite = c || null;
    suppCompteArme = false;
    const emp = c ? equipeApercu.find(x => x.id === c.employeId) : employe;
    const libres = equipeApercu.filter(x => !compteDe(x) && peutGerer(x));
    cp.employe.replaceChildren(...(c ? [emp] : libres).map(x => { const o = el('option', null, `${nomComplet(x)} · ${nomPoste(x.poste)}`); o.value = x.id; return o; }));
    if (emp) cp.employe.value = emp.id;
    cp.employe.disabled = !!c;
    cp.id.value = c ? c.identifiant : emp ? identifiantPropose(emp) : libres[0] ? identifiantPropose(libres[0]) : '';
    cp.mdp.value = '';
    cp.mdp2.value = '';
    cp.actif.checked = c ? c.actif : true;
    cp.actif.disabled = !!(c && compteConnecte && c.id === compteConnecte.id);
    $('#cp-actif-zone').hidden = !c;
    $('#cp-mdp-label').textContent = c ? 'Nouveau mot de passe (laisser vide pour le garder)' : 'Mot de passe';
    $('#cp-titre').textContent = c ? `Compte de ${nomComplet(emp)}` : 'Nouveau compte';
    $('#cp-valider').textContent = c ? 'Enregistrer' : 'Créer le compte';
    const sup = $('#cp-supprimer');
    sup.hidden = !(c && estPatron() && !(compteConnecte && c.id === compteConnecte.id));
    sup.textContent = 'Supprimer le compte';
    sup.className = 'btn btn-ghost';
    Object.values(cp).forEach(x => x.removeAttribute('aria-invalid'));
    $('#cp-message').textContent = libres.length || c ? '' : "Tous les employés que tu peux gérer ont déjà un compte. Ajoute d'abord la personne dans Équipe.";
    dlgCompte.showModal();
  }
  cp.employe.addEventListener('change', () => {
    const e = equipeApercu.find(x => x.id === cp.employe.value);
    if (e && !compteEdite) cp.id.value = identifiantPropose(e);
  });
  $('#cp-annuler').addEventListener('click', () => dlgCompte.close());
  $('#cp-supprimer').addEventListener('click', async () => {
    const sup = $('#cp-supprimer');
    if (!suppCompteArme) { suppCompteArme = true; sup.textContent = 'Confirmer la suppression'; sup.className = 'btn btn-danger'; return; }
    if (EN_LIGNE) { try { await rpc('supprimer_utilisateur', { p_user: compteEdite.userId }); } catch (e) { $('#cp-message').className = 'form-message erreur'; $('#cp-message').textContent = e.message; return; } }
    comptesApercu.splice(comptesApercu.indexOf(compteEdite), 1);
    journal('Comptes', 'Compte supprimé', compteEdite.identifiant);
    dlgCompte.close();
    rendreEspace(pageEspace());
  });
  $('#form-compte').addEventListener('submit', async ev => {
    ev.preventDefault();
    const msg = $('#cp-message');
    const emp = equipeApercu.find(x => x.id === cp.employe.value);
    const ident = cp.id.value.trim();
    const mdp = cp.mdp.value;
    const manque = [];
    const verifier = (ch, ok, texte) => { ch.setAttribute('aria-invalid', String(!ok)); if (!ok) manque.push(texte); };
    verifier(cp.employe, !!emp, "l'employé");
    verifier(cp.id, RE_IDENTIFIANT.test(ident), "l'identifiant (3 à 30 caractères : lettres, chiffres, . _ -)");
    verifier(cp.mdp, compteEdite && !mdp ? true : mdp.length >= 6, 'le mot de passe (6 caractères minimum)');
    verifier(cp.mdp2, cp.mdp2.value === mdp, 'la confirmation identique au mot de passe');
    if (manque.length) {
      msg.className = 'form-message erreur';
      msg.textContent = 'À corriger : ' + manque.join(', ') + '.';
      return;
    }
    if (comptesApercu.some(c => c !== compteEdite && c.identifiant.toLowerCase() === ident.toLowerCase())) {
      cp.id.setAttribute('aria-invalid', 'true');
      msg.className = 'form-message erreur';
      msg.textContent = `L'identifiant « ${ident} » est déjà pris.`;
      return;
    }
    if (EN_LIGNE) {
      /* En ligne : l'identifiant et le mot de passe vivent dans Supabase Auth (fonctions du serveur) */
      msg.className = 'form-message';
      msg.textContent = 'Enregistrement…';
      try {
        if (compteEdite) {
          if (compteEdite.identifiant !== ident) await rpc('changer_identifiant', { p_user: compteEdite.userId, p_email: emailDe(ident) });
          if (mdp) { await rpc('definir_mdp', { p_user: compteEdite.userId, p_mdp: mdp }); mdpEnLigne[compteEdite.userId] = mdp; }
        } else {
          const userId = await creerUtilisateur(ident, mdp);
          comptesApercu.push({ id: 'cpt-' + Date.now().toString(36), employeId: emp.id, userId, identifiant: ident, actif: true, creeLe: new Date(), par: identifiant, derniere: null });
          await synchroniser();
          await rpc('definir_mdp', { p_user: userId, p_mdp: mdp });
          mdpEnLigne[userId] = mdp;
          journal('Comptes', 'Compte créé', `${ident} · ${nomComplet(emp)} · ${nomPoste(emp.poste)}`);
          dlgCompte.close();
          rendreEspace(pageEspace());
          return;
        }
      } catch (e) {
        msg.className = 'form-message erreur';
        msg.textContent = e.message;
        return;
      }
    }
    if (compteEdite) {
      const faits = [];
      if (compteEdite.identifiant !== ident) faits.push(`identifiant : ${compteEdite.identifiant} → ${ident}`);
      if (mdp && EN_LIGNE) faits.push('mot de passe réinitialisé');
      else if (mdp) { compteEdite.sel = nouveauSel(); compteEdite.hash = await hacher(mdp, compteEdite.sel); compteEdite.mdp = mdp; faits.push('mot de passe réinitialisé'); }
      if (compteEdite.actif !== cp.actif.checked) faits.push(cp.actif.checked ? 'réactivé' : 'désactivé');
      compteEdite.identifiant = ident;
      compteEdite.actif = cp.actif.checked;
      if (faits.length) journal('Comptes', 'Compte modifié', `${nomComplet(emp)} · ${faits.join(' · ')}`);
    } else {
      const sel = nouveauSel();
      comptesApercu.push({ id: 'cpt-' + Date.now().toString(36), employeId: emp.id, identifiant: ident, sel, hash: await hacher(mdp, sel), mdp, actif: true, creeLe: new Date(), par: identifiant, derniere: null });
      journal('Comptes', 'Compte créé', `${ident} · ${nomComplet(emp)} · ${nomPoste(emp.poste)}`);
    }
    dlgCompte.close();
    rendreEspace(pageEspace());
  });

  function panneauMonCompte() {
    if (!compteConnecte) {
      return el('p', 'note-reserve', comptesApercu.length
        ? 'Tu es en mode aperçu. Déconnecte-toi puis reconnecte-toi avec ton identifiant et ton mot de passe pour utiliser ton compte.'
        : "Mode aperçu : aucun compte n'existe encore. Ajoute les employés dans Équipe, crée leurs comptes ci-dessous, puis reconnecte-toi avec un identifiant et son mot de passe.");
    }
    const c = compteConnecte;
    const emp = equipeApercu.find(x => x.id === c.employeId);
    const dl = el('dl', 'specs resume-specs');
    [['Identifiant', c.identifiant], ['Employé', nomComplet(emp)], ['Rôle', nomPoste(emp.poste)], ['Dernière connexion', c.derniere ? fmtDate(c.derniere) : '—']]
      .forEach(([k, v]) => { const d = el('div'); d.append(el('dt', null, k), el('dd', null, v)); dl.append(d); });
    const f = el('form', 'form-grille');
    f.noValidate = true;
    const champ = (id, label) => {
      const ch = el('div', 'champ');
      const l = el('label', null, label);
      l.htmlFor = id;
      const i = el('input');
      i.id = id;
      i.type = 'password';
      i.autocomplete = id === 'mc-ancien' ? 'current-password' : 'new-password';
      ch.append(l, i);
      f.append(ch);
      return i;
    };
    const ancien = champ('mc-ancien', 'Mot de passe actuel');
    const nouveau = champ('mc-nouveau', 'Nouveau mot de passe');
    const conf = champ('mc-conf', 'Confirmation');
    const pied = el('div', 'form-pied');
    const msg = el('p', 'form-message');
    msg.setAttribute('role', 'status');
    const b = el('button', 'btn btn-sm', 'Changer mon mot de passe');
    b.type = 'submit';
    pied.append(msg, b);
    f.addEventListener('submit', async ev => {
      ev.preventDefault();
      msg.className = 'form-message erreur';
      if (EN_LIGNE) {
        const { error } = await sb.auth.signInWithPassword({ email: emailDe(c.identifiant), password: ancien.value });
        if (error) { msg.textContent = 'Mot de passe actuel incorrect.'; return; }
      } else if ((await hacher(ancien.value, c.sel)) !== c.hash) { msg.textContent = 'Mot de passe actuel incorrect.'; return; }
      if (nouveau.value.length < 6) { msg.textContent = 'Le nouveau mot de passe doit faire 6 caractères minimum.'; return; }
      if (nouveau.value !== conf.value) { msg.textContent = 'La confirmation ne correspond pas.'; return; }
      if (EN_LIGNE) {
        try { await rpc('definir_mdp', { p_user: c.userId, p_mdp: nouveau.value }); } catch (e) { msg.textContent = e.message; return; }
      } else {
        c.sel = nouveauSel();
        c.hash = await hacher(nouveau.value, c.sel);
        c.mdp = nouveau.value;
      }
      journal('Comptes', 'Mot de passe changé', c.identifiant);
      ancien.value = nouveau.value = conf.value = '';
      msg.className = 'form-message succes';
      msg.textContent = 'Mot de passe changé.';
    });
    const p = panneauAvec('Mon compte', dl);
    p.append(f, pied);
    return p;
  }

  function blocsComptes() {
    const blocs = [panneauMonCompte()];
    if (!estResponsable()) return blocs;
    if (!equipeVisible().length) {
      const n = el('p', 'note-reserve', "Aucun employé dans l'Équipe. Les comptes se créent à partir des fiches : ");
      n.append(lienEspace("ajouter des employés dans l'Équipe", 'espace-equipe'), '.');
      blocs.push(n);
      return blocs;
    }
    const liste = [...equipeVisible()].sort((a, b) => rang(a.poste) - rang(b.poste) || a.nom.localeCompare(b.nom, 'fr'));
    const lignes = liste.map(e => {
      const c = compteDe(e);
      const gere = peutGerer(e) || (compteConnecte && c && c.id === compteConnecte.id && estPatron());
      let action = '';
      if (c && gere) {
        action = el('button', 'roue roue-mini');
        action.type = 'button';
        action.title = 'Modifier le compte';
        action.setAttribute('aria-label', `Modifier le compte de ${nomComplet(e)}`);
        action.innerHTML = ICONE_ROUE;
        action.addEventListener('click', () => ouvrirCompte(c));
      }
      const statut = el('div', 'actions-ligne');
      statut.append(!c ? el('span', 'pastille', 'Pas de compte') : c.actif ? el('span', 'pastille pastille-validee', 'Actif') : el('span', 'pastille pastille-refusee', 'Désactivé'));
      if (c && gere && !(compteConnecte && c.id === compteConnecte.id)) {
        const bascule = el('button', 'btn btn-mini' + (c.actif ? ' btn-ghost' : ''), c.actif ? 'Désactiver' : 'Activer');
        bascule.type = 'button';
        bascule.setAttribute('aria-label', `${c.actif ? 'Désactiver' : 'Activer'} le compte de ${nomComplet(e)}`);
        bascule.addEventListener('click', () => {
          c.actif = !c.actif;
          journal('Comptes', c.actif ? 'Compte activé' : 'Compte désactivé', `${c.identifiant} · ${nomComplet(e)}`);
          rendreEspace('espace-comptes');
        });
        statut.append(bascule);
      }
      let ident = c ? c.identifiant : '—';
      if (!c && peutGerer(e)) {
        ident = el('button', 'btn btn-mini', 'Créer le compte');
        ident.type = 'button';
        ident.addEventListener('click', () => ouvrirCompte(null, e));
      }
      const acces = (POSTES.find(p => p.id === e.poste) || {}).responsable ? 'Direction' : 'Employé';
      const mdpVu = c && (EN_LIGNE ? mdpEnLigne[c.userId] : c.mdp);
      const mdpCell = !c ? '—' : mdpVu ? el('span', 'rib', mdpVu) : el('span', 'calcul-detail', 'Inconnu (à réinitialiser)');
      return [action, nomComplet(e), nomPoste(e.poste), ident, ...(estPatron() ? [mdpCell] : []), acces, c && c.derniere ? fmtDate(c.derniere) : '—', statut];
    });
    const sans = liste.filter(e => !compteDe(e) && peutGerer(e)).length;
    let extra = null;
    if (sans) {
      extra = el('button', 'btn btn-sm', '+ Créer un compte');
      extra.type = 'button';
      extra.addEventListener('click', () => ouvrirCompte());
    }
    const p = panneauAvec(`Comptes des employés · ${liste.filter(e => compteDe(e)).length} / ${liste.length}`, tableau(['', 'Employé', 'Rôle', 'Identifiant', ...(estPatron() ? ['Mot de passe'] : []), 'Accès', 'Dernière connexion', 'Statut'], lignes, ''), extra);
    p.append(el('p', 'calcul-detail panneau-pied', estPatron() ? 'Le patron gère tous les comptes et voit les mots de passe (visibles par lui seul). Chaque employé doit utiliser un mot de passe propre au Caracas.' : 'Tu gères les comptes des rangs inférieurs au tien. Le rôle se modifie dans la fiche Équipe.'));
    blocs.push(p);
    return blocs;
  }

  /* ---------- Dossier RH (CTC) : contrat CDI/CDD, essai 7 j, signature, nouveau contrat à chaque promotion, sanctions ---------- */
  const JOUR_MS = 86400000;
  const versChampDate = d => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '');
  const lireChampDate = v => (v ? new Date(v + 'T12:00') : null);
  function rhDe(e) {
    if (!e.rh) e.rh = { contrat: 'CDI', debut: e.embauche, finCDD: null, signe: null, aSigner: false, sanctions: [] };
    return e.rh;
  }
  function etatRH(e) {
    const rh = rhDe(e);
    const now = new Date();
    const n = nomComplet(e);
    const finEssai = new Date(rh.debut.getTime() + 7 * JOUR_MS);
    if (rh.contrat === 'CDD' && rh.finCDD && rh.finCDD < now) return { texte: 'CDD terminé', cls: 'refusee', alerte: `${n} : CDD terminé le ${jour(rh.finCDD)}` };
    if (rh.aSigner) return { texte: 'Nouveau contrat à signer', cls: 'attente', alerte: `${n} : nouveau contrat à signer (promotion)` };
    if (!rh.signe) {
      if (now < finEssai) return { texte: `Essai jusqu'au ${jour(finEssai)}`, cls: 'attente', alerte: finEssai - now <= 2 * JOUR_MS ? `${n} : fin d'essai le ${jour(finEssai)}, contrat à signer` : null };
      return { texte: 'Contrat non signé', cls: 'refusee', alerte: `${n} : essai terminé le ${jour(finEssai)}, contrat toujours pas signé` };
    }
    if (rh.contrat === 'CDD') return { texte: `CDD jusqu'au ${jour(rh.finCDD)}`, cls: 'attente', alerte: rh.finCDD - now <= 2 * JOUR_MS ? `${n} : CDD se termine le ${jour(rh.finCDD)}` : null };
    return { texte: 'CDI signé', cls: 'validee', alerte: null };
  }
  function celluleContrat(e) {
    const et = etatRH(e);
    const d = el('div', 'actions-ligne');
    d.append(el('span', 'pastille pastille-' + et.cls, et.texte));
    const ns = rhDe(e).sanctions.length;
    if (ns) d.append(el('span', 'pastille pastille-refusee', `${ns} sanction${ns > 1 ? 's' : ''}`));
    return d;
  }
  const dlgRH = $('#dlg-rh');
  const rhC = { contrat: $('#rh-contrat'), debut: $('#rh-debut'), fin: $('#rh-fin'), signe: $('#rh-signe') };
  let rhEmploye = null;
  const majZoneFin = () => { $('#rh-fin-zone').hidden = rhC.contrat.value !== 'CDD'; };
  function listeSanctions() {
    const rh = rhDe(rhEmploye);
    $('#rh-liste').replaceChildren(...(rh.sanctions.length ? rh.sanctions.map(s => {
      const d = el('div', 'rh-sanction');
      d.append(el('strong', null, s.type), el('span', null, s.motif), el('span', 'calcul-detail', `Le ${fmtDate(s.date)} par ${s.par}`));
      if (estResponsable()) {
        const k = el('button', 'btn btn-mini btn-ghost', 'Retirer la sanction');
        k.type = 'button';
        let arme = false;
        k.addEventListener('click', () => {
          if (!arme) { arme = true; k.textContent = 'Confirmer le retrait'; k.className = 'btn btn-mini btn-danger'; return; }
          const l = rhDe(rhEmploye).sanctions;
          l.splice(l.indexOf(s), 1);
          journal('Équipe', 'Sanction retirée', `${nomComplet(rhEmploye)} · ${s.type} · ${s.motif}`);
          listeSanctions();
          rendreEspace(pageEspace());
        });
        d.append(k);
      }
      return d;
    }) : [el('p', 'calcul-detail', 'Aucune sanction.')]));
    $('#rh-etat').textContent = `État : ${etatRH(rhEmploye).texte} · ${nomPoste(rhEmploye.poste)}`;
  }
  function ouvrirRH(e) {
    rhEmploye = e;
    const rh = rhDe(e);
    $('#rh-titre').textContent = `Dossier de ${nomComplet(e)}`;
    rhC.contrat.value = rh.contrat;
    rhC.debut.value = versChampDate(rh.debut);
    rhC.fin.value = versChampDate(rh.finCDD);
    rhC.signe.value = versChampDate(rh.signe);
    Object.values(rhC).forEach(x => x.removeAttribute('aria-invalid'));
    majZoneFin();
    $('#rh-message').textContent = '';
    $('#rh-s-message').textContent = '';
    $('#rh-s-motif').value = '';
    listeSanctions();
    dlgRH.showModal();
  }
  rhC.contrat.addEventListener('change', () => {
    majZoneFin();
    const d = lireChampDate(rhC.debut.value);
    if (rhC.contrat.value === 'CDD' && !rhC.fin.value && d) rhC.fin.value = versChampDate(new Date(d.getTime() + 15 * JOUR_MS));
  });
  $('#rh-annuler').addEventListener('click', () => dlgRH.close());
  $('#form-rh').addEventListener('submit', ev => {
    ev.preventDefault();
    const rh = rhDe(rhEmploye);
    const msg = $('#rh-message');
    msg.className = 'form-message erreur';
    const debut = lireChampDate(rhC.debut.value);
    const fin = lireChampDate(rhC.fin.value);
    const signe = lireChampDate(rhC.signe.value);
    if (!debut) { rhC.debut.setAttribute('aria-invalid', 'true'); msg.textContent = 'Indique le premier jour du contrat.'; return; }
    if (rhC.contrat.value === 'CDD' && (!fin || fin <= debut || fin - debut > 15 * JOUR_MS)) {
      rhC.fin.setAttribute('aria-invalid', 'true');
      msg.textContent = 'Un CDD dure 15 jours maximum : indique une fin entre le lendemain du début et 15 jours après.';
      return;
    }
    const avant = `${rh.contrat}${rh.signe ? ' signé' : ''}`;
    const nouvelleSignature = signe && (!rh.signe || signe.getTime() !== rh.signe.getTime());
    Object.assign(rh, { contrat: rhC.contrat.value, debut, finCDD: rhC.contrat.value === 'CDD' ? fin : null, signe });
    if (nouvelleSignature) rh.aSigner = false;
    journal('Équipe', 'Dossier RH modifié', `${nomComplet(rhEmploye)} · ${avant} → ${rh.contrat}${rh.signe ? ` signé le ${jour(rh.signe)}` : ' non signé'}`);
    msg.className = 'form-message succes';
    msg.textContent = 'Contrat enregistré.';
    listeSanctions();
    rendreEspace(pageEspace());
  });
  $('#rh-s-ajouter').addEventListener('click', () => {
    const motif = $('#rh-s-motif').value.trim();
    const m = $('#rh-s-message');
    if (motif.length < 5) { m.className = 'form-message erreur'; m.textContent = 'Une sanction doit être motivée par écrit (5 caractères minimum).'; return; }
    const type = $('#rh-s-type').value;
    rhDe(rhEmploye).sanctions.unshift({ date: new Date(), type, motif, par: identifiant });
    journal('Équipe', 'Sanction', `${nomComplet(rhEmploye)} · ${type} · ${motif}`);
    $('#rh-s-motif').value = '';
    m.className = 'form-message succes';
    m.textContent = `${type} enregistré${type === 'Mise à pied' || type === 'Rupture du contrat' ? 'e' : ''}.`;
    listeSanctions();
    rendreEspace(pageEspace());
  });

  /* ---------- Demandes de réservation (fiche véhicule publique) → espace employé ---------- */
  const reservationsApercu = [];
  let ficheCourante = null;
  const dlgResa = $('#dlg-reservation');
  const rsTel = $('#rs-tel');
  rsTel.addEventListener('input', () => {
    const c = rsTel.value.replace(/\D/g, '').slice(0, 7);
    rsTel.value = c.length > 3 ? c.slice(0, 3) + '-' + c.slice(3) : c;
  });
  $('#dlg-cta').addEventListener('click', () => {
    const v = ficheCourante;
    if (!v) return;
    const dispo = v.statut === 'disponible';
    $('#rs-titre').textContent = nomV(v);
    $('#rs-resume').textContent = dispo
      ? `Réf. ${v.id.toUpperCase()} · ${prix.format(v.prix)}. Laisse ton nom et ton numéro : le Caracas te rappelle pour confirmer la réservation.`
      : `Ce véhicule n'est plus disponible. Laisse ton numéro : le Caracas te prévient dès qu'un modèle similaire arrive.`;
    ['#rs-nom', '#rs-tel', '#rs-message'].forEach(s => { $(s).value = ''; $(s).removeAttribute('aria-invalid'); });
    rsTel.value = '555-';
    $('#rs-retour').textContent = '';
    $('#rs-envoyer').hidden = false;
    $('#rs-annuler').textContent = 'Annuler';
    dlgResa.showModal();
  });
  $('#rs-annuler').addEventListener('click', () => dlgResa.close());
  $('#form-reservation').addEventListener('submit', async ev => {
    ev.preventDefault();
    const v = ficheCourante;
    const nom = $('#rs-nom').value.trim();
    const tel = rsTel.value.trim();
    const r = $('#rs-retour');
    $('#rs-nom').setAttribute('aria-invalid', String(nom.length < 3));
    rsTel.setAttribute('aria-invalid', String(!RE_TEL.test(tel)));
    if (nom.length < 3 || !RE_TEL.test(tel)) { r.className = 'form-message erreur'; r.textContent = 'Indique ton nom et un téléphone au format 555-xxxx.'; return; }
    const type = v.statut === 'disponible' ? 'reservation' : 'similaire';
    const demande = { id: 'rs-' + Date.now().toString(36), date: new Date(), vehiculeId: v.id, vehicule: nomV(v), prix: v.prix, type, nom, tel, message: $('#rs-message').value.trim(), statut: 'nouvelle' };
    if (EN_LIGNE) {
      if (!sb) { r.className = 'form-message erreur'; r.textContent = 'Connexion au serveur en cours, réessaie dans un instant.'; return; }
      const { error } = await sb.from('elements').insert({ collection: 'reservations', id: demande.id, data: propre(demande) });
      if (error) { r.className = 'form-message erreur'; r.textContent = "La demande n'a pas pu être envoyée. Réessaie ou appelle le Caracas."; return; }
    } else reservationsApercu.unshift(demande);
    if (!EN_LIGNE) journalApercu.unshift({ date: new Date(), par: 'Site public', section: 'Réservations', action: type === 'reservation' ? 'Demande de réservation' : 'Demande modèle similaire', detail: `${nomV(v)} (${v.id.toUpperCase()}) · ${nom} · ${tel}` });
    r.className = 'form-message succes';
    r.textContent = `Demande envoyée. Le Caracas te rappelle au ${tel}.`;
    $('#rs-envoyer').hidden = true;
    $('#rs-annuler').textContent = 'Fermer';
  });
  const discordResa = x => [`**${x.type === 'reservation' ? 'Demande de réservation' : 'Demande modèle similaire'}** · Le Caracas`,
    `Véhicule : ${x.vehicule} (${x.vehiculeId.toUpperCase()}) · ${prix.format(x.prix)}`, `Client : ${x.nom} · ${x.tel}`, ...(x.message ? [`Message : ${x.message}`] : []), `Reçue le ${fmtDate(x.date)}`].join('\n');
  function traiterResa(x, statut) {
    x.statut = statut;
    x.par = identifiant;
    x.le = new Date();
    const v = vehicules.find(y => y.id === x.vehiculeId);
    if (statut === 'acceptee' && v && v.statut === 'disponible') { v.statut = 'reserve'; rendreAccueil(); rendreCatalogue(); }
    journal('Réservations', { acceptee: 'Réservation acceptée', refusee: 'Demande refusée', traitee: 'Demande traitée' }[statut], `${x.vehicule} · ${x.nom} · ${x.tel}`);
    rendreEspace(pageEspace());
  }
  function panneauReservations() {
    const nouvelles = reservationsApercu.filter(x => x.statut === 'nouvelle');
    const traitees = reservationsApercu.filter(x => x.statut !== 'nouvelle').slice(0, 8);
    const ETATS = { acceptee: ['validee', 'Acceptée'], refusee: ['refusee', 'Refusée'], traitee: ['validee', 'Traitée'] };
    const lignes = [...nouvelles, ...traitees].map(x => {
      const act = el('div', 'actions-ligne');
      if (x.statut === 'nouvelle') {
        const b = (t, s, cls) => { const k = el('button', 'btn btn-mini' + (cls || ''), t); k.type = 'button'; k.addEventListener('click', () => traiterResa(x, s)); return k; };
        if (x.type === 'reservation') act.append(b('Accepter', 'acceptee'), b('Refuser', 'refusee', ' btn-ghost'));
        else act.append(b('Traitée', 'traitee'));
      } else {
        const [cls, t] = ETATS[x.statut];
        const p = el('span', 'pastille pastille-' + cls, t);
        p.title = `Par ${x.par} le ${fmtDate(x.le)}`;
        act.append(p);
      }
      act.append(boutonDiscord(() => discordResa(x)));
      return [fmtDate(x.date), x.type === 'reservation' ? 'Réservation' : 'Modèle similaire', `${x.vehicule} · ${x.vehiculeId.toUpperCase()}`, x.nom, x.tel, x.message || '—', act];
    });
    const note = nouvelles.length ? el('p', 'panneau-note', `${nouvelles.length} nouvelle${nouvelles.length > 1 ? 's' : ''}`) : null;
    return panneauAvec('Demandes de réservation', tableau(['Reçue', 'Demande', 'Véhicule', 'Client', 'Téléphone', 'Message', ''], lignes,
      'Aucune demande. Les clients réservent depuis la fiche d’un véhicule du catalogue.'), note);
  }

  /* ---------- Copier pour Discord : texte prêt à coller (presse-papiers, sinon fenêtre de copie) ---------- */
  async function copierTexte(texte, bouton, titre) {
    let ok = false;
    try { await navigator.clipboard.writeText(texte); ok = true; } catch (e) { /* presse-papiers bloqué */ }
    if (!ok) {
      const t = el('textarea');
      t.value = texte;
      t.readOnly = true;
      t.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.append(t);
      t.select();
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      t.remove();
    }
    if (ok) {
      if (bouton) {
        const avant = bouton.textContent;
        bouton.textContent = 'Copié !';
        setTimeout(() => { bouton.textContent = avant; }, 1500);
      }
      return;
    }
    exportEnCours = { texte, contenu: null, copie: 'Copié. Colle-le dans Discord (Ctrl+V).' };
    $('#export-titre').textContent = titre || 'Copier pour Discord';
    $('#export-aide').textContent = 'La copie automatique est bloquée ici : clique sur « Copier » ou sélectionne le texte puis Ctrl+C.';
    $('#export-texte').value = texte;
    $('#export-fichier').hidden = true;
    $('#export-message').textContent = '';
    dlgExport.showModal();
  }
  function boutonDiscord(texte, label) {
    const b = el('button', 'btn btn-mini btn-ghost', label || 'Discord');
    b.type = 'button';
    b.title = 'Copier un message prêt à coller dans Discord';
    b.addEventListener('click', () => copierTexte(typeof texte === 'function' ? texte() : texte, b));
    return b;
  }
  const discordVente = v => {
    const contrat = !('plaque' in v);
    const etat = { attente: 'à valider', validee: 'validée', refusee: 'refusée' }[v.statut] || '';
    return [`**${contrat ? 'Contrat' : 'Vente'} ${etat}** · Le Caracas`, `Véhicule : ${v.vehicule}${v.plaque ? ' · plaque ' + v.plaque : ''}`,
      `Client : ${v.client}`, `Prix : **${prix.format(v.prix)}**`, `Vendeur : ${v.vendeur || '—'} · ${fmtDate(v.date)}`].join('\n');
  };
  function celluleStatut(v) {
    const d = el('div', 'actions-ligne');
    d.append(pastille(v), boutonDiscord(() => discordVente(v)));
    return d;
  }
  const discordDevis = d => [`**Devis de rachat** · Le Caracas`, `Véhicule : ${d.vehicule || 'non précisé'}`, `Prix neuf : ${prix.format(d.neuf)}`,
    `Custom : ${d.options.length ? d.options.join(', ') : 'aucun'} (${prix.format(d.custom)})`, `Taux : ${d.taux} %`, `**Prix de rachat : ${prix.format(d.prix)}**`, `Établi par : ${identifiant || '—'}`].join('\n');
  const heuresPayees = (nom, per) => pointagesApercu.filter(x => memeNom(x.nom, nom) && x.debut >= per.debut && x.debut < per.fin).reduce((t, x) => t + msPaye(x), 0);
  const discordPaie = (f, per) => [`**Paie ${f.nom}** · semaine ${per.libelle}`,
    `Heures badgées : ${fmtDuree(f.ms)} (rémunérées : ${fmtDuree(heuresPayees(f.nom, per))} / ${SUBVENTION_HEURES} h)`,
    `Salaire horaire : ${prix.format(f.salaireHoraire)}`, `Commissions : ${prix.format(f.commission)} (${f.ventes.length} vente(s) validée(s))`, ...(f.fixe ? [`Salaire fixe : ${prix.format(f.fixe)}`] : []), ...(f.primes ? [`Primes : ${prix.format(f.primes)}`] : []), ...(f.plafonne ? [`Plafonné au salaire max : ${prix.format(f.plafond)}`] : []),
    `**Total : ${prix.format(f.total)}** · ${f.paye ? `payé le ${fmtDate(f.paye.le)}` : 'à payer'}`].join('\n');
  const discordBilan = (b, c) => [`**Bilan de la semaine ${b.libelle}**${c ? ' · clôturée' : ''} · Le Caracas`,
    ...b.tuiles.map(([l, v, n]) => `${l} : **${v}** (${n})`),
    ...b.resume.flatMap(x => ['', `__${x.titre}__`, ...x.lignes.map(([k, v]) => `${k} : ${v}`)])].join('\n');

  /* ---------- Fiche de paie (document HTML imprimable) ---------- */
  function fichePaie(f, per) {
    const emp = equipeApercu.find(e => memeNom(nomComplet(e), f.nom));
    const paye = heuresPayees(f.nom, per);
    const lignes = [
      ['Heures badgées', fmtDuree(f.ms)],
      [`Heures rémunérées (${SUBVENTION_HEURES} h max par semaine)`, fmtDuree(paye)],
      ['Taux horaire du grade', `${prix.format(tauxDe(f.poste))} / h`],
      [f.fixe ? 'Salaire fixe (comptable)' : 'Salaire horaire', prix.format(f.fixe || f.salaireHoraire)],
      [`Commissions (${commissionDe(f.poste)} % du bénéfice des ventes validées)`, prix.format(f.commission)],
      ...(f.primes ? [['Primes', prix.format(f.primes)]] : []),
      ...(f.plafonne ? [[`Plafonné au salaire max du rôle`, prix.format(f.plafond)]] : []),
      ['Total de la semaine', prix.format(f.total)],
    ];
    const etat = f.paye ? `Payé le ${fmtDate(f.paye.le)} par ${f.paye.par}` : 'À payer';
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Fiche de paie · ${esc(f.nom)} · ${esc(per.libelle)}</title>
<style>body{font:14px/1.45 Arial,Helvetica,sans-serif;color:#2A1D14;max-width:820px;margin:32px auto;padding:0 24px}h1{font-size:24px;margin:0 0 4px}h2{font-size:15px;margin:26px 0 8px;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #2A1D14;padding-bottom:4px}.meta{color:#5a4a3c;margin:2px 0}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border:1px solid #c9b896;padding:6px 8px;text-align:left}th{background:#EADCC2}td.m{text-align:right;white-space:nowrap}tr.fort td{font-weight:700;background:#F5EDDF}.note{font-size:12px;color:#5a4a3c}.sign{display:flex;gap:48px;margin-top:40px}.sign div{flex:1;border-top:1px solid #2A1D14;padding-top:6px}</style></head><body>
<h1>Fiche de paie · Le Caracas</h1>
<p class="meta">Sandy Shores, Blaine County · semaine ${esc(per.libelle)}</p>
<h2>Salarié</h2>
<table><tbody><tr><td>Nom</td><td>${esc(f.nom)}</td></tr><tr><td>Grade</td><td>${esc(nomPoste(f.poste))}</td></tr>${emp ? `<tr><td>Téléphone</td><td>${esc(emp.tel)}</td></tr><tr><td>RIB</td><td>${esc(emp.rib)}</td></tr>` : ''}</tbody></table>
<h2>Rémunération</h2>
<table><tbody>${lignes.map(([k, v], n) => `<tr${n === lignes.length - 1 ? ' class="fort"' : ''}><td>${esc(k)}</td><td class="m">${esc(v)}</td></tr>`).join('')}</tbody></table>
<p class="note">Paiement : ${esc(etat)}. Au-delà de ${SUBVENTION_HEURES} h badgées par semaine, les heures ne sont pas rémunérées.</p>
<h2>Détail des commissions</h2>
${f.ventes.length ? `<table><thead><tr><th>Date</th><th>Type</th><th>Vente</th><th>Prix</th><th>Bénéfice</th><th>Commission</th></tr></thead><tbody>${f.ventes.map(v => `<tr><td>${esc(jour(v.date))}</td><td>${esc(v.genre)}</td><td>${esc(v.vehicule)}</td><td class="m">${esc(prix.format(v.prix))}</td><td class="m">${esc(prix.format(v.benefice))}</td><td class="m">${esc(prix.format(v.com))}</td></tr>`).join('')}</tbody></table>` : '<p class="note">Aucune vente validée sur la semaine.</p>'}
<p class="note">Fiche établie le ${esc(fmtDate(new Date()))} par ${esc(identifiant || '—')}.</p>
<div class="sign"><div>Signature de l'employeur</div><div>Signature du salarié</div></div>
</body></html>`;
    const texte = [`FICHE DE PAIE · LE CARACAS`, `${f.nom} · ${nomPoste(f.poste)} · semaine ${per.libelle}`, ...(emp ? [`RIB : ${emp.rib}`] : []), '',
      ...lignes.map(([k, v]) => `${k}\t${v}`), `Paiement\t${etat}`].join('\n');
    return { html, texte };
  }
  function boutonFichePaie(f, per, label) {
    const b = el('button', 'btn btn-mini btn-ghost', label || 'Fiche de paie');
    b.type = 'button';
    b.addEventListener('click', () => {
      const d = fichePaie(f, per);
      offrirFichier({
        nom: `fiche-paie-${f.nom.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${per.debut.toISOString().slice(0, 10)}.html`, contenu: d.html, type: 'text/html',
        titre: 'Fiche de paie', texte: d.texte, copie: 'Fiche copiée.',
        aide: "Le téléchargement n'est pas disponible ici. Copie la fiche de paie (texte) pour la coller où tu veux.",
      }, b);
    });
    return b;
  }

  /* ---------- Équipe : RIB à copier (direction) ---------- */
  function panneauRIB() {
    const liste = [...equipeVisible()].sort((a, b) => rang(a.poste) - rang(b.poste) || a.nom.localeCompare(b.nom, 'fr'));
    const lignes = liste.map(e => {
      const b = el('button', 'btn btn-mini', 'Copier');
      b.type = 'button';
      b.setAttribute('aria-label', `Copier le RIB de ${nomComplet(e)}`);
      b.addEventListener('click', () => copierTexte(e.rib, b, 'Copier le RIB'));
      return [nomComplet(e), nomPoste(e.poste), el('span', 'rib', e.rib), b];
    });
    let tous = null;
    if (liste.length) {
      tous = el('button', 'btn btn-sm btn-ghost', 'Copier tous les RIB');
      tous.type = 'button';
      tous.addEventListener('click', () => copierTexte(liste.map(e => `${nomComplet(e)} (${nomPoste(e.poste)}) : ${e.rib}`).join('\n'), tous, 'Copier les RIB'));
    }
    return panneauAvec('RIB des employés', tableau(['Employé', 'Rôle', 'RIB', ''], lignes, 'Aucun employé.'), tous);
  }

  /* ---------- Badge oublié : services ouverts depuis plus de 10 h ---------- */
  const SEUIL_OUBLI = 10 * 3600000;
  const servicesOublies = () => pointagesApercu.filter(x => !x.fin && new Date() - x.debut > SEUIL_OUBLI);
  function boutonArretOubli(x) {
    const b = el('button', 'btn btn-mini', 'Arrêter à 10 h');
    b.type = 'button';
    b.title = 'Termine le service 10 h après son début';
    b.addEventListener('click', () => {
      x.fin = new Date(x.debut.getTime() + SEUIL_OUBLI);
      x.corrige = { par: identifiant, le: new Date() };
      journal('Badgeuse', 'Service oublié arrêté à 10 h', `${x.nom} · ${fmtDate(x.debut)} → ${fmtDate(x.fin)}`);
      rendreEspace(pageEspace());
    });
    return b;
  }

  /* ---------- Bilan d'une semaine (affiché dans l'Historique, figé à la clôture) ---------- */
  const cloturesApercu = [];
  const nomPoste = id => (POSTES.find(p => p.id === id) || {}).nom || '—';
  const jour = d => d.toLocaleDateString('fr-FR');
  function bilanSemaine(per) {
    calculerDeductible();
    const dans = d => d >= per.debut && d < per.fin;
    const somme = (l, f) => l.reduce((t, x) => t + (f(x) || 0), 0);
    const livre = grandLivre();
    const lignes = livre.filter(x => dans(x.date));
    const t = totaux(lignes);
    const avant = livre.filter(x => x.date < per.fin);
    const solde = avant.length ? avant[avant.length - 1].solde : 0;
    const STAT = { attente: 'En attente', validee: 'Validée', refusee: 'Refusée' };
    const ventes = [...ventesApercu.map(v => ({ ...v, genre: 'Véhicule' })), ...contratsApercu.map(v => ({ ...v, genre: 'Contrat' }))]
      .filter(v => dans(v.date)).sort((a, b) => a.date - b.date);
    const validees = ventes.filter(v => v.statut === 'validee');
    const rachats = rachatsApercu.filter(r => dans(r.date)).sort((a, b) => a.date - b.date);
    const deps = depensesApercu.filter(x => dans(x.date)).sort((a, b) => a.date - b.date);
    const ecr = ecrituresApercu.filter(x => dans(x.date)).sort((a, b) => a.date - b.date);
    const fiches = calculerPaie(per);
    const parEmp = {};
    pointagesApercu.filter(x => dans(x.debut)).forEach(x => {
      const e = parEmp[x.nom] = parEmp[x.nom] || { n: 0, ms: 0, gain: 0 };
      e.n += 1;
      e.ms += (x.fin || new Date()) - x.debut;
      e.gain += gain(x);
    });
    const plafonds = CATEGORIES_DEPENSES.map(c => {
      const l = deps.filter(x => catDepense(x.categorie) === c);
      return [c.nom, c.total ? 'Sans plafond' : c.plafond ? prix.format(c.plafond) : 'Selon ' + c.regle, prix.format(somme(l, x => x.montant)), c.plafond || c.total ? prix.format(somme(l, x => x.deductible)) : '—'];
    }).filter(l => l[2] !== prix.format(0));
    const ca = somme(validees, v => v.prix);
    const autres = somme(ecr.filter(x => x.sens === 'entree'), x => x.montant);
    const sub = subventionSemaine(per);
    return {
      cle: per.cle, libelle: per.libelle, debut: per.debut, fin: per.fin, calculeLe: new Date(),
      tuiles: [
        ['Entrées', prix.format(t.entree), `${lignes.filter(x => x.entree).length} opération(s)`],
        ['Sorties', prix.format(t.sortie), `dont ${prix.format(t.deductible)} déductible`],
        ['Résultat', prix.format(t.entree - t.sortie), t.entree - t.sortie >= 0 ? 'Bénéfice' : 'Perte'],
        ['Solde fin de semaine', prix.format(solde), `Au ${jour(new Date(per.fin - 1))}`],
      ],
      resume: donneesResume(per).map(x => ({ ...x, lignes: x.lignes.filter(l => l[0] !== 'En service maintenant') })),
      tables: [
        { titre: 'Paie par employé', colonnes: ['Employé', 'Grade', 'Heures', 'Salaire', 'Commission', 'Primes', 'Total', 'Statut'], vide: 'Aucune paie sur la semaine.',
          lignes: fiches.map(f => [f.nom, nomPoste(f.poste), fmtDuree(f.ms), prix.format(f.salaireHoraire + (f.fixe || 0)), prix.format(f.commission), prix.format(f.primes || 0), prix.format(f.total) + (f.plafonne ? ' (plafond)' : ''), f.paye ? 'Payé' : f.total > 0 ? 'À payer' : '—']) },
        { titre: 'Ventes et contrats', colonnes: ['Date', 'Type', 'Client', 'Véhicule', 'Vendeur', 'Prix', 'Statut'], vide: 'Aucune vente.',
          lignes: ventes.map(v => [jour(v.date), v.genre, v.client, v.vehicule, v.vendeur || '—', prix.format(v.prix), STAT[v.statut] || v.statut]) },
        { titre: 'Rachats', colonnes: ['Date', 'Client', 'Modèle', 'Plaque', 'Prix de rachat', 'Revente prévue', 'Par'], vide: 'Aucun rachat.',
          lignes: rachats.map(r => [jour(r.date), r.client, r.modele, r.plaque, prix.format(r.prix), prix.format(r.revente), r.par || '—']) },
        { titre: 'Dépenses', colonnes: ['Date', 'Catégorie', 'Libellé', 'Montant', 'Déductible', 'Par'], vide: 'Aucune dépense.',
          lignes: deps.map(x => [jour(x.date), x.categorie, x.libelle, prix.format(x.montant), x.deductible === null ? 'Selon ' + x.regle : prix.format(x.deductible || 0), x.par || '—']) },
        { titre: 'Plafonds déductibles', colonnes: ['Catégorie', 'Plafond / semaine', 'Dépensé', 'Déductible'], vide: 'Aucune dépense dans les catégories du CTC.', lignes: plafonds },
        { titre: 'Badgeuse par employé', colonnes: ['Employé', 'Services', 'Heures', 'Gagné'], vide: 'Aucun pointage.',
          lignes: Object.entries(parEmp).sort((a, b) => a[0].localeCompare(b[0], 'fr')).map(([n, e]) => [n, String(e.n), fmtDuree(e.ms), prix.format(e.gain)]) },
        { titre: "Subvention de l'État (badgeuse)", colonnes: ['Employé', 'Heures badgées', `Heures subventionnées (${SUBVENTION_HEURES} h max)`, 'Montant'], vide: 'Aucune heure badgée.',
          lignes: sub.liste.map(e => [e.nom, fmtDuree(e.ms), fmtDuree(e.msSub), prix.format(e.montant)]) },
        { titre: 'Écritures manuelles', colonnes: ['Date', 'Sens', 'Catégorie', 'Libellé', 'Montant'], vide: 'Aucune écriture manuelle.',
          lignes: ecr.map(x => [jour(x.date), x.sens === 'entree' ? 'Entrée' : 'Sortie', x.categorie, x.libelle, prix.format(x.montant)]) },
      ],
      irs: {
        ca, autres, charges: t.sortie, deductible: t.deductible,
        salaires: somme(deps.filter(x => x.categorie === 'Salaires'), x => x.montant),
        rachats: somme(rachats, r => r.prix),
        resultat: t.entree - t.sortie,
        base: Math.max(0, ca + autres - t.deductible),
        justifs: deps.filter(x => x.justif).length, nbDeps: deps.length,
        subvention: sub.total, subventionRecue: sub.recu ? sub.recu.montant : 0,
      },
    };
  }
  const clotureDe = cle => cloturesApercu.find(c => c.cle === cle);
  function cloturer(per) {
    const i = cloturesApercu.findIndex(c => c.cle === per.cle);
    const deja = i >= 0;
    if (deja) cloturesApercu.splice(i, 1);
    cloturesApercu.push({ cle: per.cle, le: new Date(), par: identifiant, bilan: bilanSemaine(per) });
    journal('Historique', deja ? 'Clôture mise à jour' : 'Semaine clôturée', per.libelle);
    creerSauvegarde(`Clôture de la semaine ${per.libelle}`);
  }
  /* Semaines connues : de la plus ancienne donnée à la semaine en cours (plus récente en premier) */
  function semainesConnues() {
    const dates = [...pointagesApercu.map(x => x.debut), ...ventesApercu, ...contratsApercu, ...rachatsApercu, ...depensesApercu, ...ecrituresApercu]
      .map(x => (x instanceof Date ? x : x.date)).filter(Boolean);
    cloturesApercu.forEach(c => dates.push(new Date(c.bilan.debut)));
    const premier = dates.length ? lundi(new Date(Math.min(...dates))) : lundi(new Date());
    const liste = [];
    for (let d = 0; liste.length < 260; d -= 1) {
      const p = periodeSemaine(d);
      liste.push(p);
      if (p.debut <= premier) break;
    }
    return liste;
  }

  /* Clôture depuis le tableau de bord (direction) */
  let clotureArmee = null;
  function panneauCloture() {
    const lignes = [0, -1].map(d => periodeSemaine(d)).filter((p, i) => i === 0 || !clotureDe(p.cle)).map((p, i) => {
      const c = clotureDe(p.cle);
      const etat = c ? el('span', 'pastille pastille-validee', `Clôturée le ${fmtDate(c.le)} par ${c.par}`) : el('span', 'pastille pastille-attente', 'Non clôturée');
      const arme = clotureArmee === p.cle;
      const b = el('button', 'btn btn-mini' + (arme ? ' btn-danger' : c ? ' btn-ghost' : ''),
        arme ? 'Confirmer' : c ? 'Mettre à jour la clôture' : i === 0 ? 'Clôturer la semaine' : 'Clôturer la semaine précédente');
      b.type = 'button';
      b.addEventListener('click', () => {
        if (!arme) { clotureArmee = p.cle; } else { clotureArmee = null; cloturer(p); }
        rendreEspace('espace');
      });
      return [(i === 0 ? 'En cours · ' : 'Précédente · ') + p.libelle, etat, b];
    });
    const p = panneauAvec('Clôture de la semaine', tableau(['Semaine', 'État', ''], lignes, ''), lienEspace('Voir l’historique', 'espace-historique', () => { ongletHisto = 'semaines'; }));
    p.append(el('p', 'calcul-detail panneau-pied', 'La clôture fige le résumé de la semaine dans l’Historique (dossier IRS) et crée une sauvegarde automatique.'));
    return p;
  }

  /* ---------- Historique : semaines, sauvegardes, journal ---------- */
  let ongletHisto = 'semaines';
  let semaineHisto = null;
  let filtreJournal = '';
  function rendreBilan(b) {
    const blocs = [];
    const t = el('div', 'tuiles');
    b.tuiles.forEach(([l, v, n]) => t.append(tuile(l, v, n)));
    blocs.push(t, grilleResume(b.resume, false));
    b.tables.forEach(x => blocs.push(panneauAvec(x.titre, tableau(x.colonnes, x.lignes, x.vide))));
    return blocs;
  }
  const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function dossierIRS(b, cloture) {
    const i = b.irs;
    const recap = [
      ["Chiffre d'affaires (ventes et contrats validés)", i.ca],
      ['Autres entrées (écritures et subventions encaissées dans la semaine)', i.autres],
      ...(i.subvention !== undefined ? [
        [`Subvention de l'État calculée (badgeuse, ${SUBVENTION_HEURES} h max par employé)`, i.subvention],
        ['dont remboursée à ce jour', i.subventionRecue],
      ] : []),
      ['Total des charges', i.charges],
      ['dont charges déductibles (plafonds CTC + salaires)', i.deductible],
      ['dont salaires versés', i.salaires],
      ['dont rachats de véhicules', i.rachats],
      ['Résultat comptable', i.resultat],
      ['Base imposable estimée (CA + autres entrées − charges déductibles, salaires compris)', i.base],
    ];
    const etat = cloture ? `Semaine clôturée le ${fmtDate(new Date(cloture.le))} par ${cloture.par}` : 'Semaine non clôturée : chiffres calculés le ' + fmtDate(new Date());
    const table = x => `<h2>${esc(x.titre)}</h2>` + (x.lignes.length
      ? `<table><thead><tr>${x.colonnes.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${x.lignes.map(l => `<tr>${l.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      : `<p class="vide">${esc(x.vide)}</p>`);
    const ordre = ['Ventes et contrats', 'Dépenses', 'Plafonds déductibles', 'Paie par employé', "Subvention de l'État (badgeuse)", 'Rachats', 'Écritures manuelles', 'Badgeuse par employé'];
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Dossier IRS · Le Caracas · ${esc(b.libelle)}</title>
<style>body{font:14px/1.45 Arial,Helvetica,sans-serif;color:#2A1D14;max-width:960px;margin:32px auto;padding:0 24px}h1{font-size:26px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 8px;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #2A1D14;padding-bottom:4px}.meta{color:#5a4a3c;margin:2px 0}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border:1px solid #c9b896;padding:6px 8px;text-align:left;vertical-align:top}th{background:#EADCC2}td.m{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}tr.fort td{font-weight:700;background:#F5EDDF}.vide{color:#7a6a5a;font-style:italic}.note{font-size:12px;color:#5a4a3c}.sign{display:flex;gap:48px;margin-top:40px}.sign div{flex:1;border-top:1px solid #2A1D14;padding-top:6px}@media print{body{margin:0}h2{break-after:avoid}tr{break-inside:avoid}}</style></head><body>
<h1>Dossier IRS · Le Caracas</h1>
<p class="meta">Concession de véhicules · Sandy Shores, Blaine County · serveur RP Limitless</p>
<p class="meta"><strong>Semaine du ${esc(b.libelle.replace(/^du /, ''))}</strong></p>
<p class="meta">${esc(etat)} · Dossier établi le ${esc(fmtDate(new Date()))} par ${esc(identifiant || '—')}</p>
<h2>Récapitulatif</h2>
<table><tbody>${recap.map(([k, v], n) => `<tr${n >= recap.length - 2 ? ' class="fort"' : ''}><td>${esc(k)}</td><td class="m">${esc(prix.format(v))}</td></tr>`).join('')}</tbody></table>
<p class="note">Charges déductibles : plafonds hebdomadaires du Code du travail et du commerce, salaires versés déduits en totalité. Dons : déductibilité selon les articles du CTC (à vérifier). Taux d'imposition à appliquer selon le barème IRS en vigueur.</p>
${ordre.map(n => b.tables.find(x => x.titre === n)).filter(Boolean).map(table).join('\n')}
<p class="note">Justificatifs : ${i.justifs} dépense(s) sur ${i.nbDeps} ont une capture jointe dans l'espace employé du Caracas.</p>
<div class="sign"><div>Signature de la direction</div><div>Visa IRS</div></div>
</body></html>`;
    const texte = [`DOSSIER IRS · LE CARACAS`, `Semaine ${b.libelle}`, etat, '', ...recap.map(([k, v]) => `${k}\t${prix.format(v)}`),
      ...ordre.map(n => b.tables.find(x => x.titre === n)).filter(Boolean).flatMap(x => ['', x.titre.toUpperCase(), x.colonnes.join('\t'), ...(x.lignes.length ? x.lignes.map(l => l.join('\t')) : [x.vide])])].join('\n');
    return { html, texte };
  }

  /* Sauvegardes : copie complète des données de l'aperçu, restaurable, téléchargeable (JSON) et importable */
  const sauvegardesApercu = [];
  let sauvegardeArmee = null;
  function etatDonnees() {
    return structuredClone({
      pointages: pointagesApercu, ventes: ventesApercu, contrats: contratsApercu, rachats: rachatsApercu, depenses: depensesApercu,
      paies: paiesApercu, ecritures: ecrituresApercu, vehicules, clotures: cloturesApercu, prixNeufs: prixNeufsCache, equipe: equipeApercu, comptes: comptesApercu, reservations: reservationsApercu, primes: primesApercu,
      reglages: { marge: MARGE_REVENTE, taux: POSTES.map(p => [p.id, p.taux]), postes: etatPostes() },
    });
  }
  const resumeDonnees = d => `${(d.equipe || []).length} employé(s), ${(d.comptes || []).length} compte(s), ${d.ventes.length} vente(s), ${d.contrats.length} contrat(s), ${d.rachats.length} rachat(s), ${d.depenses.length} dépense(s), ${d.pointages.length} pointage(s), ${d.clotures.length} semaine(s) clôturée(s)`;
  function appliquerDonnees(d) {
    const remplacer = (t, n) => t.splice(0, t.length, ...structuredClone(n || []));
    remplacer(pointagesApercu, d.pointages);
    remplacer(ventesApercu, d.ventes);
    remplacer(contratsApercu, d.contrats);
    remplacer(rachatsApercu, d.rachats);
    remplacer(depensesApercu, d.depenses);
    remplacer(paiesApercu, d.paies);
    remplacer(ecrituresApercu, d.ecritures);
    remplacer(cloturesApercu, d.clotures);
    const equipeAvant = structuredClone(equipeApercu);
    remplacer(equipeApercu, d.equipe);
    if (EN_LIGNE) {
      /* En ligne : les comptes de connexion restent ceux du serveur ; on garde les fiches qui ont un compte */
      comptesApercu.forEach(c => {
        const avant = equipeAvant.find(e => e.id === c.employeId);
        if (avant && !equipeApercu.some(e => e.id === c.employeId)) equipeApercu.push(avant);
      });
    } else remplacer(comptesApercu, d.comptes);
    remplacer(reservationsApercu, d.reservations);
    remplacer(primesApercu, d.primes);
    vehicules = structuredClone(d.vehicules || []);
    if (d.prixNeufs) prixNeufsCache = structuredClone(d.prixNeufs);
    if (d.reglages) {
      if (d.reglages.marge >= 0) MARGE_REVENTE = d.reglages.marge;
      (d.reglages.taux || []).forEach(([id, taux]) => { const p = POSTES.find(x => x.id === id); if (p && taux >= 0) p.taux = taux; });
      appliquerPostes(d.reglages.postes);
    }
    demoChargee = [pointagesApercu, ventesApercu, depensesApercu, vehicules].some(t => t.some(x => x.demo));
    majBoutonsDemo();
    remplirCategories();
    rendreAccueil();
    rendreCatalogue();
  }
  function creerSauvegarde(motif) {
    const donnees = etatDonnees();
    sauvegardesApercu.unshift({ date: new Date(), par: identifiant || 'Aperçu', motif, donnees, resume: resumeDonnees(donnees) });
    journal('Historique', 'Sauvegarde créée', motif);
  }
  /* JSON : dates en ISO, relues en Date ; photos locales (blob:) non incluses */
  const RE_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  const versJSON = s => JSON.stringify({ application: 'caracas', version: 1, date: s.date, par: s.par, motif: s.motif, donnees: s.donnees },
    (k, v) => (typeof v === 'string' && v.startsWith('blob:') ? null : v), 1);
  const lireJSON = texte => JSON.parse(texte, (k, v) => (typeof v === 'string' && RE_DATE.test(v) ? new Date(v) : v));
  function panneauSauvegardes() {
    const blocs = [];
    const barre = el('div', 'actions-ligne histo-actions');
    const creer = el('button', 'btn btn-sm', 'Créer une sauvegarde');
    creer.type = 'button';
    creer.addEventListener('click', () => { creerSauvegarde('Sauvegarde manuelle'); rendreEspace('espace-historique'); });
    const fichier = el('input');
    fichier.type = 'file';
    fichier.accept = '.json,application/json';
    fichier.id = 'sv-import';
    fichier.className = 'sr-only';
    const lab = el('label', 'btn btn-sm btn-ghost', 'Importer un fichier de sauvegarde');
    lab.htmlFor = 'sv-import';
    const msg = el('p', 'form-message');
    msg.setAttribute('role', 'status');
    fichier.addEventListener('change', async () => {
      const f = fichier.files[0];
      if (!f) return;
      try {
        const o = lireJSON(await f.text());
        if (o.application !== 'caracas' || !o.donnees || !Array.isArray(o.donnees.ventes)) throw new Error('format');
        creerSauvegarde('Avant import');
        appliquerDonnees(o.donnees);
        sauvegardesApercu.unshift({ date: new Date(), par: identifiant || 'Aperçu', motif: `Importée : ${f.name}`, donnees: structuredClone(o.donnees), resume: resumeDonnees(o.donnees) });
        journal('Historique', 'Sauvegarde importée', f.name);
        rendreEspace('espace-historique');
        const m = $('#esp-corps .histo-actions + .form-message');
        if (m) { m.className = 'form-message succes'; m.textContent = `Données de « ${f.name} » chargées. Une sauvegarde « Avant import » a été créée.`; }
      } catch (e) {
        msg.className = 'form-message erreur';
        msg.textContent = "Ce fichier n'est pas une sauvegarde du Caracas.";
      }
      fichier.value = '';
    });
    barre.append(creer, lab, fichier);
    blocs.push(barre, msg);
    blocs.push(el('p', 'note-reserve', EN_LIGNE ? "Les données sont enregistrées en ligne automatiquement. Une sauvegarde fige l'état complet pour revenir en arrière si besoin ; le fichier .json en garde une copie hors ligne." : "Aperçu : les données ne sont pas encore enregistrées en ligne et disparaissent au rechargement de la page. Télécharge une sauvegarde (fichier .json) pour la réimporter plus tard. Les photos et justificatifs ne sont pas inclus dans le fichier."));
    const lignes = sauvegardesApercu.map(s => {
      const actions = el('div', 'actions-ligne');
      const arme = sauvegardeArmee === s;
      const rest = el('button', 'btn btn-mini' + (arme ? ' btn-danger' : ''), arme ? 'Confirmer la restauration' : 'Restaurer');
      rest.type = 'button';
      rest.addEventListener('click', () => {
        if (!arme) { sauvegardeArmee = s; } else {
          sauvegardeArmee = null;
          creerSauvegarde('Avant restauration');
          appliquerDonnees(s.donnees);
          journal('Historique', 'Sauvegarde restaurée', `${s.motif} · ${fmtDate(s.date)}`);
        }
        rendreEspace('espace-historique');
      });
      const tel = el('button', 'btn btn-mini btn-ghost', 'Télécharger');
      tel.type = 'button';
      const m = el('span', 'calcul-detail');
      tel.addEventListener('click', () => {
        const json = versJSON(s);
        offrirFichier({
          nom: `caracas-sauvegarde-${s.date.toISOString().slice(0, 16).replace(/[T:]/g, '-')}.json`, contenu: json, type: 'application/json',
          titre: 'Télécharger la sauvegarde', texte: json, copie: 'Sauvegarde copiée. Colle-la dans un fichier texte nommé caracas.json.',
          aide: "Le téléchargement n'est pas disponible ici. Copie le contenu et enregistre-le dans un fichier texte (.json) pour pouvoir l'importer plus tard.",
        }, tel, m);
      });
      actions.append(rest, tel);
      if (estPatron()) {
        const sup = el('button', 'btn btn-mini btn-ghost', 'Supprimer');
        sup.type = 'button';
        let armee = false;
        sup.addEventListener('click', () => {
          if (!armee) { armee = true; sup.textContent = 'Confirmer'; sup.className = 'btn btn-mini btn-danger'; return; }
          sauvegardesApercu.splice(sauvegardesApercu.indexOf(s), 1);
          journal('Historique', 'Sauvegarde supprimée', `${s.motif} · ${fmtDate(s.date)}`);
          rendreEspace('espace-historique');
        });
        actions.append(sup);
      }
      actions.append(m);
      return [fmtDate(s.date), s.par, s.motif, s.resume, actions];
    });
    blocs.push(panneauAvec('Sauvegardes', tableau(['Date', 'Créée par', 'Motif', 'Contenu', 'Actions'], lignes, 'Aucune sauvegarde. Une sauvegarde est aussi créée à chaque clôture de semaine.')));
    return blocs;
  }

  function panneauJournal() {
    const sections = [...new Set(journalApercu.map(x => x.section))].sort((a, b) => a.localeCompare(b, 'fr'));
    const barre = el('div', 'actions-ligne histo-actions');
    const ch = el('div', 'champ');
    const lab = el('label', null, 'Section');
    lab.htmlFor = 'jr-section';
    const sel = el('select');
    sel.id = 'jr-section';
    [['', 'Toutes les sections'], ...sections.map(x => [x, x])].forEach(([v, t]) => { const o = el('option', null, t); o.value = v; sel.append(o); });
    sel.value = sections.includes(filtreJournal) ? filtreJournal : '';
    sel.addEventListener('change', () => { filtreJournal = sel.value; rendreEspace('espace-historique'); });
    ch.append(lab, sel);
    const liste = journalApercu.filter(x => !sel.value || x.section === sel.value);
    const exp = el('button', 'btn btn-sm btn-ghost', 'Exporter (CSV)');
    exp.type = 'button';
    exp.disabled = !liste.length;
    const m = el('span', 'calcul-detail');
    exp.addEventListener('click', () => offrirTableau('Exporter le journal', `caracas-journal-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Date', 'Employé', 'Section', 'Action', 'Détail'], liste.map(x => [fmtDate(x.date), x.par, x.section, x.action, x.detail]), exp, m));
    barre.append(ch, exp, m);
    return [barre, panneauAvec(`Journal des modifications · ${liste.length} ligne(s)`, tableau(['Date', 'Employé', 'Section', 'Action', 'Détail'],
      liste.slice(0, 300).map(x => [fmtDate(x.date), x.par, x.section, x.action, x.detail]), 'Aucune modification enregistrée.'))];
  }

  function blocsHistorique() {
    const blocs = [boutonsSegment('Historique', [['semaines', 'Semaines'], ['sauvegardes', 'Sauvegardes'], ['journal', 'Journal des modifications']], ongletHisto,
      id => { ongletHisto = id; sauvegardeArmee = null; rendreEspace('espace-historique'); })];
    if (ongletHisto === 'sauvegardes') return [...blocs, ...panneauSauvegardes()];
    if (ongletHisto === 'journal') return [...blocs, ...panneauJournal()];

    const semaines = semainesConnues();
    if (!semaines.some(p => p.cle === semaineHisto)) semaineHisto = (semaines[1] || semaines[0]).cle;
    const per = semaines.find(p => p.cle === semaineHisto);
    const c = clotureDe(per.cle);
    const barre = el('div', 'actions-ligne histo-actions');
    const ch = el('div', 'champ histo-semaine');
    const lab = el('label', null, 'Semaine');
    lab.htmlFor = 'hi-semaine';
    const sel = el('select');
    sel.id = 'hi-semaine';
    semaines.forEach((p, i) => {
      const o = el('option', null, `Semaine ${p.libelle} · ${[i === 0 ? 'en cours' : '', clotureDe(p.cle) ? 'clôturée' : i === 0 ? '' : 'non clôturée'].filter(Boolean).join(', ')}`);
      o.value = p.cle;
      sel.append(o);
    });
    sel.value = per.cle;
    sel.addEventListener('change', () => { semaineHisto = sel.value; rendreEspace('espace-historique'); });
    ch.append(lab, sel);
    const irs = el('button', 'btn btn-sm', 'Télécharger le dossier IRS');
    irs.type = 'button';
    const m = el('span', 'calcul-detail');
    const bilan = c ? c.bilan : bilanSemaine(per);
    irs.addEventListener('click', () => {
      const d = dossierIRS(bilan, c);
      offrirFichier({
        nom: `dossier-irs-caracas-${per.debut.toISOString().slice(0, 10)}.html`, contenu: d.html, type: 'text/html',
        titre: 'Dossier IRS', texte: d.texte, copie: 'Dossier copié. Colle-le dans un document ou un tableur.',
        aide: "Le téléchargement n'est pas disponible ici. Copie le dossier (texte tabulé) pour le coller dans Google Docs, Sheets ou Excel.",
      }, irs, m);
    });
    barre.append(ch, irs, boutonDiscord(() => discordBilan(bilan, c), 'Copier pour Discord'), m);
    blocs.push(barre);
    blocs.push(el('p', 'calcul-detail paie-periode', c
      ? `Clôturée le ${fmtDate(new Date(c.le))} par ${c.par} : chiffres figés à la clôture.`
      : 'Non clôturée : chiffres calculés en direct. Clôture la semaine depuis le tableau de bord pour les figer.'));
    blocs.push(...rendreBilan(bilan));
    return blocs;
  }

  function bouton(texte) {
    const b = el('button', 'btn btn-sm', texte);
    b.type = 'button';
    b.disabled = true;
    b.title = 'Disponible quand les données seront branchées';
    return b;
  }
  function rendreEspace(page) {
    syncCompte();
    const c = ESPACE[page];
    $('#esp-titre').textContent = c.titre;
    $('#esp-intro').textContent = c.intro;
    document.querySelectorAll('.espace-liens a').forEach(a => {
      if (a.getAttribute('href') === '#' + page) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    clearInterval(horlogeTimer);
    const blocs = [];

    if (c.tableau) blocs.push(...blocsTableau());
    if (c.paie) blocs.push(...blocsPaie());
    if (c.badgeuse) {
      blocs.push(panneauBadge());
      blocs.push(...(estResponsable() ? historiqueBadgeuse() : [mesPointages()]));
    }

    const masque = c.reserve && !estResponsable();
    const contrat = c.onglets && sousVentes === 'contrat';
    if (c.tuiles && !masque) {
      const t = el('div', 'tuiles');
      c.tuiles.forEach(l => {
        const d = el('div', 'tuile');
        if (typeof l === 'object') d.append(el('p', 'tuile-label', l.label), el('p', 'tuile-valeur', l.valeur()), el('p', 'tuile-note', l.note()));
        else d.append(el('p', 'tuile-label', l), el('p', 'tuile-valeur', '—'), el('p', 'tuile-note', 'Aucune donnée'));
        t.append(d);
      });
      blocs.push(t);
    }

    (c.reglages || []).forEach(g => {
      const p = el('div', 'panneau');
      const tete = el('div', 'panneau-tete');
      tete.append(el('h2', 'panneau-titre', g.titre));
      const corps = el('div', 'reglages');
      g.champs.forEach(([label, val]) => {
        const id = 'r-' + (g.titre + '-' + label).toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-');
        const ch = el('div', 'champ');
        const lab = el('label', null, label);
        lab.htmlFor = id;
        const inp = el('input');
        inp.id = id;
        inp.value = val;
        inp.disabled = true;
        ch.append(lab, inp);
        corps.append(ch);
      });
      p.append(tete, corps);
      blocs.push(p);
    });
    if (c.reglages) blocs.push(bouton('Enregistrer les paramètres'));
    if (c.marge && estResponsable()) blocs.push(panneauMarge());
    if (c.remuneration && estPatron()) blocs.push(panneauRemuneration());
    if (c.prixVehicules) blocs.push(estResponsable() ? panneauPrix() : el('p', 'note-reserve', 'La modification des prix des véhicules est réservée aux managers et à la direction.'));
    if (c.calculateur) blocs.push(calculateurRachat());
    if (c.onglets) {
      const seg = el('div', 'segment sous-onglets');
      seg.setAttribute('role', 'group');
      seg.setAttribute('aria-label', 'Type de vente');
      c.onglets.forEach(o => {
        const b = el('button', null, o.nom);
        b.type = 'button';
        b.setAttribute('aria-pressed', String(sousVentes === o.id));
        b.addEventListener('click', () => { sousVentes = o.id; rendreEspace(page); });
        seg.append(b);
      });
      blocs.unshift(seg);
    }
    if (c.formulaire === 'vente' && !contrat) blocs.push(formulaireVente());
    if (contrat) blocs.push(formulaireContrat());
    if (c.formulaire === 'rachat' && !masque) blocs.push(formulaireRachat());
    if (c.compta && !masque) blocs.push(...blocsCompta());
    if (c.equipe) blocs.push(blocEquipe());
    if (c.equipe && estResponsable()) blocs.push(panneauRIB());
    if (c.comptes) blocs.push(...blocsComptes());
    if (c.historique && !masque) blocs.push(...blocsHistorique());
    if (c.formulaire === 'depense' && !masque) blocs.push(formulaireDepense());
    if (c.stockManuel && estResponsable()) blocs.push(formulaireStock());
    if (c.plafonds && !masque) blocs.push(panneauPlafonds());
    if (masque) blocs.push(el('p', 'note-reserve', c.messageReserve || 'Le registre des rachats est réservé aux managers et à la direction. Envoie ton devis sur Discord pour validation.'));

    (contrat ? c.registresContrat : masque ? [] : c.registres || []).forEach(r => {
      if (r.reserveResp && !estResponsable()) return;
      const panneau = el('div', 'panneau');
      const tete = el('div', 'panneau-tete');
      tete.append(el('h2', 'panneau-titre', r.titre));
      const note = r.note ? r.note() : '';
      if (note) tete.append(el('p', 'panneau-note', note));
      if (r.action) tete.append(bouton('+ ' + r.action));
      const defil = el('div', 'tableau-defil');
      const table = el('table', 'tableau');
      const tr = el('tr');
      const cols = typeof r.colonnes === 'function' ? r.colonnes() : r.colonnes;
      cols.forEach(col => { const th = el('th', null, col); th.scope = 'col'; tr.append(th); });
      const thead = el('thead');
      thead.append(tr);
      const tbody = el('tbody');
      const lignes = r.lignes ? r.lignes() : [];
      if (lignes.length) {
        lignes.forEach(cells => {
          const ligne = el('tr');
          cells.forEach(x => {
            const td = el('td');
            if (x instanceof Node) td.append(x); else td.textContent = x;
            ligne.append(td);
          });
          tbody.append(ligne);
        });
      } else {
        const ligne = el('tr');
        const td = el('td', 'tableau-vide', r.vide);
        td.colSpan = cols.length;
        ligne.append(td);
        tbody.append(ligne);
      }
      table.append(thead, tbody);
      defil.append(table);
      panneau.append(tete, defil);
      blocs.push(panneau);
    });
    $('#esp-corps').replaceChildren(...blocs);
    majBadgeRapide();
    planifierSync();
  }

  /* Navigation par #page ou #id-vehicule */
  function montrerVue(vue) {
    document.querySelectorAll('[data-view]').forEach(v => { v.hidden = v.dataset.view !== vue; });
  }
  function marquerNav(page) {
    nav.querySelectorAll('a:not(.btn)').forEach(a => {
      const cible = a.getAttribute('href').slice(1);
      if (cible === page || (CATALOGUE[page] && cible === 'catalogue') || (ESPACE[page] && cible === 'employes')) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }
  function route() {
    const h = location.hash.slice(1);
    setMenu(false);
    const v = vehicules.find(x => x.id === h && enLigne(x));
    if (v) {
      if (pageCourante !== 'accueil' && !CATALOGUE[pageCourante]) afficherCatalogue(v.type === 'neuf' ? 'neufs' : 'occasions');
      retour = pageCourante;
      ouvrirFiche(v);
      return;
    }
    if (dlg.open) dlg.close();
    if (h === 'employes' || ESPACE[h]) {
      pageCourante = h;
      marquerNav(h);
      if (!connecte) {
        montrerVue('connexion');
      } else {
        montrerVue('espace');
        rendreEspace(ESPACE[h] ? h : 'espace');
      }
      window.scrollTo(0, 0);
      return;
    }
    const page = PAGES[h] ? h : 'accueil';
    if (CATALOGUE[page]) {
      afficherCatalogue(page);
    } else {
      pageCourante = page;
      montrerVue(page === 'accueil' ? 'accueil' : 'soon');
      $('#soon-label').textContent = PAGES[page];
      marquerNav(page);
    }
    window.scrollTo(0, 0);
  }
  /* ==================== Mode en ligne (Supabase) ====================
     Actif quand assets/js/config.js contient l'adresse et la clé publique du projet. Sinon : mode aperçu (données en mémoire).
     Une table « elements » : une ligne par élément (collection + id + data). Chaque rendu compare l'état local à la dernière
     version enregistrée et n'envoie que ce qui a changé ; le temps réel applique les changements des autres employés. */
  const CONFIG = window.CARACAS_CONFIG || {};
  const EN_LIGNE = !!(CONFIG.supabaseUrl && CONFIG.supabaseKey);
  const DOMAINE = CONFIG.domaine || 'caracas.app';
  const emailDe = ident => `${ident.trim().toLowerCase()}@${DOMAINE}`;
  let sb = null;
  let sessionEnLigne = null;
  let vehiculesEnLigne = false;
  let vehiculesExemples = [];
  const mdpEnLigne = {};
  const COLL = {
    equipe: () => equipeApercu, comptes: () => comptesApercu, ventes: () => ventesApercu, contrats: () => contratsApercu,
    rachats: () => rachatsApercu, pointages: () => pointagesApercu, depenses: () => depensesApercu, paies: () => paiesApercu,
    ecritures: () => ecrituresApercu, clotures: () => cloturesApercu, reservations: () => reservationsApercu,
    journal: () => journalApercu, sauvegardes: () => sauvegardesApercu, vehicules: () => vehicules, primes: () => primesApercu,
  };
  const SECRETS = new Set(['mdp', 'hash', 'sel', '_id']);
  const idDe = x => String(x.id || x._id || (x._id = crypto.randomUUID()));
  /* JSON stable (clés triées) : sert à comparer l'état local et celui du serveur */
  const propre = v => {
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(propre);
    if (v && typeof v === 'object') {
      const o = {};
      Object.keys(v).sort().forEach(k => { if (!SECRETS.has(k) && v[k] !== undefined) o[k] = propre(v[k]); });
      return o;
    }
    return typeof v === 'string' && v.startsWith('blob:') ? null : v;
  };
  const canon = v => JSON.stringify(propre(v));
  const raviver = v => {
    if (typeof v === 'string') return RE_DATE.test(v) ? new Date(v) : v;
    if (Array.isArray(v)) return v.map(raviver);
    if (v && typeof v === 'object') { Object.keys(v).forEach(k => { v[k] = raviver(v[k]); }); return v; }
    return v;
  };
  const reglagesEtat = () => ({ marge: MARGE_REVENTE, taux: POSTES.map(p => [p.id, p.taux]), postes: etatPostes() });
  const appliquerReglages = d => {
    if (d.marge >= 0) MARGE_REVENTE = d.marge;
    (d.taux || []).forEach(([id, t]) => { const p = POSTES.find(x => x.id === id); if (p && t >= 0) p.taux = t; });
    appliquerPostes(d.postes);
  };
  const versionServeur = {};
  let syncMinuteur = null;
  let syncEnCours = false;
  let syncEncore = false;
  function etatSync(etat, detail) {
    const b = $('#bandeau-apercu');
    if (!b || !EN_LIGNE) return;
    b.dataset.etat = etat;
    b.textContent = { ok: 'En ligne · tout est enregistré', envoi: 'En ligne · enregistrement…', erreur: `En ligne · erreur d'enregistrement${detail ? ' : ' + detail : ''} (nouvel essai automatique)` }[etat];
  }
  function planifierSync() {
    if (!sb || !compteConnecte) return;
    clearTimeout(syncMinuteur);
    syncMinuteur = setTimeout(synchroniser, 300);
  }
  function elementsLocaux() {
    const l = [];
    Object.entries(COLL).forEach(([c, get]) => get().forEach(x => { if (!x.demo) l.push([c, idDe(x), x]); }));
    l.push(['reglages', 'general', reglagesEtat()]);
    if (prixNeufsCache && prixNeufsCache.some(x => x.modifie || x.ajoute)) l.push(['reglages', 'prix', { liste: prixNeufsCache }]);
    return l;
  }
  async function synchroniser() {
    if (!sb || !compteConnecte) return;
    if (syncEnCours) { syncEncore = true; return; }
    syncEnCours = true;
    const envois = [];
    const vus = new Set();
    elementsLocaux().forEach(([c, id, x]) => {
      const k = c + '|' + id;
      vus.add(k);
      const j = canon(x);
      if (versionServeur[k] !== j) envois.push({ k, j, ligne: { collection: c, id, data: JSON.parse(j), maj: new Date().toISOString() } });
    });
    const retraits = Object.keys(versionServeur).filter(k => !vus.has(k) && !k.startsWith('mdp|'));
    if (!envois.length && !retraits.length) { syncEnCours = false; return; }
    etatSync('envoi');
    try {
      let refus = 0;
      for (let i = 0; i < envois.length; i += 200) {
        const lot = envois.slice(i, i + 200);
        const { error } = await sb.from('elements').upsert(lot.map(e => e.ligne));
        if (!error) { lot.forEach(e => { versionServeur[e.k] = e.j; }); continue; }
        if (error.code !== '42501') throw error;
        /* Refus des droits (ex. un vendeur qui toucherait à l'équipe) : on envoie un par un pour sauver le reste */
        for (const e of lot) {
          const { error: err } = await sb.from('elements').upsert(e.ligne);
          if (!err) versionServeur[e.k] = e.j;
          else if (err.code === '42501') { versionServeur[e.k] = e.j; refus += 1; } else throw err;
        }
      }
      const parColl = {};
      retraits.forEach(k => { const [c, ...id] = k.split('|'); (parColl[c] = parColl[c] || []).push(id.join('|')); });
      for (const [c, ids] of Object.entries(parColl)) {
        const { error } = await sb.from('elements').delete().eq('collection', c).in('id', ids);
        if (error) throw error;
        ids.forEach(id => { delete versionServeur[c + '|' + id]; });
      }
      if (refus) etatSync('erreur', `${refus} modification(s) refusée(s) : droits insuffisants`);
      else etatSync('ok');
    } catch (e) {
      etatSync('erreur', e.message);
      setTimeout(planifierSync, 5000);
    } finally {
      syncEnCours = false;
      if (syncEncore) { syncEncore = false; planifierSync(); }
    }
  }
  /* Charge toutes les données visibles (employé : tout ; visiteur : véhicules publiés) */
  async function chargerEnLigne() {
    const lignes = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await sb.from('elements').select('collection,id,data').range(de, de + 999);
      if (error) throw error;
      lignes.push(...data);
      if (data.length < 1000) break;
    }
    const par = {};
    lignes.forEach(r => { (par[r.collection] = par[r.collection] || []).push(r); });
    Object.keys(versionServeur).forEach(k => delete versionServeur[k]);
    Object.entries(COLL).forEach(([c, get]) => {
      const items = (par[c] || []).map(r => { versionServeur[c + '|' + r.id] = canon(r.data); const x = raviver(r.data); if (!x.id) x._id = r.id; return x; });
      if (c === 'vehicules') {
        if (items.length || compteConnecte) { vehicules = items; vehiculesEnLigne = true; }
      } else get().splice(0, get().length, ...items);
    });
    (par.reglages || []).forEach(r => {
      versionServeur['reglages|' + r.id] = canon(r.data);
      if (r.id === 'general') appliquerReglages(r.data);
      if (r.id === 'prix') { prixNeufsCache = raviver(r.data.liste); prixNeufs = Promise.resolve(prixNeufsCache); }
    });
    (par.mdp || []).forEach(r => { versionServeur['mdp|' + r.id] = canon(r.data); mdpEnLigne[r.id] = r.data.mdp; });
    pointagesApercu.sort((a, b) => b.debut - a.debut);
    remplirCategories();
    rendreAccueil();
    rendreCatalogue();
  }
  /* Temps réel : applique les changements faits par les autres (les siens sont reconnus et ignorés) */
  let aRendre = false;
  const saisieEnCours = () => { const a = document.activeElement; return a && /INPUT|SELECT|TEXTAREA/.test(a.tagName) && a.closest('#esp-corps, dialog[open]'); };
  function rafraichir() {
    if (saisieEnCours()) { aRendre = true; return; }
    aRendre = false;
    rendreAccueil();
    rendreCatalogue();
    if (connecte && ESPACE[location.hash.slice(1)]) rendreEspace(pageEspace());
  }
  document.addEventListener('focusout', () => setTimeout(() => { if (aRendre && !saisieEnCours()) rafraichir(); }, 50));
  function changementDistant(p) {
    const r = p.eventType === 'DELETE' ? p.old : p.new;
    if (!r || !r.collection) return;
    const k = r.collection + '|' + r.id;
    if (p.eventType === 'DELETE') {
      if (!(k in versionServeur)) return;
      delete versionServeur[k];
      const get = COLL[r.collection];
      if (get) { const t = get(); const i = t.findIndex(x => idDe(x) === r.id); if (i >= 0) t.splice(i, 1); }
      rafraichir();
      return;
    }
    const j = canon(r.data);
    if (versionServeur[k] === j) return;
    versionServeur[k] = j;
    if (r.collection === 'reglages') { if (r.id === 'general') appliquerReglages(r.data); if (r.id === 'prix') { prixNeufsCache = raviver(r.data.liste); prixNeufs = Promise.resolve(prixNeufsCache); } rafraichir(); return; }
    if (r.collection === 'mdp') { mdpEnLigne[r.id] = r.data.mdp; rafraichir(); return; }
    const get = COLL[r.collection];
    if (!get) return;
    const x = raviver(r.data);
    if (!x.id) x._id = r.id;
    const t = get();
    const i = t.findIndex(y => idDe(y) === r.id);
    if (i >= 0) t[i] = x; else t.unshift(x);
    if (r.collection === 'comptes' && compteConnecte && compteConnecte.id === x.id) compteConnecte = x;
    if (r.collection === 'pointages') pointagesApercu.sort((a, b) => b.debut - a.debut);
    rafraichir();
  }
  let canal = null;
  function ecouter() {
    if (canal) sb.removeChannel(canal);
    canal = sb.channel('elements').on('postgres_changes', { event: '*', schema: 'public', table: 'elements' }, changementDistant).subscribe();
  }
  /* Ouvre la session d'un compte Supabase : retrouve le compte et la fiche Équipe */
  async function ouvrirSessionEnLigne(user) {
    compteConnecte = { id: '__chargement', userId: user.id };
    await chargerEnLigne();
    const c = comptesApercu.find(x => x.userId === user.id);
    const emp = c && equipeApercu.find(x => x.id === c.employeId);
    if (!c || !emp || !c.actif) { compteConnecte = null; await sb.auth.signOut(); return c && !c.actif ? 'Ce compte est désactivé. Contacte la direction.' : 'Compte introuvable. Contacte la direction.'; }
    if ((POSTES.find(p => p.id === emp.poste) || {}).responsable) c.derniere = new Date();
    compteConnecte = c;
    posteApercu = emp.poste;
    selPoste.value = emp.poste;
    setConnecte(nomComplet(emp));
    ecouter();
    etatSync('ok');
    planifierSync();
    return '';
  }
  async function connexionEnLigne(id, mdp) {
    const { data, error } = await sb.auth.signInWithPassword({ email: emailDe(id), password: mdp });
    if (error) return 'Identifiant ou mot de passe incorrect.';
    const m = await ouvrirSessionEnLigne(data.user);
    if (!m) journal('Comptes', 'Connexion', id);
    return m;
  }
  /* Crée un utilisateur de connexion sans toucher à la session en cours */
  async function creerUtilisateur(ident, mdp) {
    const tmp = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'caracas-tmp' } });
    const { data, error } = await tmp.auth.signUp({ email: emailDe(ident), password: mdp });
    if (error) throw new Error(/registered|exists/i.test(error.message) ? `L'identifiant « ${ident} » est déjà utilisé.` : error.message);
    if (!data.user || !data.user.id || (data.user.identities && !data.user.identities.length)) throw new Error(`L'identifiant « ${ident} » est déjà utilisé.`);
    return data.user.id;
  }
  async function rpc(nom, args) {
    const { error } = await sb.rpc(nom, args);
    if (error) throw new Error(error.message);
  }

  /* Première installation : aucun compte en base → création du compte du patron */
  async function premiereInstallation() {
    const { data } = await sb.rpc('base_vide');
    const boite = $('#form-connexion');
    if (!data || $('#form-installation')) return;
    const f = el('form', 'boite-connexion');
    f.id = 'form-installation';
    f.noValidate = true;
    f.innerHTML = `<div class="section-tete"><p class="eyebrow">Première installation</p><h1>Compte du patron</h1></div>
      <p class="note-apercu">La base en ligne est vide. Crée la fiche et le compte du patron : il pourra ensuite ajouter l'équipe et ses comptes.</p>
      <div class="em-grille">
        <div class="champ"><label for="in-prenom">Prénom</label><input id="in-prenom" autocomplete="off"></div>
        <div class="champ"><label for="in-nom">Nom</label><input id="in-nom" autocomplete="off"></div>
        <div class="champ"><label for="in-tel">Téléphone</label><input id="in-tel" maxlength="8" inputmode="numeric" placeholder="555-0142" autocomplete="off"></div>
        <div class="champ"><label for="in-rib">RIB</label><input id="in-rib" autocomplete="off"></div>
        <div class="champ em-large"><label for="in-id">Identifiant de connexion</label><input id="in-id" autocomplete="off" spellcheck="false"></div>
        <div class="champ"><label for="in-mdp">Mot de passe</label><input id="in-mdp" type="password" autocomplete="new-password"></div>
        <div class="champ"><label for="in-mdp2">Confirmation</label><input id="in-mdp2" type="password" autocomplete="new-password"></div>
      </div>
      <button class="btn" type="submit">Créer le compte du patron</button>
      <p class="form-message erreur" id="in-message" role="status"></p>`;
    boite.hidden = true;
    boite.after(f);
    const v = s => f.querySelector(s).value.trim();
    const tel = f.querySelector('#in-tel');
    tel.addEventListener('input', () => { const c = tel.value.replace(/\D/g, '').slice(0, 7); tel.value = c.length > 3 ? c.slice(0, 3) + '-' + c.slice(3) : c; });
    f.querySelector('#in-prenom').addEventListener('input', () => { f.querySelector('#in-id').value = identifiantPropose({ prenom: v('#in-prenom'), nom: v('#in-nom') }); });
    f.querySelector('#in-nom').addEventListener('input', () => { f.querySelector('#in-id').value = identifiantPropose({ prenom: v('#in-prenom'), nom: v('#in-nom') }); });
    f.addEventListener('submit', async ev => {
      ev.preventDefault();
      const msg = f.querySelector('#in-message');
      const mdp = f.querySelector('#in-mdp').value;
      if (v('#in-prenom').length < 2 || v('#in-nom').length < 2 || !RE_TEL.test(v('#in-tel')) || v('#in-rib').length < 4) { msg.textContent = 'Remplis prénom, nom, téléphone 555-xxxx et RIB.'; return; }
      if (!RE_IDENTIFIANT.test(v('#in-id'))) { msg.textContent = 'Identifiant : 3 à 30 caractères (lettres, chiffres, . _ -).'; return; }
      if (mdp.length < 6 || mdp !== f.querySelector('#in-mdp2').value) { msg.textContent = 'Mot de passe : 6 caractères minimum, confirmation identique.'; return; }
      msg.textContent = 'Création…';
      const { data: d, error } = await sb.auth.signUp({ email: emailDe(v('#in-id')), password: mdp });
      if (error || !d.session) { msg.textContent = error ? error.message : "Désactive « Confirm email » dans Supabase (Authentication > Sign In / Providers > Email), puis réessaie."; return; }
      const emp = { id: 'em-' + Date.now().toString(36), prenom: v('#in-prenom'), nom: v('#in-nom'), tel: v('#in-tel'), rib: v('#in-rib'), poste: 'patron', embauche: new Date(), par: 'Installation' };
      const cpt = { id: 'cpt-' + Date.now().toString(36), employeId: emp.id, userId: d.user.id, identifiant: v('#in-id'), actif: true, creeLe: new Date(), par: 'Installation', derniere: null };
      [pointagesApercu, ventesApercu, contratsApercu, rachatsApercu, depensesApercu, paiesApercu, ecrituresApercu, cloturesApercu, equipeApercu, comptesApercu, reservationsApercu, journalApercu, sauvegardesApercu].forEach(t => t.splice(0));
      equipeApercu.push(emp);
      comptesApercu.push(cpt);
      vehicules = vehiculesExemples.map(x => ({ ...x }));
      compteConnecte = cpt;
      journal('Installation', 'Base en ligne créée', `${nomComplet(emp)} · ${cpt.identifiant}`);
      await synchroniser();
      try { await rpc('definir_mdp', { p_user: d.user.id, p_mdp: mdp }); } catch (e) { /* le mot de passe reste valable, seule la copie lisible manque */ }
      const m = await ouvrirSessionEnLigne(d.user);
      if (m) { msg.textContent = m; return; }
      f.remove();
      boite.hidden = false;
      majRole();
      location.hash = '#espace';
      route();
    });
  }

  async function initEnLigne() {
    $('#bandeau-apercu').textContent = 'En ligne · connexion au serveur…';
    $('.note-apercu').textContent = "Connecte-toi avec l'identifiant et le mot de passe donnés par la direction.";
    $('#demo-charger').hidden = true;
    $('#demo-effacer').hidden = true;
    try {
      await new Promise((ok, ko) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
        s.onload = ok;
        s.onerror = ko;
        document.head.append(s);
      });
      sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
      const { data } = await sb.auth.getSession();
      sessionEnLigne = data.session;
      if (sessionEnLigne) {
        const m = await ouvrirSessionEnLigne(sessionEnLigne.user);
        if (m) $('#c-message').textContent = m;
      } else {
        await chargerEnLigne();
        ecouter();
        premiereInstallation();
      }
      majRole();
      route();
    } catch (e) {
      $('#c-message').textContent = 'Serveur injoignable : réessaie dans un instant.';
    }
  }
  if (EN_LIGNE) {
    setConnecte('');
    document.documentElement.classList.add('en-ligne');
  }

  addEventListener('hashchange', route);
  route();
  if (EN_LIGNE) initEnLigne();

  fetch('data/vehicules.json')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(liste => {
      vehiculesExemples = liste;
      if (vehiculesEnLigne) return;
      vehicules = liste;
      remplirCategories();
      rendreAccueil();
      rendreCatalogue();
      if (vehicules.some(v => v.id === location.hash.slice(1))) route();
      else if (connecte && ESPACE[location.hash.slice(1)]) rendreEspace(pageEspace());
    })
    .catch(() => {
      const msg = "Le catalogue ne s'est pas chargé. Rechargez la page dans quelques instants.";
      $('#car-piste').replaceChildren(el('p', 'vide', msg));
      $('.car-ctrl').hidden = true;
      $('#arrivages').replaceChildren(el('p', 'vide', msg));
      $('#cat-grille').replaceChildren(el('p', 'vide', msg));
    });
})();
