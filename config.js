/* Configuration de Trokémon. Ce fichier est public : il ne doit contenir QUE des clés publiques.
   Ne mets jamais ici la clé "service_role" / "secret" de Supabase. */
window.TK_CONFIG = {
  /* Supabase > Project Settings > API : "Project URL" et clé "publishable".
     Laisse vide pour tester en mode démo (données fictives, rien n'est enregistré). */
  SUPABASE_URL: 'https://yspeztbrwepzgtptljto.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_p98GocBhfkZYDbgWnVCPng_gnyKawa8',

  /* Fond de carte CARTO. Ne modifie pas TILE_URL : {style} est remplacé par le code
     (sombre / détaillé) et la clé CARTO_KEY est ajoutée automatiquement. */
  CARTO_KEY: 'cb1_58mv_1_bb2184a7a1195c632098bbe4',
  TILE_URL: 'https://basemaps.cartocdn.com/rastertiles/{style}/{z}/{x}/{y}{r}.png',
  TILE_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',

  /* Liens d'achat neuf pour les produits scellés. Laisse vide tant que tu n'as pas de compte affilié.
     ebay   : paramètres fournis par eBay Partner Network (ex. "mkcid=1&mkrid=...&campid=...")
     amazon : ton identifiant Partenaires (ex. "monid-21") */
  AFFILIATE: { ebay: '', amazon: '' },

  /* Lien de soutien facultatif (Ko-fi, Buy Me a Coffee, Tipeee, page de don...). Laisse vide pour ne rien afficher. */
  SUPPORT_URL: 'https://fr.tipeee.com/trokemon/',

  /* Pages légales (legal.html). */
  LEGAL: {
    nom: 'L3AKR',
    statut: 'Particulier',
    siret: '',
    adresse: 'FRANCE',
    email: 'l3akr.dev@proton.me',
    directeur: 'L3AKR',
    supabaseRegion: 'Londres (eu-west-2)'
  }
};
