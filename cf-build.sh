#!/bin/bash

export NPM_OPTS=

echo === Installing pnpm ===
npm -g i pnpm || exit 1

echo === Installing pnpm packages ===
pnpm i --store=node_modules/.pnpm-store --no-optional || exit 1

case $1 in
  web)
    echo === Building ===
    pnpm nx run web:build || exit 1
    ln -sfn apps/web/functions functions
    ;;

  *)
    echo -n "Usage: $0 {web}"
    ;;
esac
