#!/bin/bash
set -eo pipefail
INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')
[ -z "$CMD" ] && echo '{"hookSpecificOutput":{"permissionDecision":"allow"}}' && exit 0

deny() {
  echo "{\"hookSpecificOutput\":{\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"$1\"}}"
  exit 0
}

# =============================================================================
# SECURITY — Git destructive operations
# =============================================================================
echo "$CMD" | grep -qiE 'git\s+push\s+.*--force' && deny "BLOCKED: git push --force is prohibited"
echo "$CMD" | grep -qiE 'git\s+push\s+.*--force-with-lease' && deny "BLOCKED: git push --force-with-lease is prohibited"
echo "$CMD" | grep -qiE 'git\s+push\s+.*\s-f(\s|$)' && deny "BLOCKED: git push -f is prohibited"
echo "$CMD" | grep -qiE 'git\s+reset\s+--hard' && deny "BLOCKED: git reset --hard is prohibited"
echo "$CMD" | grep -qiE 'git\s+.*--no-verify' && deny "BLOCKED: --no-verify is prohibited — never skip hooks"
echo "$CMD" | grep -qiE 'git\s+.*--no-gpg-sign' && deny "BLOCKED: --no-gpg-sign is prohibited"
echo "$CMD" | grep -qiE 'git\s+push\s+.*--delete' && deny "BLOCKED: git push --delete is prohibited"
echo "$CMD" | grep -qiE 'git\s+push\s+\S+\s+:' && deny "BLOCKED: deleting remote branch via push is prohibited"
echo "$CMD" | grep -qiE 'git\s+branch\s+-D\s' && deny "BLOCKED: git branch -D is prohibited — use -d for safe delete"
echo "$CMD" | grep -qiE 'git\s+clean\s+.*-f' && deny "BLOCKED: git clean -f is prohibited"
echo "$CMD" | grep -qiE 'git\s+checkout\s+\.\s*$' && deny "BLOCKED: git checkout . discards all changes"
echo "$CMD" | grep -qiE 'git\s+restore\s+\.\s*$' && deny "BLOCKED: git restore . discards all changes"
echo "$CMD" | grep -qiE 'git\s+add\s+-A' && deny "BLOCKED: git add -A is prohibited — stage files explicitly"
echo "$CMD" | grep -qiE 'git\s+add\s+--all' && deny "BLOCKED: git add --all is prohibited — stage files explicitly"
echo "$CMD" | grep -qiE 'git\s+add\s+\.\s*$' && deny "BLOCKED: git add . is prohibited — stage files explicitly"

# SECURITY — Filesystem
echo "$CMD" | grep -qiE 'rm\s+-rf\s+/' && deny "BLOCKED: rm -rf / is prohibited"
echo "$CMD" | grep -qiE 'rm\s+-rf\s+~' && deny "BLOCKED: rm -rf ~ is prohibited"
echo "$CMD" | grep -qiE 'rm\s+-rf\s+\.\s*$' && deny "BLOCKED: rm -rf . is prohibited"
echo "$CMD" | grep -qiE 'rm\s+-r\s+-f\s' && deny "BLOCKED: rm -r -f is prohibited"
echo "$CMD" | grep -qiE 'chmod\s+777\s' && deny "BLOCKED: chmod 777 is prohibited — use specific permissions"
echo "$CMD" | grep -qiE 'chmod\s+-R\s+777' && deny "BLOCKED: chmod -R 777 is prohibited"

# SECURITY — Remote code execution
echo "$CMD" | grep -qiE 'curl\s.*\|\s*(sh|bash)' && deny "BLOCKED: piping curl to shell is prohibited — download and review first"
echo "$CMD" | grep -qiE 'wget\s.*\|\s*(sh|bash)' && deny "BLOCKED: piping wget to shell is prohibited — download and review first"
echo "$CMD" | grep -qiE 'curl\s.*\|\s*sudo' && deny "BLOCKED: piping curl to sudo is prohibited"

# SECURITY — SQL
echo "$CMD" | grep -qiE 'DROP\s+(TABLE|DATABASE|SCHEMA|INDEX)' && deny "BLOCKED: DROP operations are prohibited"
echo "$CMD" | grep -qiE 'TRUNCATE\s+TABLE' && deny "BLOCKED: TRUNCATE TABLE is prohibited"
echo "$CMD" | grep -qiE 'DELETE\s+FROM\s+\S+\s*;?\s*$' && deny "BLOCKED: DELETE without WHERE clause is prohibited"

# SECURITY — Docker
echo "$CMD" | grep -qiE 'docker\s+system\s+prune' && deny "BLOCKED: docker system prune is prohibited"
echo "$CMD" | grep -qiE 'docker\s+rm\s+-f' && deny "BLOCKED: docker rm -f is prohibited"
echo "$CMD" | grep -qiE 'docker\s+rmi\s+-f' && deny "BLOCKED: docker rmi -f is prohibited"

# SECURITY — Process signals
echo "$CMD" | grep -qiE 'kill\s+-9\s' && deny "BLOCKED: kill -9 is prohibited — use graceful signals first"
echo "$CMD" | grep -qiE 'pkill\s+-9\s' && deny "BLOCKED: pkill -9 is prohibited"
echo "$CMD" | grep -qiE 'killall\s' && deny "BLOCKED: killall is prohibited"

