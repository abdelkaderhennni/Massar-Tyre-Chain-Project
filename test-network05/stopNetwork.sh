#!/bin/bash
echo "═══════════════════════════════════════"
echo "  Stopping TyreChain Network safely..."
echo "═══════════════════════════════════════"

cd ~/go/src/github.com/fabric-samples/test-network05

# Stop containers WITHOUT removing them or their data
docker-compose -f docker/docker-compose-test-net.yaml stop
docker-compose -f docker/docker-compose-ca.yaml stop 2>/dev/null || true

echo ""
echo "✓ Network stopped. All data preserved."
echo "  Run ./startNetwork.sh to restart."
