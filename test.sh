#!/bin/sh

if [ $# -ge 1 ]; then
  clasp run --params "[\"$1\"]" doTest
fi
if [ $# -lt 1 ]; then
  clasp run allTests
fi
say "Ready"