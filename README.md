# node-config-demo

Node.js service deployed to Choreo (WSO2 Developer Platform), demonstrating how to map **config groups** — an environment-variable config and a certificate file mount — onto a component.

## Prerequisites

- [GitHub CLI (`gh`)](https://cli.github.com/) installed and authenticated
- WSO2 Developer Platform CLI (`wdp`) installed and authenticated
- A target project to deploy into (`Ranga-US` in the commands below — swap in your own)
- `config-group-env.yaml`, `config-group-cert.yaml`, and `link-groups.yaml` already defined under a local `wdp/` folder

## 1. Test locally

Run the service with the same two configurables it expects at runtime:

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
