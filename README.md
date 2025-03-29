# Writing Assistant a.k.a. Canvo
A canvas for thinking  
Node-based procedural text manipulation

### Start app in dev mode

`cd backend && yarn dev`  
`cd frontend && yarn dev`  
`cd ai-service && poetry run dev`  

### Build app for production

`yarn build:backend`  
`yarn build:frontend`  
`yarn build:shared`  

### Deploy

```
./scripts/app/build_and_deploy.sh <green | blue>
./scripts/connect.sh <green | blue>
$cloud> ./unpackage.sh
```
