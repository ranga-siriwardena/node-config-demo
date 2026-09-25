# node-config-demo

Node.js service deployed to Choreo (WSO2 Developer Platform), demonstrating how to map **config groups** — an environment-variable config and a certificate file mount — onto a component.

## About this service

`index.js` is a plain Node `http` server — no framework, no dependencies (`package.json` lists none). It listens on port `8080` and exposes one endpoint:

- `GET /albums` → returns two hardcoded albums as JSON, and logs the `TEST_CONFIG_STR` value plus the full cert content (line by line) to stdout on every call.

Two env vars are required at startup — `TEST_CONFIG_STR` and `CERT_FILE_PATH`. If either is missing, the process logs an error and calls `process.exit(1)` immediately; it never gets as far as listening on a port. That's the fail-fast behavior referenced in step 4 below.

`.choreo/component.yaml` declares the matching Choreo endpoint: port `8080`, `type: REST`, `networkVisibilities: [Public]`.

## Prerequisites

- [GitHub CLI (`gh`)](https://cli.github.com/) installed and authenticated
- WSO2 Developer Platform CLI (`wdp`) installed and authenticated
- A target project to deploy into (`Ranga-US` in the commands below — swap in your own)
- `config-group-env.yaml`, `config-group-cert.yaml`, and `link-groups.yaml` already defined under a local `wdp/` folder

## 1. Test locally

No `npm install` needed — `package.json` has zero dependencies. Just run the service with the same two configurables it expects at runtime:

```bash
TEST_CONFIG_STR=hello-from-config-group CERT_FILE_PATH=$PWD/wdp/test-cert.pem npm start
```

In a second terminal:

```bash
curl localhost:8080/albums
```

## 2. Push to GitHub

Choreo builds from a repository, so this folder needs to be one first:

```bash
git init && git add . && git commit -m "node-config-demo"
gh repo create node-config-demo --public --source=. --push
```

## 3. Create the component and build it

```bash
wdp create component node-config-demo -p Ranga-US --type=service --build-pack=nodejs \
  --repo=https://github.com/ranga-siriwardena/node-config-demo --repo-branch=main

wdp create build node-config-demo -p Ranga-US
```

## 4. Create the config groups and link them

Run these from the `wdp/` folder:

```bash
cd wdp

wdp create config-group --file=config-group-env.yaml
wdp create config-group --file=config-group-cert.yaml
wdp set component-config -f link-groups.yaml --dry-run
wdp set component-config -f link-groups.yaml
```

> Do this before deploying — the app exits on startup without its config.

**`config-group-env.yaml`** — the two plain values, applied as env vars:

```yaml
name: node-demo-env
description: "node-config-demo env vars"
configurations:
  - key: TEST_CONFIG_STR
    isSensitive: false
    isFile: false
    values:
      Development: "hello-from-config-group"
  - key: CERT_FILE_PATH
    isSensitive: false
    isFile: false
    values:
      Development: "/etc/certs/test-cert.pem"
```

**`config-group-cert.yaml`** — the cert as a file (`isFile: true` means the value is a path to a *local* file to upload, not inline content):

```yaml
name: node-demo-cert
description: "node-config-demo certificate"
configurations:
  - key: test-cert.pem
    isSensitive: true
    isFile: true
    values:
      Development: "test-cert.pem"
```

**`link-groups.yaml`** — maps both groups onto the component:

```yaml
schemaVersion: 1
component: node-config-demo
project: Ranga-US
environment: Development

configs:
  configGroups:
    - name: node-demo-env
    - name: node-demo-cert
      mountPath: /etc/certs
```

These two files have to agree with each other: `node-demo-cert` is mounted at `/etc/certs`, which is what turns its `test-cert.pem` key into the file `/etc/certs/test-cert.pem` — and that's exactly the path `CERT_FILE_PATH` points to in `node-demo-env`. If you ever rename the mount path or the cert's key, update `CERT_FILE_PATH` to match, or the component will exit on startup unable to find the file.

## 5. Deploy

Only after step 4:

```bash
wdp create deployment node-config-demo -p Ranga-US --deployment-track=main --env=Development
```

## 6. Verify

```bash
wdp list components --config-group node-demo-env
wdp list config-groups -p Ranga-US -c node-config-demo
```

## 7. Test

Call `GET /albums` from the Choreo test console and check the logs for `hello-from-config-group` and the cert content.

## 8. Update a config group

"Update" covers two different operations — only one of them has a documented, upsert-safe command.

**A. Change which config groups a component is linked to (or how they're mounted)**

Edit `link-groups.yaml`, then re-apply it. `set component-config` is an upsert (creates missing entries, updates existing ones, leaves the rest alone), so this is safe to re-run:

```bash
wdp set component-config -f link-groups.yaml --dry-run   # preview the diff
wdp set component-config -f link-groups.yaml              # apply
```

**B. Change a value *inside* an existing config group** (e.g. bump `TEST_CONFIG_STR`, or add a new key)

There's no distinct "update config-group" verb documented — only `create config-group` for the initial creation. The likely path, following the edit-file-then-reapply pattern used elsewhere in this CLI, is to edit the group's file and re-run the same create command. For example, to change the value and add a new key to `node-demo-env`:

```yaml
# config-group-env.yaml
name: node-demo-env
description: "node-config-demo env vars"
configurations:
  - key: TEST_CONFIG_STR
    isSensitive: false
    isFile: false
    values:
      Development: "hello-from-config-group-v2"   # <- changed
  - key: CERT_FILE_PATH
    isSensitive: false
    isFile: false
    values:
      Development: "/etc/certs/test-cert.pem"
  - key: EXTRA_FLAG                                 # <- new key
    isSensitive: false
    isFile: false
    values:
      Development: "true"
```

```bash
wdp create config-group --file=config-group-env.yaml
```

Before relying on this, confirm `create config-group` is actually idempotent on an existing group name (check `wdp create config-group --help`, or test against a throwaway group first) — that guarantee is only explicitly stated in the doc for `set component-config`, not for `create config-group`.

Either way, a config-group change only takes effect on the component's **next deployment** — same caveat as step 5.
