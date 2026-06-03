#!/bin/bash

echo "Syncing files back to Git repository..."

# Sync network
rm -rf test-network05
cp -r ~/go/src/github.com/fabric-samples/test-network05 .

# Sync chaincode
rm -rf chaincode-go
cp -r ~/go/src/github.com/fabric-samples/asset-transfer-basic/chaincode-go .

# Sync frontend/backend app
rm -rf tyre-app
cp -r ~/tyre-app .

echo "Sync completed!"
