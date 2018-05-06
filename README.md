# clav_nd
![abc](https://travis-ci.org/namitha17/clav_app.svg?branch=DEV)

Usage ::
>  node app.js [-s <port>] [-r <port>] | -h
  
Documentation (generated via jsdoc) :
```
//output in documentation/index.html
npm run docs
```


Starting ::
```
//install all dependancies
npm install

//start with default ports
node app.js

//start with specifics
node app.js -s 8080 -r 8081

//get help
node app.js -h
```

Linting:
```
//linting with eslint using rules from airbnb javascript style guide
npm run lint
```

Unit Testing (via mocha and chai):
```
npm run tests
```
