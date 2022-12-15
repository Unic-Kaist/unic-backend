# Geralt
Nufutu Backend Service

# Structure

# How to set up & run
You may need to install nodemon and ts-node globally.

```
npm i g nodemon ts-node
``` 

```
yarn
```

How to run dev:
```
yarn dev
```

How to run prod:
```
docker build -t geralt . 
docker run -p 3001:80 geralt 
```
