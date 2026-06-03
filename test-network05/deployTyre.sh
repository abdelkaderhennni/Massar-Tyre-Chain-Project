#!/bin/bash
set -e

echo "═══════════════════════════════════════════"
echo "   TyreChain — Deploy Script"
echo "═══════════════════════════════════════════"

cd /home/abdelkader/go/src/github.com/fabric-samples/test-network05

# ── Environment ──────────────────────────────────────────────────────────────
export FABRIC_CFG_PATH=${PWD}/../config/
export ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
export PEER0_ORG1_CA=${PWD}/organizations/peerOrganizations/central.example.com/peers/peer0.central.example.com/tls/ca.crt
export PEER0_ORG2_CA=${PWD}/organizations/peerOrganizations/regional.example.com/peers/peer0.regional.example.com/tls/ca.crt
export PEER0_ORG3_CA=${PWD}/organizations/peerOrganizations/gas.example.com/peers/peer0.gas.example.com/tls/ca.crt
export CORE_PEER_TLS_ENABLED=true

CHAINCODE_PATH="/home/abdelkader/go/src/github.com/fabric-samples/asset-transfer-basic/chaincode-go"
POLICY="AND('CentralMSP.peer','RegionalMSP.peer','GasMSP.peer')"

# ── Step 1: Package ──────────────────────────────────────────────────────────
echo ""
echo "Step 1: Packaging chaincode as tyre_1.0..."
peer lifecycle chaincode package tyre.tar.gz \
  --path $CHAINCODE_PATH \
  --lang golang \
  --label tyre_1.0
echo "Packaged"

# ── Step 2: Install on all 3 peers ──────────────────────────────────────────
echo ""


echo "Step 2: Installing on Central..."
export CORE_PEER_LOCALMSPID="CentralMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/central.example.com/users/Admin@central.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
peer lifecycle chaincode install tyre.tar.gz
echo "Installed on Central"




echo ""
echo "▶ Installing on Regional..."
export CORE_PEER_LOCALMSPID="RegionalMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG2_CA
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/regional.example.com/users/Admin@regional.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051
peer lifecycle chaincode install tyre.tar.gz
echo "✓ Installed on Regional"

echo ""
echo "▶ Installing on Gas..."
export CORE_PEER_LOCALMSPID="GasMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG3_CA
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/gas.example.com/users/Admin@gas.example.com/msp
export CORE_PEER_ADDRESS=localhost:11051
peer lifecycle chaincode install tyre.tar.gz
echo "✓ Installed on Gas"

# ── Step 3: Get Package ID ───────────────────────────────────────────────────
echo ""
echo "▶ Step 3: Getting Package ID..."
export CORE_PEER_LOCALMSPID="CentralMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/central.example.com/users/Admin@central.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep "tyre_1.0" | awk '{print $3}' | sed 's/,//')
echo "✓ Package ID: $PACKAGE_ID"

# ── Step 4: Approve from all 3 orgs ─────────────────────────────────────────
echo ""
echo "▶ Step 4: Central approves..."
export CORE_PEER_LOCALMSPID="CentralMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/central.example.com/users/Admin@central.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile $ORDERER_CA \
  --channelID mychannel --name basic \
  --version 1.0 --package-id $PACKAGE_ID --sequence 1 \
  --signature-policy "$POLICY"
echo "✓ Central approved"

echo ""
echo "▶ Regional approves..."
export CORE_PEER_LOCALMSPID="RegionalMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG2_CA
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/regional.example.com/users/Admin@regional.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile $ORDERER_CA \
  --channelID mychannel --name basic \
  --version 1.0 --package-id $PACKAGE_ID --sequence 1 \
  --signature-policy "$POLICY"
echo "✓ Regional approved"

echo ""
echo "▶ Gas approves..."
export CORE_PEER_LOCALMSPID="GasMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG3_CA
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/gas.example.com/users/Admin@gas.example.com/msp
export CORE_PEER_ADDRESS=localhost:11051
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile $ORDERER_CA \
  --channelID mychannel --name basic \
  --version 1.0 --package-id $PACKAGE_ID --sequence 1 \
  --signature-policy "$POLICY"
echo "✓ Gas approved"

# ── Step 5: Commit ───────────────────────────────────────────────────────────
echo ""
echo "▶ Step 5: Committing chaincode..."
export CORE_PEER_LOCALMSPID="CentralMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/central.example.com/users/Admin@central.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
peer lifecycle chaincode commit \
  -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile $ORDERER_CA \
  --channelID mychannel --name basic \
  --version 1.0 --sequence 1 \
  --signature-policy "$POLICY" \
  --peerAddresses localhost:7051 --tlsRootCertFiles $PEER0_ORG1_CA \
  --peerAddresses localhost:9051 --tlsRootCertFiles $PEER0_ORG2_CA \
  --peerAddresses localhost:11051 --tlsRootCertFiles $PEER0_ORG3_CA
echo "✓ Committed"

# ── Step 6: Verify ───────────────────────────────────────────────────────────
echo ""
echo "▶ Step 6: Verifying..."
peer lifecycle chaincode querycommitted -C mychannel -n basic --output json

echo ""
echo "═══════════════════════════════════════════"
echo "✓ TyreChain deployed successfully!"
echo "  Label:    tyre_1.0"
echo "  Version:  1.0"
echo "  Sequence: 1"
echo "  Policy:   AND(Central, Regional, Gas)"
echo "════════════════════════════════
═══════════"



