# 🚀 GUIDE DÉPLOIEMENT COMPLET — Version 5.1

**Date** : 14/06/2026  
**Environnement** : Cloudflare Workers (pilotage-bron.workers.dev)  
**Scope** : Dashboard + Service Worker  
**Risque** : FAIBLE (rollback facile, validations nombreuses)  
**Durée estimée** : 30 minutes (étapes 1-5), puis monitoring 48h

---

## 📋 PRE-DÉPLOIEMENT (5 min)

### Étape 0 : Préparation locale
```bash
cd /home/claude/bron

# 0.1 Vérifier qu'on a les bons fichiers
ls -lh index.html service-worker.js
# → index.html (7.4 MB)
# → service-worker.js (1.9 KB)

# 0.2 Sauvegarder version actuelle (EN CAS DE BESOIN)
cp index.html index.html.backup.v5.0
echo "Backup créé : index.html.backup.v5.0"

# 0.3 Vérifier les fichiers de déploiement
echo "Fichiers à déployer :"
wc -l index.html service-worker.js
du -sh index.html service-worker.js
```

---

## 🔗 DÉPLOIEMENT SUR CLOUDFLARE WORKERS (15 min)

### Étape 1 : Déployer index.html

**Méthode A : Ligne de commande (si wrangler installé)**
```bash
# 1.1 S'assurer qu'on est dans le bon répertoire
cd /home/claude/bron
pwd  # → doit être /home/claude/bron

# 1.2 Copier les fichiers à déployer vers output
cp index.html /mnt/user-data/outputs/
cp service-worker.js /mnt/user-data/outputs/

# 1.3 Vérifier le contenu du fichier AVANT déploiement
head -c 100 index.html  # → doit commencer par <!DOCTYPE ou <html
tail -c 100 index.html  # → doit finir par </html> ou script

# 1.4 Vérifier la version dans le fichier
grep "APP_VERSION_LABEL" index.html
# → doit afficher: window.APP_VERSION_LABEL='5.1'

# 1.5 Déployer (adapte selon ta config Cloudflare)
# Si via GitHub Actions / wrangler :
wrangler deploy index.html --name pilotage-bron

# Si via téléchargement manuel :
# → Aller à https://dash.cloudflare.com/
# → Workers & Pages → pilotage-bron.workers.dev
# → Copier-coller le contenu de index.html dans l'éditeur
# → Save and Deploy

# 1.6 Vérifier déploiement
echo "✓ Attendez 30 secondes pour que Cloudflare propage"
sleep 30
```

**Méthode B : Interface Cloudflare (manual)**
```
1. Aller à https://dash.cloudflare.com/
2. Sélectionner ton domaine
3. Aller à "Workers & Pages"
4. Cliquer sur "pilotage-bron.workers.dev"
5. Éditor → Remplacer tout le contenu par index.html
6. Copier le contenu COMPLET de index.html
7. Coller dans l'éditeur Cloudflare
8. Bouton "Save and Deploy"
9. Attendre 30 secondes la propagation
```

### Étape 2 : Déployer service-worker.js

**IMPORTANT** : Le service-worker.js doit être accessible à `/service-worker.js`

**Option A : Cloudflare Workers KV ou Assets**
```bash
# 2.1 Si tu utilises wrangler avec KV :
wrangler publish service-worker.js

# 2.2 Ou, si tu as un bucket d'assets Cloudflare Pages :
# → Uploader service-worker.js dans /public/
# → Vérifier que l'accès est public
```

**Option B : Héberger directement sur Cloudflare Pages**
```bash
# 2.1 Créer un repo GitHub avec la structure
mkdir -p ~/deployement-campnature/public
cp service-worker.js ~/deployement-campnature/public/
cp index.html ~/deployement-campnature/public/

# 2.2 Push vers GitHub
cd ~/deployement-campnature
git init
git add .
git commit -m "Deploy v5.1 with Service Worker"
git remote add origin https://github.com/YOUR_REPO
git push -u origin main

# 2.3 Connecter à Cloudflare Pages
# → https://pages.cloudflare.com/
# → Connect to Git
# → Sélectionner le repo
# → Build settings : Framework = None (static)
# → Déployer
```

**Option C : Servir depuis index.html (Inline)**
```bash
# Créer un worker qui sert le service-worker inline
# (déjà en place si tu utilises Cloudflare Workers avec wrangler.toml)

# Dans wrangler.toml, ajouter :
[env.production]
routes = [
  { pattern = "/service-worker.js", zone_name = "your-domain.com" }
]

# Et un script wrangler qui crée la route
```

---

## ✅ VÉRIFICATION POST-DÉPLOIEMENT (10 min)

### Étape 3 : Tester en Incognito (nouvelle fenêtre, cache vide)

