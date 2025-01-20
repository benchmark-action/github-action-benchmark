#!/bin/bash

npm install
npm run build

PATH=$(basename $1)
SCRIPT="$PATH/dist/src/index.js"

$SCRIPT
