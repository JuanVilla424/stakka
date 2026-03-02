#!/bin/bash
set -eo pipefail
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')
[ -z "$FILE" ] && echo '{"hookSpecificOutput":{"permissionDecision":"allow"}}' && exit 0

BASENAME=$(basename "$FILE")

deny() {
  echo "{\"hookSpecificOutput\":{\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"$1\"}}"
  exit 0
}

# =============================================================================
# ENVIRONMENT FILES
# =============================================================================
echo "$BASENAME" | grep -qiE '^\.env(\..+)?$' && deny "BLOCKED: Writing to $BASENAME is prohibited (environment credentials)"

# =============================================================================
# CREDENTIAL FILES
# =============================================================================
echo "$BASENAME" | grep -qiE '^credentials' && deny "BLOCKED: Writing to credential files is prohibited"
echo "$BASENAME" | grep -qiE '^\.git-credentials$' && deny "BLOCKED: Writing to .git-credentials is prohibited"
echo "$BASENAME" | grep -qiE '^\.netrc$' && deny "BLOCKED: Writing to .netrc is prohibited"

# =============================================================================
# KEY AND CERTIFICATE FILES
# =============================================================================
echo "$BASENAME" | grep -qiE '\.(pem|key|ppk|p12|pfx|jks|keystore)$' && deny "BLOCKED: Writing to key/certificate files is prohibited"

# =============================================================================
# SSH KEYS
# =============================================================================
echo "$BASENAME" | grep -qiE '^id_(rsa|ed25519|ecdsa|dsa)(\.pub)?$' && deny "BLOCKED: Writing to SSH key files is prohibited"
echo "$BASENAME" | grep -qiE '^known_hosts$' && deny "BLOCKED: Writing to known_hosts is prohibited"
echo "$BASENAME" | grep -qiE '^authorized_keys$' && deny "BLOCKED: Writing to authorized_keys is prohibited"

# =============================================================================
# CLOUD CREDENTIALS
# =============================================================================
echo "$FILE" | grep -qiE '\.aws/credentials' && deny "BLOCKED: Writing to AWS credentials is prohibited"
echo "$FILE" | grep -qiE '\.aws/config' && deny "BLOCKED: Writing to AWS config is prohibited"
echo "$FILE" | grep -qiE '\.oci/config' && deny "BLOCKED: Writing to OCI config is prohibited"
echo "$FILE" | grep -qiE '\.config/gcloud' && deny "BLOCKED: Writing to GCloud config is prohibited"
echo "$FILE" | grep -qiE '\.kube/config' && deny "BLOCKED: Writing to kubectl config is prohibited"
echo "$FILE" | grep -qiE '\.docker/config\.json' && deny "BLOCKED: Writing to Docker config is prohibited"

# =============================================================================
# DATABASE CREDENTIAL FILES
# =============================================================================
echo "$BASENAME" | grep -qiE '^\.pgpass$' && deny "BLOCKED: Writing to .pgpass is prohibited"
echo "$BASENAME" | grep -qiE '^\.my\.cnf$' && deny "BLOCKED: Writing to .my.cnf is prohibited"
echo "$BASENAME" | grep -qiE '^\.mongorc\.js$' && deny "BLOCKED: Writing to .mongorc.js is prohibited"

# =============================================================================
# SHELL HISTORY
# =============================================================================
echo "$BASENAME" | grep -qiE '^\.(bash|zsh|python|node_repl|mysql|psql)_history$' && deny "BLOCKED: Writing to shell history is prohibited"

# =============================================================================
# SENSITIVE DIRECTORIES
# =============================================================================
echo "$FILE" | grep -qiE '(secrets|keys|certs|private)/' && deny "BLOCKED: Writing to sensitive directory is prohibited"

# =============================================================================
# LOCK FILES (should not be manually edited)
# =============================================================================
echo "$BASENAME" | grep -qiE '^(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|Gemfile\.lock|poetry\.lock|Cargo\.lock|go\.sum)$' && deny "BLOCKED: Lock files should not be edited manually — use package manager commands"

echo '{"hookSpecificOutput":{"permissionDecision":"allow"}}'
