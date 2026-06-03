#!/bin/bash

echo "Creating Fabric directories..."

mkdir -p ~/go/src/github.com/fabric-samples
mkdir -p ~/go/src/github.com/fabric-samples/asset-transfer-basic

echo "Copying test-network05..."

cp -r test-network05 \
~/go/src/github.com/fabric-samples/

echo "Copying chaincode-go..."

cp -r chaincode-go \
~/go/src/github.com/fabric-samples/asset-transfer-basic/

echo "Copying tyre-app..."

cp -r tyre-app ~/

echo "Project installed successfully!"
