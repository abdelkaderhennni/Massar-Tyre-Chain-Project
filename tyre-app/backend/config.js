// config.js - Network connection configuration
// Update BASE_PATH to match your network path

const BASE_PATH = '/home/abdelkader/go/src/github.com/fabric-samples/test-network05';

const config = {
  channelName: 'mychannel',
  chaincodeName: 'basic',
  
  orgs: {
    central: {
      mspId: 'CentralMSP',
      peers: [{ host: 'localhost', port: 7051 }],
      tlsCertPath: `${BASE_PATH}/organizations/peerOrganizations/central.example.com/peers/peer0.central.example.com/tls/ca.crt`,
      certPath: `${BASE_PATH}/organizations/peerOrganizations/central.example.com/users/Admin@central.example.com/msp/signcerts/Admin@central.example.com-cert.pem`,
      keyDirPath: `${BASE_PATH}/organizations/peerOrganizations/central.example.com/users/Admin@central.example.com/msp/keystore`,
      // Functions this org is allowed to call
      allowedFunctions: ['InitLedger', 'CreateTyre', 'TransferToRegional', 'ReadTyre', 'TyreExists', 'GetAllTyres', 'GetTyreHistory'],
    },
    regional: {
      mspId: 'RegionalMSP',
      peers: [{ host: 'localhost', port: 9051 }],
      tlsCertPath: `${BASE_PATH}/organizations/peerOrganizations/regional.example.com/peers/peer0.regional.example.com/tls/ca.crt`,
      certPath: `${BASE_PATH}/organizations/peerOrganizations/regional.example.com/users/Admin@regional.example.com/msp/signcerts/Admin@regional.example.com-cert.pem`,
      keyDirPath: `${BASE_PATH}/organizations/peerOrganizations/regional.example.com/users/Admin@regional.example.com/msp/keystore`,
      allowedFunctions: ['ConfirmArrivalRegional', 'TransferToGasStation', 'ReadTyre', 'TyreExists', 'GetAllTyres', 'GetTyreHistory'],
    },
    gas: {
      mspId: 'GasMSP',
      peers: [{ host: 'localhost', port: 11051 }],
      tlsCertPath: `${BASE_PATH}/organizations/peerOrganizations/gas.example.com/peers/peer0.gas.example.com/tls/ca.crt`,
      certPath: `${BASE_PATH}/organizations/peerOrganizations/gas.example.com/users/Admin@gas.example.com/msp/signcerts/Admin@gas.example.com-cert.pem`,
      keyDirPath: `${BASE_PATH}/organizations/peerOrganizations/gas.example.com/users/Admin@gas.example.com/msp/keystore`,
      allowedFunctions: ['ConfirmArrivalGasStation', 'SellTyre', 'ReadTyre', 'TyreExists', 'GetAllTyres', 'GetTyreHistory'],
    },
  },

  // Simple user store — in production use a real database
  users: {
    'admin.central': { password: 'central123', org: 'central', role: 'Admin' },
    'admin.regional': { password: 'regional123', org: 'regional', role: 'Admin' },
    'admin.gas': { password: 'gas123', org: 'gas', role: 'Admin' },
  },

  jwt: {
    secret: 'tyre-supply-chain-secret-2024',
    expiresIn: '8h',
  },
};

module.exports = config;
