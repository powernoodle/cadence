#!/bin/bash

NPM_OPTS=

npm -g i pnpm
pnpm i --store=node_modules/.pnpm-store

case $1 in
  web)
    pnpm nx run web:build
    ln -sfn apps/web/functions functions
    ;;

  *)
    echo -n "Usage: $0 {web}"
    ;;
esac
