/* Configuration de Trokémon. Ce fichier est public : il ne doit contenir QUE des clés publiques.
   Ne mets jamais ici la clé "service_role" de Supabase. */
window.TK_CONFIG = {
  /* Supabase > Project Settings > API : "Project URL" et clé "anon public".
     Laisse vide pour tester en mode démo (données fictives, rien n'est enregistré). */
  SUPABASE_URL: 'https://yspeztbrwepzgtptljto.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_p98GocBhfkZYDbgWnVCPng_gnyKawa8',

  /* Fond de carte. Les tuiles CARTO conviennent pour une bêta ; vérifie leurs conditions
     avant un lancement public, ou remplace par un autre fournisseur (une seule ligne à changer). */
  /* Clé gratuite CARTO (https://carto.com/basemaps/apikey/) : sans elle, un filigrane « API KEY REQUIRED » s'affiche sur la carte. */
  CARTO_KEY: 'https://carto.com/basemaps/apikey/',
  TILE_URL: 'https://basemaps.cartocdn.com/rastertiles/{style}/{z}/{x}/{y}{r}.png',
  TILE_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',

  /* Liens d'achat neuf pour les produits scellés. Laisse vide tant que tu n'as pas de compte affilié.
     ebay   : colle ici les paramètres fournis par eBay Partner Network (ex. "mkcid=1&mkrid=...&campid=...")
     amazon : ton identifiant Partenaires (ex. "monid-21")
     Un lien n'est présenté comme affilié que si la valeur correspondante est renseignée. */
  AFFILIATE: { ebay: '', amazon: '' },

  /* Pages légales (legal.html). REMPLIS ces champs avec tes vraies informations avant de publier :
     la loi (LCEN, art. 6) impose d'identifier l'éditeur d'un site. Un particulier peut, à certaines
     conditions, ne donner au public que les coordonnées de l'hébergeur, mais il doit alors avoir
     communiqué son identité à l'hébergeur. En cas de doute, demande conseil à un juriste. */
  LEGAL: {
    nom: '',            // Prénom NOM (ou raison sociale)
    statut: '',         // ex. « Entrepreneur individuel (micro-entreprise) » ou « Particulier »
    siret: '',          // si applicable
    adresse: '',        // adresse postale (ou siège)
    email: '',          // adresse de contact (aussi utilisée pour exercer les droits RGPD)
    directeur: '',      // directeur de la publication (souvent la même personne)
    supabaseRegion: ''  // région choisie à la création du projet Supabase, ex. « Paris (eu-west-3) »
  }
};
