#!/usr/bin/env bash
#
# Vérifie un déploiement Apps Script depuis l'extérieur, comme le fera le site.
#
#   ./outils/verifier-deploiement.sh "https://script.google.com/macros/s/.../exec"
#
# N'envoie AUCUN mail : tous les contrôles utilisent des adresses @example.com,
# qui ne correspondent à aucun foyer et ne déclenchent donc aucun envoi.
#
# Le -L de curl est indispensable : Apps Script répond par une redirection 302
# vers googleusercontent.com (C4). Sans lui, curl n'affiche rien du tout.

set -u

URL="${1:-}"
if [ -z "$URL" ]; then
  echo "Usage : $0 <URL /exec>" >&2
  exit 2
fi
case "$URL" in
  *"/exec") ;;
  *) echo "L'URL doit se terminer par /exec (et non /dev)." >&2; exit 2 ;;
esac

VERSION_ATTENDUE="0.2.0"
reussis=0; echoues=0

appeler() {
  curl -sL --max-time 30 -H "Content-Type: text/plain" -d "$1" "$URL"
}

verifier() { # intitulé, réponse, motif attendu
  if printf '%s' "$2" | grep -q "$3"; then
    printf '  OK    %s\n' "$1"; reussis=$((reussis + 1))
  else
    printf '  ÉCHEC %s\n        reçu : %s\n' "$1" "$(printf '%s' "$2" | head -c 200)"
    echoues=$((echoues + 1))
  fi
}

echo "Vérification de $URL"
echo

# ── 1. Le service répond ─────────────────────────────────────────────────
PING=$(appeler '{"action":"ping"}')
verifier "ping répond ok"                 "$PING" '"ok":true'
verifier "version $VERSION_ATTENDUE en ligne" "$PING" "\"version\":\"$VERSION_ATTENDUE\""
verifier "la date limite est lue dans Config" "$PING" '"dateLimite":"[0-9]\{4\}-'
verifier "l'état des réponses est renvoyé" "$PING" '"reponsesOuvertes":'

# L'adresse de contact doit venir du classeur : c'est elle qui s'affiche dans les
# messages d'erreur et le pied de page du site. Elle n'est plus écrite dans le dépôt.
verifier "l'adresse de contact est servie depuis Config" "$PING" '"contact":"[^"]*@[^"]*"'

if ! printf '%s' "$PING" | grep -q '"contact":"[^"]*@'; then
  echo "  NOTE  renseignez CONTACT_MARIES dans l'onglet Config : sans elle, le site"
  echo "        n'affiche aucune adresse à qui écrire en cas de problème."
fi

if printf '%s' "$PING" | grep -q '"reponsesOuvertes":false'; then
  echo "  NOTE  les réponses sont CLOSES : vérifiez DATE_LIMITE dans l'onglet Config."
fi

# ── 2. Les erreurs sont propres ──────────────────────────────────────────
verifier "action inconnue refusée" \
  "$(appeler '{"action":"nimportequoi"}')" '"error":"DONNEES_INVALIDES"'
verifier "corps illisible refusé" \
  "$(appeler 'ceci nest pas du json')" '"error":"DONNEES_INVALIDES"'
verifier "adresse inconnue refusée (aucun mail envoyé)" \
  "$(appeler '{"action":"requestCode","email":"inconnu@example.com","website":""}')" \
  '"error":"EMAIL_INCONNU"'
verifier "adresse mal formée refusée" \
  "$(appeler '{"action":"requestCode","email":"pas-une-adresse","website":""}')" \
  '"error":"EMAIL_INCONNU"'
verifier "token inventé refusé" \
  "$(appeler '{"action":"getRsvp","token":"00000000-0000-4000-8000-000000000000"}')" \
  '"error":"SESSION_EXPIREE"'
verifier "code mal formé refusé" \
  "$(appeler '{"action":"verifyCode","email":"inconnu@example.com","code":"abc"}')" \
  '"error":"CODE_INVALIDE"'

# ── 3. Aucune fuite technique ────────────────────────────────────────────
FUITE=$(appeler '{"action":"getRsvp","token":"x"}')
if printf '%s' "$FUITE" | grep -qiE 'at [A-Za-z_]+ \(|\.gs:|Exception|Stack'; then
  echo "  ÉCHEC une trace technique fuit dans la réponse"; echoues=$((echoues + 1))
else
  echo "  OK    aucune trace technique dans les réponses"; reussis=$((reussis + 1))
fi

# ── 4. Le déploiement est bien une Application Web ouverte ───────────────
CODE_HTTP=$(curl -sL -o /dev/null -w '%{http_code}' --max-time 30 "$URL")
verifier "l'URL répond en HTTP 200 sans compte Google" "$CODE_HTTP" '200'

echo
echo "─────────────────────────────────────────────"
echo "$((reussis + echoues)) contrôles · $reussis OK · $echoues échec(s)"
if [ "$echoues" -gt 0 ]; then
  cat <<'AIDE'

Pistes selon l'échec :
  · version différente de celle attendue
      → Déployer → Gérer les déploiements → crayon → Version : Nouvelle version.
        « Nouveau déploiement » créerait une autre URL (C12).
  · tout échoue, ou la réponse est du HTML
      → le déploiement n'est pas en « Qui a accès : Tout le monde »,
        ou l'URL se termine par /dev au lieu de /exec.
  · ERREUR_SERVEUR partout
      → un onglet manque ou un en-tête a été renommé.
        Menu Mariage → Vérifier les données, puis Initialiser / réparer le classeur.
AIDE
  exit 1
fi
echo "Le déploiement est prêt. Reportez l'URL dans assets/js/config.js."
