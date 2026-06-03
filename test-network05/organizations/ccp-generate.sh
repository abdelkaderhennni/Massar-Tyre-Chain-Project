#!/usr/bin/env bash

function one_line_pem {
    echo "`awk 'NF {sub(/\\n/, ""); printf "%s\\\\\\\n",$0;}' $1`"
}

function json_ccp {
    local PP=$(one_line_pem $4)
    local CP=$(one_line_pem $5)
    sed -e "s/\${ORG}/$1/" \
        -e "s/\${P0PORT}/$2/" \
        -e "s/\${CAPORT}/$3/" \
        -e "s#\${PEERPEM}#$PP#" \
        -e "s#\${CAPEM}#$CP#" \
        organizations/ccp-template.json
}

function yaml_ccp {
    local PP=$(one_line_pem $4)
    local CP=$(one_line_pem $5)
    sed -e "s/\${ORG}/$1/" \
        -e "s/\${P0PORT}/$2/" \
        -e "s/\${CAPORT}/$3/" \
        -e "s#\${PEERPEM}#$PP#" \
        -e "s#\${CAPEM}#$CP#" \
        organizations/ccp-template.yaml | sed -e $'s/\\\\n/\\\n          /g'
}

# --- Central Administration (Org 1) ---
ORG=1
P0PORT=7051
CAPORT=7054
PEERPEM=organizations/peerOrganizations/central.example.com/tlsca/tlsca.central.example.com-cert.pem
CAPEM=organizations/peerOrganizations/central.example.com/ca/ca.central.example.com-cert.pem

echo "$(json_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/central.example.com/connection-central.json
echo "$(yaml_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/central.example.com/connection-central.yaml

# --- Regional Administration (Org 2) ---
ORG=2
P0PORT=9051
CAPORT=8054
PEERPEM=organizations/peerOrganizations/regional.example.com/tlsca/tlsca.regional.example.com-cert.pem
CAPEM=organizations/peerOrganizations/regional.example.com/ca/ca.regional.example.com-cert.pem

echo "$(json_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/regional.example.com/connection-regional.json
echo "$(yaml_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/regional.example.com/connection-regional.yaml

# --- Gas Station (Org 3) ---
ORG=3
P0PORT=11051
CAPORT=11054
PEERPEM=organizations/peerOrganizations/gas.example.com/tlsca/tlsca.gas.example.com-cert.pem
CAPEM=organizations/peerOrganizations/gas.example.com/ca/ca.gas.example.com-cert.pem

echo "$(json_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/gas.example.com/connection-gas.json
echo "$(yaml_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/gas.example.com/connection-gas.yaml