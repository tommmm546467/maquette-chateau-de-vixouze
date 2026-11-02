/* Château de Vixouze : le panneau « Vérifier une date » (mécanisme repris du Château de Bourguignon).
   Tout bouton [data-date] ouvre un panneau à droite : on choisit l'événement et le nombre d'invités, on voit les
   jours libres ou déjà réservés (un seul événement par jour au domaine), on choisit sa date.
   « Continuer ma demande » ouvre le formulaire de contact avec la date, l'événement et les invités déjà remplis.
   Sans JavaScript, chaque bouton garde son lien vers le formulaire. Les réservations ci-dessous sont un exemple. */
(function () {
  'use strict';
  var RESERVE = ['2026-11-14', '2026-11-28', '2026-12-12', '2026-12-31', '2027-04-24', '2027-05-08', '2027-05-15', '2027-05-29',
    '2027-06-05', '2027-06-12', '2027-06-19', '2027-06-26', '2027-07-03', '2027-07-10', '2027-07-17', '2027-07-24',
    '2027-08-07', '2027-08-21', '2027-08-28', '2027-09-04', '2027-09-11', '2027-09-18', '2027-10-02'];
  var EVENEMENTS = { mariage: 'Un mariage', entreprise: 'Un événement d’entreprise', fete: 'Une fête de famille' };
  var BOUTONS = { mariage: 'Mariage', entreprise: 'Entreprise', fete: 'Fête de famille' };
  var INVITES = ['50 à 100', '100 à 180', '180 à 260', '260 à 350'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var cle = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var date = function (k) { var p = k.split('-'); return new Date(+p[0], p[1] - 1, +p[2]); };
  var aujourdhui = cle(new Date());
  var lisible = function (k) { var d = date(k); return JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()] + ' ' + d.getFullYear(); };
  var etat = function (k) { return k < aujourdhui ? 'passe' : RESERVE.indexOf(k) >= 0 ? 'reserve' : 'libre'; };

  var s = { evenement: 'mariage', invites: INVITES[0], mois: aujourdhui.slice(0, 7), jour: null, message: '' };
  var panneau, ouvreur;

  function construire() {
    panneau = document.createElement('div');
    panneau.className = 'cal';
    panneau.hidden = true;
    panneau.setAttribute('role', 'dialog');
    panneau.setAttribute('aria-modal', 'true');
    panneau.setAttribute('aria-labelledby', 'cal-titre');
    var evts = Object.keys(EVENEMENTS).map(function (k) { return '<button type="button" data-evenement="' + k + '" aria-pressed="false">' + BOUTONS[k] + '</button>'; }).join('');
    var invites = INVITES.map(function (v) { return '<option value="' + v + '">' + v + ' invités</option>'; }).join('');
    panneau.innerHTML =
      '<div class="cal__voile" data-cal-fermer></div>' +
      '<aside class="cal__panneau">' +
        '<div class="cal__tete"><div><span class="surtitre">Le calendrier</span><h2 id="cal-titre">Votre date est-elle <em>libre</em> ?</h2></div>' +
        '<button type="button" class="cal__fermer" data-cal-fermer aria-label="Fermer le calendrier">×</button></div>' +
        '<div class="cal__corps">' +
          '<p class="cal__etiquette">Votre événement</p><div class="cal__choix-ligne">' + evts + '</div>' +
          '<p class="cal__etiquette">Vos invités</p><select class="cal__select" aria-label="Nombre d’invités">' + invites + '</select>' +
          '<div class="cal__nav"><button type="button" class="cal__fleche" data-cal-mois="-1" aria-label="Mois précédent">←</button>' +
          '<h3 class="cal__titre-mois" aria-live="polite"></h3>' +
          '<button type="button" class="cal__fleche" data-cal-mois="1" aria-label="Mois suivant">→</button></div>' +
          '<div class="cal__jours" aria-hidden="true"><span>lun.</span><span>mar.</span><span>mer.</span><span>jeu.</span><span>ven.</span><span>sam.</span><span>dim.</span></div>' +
          '<div class="cal__grille"></div>' +
          '<ul class="cal__legende"><li><span class="cal__pastille"></span>Libre</li><li><span class="cal__pastille cal__pastille--reserve"></span>Déjà réservé</li><li><span class="cal__pastille cal__pastille--choisi"></span>Votre date</li></ul>' +
        '</div>' +
        '<div class="cal__pied"><p class="cal__message" aria-live="polite"></p>' +
          '<a class="btn btn-plein cal__continuer" href="contact.html#demande" aria-disabled="true">Continuer ma demande</a>' +
          '<p class="cal__note">Un seul événement par jour : le château est entièrement à vous.</p></div>' +
      '</aside>';
    document.body.appendChild(panneau);
    $('.cal__select', panneau).addEventListener('change', function (e) { s.invites = e.target.value; dessiner(); });
    panneau.addEventListener('click', function (e) {
      if (e.target.closest('[data-cal-fermer]')) return fermer();
      var ev = e.target.closest('[data-evenement]');
      if (ev) { s.evenement = ev.getAttribute('data-evenement'); return dessiner(); }
      var f = e.target.closest('[data-cal-mois]');
      if (f) { var d = date(s.mois + '-01'); d.setMonth(d.getMonth() + +f.getAttribute('data-cal-mois')); s.mois = cle(d).slice(0, 7); return dessiner(); }
      var j = e.target.closest('[data-jour]');
      if (j) return choisir(j.getAttribute('data-jour'));
      var c = e.target.closest('.cal__continuer');
      if (c && c.getAttribute('aria-disabled') === 'true') { e.preventDefault(); s.message = 'Choisissez d’abord une date libre dans le calendrier.'; dessiner(); }
    });
    panneau.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') fermer();
      if (e.key === 'Tab') { // le focus reste dans le panneau
        var f = $$('button, a[href], select', $('.cal__panneau', panneau)).filter(function (x) { return x.offsetParent !== null; });
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  function choisir(k) {
    var e = etat(k);
    if (e === 'reserve') { s.message = 'Le ' + lisible(k) + ' est déjà réservé : choisissez une autre date.'; return dessiner(); }
    if (e === 'passe') return;
    s.jour = k; s.message = '';
    dessiner();
  }

  function dessiner() {
    $$('[data-evenement]', panneau).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-evenement') === s.evenement); });
    $('.cal__select', panneau).value = s.invites;
    var premier = date(s.mois + '-01');
    $('.cal__titre-mois', panneau).textContent = MOIS[premier.getMonth()] + ' ' + premier.getFullYear();
    $('[data-cal-mois="-1"]', panneau).disabled = s.mois <= aujourdhui.slice(0, 7);
    var html = '', decalage = (premier.getDay() + 6) % 7;
    for (var i = 0; i < decalage; i++) html += '<span></span>';
    for (var d = new Date(premier); d.getMonth() === premier.getMonth(); d.setDate(d.getDate() + 1)) {
      var k = cle(d), e = etat(k);
      var nom = lisible(k) + ', ' + { libre: 'libre', reserve: 'déjà réservé', passe: 'passé' }[e];
      html += '<button type="button" class="cal__jour cal__jour--' + e + (k === s.jour ? ' est-choisi' : '') + '" data-jour="' + k + '"' +
        (e === 'passe' ? ' disabled' : '') + (e === 'reserve' ? ' aria-disabled="true"' : '') + ' aria-label="' + nom + '">' + d.getDate() + '</button>';
    }
    $('.cal__grille', panneau).innerHTML = html;
    var msg = $('.cal__message', panneau), suite = $('.cal__continuer', panneau);
    if (s.jour) {
      msg.innerHTML = '<strong>Le ' + lisible(s.jour) + ' est libre.</strong><br>' + EVENEMENTS[s.evenement] + ', ' + s.invites + ' invités.' + (s.message ? '<br>' + s.message : '');
      suite.href = 'contact.html?date=' + s.jour + '&evenement=' + s.evenement + '&invites=' + encodeURIComponent(s.invites) + '#demande';
      suite.removeAttribute('aria-disabled');
    } else {
      msg.textContent = s.message || 'Choisissez une date libre dans le calendrier.';
      suite.href = 'contact.html#demande';
      suite.setAttribute('aria-disabled', 'true');
    }
  }

  function ouvrir(e) {
    if (e) e.preventDefault();
    if (!panneau) construire();
    ouvreur = document.activeElement;
    var voulu = e && e.currentTarget && e.currentTarget.getAttribute('data-date');
    if (voulu && EVENEMENTS[voulu]) s.evenement = voulu;
    s.message = '';
    dessiner();
    panneau.hidden = false;
    document.body.classList.add('cal-ouvert');
    var entete = $('.entete');
    if (entete && entete.classList.contains('menu-ouvert')) $('.burger').click();
    requestAnimationFrame(function () { panneau.classList.add('est-ouvert'); $('.cal__fermer', panneau).focus(); });
  }
  function fermer() {
    panneau.classList.remove('est-ouvert');
    document.body.classList.remove('cal-ouvert');
    setTimeout(function () { panneau.hidden = true; }, 350);
    if (ouvreur && ouvreur.focus) ouvreur.focus();
  }

  $$('[data-date]').forEach(function (b) { b.addEventListener('click', ouvrir); });

  /* Page contact : on reprend la date, l'événement et les invités choisis dans le panneau */
  var form = $('form[data-formulaire]');
  var p = new URLSearchParams(location.search);
  if (form && p.get('date')) {
    $('#c-date', form).value = p.get('date');
    if (EVENEMENTS[p.get('evenement')]) $('#c-evenement', form).value = p.get('evenement');
    if (INVITES.indexOf(p.get('invites')) >= 0) $('#c-invites', form).value = p.get('invites');
  }
})();
