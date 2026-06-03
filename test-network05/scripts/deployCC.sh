#!/usr/bin/env bash

source scripts/utils.sh

CHANNEL_NAME=${1:-"mychannel"}
CC_NAME=${2}
CC_SRC_PATH=${3}
CC_SRC_LANGUAGE=${4}
CC_VERSION=${5:-"1.0"}
CC_SEQUENCE=${6:-"1"}
CC_INIT_FCN=${7:-"NA"}
CC_END_POLICY=${8:-"NA"}
CC_COLL_CONFIG=${9:-"NA"}
DELAY=${10:-"3"}
MAX_RETRY=${11:-"5"}
VERBOSE=${12:-"false"}

println "executing with the following"
println "- CHANNEL_NAME: ${C_GREEN}${CHANNEL_NAME}${C_RESET}"
println "- CC_NAME: ${C_GREEN}${CC_NAME}${C_RESET}"
println "- CC_SRC_PATH: ${C_GREEN}${CC_SRC_PATH}${C_RESET}"
println "- CC_SRC_LANGUAGE: ${C_GREEN}${CC_SRC_LANGUAGE}${C_RESET}"
println "- CC_VERSION: ${C_GREEN}${CC_VERSION}${C_RESET}"
println "- CC_SEQUENCE: ${C_GREEN}${CC_SEQUENCE}${C_RESET}"
println "- CC_END_POLICY: ${C_GREEN}${CC_END_POLICY}${C_RESET}"
println "- CC_COLL_CONFIG: ${C_GREEN}${CC_COLL_CONFIG}${C_RESET}"
println "- CC_INIT_FCN: ${C_GREEN}${CC_INIT_FCN}${C_RESET}"
println "- DELAY: ${C_GREEN}${DELAY}${C_RESET}"
println "- MAX_RETRY: ${C_GREEN}${MAX_RETRY}${C_RESET}"
println "- VERBOSE: ${C_GREEN}${VERBOSE}${C_RESET}"

INIT_REQUIRED="--init-required"
# check if the init fcn should be called
if [ "$CC_INIT_FCN" = "NA" ]; then
  INIT_REQUIRED=""
fi

if [ "$CC_END_POLICY" = "NA" ]; then
  CC_END_POLICY=""
else
  CC_END_POLICY="--signature-policy $CC_END_POLICY"
fi

if [ "$CC_COLL_CONFIG" = "NA" ]; then
  CC_COLL_CONFIG=""
else
  CC_COLL_CONFIG="--collections-config $CC_COLL_CONFIG"
fi

FABRIC_CFG_PATH=$PWD/../config/

# استيراد ملفات الإعدادات
. scripts/envVar.sh
. scripts/ccutils.sh

# 1. تغليف العقد الذكي
./scripts/packageCC.sh $CC_NAME $CC_SRC_PATH $CC_SRC_LANGUAGE $CC_VERSION 
PACKAGE_ID=$(peer lifecycle chaincode calculatepackageid ${CC_NAME}.tar.gz)

## 2. تثبيت العقد على المنظمات الثلاث
infoln "Installing chaincode on peer0.central (Org1)..."
installChaincode 1
infoln "Installing chaincode on peer0.regional (Org2)..."
installChaincode 2
infoln "Installing chaincode on peer0.gas (Org3)..."
installChaincode 3

resolveSequence

## 3. الموافقة من قبل كل منظمة (Approve)
infoln "Approving chaincode for Central Administration..."
approveForMyOrg 1

infoln "Approving chaincode for Regional Administration..."
approveForMyOrg 2

infoln "Approving chaincode for Gas Station..."
approveForMyOrg 3

## 4. التحقق من جاهزية الالتزام (Commit Readiness)
# نتوقع أن تكون المنظمات الثلاث قد وافقت الآن
checkCommitReadiness 1 "\"CentralMSP\": true" "\"RegionalMSP\": true" "\"GasMSP\": true"

## 5. تنفيذ الالتزام النهائي (Commit)
# نرسل الأمر عبر منظمتين على الأقل (سياسة الأغلبية)
commitChaincodeDefinition 1 2 3

## 6. التحقق من حالة الالتزام
queryCommitted 1
queryCommitted 2
queryCommitted 3

## 7. تهيئة العقد (Invoke Init) إذا كان مطلوباً
if [ "$CC_INIT_FCN" = "NA" ]; then
  infoln "Chaincode initialization is not required"
else
  # تنفيذ التهيئة بمشاركة المنظمات
  chaincodeInvokeInit 1 2 3
fi

exit 0