// fabric.js - Fabric Gateway connection manager
const { connect, signers } = require('@hyperledger/fabric-gateway');
const grpc = require('@grpc/grpc-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');

// Cache open connections per org
const connections = {};

async function getContract(orgName) {
  if (connections[orgName]) {
    return connections[orgName];
  }

  const orgConfig = config.orgs[orgName];
  if (!orgConfig) {
    throw new Error(`Unknown org: ${orgName}`);
  }

  // Load TLS certificate
  const tlsCert = fs.readFileSync(orgConfig.tlsCertPath);
  const credentials = grpc.credentials.createSsl(tlsCert);

  // Connect to the peer
  const peer = orgConfig.peers[0];
  const grpcClient = new grpc.Client(
    `${peer.host}:${peer.port}`,
    credentials,
    { 'grpc.ssl_target_name_override': `peer0.${orgName}.example.com` }
  );

  // Load identity certificate
  const certPem = fs.readFileSync(orgConfig.certPath).toString();

  // Load private key from keystore directory
  const keyFiles = fs.readdirSync(orgConfig.keyDirPath);
  const keyPem = fs.readFileSync(path.join(orgConfig.keyDirPath, keyFiles[0])).toString();
  const privateKey = crypto.createPrivateKey(keyPem);
  const signer = signers.newPrivateKeySigner(privateKey);

  // Create gateway connection
  const gateway = connect({
    client: grpcClient,
    identity: { mspId: orgConfig.mspId, credentials: Buffer.from(certPem) },
    signer,
    evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
    endorseOptions: () => ({ deadline: Date.now() + 15000 }),
    submitOptions: () => ({ deadline: Date.now() + 5000 }),
    commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
  });

  const network = gateway.getNetwork(config.channelName);
  const contract = network.getContract(config.chaincodeName);

  // Cache the contract
  connections[orgName] = contract;
  return contract;
}

// Submit a transaction (invoke - writes to ledger)
async function submitTransaction(orgName, funcName, ...args) {
  const contract = await getContract(orgName);
  const result = await contract.submitTransaction(funcName, ...args);
  return result.length > 0 ? JSON.parse(Buffer.from(result).toString()) : null;
}

// Evaluate a transaction (query - read only)
async function evaluateTransaction(orgName, funcName, ...args) {
  const contract = await getContract(orgName);
  const result = await contract.evaluateTransaction(funcName, ...args);
  return result.length > 0 ? JSON.parse(Buffer.from(result).toString()) : null;
}

module.exports = { submitTransaction, evaluateTransaction };