```bash
# 3.1 Ouvrir en incognito
# Raccourci : Ctrl+Shift+N (Chrome) ou Cmd+Shift+N (Mac)

# 3.2 Aller à https://pilotage-bron.workers.dev/

# 3.3 Ouvrir la console (F12)
# Chercher les logs :
#   ✓ "ServiceWorker registered: ..."  → SW activé ✅
#   ✓ "DOMCache init: X selectors cached" → DOM cache ✅
#   ✓ Aucune erreur rouge → HTML valide ✅

# 3.4 Vérifier la version affichée
# Ouvrir console (F12) et taper :
# → window.APP_VERSION_LABEL
# → doit retourner "5.1" ✅

# 3.5 Recharger la page (Ctrl+R ou Cmd+R)
# → Doit être RAPIDE (2-3 sec) grâce au SW cache
# → Si lent (>5 sec), SW ne fonctionne pas → problème

# 3.6 Vérifier les éléments UI clés
# → Vérifier qu'on peut cliquer sur "Devis", "Budget", etc.
# → Vérifier que localStorage a migré (StorageManager.getAll() en console)
```

### Étape 4 : Tester Mode Normal (avec cache partagé)

```bash
# 4.1 Ouvrir une fenêtre normale (pas incognito)

# 4.2 Aller à https://pilotage-bron.workers.dev/

# 4.3 Console (F12) :
#   ✓ Chercher "ServiceWorker registered"
#   ✓ Vérifier version "5.1"
#   ✓ Aucune erreur

# 4.4 Ouvrir le réseau (F12 → Network)
# Recharger la page
# → Vérifier que index.html est "304 Not Modified" ou vient du cache
#   (pas "200" à chaque fois)

# 4.5 Tester une action (ex: cliquer sur une page)
# → Navigation rapide = SW fonctionne ✅
```

### Étape 5 : Tester Mode Offline

```bash
# 5.1 F12 → Network tab

# 5.2 Chercher la case "Offline" ou "No throttling" en haut
# → Cliquer → Sélectionner "Offline"

# 5.3 Recharger la page (Ctrl+R)

# 5.4 Vérifier :
#   ✓ Page affiche du contenu (pages cached)
#   ✓ Navigation marche (pages cachées accessibles)
#   ✓ Données Firestore ne mettent pas à jour (attendu offline)
#   ✓ Pas de message d'erreur rouge grave

# 5.5 Reconnecter le réseau
# → F12 → Network → Offline OFF
# → Recharger
# → Firestore doit re-syncer ✅
```

---

## 🔍 MONITORING POST-DÉPLOIEMENT (48 heures)

### Étape 6 : 1ère heure (critique)

```bash
# 6.1 Tout les utilisateurs doivent tester
# Demander aux utilisateurs principaux (direction, réception) :
# "Testez la page, signalez ANY erreur"

# 6.2 Monitoring backend
# Vérifier les logs Cloudflare Workers :
# → https://dash.cloudflare.com/
# → Workers → Logs
# → Chercher les erreurs 500 ou 4xx

# 6.3 Monitoring localStorage
# Chaque utilisateur doit avoir sa migration localStorage effective
# Vérifier sur 2-3 appareils que les données sont préservées

# 6.4 Monitoring Service Worker
# Vérifier dans F12 → Application → Service Workers
# Le SW doit être "activated"
# Cache doit avoir des entrées

# 6.5 Monitoring console
# Pas d'erreurs rouges critiques (peu de warnings ok)
```

### Étape 7 : 6-24h (suivi continu)

```bash
# 7.1 Vérifier Firestore write/read quota
# → Firebase Console
# → Firestore → Usage
# → Pas de pic anormal ?

# 7.2 Vérifier les erreurs de production
# Si vous utilisez Sentry / Rollbar :
# → Chercher les nouvelles erreurs
# → Les 10 ErrorManager.error() calls

# 7.3 Tester sur appareils mobiles
# iPhone → Vérifier SW + offline
# Android → Vérifier SW + offline

# 7.4 Vérifier la performance
# Lighthouse : https://pagespeed.web.dev/
# → Scorer, comparer avec avant

# 7.5 Vérifier cache Size
# F12 → Application → Storage → Cache
# → Combien de MB utilisés ? (2-10 MB ok)
```

### Étape 8 : 24-48h (stabilisation)

```bash
# 8.1 Tous les tests du projet passent ?
# 8.2 Aucune régression UI/UX ?
# 8.3 Firestore quotas OK ?
# 8.4 localStorage migrations complétées ?
# 8.5 Service Worker actif sur 95%+ des sessions ?

# Si OUI → ✅ DÉPLOIEMENT RÉUSSI
# Si NON → voir section ROLLBACK
```

---

## 🆘 DÉPANNAGE & ROLLBACK

### Problème 1 : Service Worker ne s'enregistre pas

```bash
# Symptôme : Console n'affiche pas "ServiceWorker registered"

# Cause possible : service-worker.js non accessible à /service-worker.js

# Solution :
# 1. Vérifier que /service-worker.js retourne HTTP 200
curl -I https://pilotage-bron.workers.dev/service-worker.js
# → doit afficher "HTTP/1.1 200" ou "HTTP/2 200"

# 2. Vérifier MIME type
curl -I https://pilotage-bron.workers.dev/service-worker.js | grep Content-Type
# → doit afficher "application/javascript" ou "text/javascript"

# 3. Si non présent : uploader manuellement service-worker.js
# → Cloudflare Pages → Public files
# → Uploader service-worker.js

# 4. Attendre propagation (30 sec)
sleep 30

# 5. Re-tester
curl https://pilotage-bron.workers.dev/service-worker.js | head -5
```

