# Mettre le Caracas en ligne

Deux parties : **Supabase** (la base de données, gratuite) puis **GitHub Pages** (le site, gratuit).
Compte environ 10 minutes.

## Partie 1 : Supabase

1. Va sur **supabase.com** → **Start your project** → connecte-toi (le plus simple : avec un compte GitHub).
2. **New project** :
   - Name : `caracas`
   - Database Password : clique sur *Generate a password* et garde-le pour toi (je n'en ai pas besoin)
   - Region : *Europe* (la plus proche)
   - Plan : *Free*
   → **Create new project**, puis attends 1 à 2 minutes.
3. Menu de gauche **Authentication** → **Sign In / Providers** → **Email** :
   - désactive **Confirm email**
   - laisse **Allow new users to sign up** activé
   → **Save**.
4. Menu de gauche **SQL Editor** → **New query** → colle tout le contenu du fichier `outils/supabase.sql` → **Run**.
   Tu dois voir *Success. No rows returned*.
5. Menu **Project Settings** (roue crantée) → **API Keys** → onglet **Legacy API keys** :
   - copie la clé **anon public**
   - et dans **Project Settings → Data API**, copie le **Project URL** (`https://xxxx.supabase.co`)

👉 **Envoie-moi ces deux valeurs** (Project URL + clé anon public). Elles sont faites pour être publiques.
⚠️ N'envoie jamais la clé **service_role / secret** ni le mot de passe de la base.

## Partie 2 : GitHub Pages

1. Va sur **github.com** → crée un compte si besoin.
2. **New repository** : nom `caracas`, **Public**, rien d'autre à cocher → **Create repository**.
3. Envoie-moi l'adresse du dépôt (`https://github.com/ton-pseudo/caracas`).
   J'envoie les fichiers du site ; une fenêtre GitHub te demandera peut-être de te connecter, accepte.
4. Dans le dépôt : **Settings** → **Pages** → *Build and deployment* :
   Source **Deploy from a branch**, Branch **main**, dossier **/docs** → **Save**.
   Après 1 à 2 minutes, le site est sur `https://ton-pseudo.github.io/caracas/`.

## Ensuite

- Ouvre le site → **Espace employé** : comme la base est vide, la page propose de créer le **compte du patron**.
- Le patron ajoute l'équipe (Équipe), puis crée les comptes (Comptes).
- Tout est enregistré en ligne et apparaît en direct chez les autres employés connectés.
- La version sur claude.ai reste un **aperçu** (données fictives, rien n'est enregistré).

## Limites actuelles

- Les **photos** (véhicules rachetés, justificatifs de dépenses) ne sont pas encore envoyées en ligne :
  elles restent sur l'ordinateur qui les a ajoutées. Prochaine étape possible : stockage de fichiers Supabase.
- Si deux employés modifient **le même élément** au même moment, la dernière modification gagne.
