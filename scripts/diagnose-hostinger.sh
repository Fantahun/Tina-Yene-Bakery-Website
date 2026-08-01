#!/bin/bash
# Run over SSH on Hostinger while Max Processes is high.
#
# Answers the question local testing cannot: what is actually consuming the
# quota. The quota counts every process AND thread in the account cgroup - not
# just your app - so the first section is usually the decisive one.
#
#   bash diagnose-hostinger.sh

echo "=============================================================="
echo " 1. TOTAL processes + threads (this is what the quota counts)"
echo "=============================================================="
ps -eLf 2>/dev/null | wc -l

echo
echo "=============================================================="
echo " 2. Threads by command - who owns the quota?"
echo "=============================================================="
ps -eLo comm= 2>/dev/null | sort | uniq -c | sort -rn | head -15

echo
echo "=============================================================="
echo " 3. Node processes (expect ONE app server)"
echo "=============================================================="
ps -eo pid,ppid,etime,rss,comm,args 2>/dev/null | grep '[n]ode' | head -20
echo "--- count ---"
ps -eo comm= 2>/dev/null | grep -c '^node$'

echo
echo "=============================================================="
echo " 4. Prisma query engines (MUST be exactly 1)"
echo "=============================================================="
ps -eo pid,etime,rss,args 2>/dev/null | grep '[q]uery-engine' | head
echo "--- count ---"
ps -eo args= 2>/dev/null | grep -c '[q]uery-engine'

echo
echo "=============================================================="
echo " 5. Threads per node process"
echo "=============================================================="
for pid in $(pgrep -x node 2>/dev/null); do
  n=$(ls "/proc/$pid/task" 2>/dev/null | wc -l)
  echo "pid $pid: $n threads"
done

echo
echo "=============================================================="
echo " 6. MySQL connections (should stay at/below connection_limit)"
echo "=============================================================="
echo "Run manually - needs credentials:"
echo "  mysql -u DB_USER -p DB_NAME -e \"SHOW STATUS LIKE 'Threads_connected';\""
echo "  mysql -u DB_USER -p DB_NAME -e \"SHOW PROCESSLIST;\""

echo
echo "=============================================================="
echo " 7. Established outbound connections (hung SMTP shows up here)"
echo "=============================================================="
ss -tnp 2>/dev/null | grep ESTAB | head -20 || echo "ss unavailable"

echo
echo "=============================================================="
echo " HOW TO READ THIS"
echo "=============================================================="
cat <<'NOTES'
- Section 2 is the key one. If node is NOT the top consumer, the quota is being
  spent by something else in the account (PHP-FPM, cron, the panel's own
  supervisor) and tuning the app will not help.
- Section 3 showing more than one long-lived `node ... server.js` means the app
  manager started duplicate instances. That alone doubles the app's share; the
  runtime log printing "Ready" twice per start is the same symptom.
- Section 4 above 1 means a PrismaClient is being constructed more than once -
  each engine is a separate process with its own pool. That is the leak
  lib/prisma.ts exists to prevent.
- Section 5 climbing over time (rather than sitting flat) is the signature of a
  leak rather than load. Sample it a few minutes apart and compare.
NOTES