# SECURITY — Sudo
echo "$CMD" | grep -qiE '^sudo\s+rm\s' && deny "BLOCKED: sudo rm is prohibited"
echo "$CMD" | grep -qiE '^sudo\s+chmod\s' && deny "BLOCKED: sudo chmod is prohibited"
echo "$CMD" | grep -qiE '^sudo\s+chown\s' && deny "BLOCKED: sudo chown is prohibited"

# SECURITY — Credentials
echo "$CMD" | grep -qiE '(cat|less|more|head|tail|bat)\s+.*\.env' && deny "BLOCKED: reading .env files via CLI is prohibited"
echo "$CMD" | grep -qiE '(cat|less|more|head|tail|bat)\s+.*id_rsa' && deny "BLOCKED: reading SSH keys is prohibited"
echo "$CMD" | grep -qiE '(cat|less|more|head|tail|bat)\s+.*credentials' && deny "BLOCKED: reading credential files is prohibited"
echo "$CMD" | grep -qiE '(cat|less|more|head|tail|bat)\s+.*\.pem' && deny "BLOCKED: reading PEM files is prohibited"
echo "$CMD" | grep -qiE 'grep\s+.*\.env' && deny "BLOCKED: searching .env files is prohibited"
echo "$CMD" | grep -qiE 'rg\s+.*\.env' && deny "BLOCKED: searching .env files is prohibited"

# SECURITY — AWS/Cloud
echo "$CMD" | grep -qiE 'aws\s+.*lambda\s+update-function-configuration' && deny "BLOCKED: direct lambda config update is prohibited — use CloudFormation"
echo "$CMD" | grep -qiE 'aws\s+.*s3\s+.*--delete' && deny "BLOCKED: aws s3 --delete is prohibited"
echo "$CMD" | grep -qiE 'aws\s+.*cloudformation\s+delete-stack' && deny "BLOCKED: deleting CloudFormation stacks is prohibited"
echo "$CMD" | grep -qiE 'aws\s+.*iam\s+create-access-key' && deny "BLOCKED: creating IAM access keys requires explicit approval"
echo "$CMD" | grep -qiE 'terraform\s+destroy' && deny "BLOCKED: terraform destroy is prohibited"

# =============================================================================
# TEST GUARD — Track test execution, require before commit
# =============================================================================
TEST_FLAG="/tmp/teamoon-tests-passed"
if echo "$CMD" | grep -qiE '(go\s+test|pytest|npm\s+(run\s+)?test|vitest|jest|cargo\s+test|make\s+test|bun\s+test|deno\s+test|php\s+artisan\s+test|bundle\s+exec\s+rspec)'; then
  touch "$TEST_FLAG"
fi

# =============================================================================
# BUILD GUARD — Track build execution, require before push
# =============================================================================
BUILD_FLAG="/tmp/teamoon-build-passed"
if echo "$CMD" | grep -qiE '(make\s+(build|install)|npm\s+run\s+build|npx\s+vite\s+build|cargo\s+build|go\s+build|docker\s+build|gradle\s+build|mvn\s+(compile|package)|dotnet\s+build)'; then
  touch "$BUILD_FLAG"
fi

# =============================================================================
# COMMIT — Require tests + validate format
# =============================================================================
if echo "$CMD" | grep -qiE 'git\s+commit'; then
  [ ! -f "$TEST_FLAG" ] && deny "BLOCKED: Run tests before committing. No test execution detected in this session."
  if echo "$CMD" | grep -qiE 'git\s+commit\s+.*-m\s'; then
    MSG=$(echo "$CMD" | sed -nE "s/.*-m\s+[\"']([^\"']+)[\"'].*/\1/p")
    [ -z "$MSG" ] && MSG=$(echo "$CMD" | sed -nE "s/.*-m\s+\"?\\\$\(cat <<.*//p")
    [ -z "$MSG" ] && MSG=$(echo "$CMD" | sed -nE 's/.*-m\s+([^ ]+).*/\1/p')
    if [ -n "$MSG" ]; then
      echo "$MSG" | grep -qE '^(feat|fix|refactor|docs|style|test|chore)\(core\): [a-z]' || \
        deny "BLOCKED: Commit message must match type(core): lowercase description. Got: $MSG"
      FIRSTLINE=$(echo "$MSG" | head -1)
      if echo "$FIRSTLINE" | grep -qP '[\x{1F300}-\x{1F9FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]' 2>/dev/null; then
        deny "BLOCKED: Emojis are not allowed in commit messages"
      fi
      AFTER_COLON=$(echo "$FIRSTLINE" | sed -nE 's/^[^:]+:\s+(.*)/\1/p')
      if [ -n "$AFTER_COLON" ]; then
        FIRST_CHAR=$(echo "$AFTER_COLON" | cut -c1)
        echo "$FIRST_CHAR" | grep -qE '[A-Z]' && deny "BLOCKED: Description must start lowercase after colon. Got: $FIRSTLINE"
      fi
      echo "$FIRSTLINE" | grep -qE '^\w+\(' && ! echo "$FIRSTLINE" | grep -qE '^\w+\(core\)' && \
        deny "BLOCKED: Scope must always be (core). Got: $FIRSTLINE"
    fi
  fi
fi

# =============================================================================
# PUSH — Require build before push
# =============================================================================
if echo "$CMD" | grep -qiE 'git\s+push'; then
  [ ! -f "$BUILD_FLAG" ] && deny "BLOCKED: Build before pushing. No build execution detected in this session."
fi

echo '{"hookSpecificOutput":{"permissionDecision":"allow"}}'
