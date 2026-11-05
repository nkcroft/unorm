#!/usr/bin/env node

// Relative specifiers resolve against this file's URL, which works on every platform
// (absolute Windows paths such as C:\... are not valid ESM import specifiers).
const { runCli } = await import('../dist/cli.js')
runCli()
