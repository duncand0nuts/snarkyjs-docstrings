#!/bin/bash

set -e

pushd ../../../../../crypto/proof-systems/poseidon/export_test_vectors
  cargo run -p export_test_vectors -- b10 kimchi ../../../../snarky_js_bindings/snarkyjs/src/js_crypto/test_vectors/testVectors.json
  cargo run -p export_test_vectors -- b10 legacy ../../../../snarky_js_bindings/snarkyjs/src/js_crypto/test_vectors/testVectorsLegacy.json
popd

echo "// @gen this file is generated - don't edit it directly" > $1 
echo "export { testPoseidonKimchiFp };" >> $1
echo "let testPoseidonKimchiFp = $(cat testVectors.json)" >> $1
rm testVectors.json
../../../node_modules/prettier/bin-prettier.js --write $1

echo "// @gen this file is generated - don't edit it directly" > $2 
echo "export { testPoseidonLegacyFp };" >> $2
echo "let testPoseidonLegacyFp = $(cat testVectorsLegacy.json)" >> $2
rm testVectorsLegacy.json
../../../node_modules/prettier/bin-prettier.js --write $2