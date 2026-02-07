# 🧪 Test des Tools Générés - Guide Complet

## ✅ Changements Implémentés

Les tools générés ont maintenant accès à :
- ✅ **DOM** : `document` pour manipuler la page
- ✅ **API** : `api` pour requêtes backend (GET/POST/PATCH/DELETE)
- ✅ **Navigation** : `navigate()` pour React Router
- ✅ **Vocal** : `speak()` pour synthèse vocale
- ✅ **Composition** : `toolRegistry` pour appeler d'autres tools

---

## 🧪 Tests à Effectuer

### Test 1 : Manipulation DOM - "Make the page smaller"

**Commande** : *"Make the page smaller"*

**Code attendu** :
```javascript
try {
  document.body.style.zoom = '0.8';
  speak("Page zoomed out");
  return { success: true, message: "Page size reduced" };
} catch (error) {
  return { success: false, message: "Error: " + error.message };
}
```

**Résultat attendu** :
- ✅ La page est zoomée à 80%
- ✅ Synthèse vocale : "Page zoomed out"
- ✅ Console : `[GENERATED TOOL] ✅ Execution result: { success: true, ... }`

---

### Test 2 : Requête API - "Show me all products"

**Commande** : *"Show me all products"* ou *"Get products from database"*

**Code attendu** :
```javascript
try {
  const response = await api.get('/api/products/');
  speak("Found " + response.data.length + " products");
  navigate('/results');
  return { success: true, message: "Products loaded", data: response.data };
} catch (error) {
  return { success: false, message: "API error: " + error.message };
}
```

**Résultat attendu** :
- ✅ Requête GET vers `/api/products/`
- ✅ Navigation vers `/results`
- ✅ Synthèse vocale avec le nombre de produits
- ✅ Console : données des produits

---

### Test 3 : Navigation + Recherche - "Search for laptop"

**Commande** : *"Search for laptop"* ou *"Find laptops"*

**Code attendu** :
```javascript
try {
  navigate('/results?q=laptop');
  speak("Searching for laptop");
  return { success: true, message: "Search initiated" };
} catch (error) {
  return { success: false, message: "Navigation failed: " + error.message };
}
```

**Résultat attendu** :
- ✅ Navigation vers `/results?q=laptop`
- ✅ Synthèse vocale : "Searching for laptop"

---

### Test 4 : Changement de Style - "Change background to dark"

**Commande** : *"Change background to dark"* ou *"Enable dark mode"*

**Code attendu** :
```javascript
try {
  document.body.style.backgroundColor = '#1a1a1a';
  document.body.style.color = '#ffffff';
  speak("Dark mode activated");
  return { success: true, message: "Dark mode enabled" };
} catch (error) {
  return { success: false, message: "Error: " + error.message };
}
```

**Résultat attendu** :
- ✅ Fond noir (#1a1a1a)
- ✅ Texte blanc (#ffffff)
- ✅ Synthèse vocale : "Dark mode activated"

---

## 🔍 Vérification dans la Console

Pour chaque test, vérifiez ces logs :

### 1. Génération du Code
```
[INTENT] 🔨 Generating new executable tool for: make the page smaller
[INTENT] 🤖 Asking LLM to generate executable code...
[INTENT] ✅ Generated code: try { document.body.style.zoom = '0.8'; ... }
[AGENTIC] ✨ Generated new tool: "Custom: make the page smaller"
```

### 2. Exécution du Tool
```
[GENERATED TOOL] Executing AI-generated code for: Custom: make the page smaller
[GENERATED TOOL] Code:
try {
  document.body.style.zoom = '0.8';
  speak("Page zoomed out");
  return { success: true, message: "Page size reduced" };
} catch (error) {
  return { success: false, message: "Error: " + error.message };
}
[GENERATED TOOL] ✅ Execution result: { success: true, message: "Page size reduced" }
```

---

## ❌ Si Vous Voyez un Placeholder

**Symptôme** :
```json
{
  success: true,
  message: "Placeholder tool executed: ...",
  note: "This is a placeholder. Real functionality could not be generated."
}
```

**Causes possibles** :

### 1. Clé API Groq Manquante/Invalide
```
[INTENT] ⚠️ Cannot generate executable code without API key
```
**Solution** : Vérifier `.env` → `VITE_GROQ_API_KEY`

### 2. Erreur API Groq
```
[INTENT] ❌ Code generation failed: 401 Unauthorized
```
**Solution** : Vérifier la validité de la clé API

### 3. Quota API Dépassé
```
[INTENT] ❌ Code generation failed: 429 Too Many Requests
```
**Solution** : Attendre ou utiliser une autre clé

### 4. Erreur Réseau
```
[INTENT] ❌ Failed to generate executable tool: TypeError: Failed to fetch
```
**Solution** : Vérifier la connexion internet

---

## 📋 Checklist de Test

Après avoir rechargé la page (`F5`) :

- [ ] Cliquer sur le bouton microphone
- [ ] Dire : *"Make the page smaller"*
  - [ ] Vérifier que la page zoom à 80%
  - [ ] Vérifier la synthèse vocale
  - [ ] Vérifier les logs de la console
- [ ] Dire : *"Show me all products"*
  - [ ] Vérifier la requête API dans Network tab
  - [ ] Vérifier la navigation vers `/results`
  - [ ] Vérifier les données dans la console
- [ ] Dire : *"Change background to dark"*
  - [ ] Vérifier le changement de couleur
  - [ ] Vérifier la synthèse vocale

---

## 🎯 Endpoints API Disponibles

Voici les endpoints que les tools peuvent utiliser :

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/products/` | GET | Liste des produits |
| `/api/products/{id}/` | GET | Détail d'un produit |
| `/api/cart/` | GET | Contenu du panier |
| `/api/cart/add/` | POST | Ajouter au panier |
| `/api/user/profile/` | GET/PATCH | Profil utilisateur |
| `/api/recommendations/` | GET | Recommandations |

---

## ✅ Résumé

**Avant** :
```json
{
  "success": true,
  "message": "Placeholder tool executed",
  "note": "Functionality is limited"
}
```

**Maintenant** :
```javascript
// Code réel généré et exécuté
document.body.style.zoom = '0.8';
speak("Page zoomed out");
return { success: true, message: "Page size reduced" };
```

**Les tools sont maintenant vraiment fonctionnels !** 🎉
