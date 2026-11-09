#!/usr/bin/env bash
# Smoke test for the whole API. Start the server first (bun run dev), then:
#   bun run smoke                      # against http://localhost:8787
#   API=https://visus-api.<you>.workers.dev bun run smoke
# Needs curl and python3 (both ship with macOS). Creates a new test account every run.
set -uo pipefail

API="${API:-http://localhost:8787}"
PASS=0
FAIL=0
TOKEN=""
BODY=""
CODE=""

# call METHOD PATH [JSON] → sets BODY and CODE
OUT=$(mktemp)
trap 'rm -f "$OUT"' EXIT
call() {
  : > "$OUT"
  # The AI plan and verdict can take ~10 s; nothing should take a minute.
  local args=(-s --connect-timeout 5 --max-time 60 -o "$OUT" -w '%{http_code}' -X "$1" "$API$2" -H 'Content-Type: application/json')
  [ -n "$TOKEN" ] && args+=(-H "Authorization: Bearer $TOKEN")
  [ $# -ge 3 ] && args+=(-d "$3")
  CODE=$(curl "${args[@]}")
  BODY=$(cat "$OUT")
  [ "$CODE" = "000" ] && BODY="(no response: is the server running at $API? Is that still your Mac's IP? ipconfig getifaddr en0)"
}

# get FIELD → reads a value from BODY with a Python expression on `d`
get() { python3 -c "import json,sys; d=json.loads(sys.argv[1]); print($1)" "$BODY" 2>/dev/null; }

# check NAME EXPECTED_CODE [PYTHON_CONDITION on d]
check() {
  local ok=1
  [ "$CODE" = "$2" ] || ok=0
  if [ $ok = 1 ] && [ $# -ge 3 ]; then
    [ "$(get "bool($3)" 2>/dev/null)" = "True" ] || ok=0
  fi
  if [ $ok = 1 ]; then
    PASS=$((PASS + 1)); echo "  ok    $1"
  else
    FAIL=$((FAIL + 1)); echo "  FAIL  $1 (HTTP $CODE): ${BODY:0:300}"
  fi
}

echo "Visus smoke test → $API"
EMAIL="smoke-$(date +%s)-$RANDOM@visus.test"

echo "Health and auth"
call GET /health;                                  check "GET /health" 200 "d['ok'] is True"
[ "$FAIL" = 0 ] || { echo; echo "Server not reachable, stopping."; exit 1; }
call POST /auth/signup "{\"name\":\"Smoke Test\",\"identifier\":\"$EMAIL\",\"password\":\"secret123\"}"
check "signup" 201 "d['token'] and d['user']['identifier'] == '$EMAIL'"
call POST /auth/signup "{\"name\":\"Smoke Test\",\"identifier\":\"$EMAIL\",\"password\":\"secret123\"}"
check "signup twice → 409" 409 "'error' in d"
call POST /auth/login "{\"identifier\":\"$EMAIL\",\"password\":\"wrong-password\"}"
check "login with wrong password → 401" 401 "'error' in d"
LONG=$(python3 -c 'print("a" * 129)')
call POST /auth/login "{\"identifier\":\"$EMAIL\",\"password\":\"$LONG\"}"
check "password over 128 chars → 400" 400 "'error' in d"
call GET /me;                                      check "GET /me without token → 401" 401
UPPER=$(echo "$EMAIL" | tr a-z A-Z)
call POST /auth/login "{\"identifier\":\"  $UPPER\",\"password\":\"secret123\"}"
check "login (any case)" 200 "d['token']"
TOKEN=$(get "d['token']")
call GET /me;                                      check "GET /me" 200 "d['user']['identifier'] == '$EMAIL' and d['profiles'] == []"

echo "Profiles"
call POST /profiles '{"name":"Smoke Test","age":34,"isChild":false,"wearsGlasses":true,"healthConditions":["diabetes"],"screenHoursPerDay":6,"eyewear":"glasses","pastEyeTest":"yes"}'
check "create owner profile" 201 "d['relation'] == 'self' and d['age'] == 34"
ME=$(get "d['id']")
call POST /profiles '{"name":"Riya","age":8,"isChild":true,"wearsGlasses":false,"healthConditions":[],"screenHoursPerDay":2,"relation":"child"}'
check "create child profile" 201 "d['relation'] == 'child' and d['isChild']"
KID=$(get "d['id']")
call PATCH "/profiles/$ME" '{"prescription":{"right":{"sph":-1.25,"cyl":-0.5,"axis":90},"left":{"sph":-1,"cyl":0,"axis":0},"updatedAt":"2026-10-21T10:00:00.000Z"}}'
check "update glasses prescription" 200 "d['prescription']['right']['sph'] == -1.25"
call PATCH "/profiles/$ME" '{"prescription":null}'
check "\"I don't know\" prescription" 200 "d['prescription'] is None"
call PATCH "/profiles/not-a-real-id" '{"age":40}'
check "update unknown profile → 404" 404
call GET /profiles;                                check "GET /profiles (owner first)" 200 "len(d) == 2 and d[0]['id'] == '$ME'"

echo "AI intake chat"
CHAT='[{"from":"ai","text":"Hi. What is bothering your eyes today?"},{"from":"me","text":"Road signs look blurry when I drive at night"}]'
call POST /intake/chat "{\"profileId\":\"$ME\",\"messages\":$CHAT}"
check "first follow-up question" 200 "not d['done'] and d['reply'] and 0 < len(d['chips']) <= 4"
echo "        AI: $(get "d['reply']")  chips: $(get "', '.join(d['chips'])")"
call POST /intake/chat "{\"profileId\":\"$ME\",\"messages\":[{\"from\":\"me\",\"text\":\"a\"},{\"from\":\"me\",\"text\":\"b\"},{\"from\":\"me\",\"text\":\"c\"},{\"from\":\"me\",\"text\":\"d\"}]}"
check "done after 3 follow-ups (rule)" 200 "d['done']"
call POST /intake/chat "{\"profileId\":\"$ME\",\"messages\":[{\"from\":\"me\",\"text\":\"I suddenly see flashes in my left eye\"}]}"
check "urgent words → doctor note (rule)" 200 "'eye doctor today' in d['reply']"

echo "Full check (AI plan → 4 results incl. Amsler red flag → verdict)"
INTAKE='Visus: Hi. What is bothering your eyes today?\nMe: Road signs look blurry at night and headlights have halos.\nVisus: Any flashes of light or eye pain?\nMe: No, none of those'
call POST /sessions "{\"profileId\":\"$ME\",\"intake\":\"$INTAKE\",\"mode\":\"full\"}"
check "POST /sessions → plan" 201 "d['sessionId'] and len(d['plan']) >= 2 and d['summary']"
SID=$(get "d['sessionId']")
echo "        plan: $(get "', '.join(p['testId'] for p in d['plan'])")"
echo "        summary: $(get "d['summary']")"

E_GOOD='{"distanceCm":40,"calibrated":true,"trials":[{"line":"6/60","shown":"up","answer":"up"},{"line":"6/60","shown":"up","answer":"up"},{"line":"6/60","shown":"up","answer":"up"},{"line":"6/12","shown":"up","answer":"up"},{"line":"6/12","shown":"up","answer":"up"},{"line":"6/12","shown":"up","answer":"up"},{"line":"6/6","shown":"up","answer":"up"},{"line":"6/6","shown":"left","answer":"left"},{"line":"6/6","shown":"down","answer":"down"},{"line":"6/5","shown":"up","answer":"left"},{"line":"6/5","shown":"up","answer":"left"},{"line":"6/5","shown":"up","answer":"right"}]}'
E_SOFT='{"distanceCm":40,"calibrated":true,"trials":[{"line":"6/60","shown":"up","answer":"up"},{"line":"6/60","shown":"up","answer":"up"},{"line":"6/60","shown":"up","answer":"up"},{"line":"6/12","shown":"up","answer":"up"},{"line":"6/12","shown":"up","answer":"up"},{"line":"6/12","shown":"up","answer":"up"},{"line":"6/9","shown":"up","answer":"left"},{"line":"6/9","shown":"up","answer":"left"},{"line":"6/9","shown":"up","answer":"right"}]}'
call POST "/sessions/$SID/results" "{\"testId\":\"tumbling_e\",\"eye\":\"both\",\"durationSec\":95,\"answers\":{\"right\":$E_GOOD,\"left\":$E_SOFT}}"
check "result 1: tumbling_e (left eye soft) → next test" 200 "d['type'] == 'next_test' and d['result']['status'] == 'mild' and d['result']['eyes']['left']['value'] == '20/40'"
echo "        next: $(get "d['testId']") (added: $(get "d['added']"), $(get "d['reason']"))"

call POST "/sessions/$SID/results" '{"testId":"amsler","eye":"both","durationSec":60,"answers":{"right":{"gridSize":10,"marked":[],"allStraight":true},"left":{"gridSize":10,"marked":[44,45,54],"allStraight":false}}}'
check "result 2: amsler (left centre wavy) → red flag" 200 "d['type'] == 'red_flag' and 'left eye' in d['finding']"
echo "        finding: $(get "d['finding']")"

call POST "/sessions/$SID/results" '{"testId":"clock_dial","eye":"both","durationSec":40,"answers":{"right":{"darker":[],"allSame":true},"left":{"darker":["3-9"],"allSame":false}}}'
check "result 3: clock_dial" 200 "d['type'] in ('next_test', 'done') and d['result']['status'] == 'mild'"

call POST "/sessions/$SID/results" '{"testId":"contrast","eye":"both","durationSec":70,"answers":{"distanceCm":40,"calibrated":true,"letterHeightMm":5,"letters":[{"letter":"H","color":"#111111","contrast":0.994},{"letter":"O","color":"#888888","contrast":0.754},{"letter":"V","color":"#C4C4C4","contrast":0.448},{"letter":"K","color":"#E1E1E1","contrast":0.247},{"letter":"Z","color":"#F1F1F1","contrast":0.121},{"letter":"N","color":"#F8F8F8","contrast":0.061}],"faintestSeen":4,"noneSeen":false}}'
check "result 4: contrast" 200 "d['type'] in ('next_test', 'done') and d['result']['status'] == 'good'"

call POST "/sessions/$SID/verdict"
check "verdict" 200 "d['sessionId'] == '$SID' and d['headline'] and d['areas']['eye_health'] == 'see_doctor' and len(d['results']) == 4 and len(d['lens']) >= 1 and 'doctor' in d['advice'].lower()"
echo "        headline: $(get "d['headline']")"
echo "        advice: $(get "d['advice']")"
echo "        lens: $(get "', '.join(l['product'] for l in d['lens'])")"
call POST "/sessions/$SID/results" '{"testId":"amsler","eye":"both","durationSec":1,"answers":{}}'
check "result after verdict → 409" 409

echo "Other check modes"
call POST /sessions "{\"profileId\":\"$KID\",\"intake\":\"\",\"mode\":\"full\"}"
check "child's check → kids tests" 201 "[p['testId'] for p in d['plan']] == ['kids_tumbling_e', 'kids_colour_shapes']"
call POST /sessions "{\"profileId\":\"$ME\",\"intake\":\"\",\"mode\":\"glasses\"}"
check "glasses check → tumbling_e twice" 201 "[p['testId'] for p in d['plan']] == ['tumbling_e', 'tumbling_e']"
GID=$(get "d['sessionId']")
call POST "/sessions/$GID/results" "{\"testId\":\"tumbling_e\",\"eye\":\"both\",\"durationSec\":80,\"answers\":{\"right\":$E_SOFT,\"left\":$E_SOFT,\"round\":\"glasses_off\"}}"
check "glasses round 1 → round 2 next" 200 "d['type'] == 'next_test' and d['testId'] == 'tumbling_e'"
call POST "/sessions/$GID/results" "{\"testId\":\"tumbling_e\",\"eye\":\"both\",\"durationSec\":80,\"answers\":{\"right\":$E_GOOD,\"left\":$E_GOOD,\"round\":\"glasses_on\"}}"
check "glasses round 2 → done" 200 "d['type'] == 'done'"
call POST "/sessions/$GID/verdict"
check "glasses verdict" 200 "d['headline'] == 'Your glasses still work well'"
call POST /sessions "{\"profileId\":\"$ME\",\"intake\":\"\",\"mode\":\"single\",\"testId\":\"eye_strain\"}"
check "single test" 201 "[p['testId'] for p in d['plan']] == ['eye_strain']"
call POST /sessions "{\"profileId\":\"$ME\",\"intake\":\"\",\"mode\":\"single\"}"
check "single test without testId → 400" 400
call POST /sessions '{"profileId":"00000000-0000-0000-0000-000000000000","intake":"","mode":"quick"}'
check "someone else's profile → 404" 404

echo "Languages (Hindi and Odia)"
call POST /intake/chat "{\"profileId\":\"$ME\",\"language\":\"hi\",\"messages\":[{\"from\":\"ai\",\"text\":\"नमस्ते\"}]}"
check "first question in Hindi" 200 "d['language'] == 'hi' and any('ऀ' <= ch <= 'ॿ' for ch in d['reply'])"
call POST /intake/chat "{\"profileId\":\"$ME\",\"language\":\"hi\",\"messages\":[{\"from\":\"ai\",\"text\":\"आज आपकी आँखों में क्या परेशानी है?\"},{\"from\":\"me\",\"text\":\"रात में गाड़ी चलाते समय धुंधला दिखता है\"}]}"
check "Hindi follow-up (AI or fallback)" 200 "not d['done'] and d['language'] == 'hi' and any('ऀ' <= ch <= 'ॿ' for ch in d['reply'])"
echo "        AI: $(get "d['reply']")  chips: $(get "', '.join(d['chips'])")"
call POST /intake/chat "{\"profileId\":\"$ME\",\"language\":\"hi\",\"messages\":[{\"from\":\"me\",\"text\":\"मुझे अचानक एक आँख से दिखना कम हो गया\"}]}"
check "Hindi urgent words → doctor note (rule)" 200 "'आँखों के डॉक्टर' in d['reply']"
call POST /intake/chat "{\"profileId\":\"$ME\",\"language\":\"or\",\"messages\":[{\"from\":\"me\",\"text\":\"ଆଖିରେ ଯନ୍ତ୍ରଣା ନାହିଁ, ଦୂରର ଜିନିଷ ଝାପସା ଦେଖାଯାଉଛି\"}]}"
check "Odia, negated pain → no doctor note" 200 "d['language'] == 'or' and 'ଡାକ୍ତର' not in d['reply']"
echo "        AI: $(get "d['reply']")"
call POST /sessions "{\"profileId\":\"$ME\",\"intake\":\"\",\"mode\":\"quick\",\"language\":\"or\"}"
check "quick check in Odia → Odia summary and reasons" 201 "any('଀' <= ch <= '୿' for ch in d['summary'] + d['plan'][0]['reason'])"
call POST /sessions "{\"profileId\":\"$ME\",\"intake\":\"\",\"mode\":\"single\",\"testId\":\"tumbling_e\",\"language\":\"hi\"}"
LSID=$(get "d['sessionId']")
call POST "/sessions/$LSID/results" "{\"testId\":\"tumbling_e\",\"eye\":\"both\",\"durationSec\":60,\"answers\":{\"right\":$E_GOOD,\"left\":$E_GOOD}}"
call POST "/sessions/$LSID/verdict"
check "single test in Hindi → Hindi verdict text" 200 "any('ऀ' <= ch <= 'ॿ' for ch in d['headline'])"

echo "Voice (Sarvam AI: 200 with SARVAM_API_KEY set, 503 without or out of credits; the apps then use the device voice)"
call GET /voice
check "GET /voice (is the Visus voice on)" 200 "isinstance(d['voice'], bool)"
call POST /voice/tts '{"text":"नमस्ते, आज आपकी आँखों में क्या परेशानी है?","language":"hi"}'
if [ "$CODE" = "503" ]; then check "TTS without a Sarvam key → 503" 503 "'error' in d"; else check "TTS in Hindi → base64 MP3" 200 "len(d['audio']) > 1000 and d['mime'] == 'audio/mpeg'"; fi
call POST /voice/tts '{"text":"","language":"hi"}'
check "TTS with empty text → 400" 400
call POST /voice/stt '{}'
check "STT without a recording → 400 or 503" "$([ "$CODE" = 503 ] && echo 503 || echo 400)" "'error' in d"

echo "History and sharing"
call GET /sessions
check "GET /sessions (newest first)" 200 "len(d) == 3 and d[0]['id'] == '$LSID' and d[1]['id'] == '$GID' and d[2]['id'] == '$SID' and d[2]['status'] == 'see_doctor' and d[2]['scores']['tumbling_e'] > 0"
call GET "/sessions/$SID"
check "GET /sessions/:id" 200 "d['sessionId'] == '$SID' and d['date'] and d['minutes'] >= 1"
call POST "/sessions/$SID/share"
check "share link" 200 "'/r/' in d['url'] and d['expiresAt']"
SHARE_TOKEN=$(get "d['url'].rsplit('/', 1)[1]")
SAVED_TOKEN=$TOKEN; TOKEN=""
call GET "/reports/$SHARE_TOKEN"
check "shared report opens without login" 200 "d['sessionId'] == '$SID'"
TOKEN=$SAVED_TOKEN
call GET /sessions/not-a-session
check "unknown check → 404" 404

echo "Shop portal (register, walk-ins, link by phone, approve, unlink)"
# single_check PROFILE_ID → runs a one-test check (Tumbling E) to its verdict, sets CHECK_ID
single_check() {
  call POST /sessions "{\"profileId\":\"$1\",\"intake\":\"\",\"mode\":\"single\",\"testId\":\"tumbling_e\"}"
  CHECK_ID=$(get "d['sessionId']")
  call POST "/sessions/$CHECK_ID/results" "{\"testId\":\"tumbling_e\",\"eye\":\"both\",\"durationSec\":60,\"answers\":{\"right\":$E_GOOD,\"left\":$E_GOOD}}"
  call POST "/sessions/$CHECK_ID/verdict"
}
PHONE="9$(printf '%09d' $(( (RANDOM * 32768 + RANDOM) % 1000000000 )))"
TOKEN=""
call POST /auth/signup "{\"name\":\"Patient Smoke\",\"identifier\":\"+91 $PHONE\",\"password\":\"secret123\"}"
check "patient signs up with a phone number" 201 "d['user']['phone'] == '$PHONE' and d['user']['role'] == 'user'"
PATIENT=$(get "d['token']")
TOKEN=$PATIENT
call POST /profiles '{"name":"Patient Smoke","age":52,"isChild":false,"wearsGlasses":true,"healthConditions":[],"screenHoursPerDay":3}'
PATIENT_ME=$(get "d['id']")
single_check "$PATIENT_ME"; OWN_CHECK=$CHECK_ID
check "patient's own check" 200 "d['sessionId'] == '$OWN_CHECK'"
call GET /shop/patients
check "personal account can't open the shop portal → 403" 403

TOKEN=""
call POST /shops/register "{\"shopName\":\"Smoke Optics\",\"city\":\"Bhubaneswar\",\"ownerName\":\"Shop Owner\",\"identifier\":\"shop-$EMAIL\",\"password\":\"secret123\"}"
check "register a shop" 201 "d['user']['role'] == 'shop' and d['user']['shopName'] == 'Smoke Optics'"
SHOP=$(get "d['token']")
TOKEN=$SHOP
call GET /me
check "GET /me for a shop" 200 "d['user']['role'] == 'shop' and d['profiles'] == []"
call POST /shop/patients '{"name":"Walk-in One","age":30,"wearsGlasses":false}'
check "walk-in without a phone" 201 "d['linkStatus'] == 'none' and d['sessions'] == []"
WALKIN=$(get "d['id']"); WALKIN_PROFILE=$(get "d['checkProfileId']")
single_check "$WALKIN_PROFILE"
check "shop runs a check for the walk-in" 200 "d['sessionId'] == '$CHECK_ID'"
call GET "/shop/patients/$WALKIN"
check "walk-in record shows the check" 200 "len(d['sessions']) == 1 and d['sessions'][0]['shopName'] == 'Smoke Optics' and d['lastCheck']"
call POST /shop/patients '{"name":"Walk-in Bad","age":30,"phone":"12345"}'
check "bad phone number → 400" 400
call POST /shop/patients "{\"name\":\"Patient Smoke\",\"age\":52,\"phone\":\"0$PHONE\",\"wearsGlasses\":true}"
check "patient with a Visus account → link pending" 201 "d['linkStatus'] == 'pending' and d['phone'] == '$PHONE'"
LINKED=$(get "d['id']"); LINKED_PROFILE=$(get "d['checkProfileId']")
call POST /shop/patients "{\"name\":\"Again\",\"age\":52,\"phone\":\"$PHONE\"}"
check "same phone twice → 409" 409
single_check "$LINKED_PROFILE"; SHOP_CHECK=$CHECK_ID
check "shop checks the patient before the link" 200 "d['sessionId'] == '$SHOP_CHECK'"
call GET "/sessions/$OWN_CHECK"
check "shop can't see the patient's checks yet → 404" 404
call GET "/shop/patients?q=walk"
check "search patients" 200 "len(d) == 1 and d[0]['id'] == '$WALKIN'"
PHONE2="8${PHONE:1}"
call POST /shop/patients "{\"name\":\"Signs Up Later\",\"age\":40,\"phone\":\"$PHONE2\"}"
check "phone with no Visus account yet → link none" 201 "d['linkStatus'] == 'none'"
TOKEN=""
call POST /auth/signup "{\"name\":\"Later\",\"identifier\":\"$PHONE2\",\"password\":\"secret123\"}"
TOKEN=$(get "d['token']")
call GET /me/shop-requests
check "signing up later with that phone shows the request" 200 "len(d) == 1 and d[0]['shopName'] == 'Smoke Optics'"
TOKEN=$SHOP
call POST /sessions '{"profileId":"","intake":"","mode":"custom","testIds":["clock_dial","amsler","clock_dial"]}'
check "Test library: picked tests, no patient record" 201 "[p['testId'] for p in d['plan']] == ['clock_dial', 'amsler']"
LIB_CHECK=$(get "d['sessionId']")
call POST "/sessions/$LIB_CHECK/results" '{"testId":"clock_dial","eye":"both","durationSec":20,"answers":{"right":{"darker":[],"allSame":true},"left":{"darker":[],"allSame":true}}}'
check "no-patient check: next test is the Amsler grid" 200 "d['type'] == 'next_test' and d['testId'] == 'amsler'"
call POST /sessions "{\"profileId\":\"$WALKIN_PROFILE\",\"intake\":\"\",\"mode\":\"custom\",\"testIds\":[\"tumbling_e\",\"contrast\"]}"
check "Test library: picked tests for a patient" 201 "len(d['plan']) == 2 and d['summary'] == 'The tests you picked.'"
call POST /sessions '{"profileId":"","intake":"","mode":"custom"}'
check "picked tests without any → 400" 400
call GET /shop/patients
check "the no-patient record isn't in the patient list" 200 "all(p['name'] != 'Walk-in (no record)' for p in d)"
call POST /intake/chat '{"profileId":"","messages":[{"from":"me","text":"Things far away look blurry"}]}'
check "Ask Visus AI: chat with no patient record" 200 "d['reply'] and not d['done']"

echo "Shop orders and payments"
call POST /shop/orders "{\"patientId\":\"$WALKIN\",\"item\":\"ZEISS SmartLife single vision + frame\",\"kind\":\"spectacles\",\"total\":4500,\"advance\":{\"amount\":1500,\"method\":\"upi\"},\"dueDate\":\"2026-12-01\"}"
check "order for a patient, with an advance" 201 "d['customerName'] == 'Walk-in One' and d['paid'] == 1500 and d['due'] == 3000 and d['paymentStatus'] == 'partial' and d['status'] == 'new'"
ORDER=$(get "d['id']")
call POST /shop/orders '{"customerName":"Counter Customer","item":"Sunglasses","kind":"sunglasses","total":1200}'
check "order without a patient record" 201 "d['patientId'] is None and d['paymentStatus'] == 'unpaid'"
call POST /shop/orders '{"item":"Frames","total":900}'
check "order with no customer → 400" 400
call POST "/shop/orders/$ORDER/payments" '{"amount":5000,"method":"cash"}'
check "paying more than is due → 400" 400
call POST "/shop/orders/$ORDER/payments" '{"amount":3000,"method":"cash"}'
check "pay the rest" 200 "d['paid'] == 4500 and d['due'] == 0 and d['paymentStatus'] == 'paid' and len(d['payments']) == 2"
call PATCH "/shop/orders/$ORDER" '{"status":"ready"}'
check "order ready for pickup" 200 "d['status'] == 'ready'"
call PATCH "/shop/orders/$ORDER" '{"total":4000}'
check "total below what's paid → 400" 400
call GET /shop/orders
check "orders and totals" 200 "len(d['orders']) == 2 and d['summary'] == {'open': 1, 'ready': 1, 'collected': 4500, 'due': 1200}"
call GET "/shop/orders?patientId=$WALKIN"
check "a patient's orders" 200 "len(d['orders']) == 1 and d['orders'][0]['id'] == '$ORDER'"
call GET "/shop/orders?q=sunglass"
check "search orders" 200 "len(d['orders']) == 1 and d['orders'][0]['customerName'] == 'Counter Customer'"

call GET /shop
check "shop account" 200 "d['name'] == 'Smoke Optics' and d['ownerName'] == 'Shop Owner' and d['patients'] == 3"
call PATCH /shop '{"name":"Smoke Optics","address":"1 Main Road","city":"Cuttack"}'
check "edit the shop's address and city" 200 "d['city'] == 'Cuttack' and d['address'] == '1 Main Road'"

# A walk-in added without a phone; the number is added later and links their past checks.
PHONE3="7${PHONE:1}"
TOKEN=""
call POST /auth/signup "{\"name\":\"Phone Later\",\"identifier\":\"$PHONE3\",\"password\":\"secret123\"}"
LATER=$(get "d['token']"); TOKEN=$LATER
call POST /profiles '{"name":"Phone Later","age":61,"isChild":false,"wearsGlasses":false,"healthConditions":[],"screenHoursPerDay":2}'
LATER_ME=$(get "d['id']")
single_check "$LATER_ME"; LATER_CHECK=$CHECK_ID
TOKEN=$SHOP
call POST /shop/patients '{"name":"Phone Later","age":61,"wearsGlasses":false}'
check "walk-in without a phone (number added later)" 201 "d['phone'] == '' and d['linkStatus'] == 'none'"
LATER_P=$(get "d['id']")
call PATCH "/shop/patients/$LATER_P" '{"phone":"12345"}'
check "add a bad number later → 400" 400
call PATCH "/shop/patients/$LATER_P" "{\"phone\":\"$PHONE\"}"
check "add another patient's number → 409" 409
call PATCH "/shop/patients/$LATER_P" "{\"phone\":\"+91 $PHONE3\"}"
check "add the number later → link request" 200 "d['phone'] == '$PHONE3' and d['linkStatus'] == 'pending' and d['sessions'] == []"
TOKEN=$LATER
call POST "/me/shop-requests/$LATER_P" '{"approve":true}'
check "patient allows it" 200 "d['status'] == 'approved'"
TOKEN=$SHOP
call GET "/shop/patients/$LATER_P"
check "shop now sees their past check" 200 "d['linkStatus'] == 'approved' and len(d['sessions']) == 1 and d['sessions'][0]['id'] == '$LATER_CHECK'"
call PATCH "/shop/patients/$LATER_P" '{"phone":"9999999999"}'
check "linked patient's number can't change → 400" 400

TOKEN=$PATIENT
call GET /me/shop-requests
check "patient sees the request" 200 "len(d) == 1 and d[0]['shopName'] == 'Smoke Optics' and d[0]['status'] == 'pending'"
call POST "/me/shop-requests/$LINKED" '{"approve":true}'
check "patient allows the shop" 200 "d['status'] == 'approved'"
call GET /sessions
check "shop's check moved into the patient's account" 200 "len(d) == 2 and any(s['id'] == '$SHOP_CHECK' and s['shopName'] == 'Smoke Optics' for s in d)"
call GET /me/shops
check "linked shops" 200 "len(d) == 1 and d[0]['shopName'] == 'Smoke Optics'"

TOKEN=$SHOP
call GET "/shop/patients/$LINKED"
check "shop sees all the patient's checks" 200 "d['linkStatus'] == 'approved' and d['checkProfileId'] == '$PATIENT_ME' and len(d['sessions']) == 2"
call GET "/sessions/$OWN_CHECK"
check "shop opens the patient's own check" 200 "d['sessionId'] == '$OWN_CHECK'"
single_check "$PATIENT_ME"; NEW_CHECK=$CHECK_ID
check "shop starts a check for the linked patient" 200 "d['sessionId'] == '$NEW_CHECK'"
call POST "/sessions/$OWN_CHECK/results" "{\"testId\":\"tumbling_e\",\"eye\":\"both\",\"durationSec\":1,\"answers\":{}}"
check "shop can't add to the patient's own check → 404" 404

TOKEN=$PATIENT
call GET /sessions
check "the shop's new check is in the patient's Results" 200 "len(d) == 3 and d[0]['id'] == '$NEW_CHECK' and d[0]['shopName'] == 'Smoke Optics'"
call DELETE "/me/shops/$LINKED"
check "patient unlinks the shop" 200 "d['ok']"
TOKEN=$SHOP
call GET "/sessions/$OWN_CHECK"
check "after the unlink: patient's own check hidden → 404" 404
call GET "/sessions/$NEW_CHECK"
check "after the unlink: the shop keeps the checks it ran" 200 "d['sessionId'] == '$NEW_CHECK'"
call POST /sessions "{\"profileId\":\"$PATIENT_ME\",\"intake\":\"\",\"mode\":\"quick\"}"
check "after the unlink: no new checks → 404" 404
TOKEN=$SAVED_TOKEN

echo
echo "$PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]
