#!/usr/bin/env bash
# Main test runner — starts the server, runs integration tests, stops the server.
# Usage: source .testEnvVars && ./scripts/test.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PORT="${PORT:-3000}"
BASE_URL="http://localhost:${PORT}"
LOG_FILE="$ROOT_DIR/logs/app.log"

PASSED=0
FAILED=0
TOTAL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

assert() {
  TOTAL=$((TOTAL + 1))
  local name="$1"
  local condition="$2"
  if eval "$condition"; then
    echo -e "  ${GREEN}✓${NC} $name"
    PASSED=$((PASSED + 1))
  else
    echo -e "  ${RED}✗${NC} $name"
    FAILED=$((FAILED + 1))
  fi
}

# ─── Setup ───
echo -e "${CYAN}=== Red Devils Chat — Integration Tests ===${NC}"
echo ""

# Clear old logs
rm -f "$LOG_FILE"

# Start the server in the background
echo -e "${YELLOW}Starting server on port ${PORT}...${NC}"
cd "$ROOT_DIR/server"
PORT="$PORT" npx tsx src/server.ts &>/tmp/test-server.log &
SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server to initialize (vector store + agent)..."
for i in $(seq 1 30); do
  if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Verify server is running
if ! curl -s "$BASE_URL/health" > /dev/null 2>&1; then
  echo -e "${RED}Server failed to start. Check /tmp/test-server.log${NC}"
  kill $SERVER_PID 2>/dev/null
  exit 1
fi
echo -e "${GREEN}Server ready.${NC}"
echo ""

# ─── 1. Health Endpoint ───
echo -e "${CYAN}1. Health Endpoint${NC}"
HEALTH=$(curl -s "$BASE_URL/health")
assert "GET /health returns 200 with status ok" '[ "$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin)[\"status\"])")" = "ok" ]'
echo ""

# ─── 2. Input Validation ───
echo -e "${CYAN}2. Input Validation (POST /api/chat)${NC}"

# Missing message
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/chat" -H "Content-Type: application/json" -d '{"conversationId":"test"}')
assert "Missing message returns 400" '[ "$STATUS" = "400" ]'

# Empty message
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/chat" -H "Content-Type: application/json" -d '{"message":"","conversationId":"test"}')
assert "Empty message returns 400" '[ "$STATUS" = "400" ]'

# Missing conversationId
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/chat" -H "Content-Type: application/json" -d '{"message":"hello"}')
assert "Missing conversationId returns 400" '[ "$STATUS" = "400" ]'

# Path traversal in conversationId
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/chat" -H "Content-Type: application/json" -d '{"message":"hello","conversationId":"../../etc/passwd"}')
assert "Path traversal conversationId returns 400" '[ "$STATUS" = "400" ]'

# Oversized message (2001 chars)
BIG_MSG=$(python3 -c "print('a' * 2001)")
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/chat" -H "Content-Type: application/json" -d "{\"message\":\"$BIG_MSG\",\"conversationId\":\"test\"}")
assert "Oversized message returns 400" '[ "$STATUS" = "400" ]'

# No body
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/chat")
assert "No body returns 400" '[ "$STATUS" = "400" ]'
echo ""

# ─── 3. Input Validation (POST /api/chat/stream) ───
echo -e "${CYAN}3. Input Validation (POST /api/chat/stream)${NC}"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/chat/stream" -H "Content-Type: application/json" -d '{"conversationId":"test"}')
assert "Stream: missing message returns 400" '[ "$STATUS" = "400" ]'

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/chat/stream" -H "Content-Type: application/json" -d '{"message":"hi","conversationId":"../../etc"}')
assert "Stream: path traversal returns 400" '[ "$STATUS" = "400" ]'
echo ""

