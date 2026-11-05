#!/usr/bin/env node

// Keep this file to syntax that very old Node versions can parse, so users on an
// outdated runtime (e.g. an old Homebrew `node`) get a clear message instead of a crash.
var REQUIRED = [20, 12, 0]
var current = process.versions.node.split('.').map(Number)

function isSupported (v) {
  for (var i = 0; i < REQUIRED.length; i++) {
    if (v[i] > REQUIRED[i]) return true
    if (v[i] < REQUIRED[i]) return false
  }
  return true
}

if (!isSupported(current)) {
  console.error('unorm requires Node.js ' + REQUIRED.join('.') + ' or newer, but you are running ' + process.version + '.')
  console.error('Upgrade Node.js, for example: `brew upgrade node`, `nvm install --lts` or https://nodejs.org')
  process.exit(1)
}

// Relative specifiers resolve against this file's URL, which works on every platform
// (absolute Windows paths such as C:\... are not valid ESM import specifiers).
import('../dist/cli.js').then(function (mod) {
  mod.runCli()
})
