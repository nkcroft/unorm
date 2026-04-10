# Changelog

## [1.0.2](https://github.com/nkcroft/unorm/compare/v1.0.1...v1.0.2) (2026-04-10)


### Bug Fixes

* add explicit id-token:write permission to publish job ([#28](https://github.com/nkcroft/unorm/issues/28)) ([968df49](https://github.com/nkcroft/unorm/commit/968df495086a8de7dcda25f70fd25451ba7f78ee))
* restore registry-url in setup-node for npm OIDC auth ([#27](https://github.com/nkcroft/unorm/issues/27)) ([080189e](https://github.com/nkcroft/unorm/commit/080189edf7316e039015da5f10e3bfe2cb8a9357))
* use Node 24 + remove --provenance per npm Trusted Publishers docs ([#29](https://github.com/nkcroft/unorm/issues/29)) ([941d3e1](https://github.com/nkcroft/unorm/commit/941d3e14ebf3d5d9d434bfca2e958b97d79badee))

## [1.0.1](https://github.com/nkcroft/unorm/compare/v1.0.0...v1.0.1) (2026-04-10)


### Bug Fixes

* inject package version at build time via vite define ([#24](https://github.com/nkcroft/unorm/issues/24)) ([75e8094](https://github.com/nkcroft/unorm/commit/75e8094493315173391dd3bdb8f4d8029e6fc082)), closes [#23](https://github.com/nkcroft/unorm/issues/23)
* pass NPM_TOKEN as NODE_AUTH_TOKEN in publish step ([#19](https://github.com/nkcroft/unorm/issues/19)) ([4515676](https://github.com/nkcroft/unorm/commit/4515676de3f2c3cd8f429fc64ef47c9c8fdde367)), closes [#18](https://github.com/nkcroft/unorm/issues/18)

## 1.0.0 (2026-04-10)


### Features

* add --test-git-user for read-only git username diagnosis ([d4a020f](https://github.com/nkcroft/unorm/commit/d4a020f94d6536f966fa9dccb95abaa5ca582301))
* enhance -t output with codepoints and escaped jamo display ([7079a4e](https://github.com/nkcroft/unorm/commit/7079a4e468117b13979d53b34668efeefda1603e))
* implement CLI interface using commander ([31a352e](https://github.com/nkcroft/unorm/commit/31a352ea6a03d58cb89791251ea1eea575fef605))
* implement core normalization logic and vitest unit tests ([8f3c6c9](https://github.com/nkcroft/unorm/commit/8f3c6c964af09a5a3b21e6946e266c115cb7cb3c))
* implement stream normalization with chunk boundary handling ([e7eafe5](https://github.com/nkcroft/unorm/commit/e7eafe5f86e1a66ab9516b1d4ed752527577fee9))


### Bug Fixes

* bump CI Node.js to 22 and add engines field ([#12](https://github.com/nkcroft/unorm/issues/12)) ([90da374](https://github.com/nkcroft/unorm/commit/90da374702e950ac400b8a7f0b24c94f3054a41d)), closes [#11](https://github.com/nkcroft/unorm/issues/11)
* include dist/ in published package and simplify bin entrypoint ([2e5b6aa](https://github.com/nkcroft/unorm/commit/2e5b6aa4b2973f2f4acb8755d00128dd640f27ed)), closes [#1](https://github.com/nkcroft/unorm/issues/1)