# ─── 4. RAG Tool (non-streaming) ───
echo -e "${CYAN}4. RAG Tool — Historical Question${NC}"
RAG_RESP=$(curl -s -X POST "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"message":"How many league titles has Manchester United won?","conversationId":"test-rag"}' --max-time 45)
RAG_ANSWER=$(echo "$RAG_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('answer',''))" 2>/dev/null)
assert "RAG response mentions 20 league titles" 'echo "$RAG_ANSWER" | grep -qi "20"'
assert "RAG response has conversationId" 'echo "$RAG_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get(\"conversationId\")"'
assert "RAG response has traceId" 'echo "$RAG_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get(\"traceId\")"'
echo ""

# ─── 5. Calculator Tool ───
echo -e "${CYAN}5. Calculator Tool — Math Query${NC}"
CALC_RESP=$(curl -s -X POST "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"message":"What is 253 divided by 559? Use the calculator tool.","conversationId":"test-calc"}' --max-time 45)
CALC_ANSWER=$(echo "$CALC_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('answer',''))" 2>/dev/null)
assert "Calculator response contains decimal result" 'echo "$CALC_ANSWER" | grep -qE "0\.4[5-9]"'
echo ""

# ─── 6. Web Search Tool ───
echo -e "${CYAN}6. Web Search Tool — Current Events${NC}"
WEB_RESP=$(curl -s -X POST "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"message":"What is the latest Manchester United transfer news?","conversationId":"test-web"}' --max-time 45)
WEB_ANSWER=$(echo "$WEB_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('answer',''))" 2>/dev/null)
assert "Web search returns a non-empty response" '[ -n "$WEB_ANSWER" ] && [ ${#WEB_ANSWER} -gt 50 ]'
echo ""

# ─── 7. Football Data Tool ───
echo -e "${CYAN}7. Football Data Tool — Live PL Data${NC}"
FOOTBALL_RESP=$(curl -s -X POST "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"message":"Where does Manchester United sit in the Premier League table right now?","conversationId":"test-football"}' --max-time 45)
FOOTBALL_ANSWER=$(echo "$FOOTBALL_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('answer',''))" 2>/dev/null)
assert "Football data returns PL standings info" '[ -n "$FOOTBALL_ANSWER" ] && [ ${#FOOTBALL_ANSWER} -gt 50 ]'
echo ""

# ─── 8. Streaming Endpoint ───
echo -e "${CYAN}8. SSE Streaming${NC}"
STREAM_OUT=$(curl -s -N -X POST "$BASE_URL/api/chat/stream" -H "Content-Type: application/json" \
  -d '{"message":"Who is the all-time top scorer for Manchester United?","conversationId":"test-stream"}' --max-time 45 2>&1)
assert "Stream has token events" 'echo "$STREAM_OUT" | grep -q "event: token"'
assert "Stream has tool_start event" 'echo "$STREAM_OUT" | grep -q "event: tool_start"'
assert "Stream has done event" 'echo "$STREAM_OUT" | grep -q "event: done"'
STREAM_TOKENS=$(echo "$STREAM_OUT" | grep "^data:" | grep -o '"content":"[^"]*"' | sed 's/"content":"//;s/"//' | tr -d '\n')
assert "Streamed tokens mention Rooney or 253" 'echo "$STREAM_TOKENS" | grep -qiE "rooney|253"'
echo ""

# ─── 9. Conversation Memory ───
echo -e "${CYAN}9. Conversation Memory — Pronoun Resolution${NC}"
curl -s -X POST "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"message":"Tell me about Wayne Rooney at Manchester United","conversationId":"test-memory"}' --max-time 45 > /dev/null
MEMORY_RESP=$(curl -s -X POST "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"message":"How many goals did he score there?","conversationId":"test-memory"}' --max-time 45)
MEMORY_ANSWER=$(echo "$MEMORY_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('answer',''))" 2>/dev/null)
assert "Follow-up resolves 'he' to Rooney (mentions 253)" 'echo "$MEMORY_ANSWER" | grep -q "253"'
echo ""

# ─── 10. Log Verification ───
echo -e "${CYAN}10. Log Verification${NC}"
sleep 2  # Let logs flush
assert "Log file exists" '[ -f "$LOG_FILE" ]'
assert "Logs contain tool_start events" 'grep -q "tool_start" "$LOG_FILE"'
assert "Logs contain tool_end events" 'grep -q "tool_end" "$LOG_FILE"'
assert "Logs contain agent_start events" 'grep -q "agent_start" "$LOG_FILE"'
assert "Logs contain agent_end events" 'grep -q "agent_end" "$LOG_FILE"'
assert "Logs contain traceId fields" 'grep -q "traceId" "$LOG_FILE"'
assert "Logs are valid JSON (spot check)" 'head -1 "$LOG_FILE" | python3 -c "import sys,json; json.load(sys.stdin)"'
echo ""

# ─── Cleanup ───
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

# ─── Summary ───
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "  ${GREEN}Passed: $PASSED${NC}  ${RED}Failed: $FAILED${NC}  Total: $TOTAL"
echo -e "${CYAN}════════════════════════════════════════${NC}"

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}Some tests failed. Check logs at $LOG_FILE${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