### Problème 2 : localStorage migration ne fonctionne pas

```bash
# Symptôme : Anciennes données (budget_mois_v1) perdues

# Cause : StorageManager n'a pas migré les vieilles clés

# Solution :
# 1. Vérifier que StorageManager.init() est appelé
F12 → Console → StorageManager.init()  # relancer manuellement

# 2. Checker localStorage brute
F12 → Application → Local Storage
# → Chercher les anciennes clés (budget_mois_v1, etc.)
# → Elles devraient être supprimées après migration

# 3. Récupérer les données migrées
F12 → Console → StorageManager.getAll()
# → doit afficher {budget_mois: {...}, ...}

# 4. Si données perdues :
# → Restorer depuis le backup Firebase (Firestore collections)
```

### Problème 3 : Page lente après déploiement

```bash
# Symptôme : Page plus lente qu'avant (5+ sec vs 2-3 sec)

# Cause possible : Service Worker mal configuré (network-first au lieu de cache-first)

# Solution :
# 1. Vérifier que le SW est actif
F12 → Application → Service Workers → "activated and running"

# 2. Checker le network waterfall
F12 → Network → Recharger
# → Chercher les requêtes "disk cache" ou "service worker"
# → Si tout est "network", le SW ne cache pas

# 3. Vider le cache et relancer
F12 → Application → Storage → Clear site data
# → Recharger
# → Doit être lent la 1ère fois, rapide la 2e

# 4. Si toujours lent :
# → Rollback (voir ci-dessous)
```

---

## 🔄 ROLLBACK (EN CAS DE PROBLÈME CRITIQUE)

### Rollback immédiat

```bash
# ÉTAPE 1 : Récupérer la version sauvegardée
cd /home/claude/bron
ls -l index.html.backup.v5.0
# → doit exister

# ÉTAPE 2 : Re-déployer l'ancienne version
cp index.html.backup.v5.0 index.html
# Puis redéployer sur Cloudflare (même processus que déploiement)

# ÉTAPE 3 : Vérifier le rollback
# → Ouvrir incognito
# → Console : window.APP_VERSION_LABEL
# → doit afficher "5.0"

# ÉTAPE 4 : Supprimer le SW (cache du problème)
# F12 → Application → Service Workers → Cliquer sur "Unregister"
# Vider le cache : Clear site data
# Recharger
```

### Rollback git (si tu utilises git)

```bash
# ÉTAPE 1 : Voir l'historique
git log --oneline | head -5
# → Chercher le dernier commit avant "10 optimisations v5.1"

# ÉTAPE 2 : Revenir à la version stable
git revert HEAD
# Ou si plusieurs commits :
git checkout <commit-hash-v5.0>

# ÉTAPE 3 : Redéployer
git push origin main
```

---

## ✅ CHECKLIST FINAL

```
PRE-DÉPLOIEMENT
[ ] Backup local créé (index.html.backup.v5.0)
[ ] Fichiers vérifiés (index.html + service-worker.js)
[ ] Version correcte (APP_VERSION_LABEL='5.1')

DÉPLOIEMENT
[ ] index.html déployé sur Cloudflare Workers
[ ] service-worker.js accessible à /service-worker.js
[ ] Propagation Cloudflare (30 sec attente)

VÉRIFICATION INCOGNITO
[ ] SW registered dans console
[ ] Version 5.1 affichée
[ ] Pas d'erreur rouge
[ ] Navigation rapide (cache)
[ ] Offline test OK

VÉRIFICATION NORMAL
[ ] SW actif
[ ] Données migrées (StorageManager.getAll())
[ ] Cache 304 Not Modified
[ ] Firestore sync OK

MONITORING 48H
[ ] 0-1h : Tests utilisateurs OK
[ ] 6-24h : Aucune erreur Firebase
[ ] 24-48h : Performance stable
[ ] Statistiques cache : 2-10 MB OK

ROLLBACK (SI PROBLÈME)
[ ] Version précédente disponible
[ ] Temps de rollback < 5 min
[ ] Données préservées après rollback
```

---

## 📞 SUPPORT POST-DÉPLOIEMENT

Si problème pendant ou après déploiement :

1. **Ne panique pas** — rollback facile < 5 min
2. **Note l'heure du problème** — utile pour les logs
3. **Screenshot des erreurs console** — F12 → Console
4. **Essayer le rollback** si critique
5. **Contactez moi avec les logs**

---

**DURÉE TOTALE ESTIMÉE :**
- Déploiement : 15 minutes
- Tests : 10 minutes
- Monitoring (1ère heure) : 10 minutes
- **Total : 35 minutes (1ère heure cruciale)**

**Puis monitoring passif les 48h suivantes.**

