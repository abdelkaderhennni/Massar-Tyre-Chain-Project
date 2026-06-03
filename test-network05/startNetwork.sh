#!/bin/bash
echo "═══════════════════════════════════════"
echo "  Starting TyreChain Network..."
echo "═══════════════════════════════════════"

cd ~/go/src/github.com/fabric-samples/test-network05

# Check if containers already exist (previous run)
EXISTING=$(docker ps -aq --filter "name=peer0.central")

if [ -n "$EXISTING" ]; then
  echo "▶️ Existing network found — restarting containers..."
  docker-compose -f docker/docker-compose-test-net.yaml start
  docker-compose -f docker/docker-compose-ca.yaml start 2>/dev/null || true
  echo "✓ Network restarted with existing data!"
else
  echo "▶️ No existing network — creating fresh network..."
  ./network.sh up createChannel -ca
  echo "▶️ Deploying TyreChain chaincode..."
  ./deployTyre.sh
  echo "✓ Fresh network created and chaincode deployed!"
fi

echo ""
echo "▶️ Starting backend API..."
cd ~/tyre-app/backend
npm start &
echo "✓ API running on http://localhost:3001"

echo ""
echo "▶️ Starting frontend..."
cd ~/tyre-app/frontend
npm start &
echo "✓ UI running on http://localhost:3000"

echo ""
echo "═══════════════════════════════════════"
echo "✓ TyreChain is running!"
echo "  Open: http://localhost:3000"
echo "═══════════════════════════════════════"
