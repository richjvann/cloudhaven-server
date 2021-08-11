import createError from 'http-errors';
import path from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';

import config from './config/database';
import mongoose from 'mongoose';
import passport from 'passport';
import cors from 'cors';

import User from './models/user.js'

//import pdf from 'express-pdf'
//express-pdf uses html-pdf which has a critical vulnerability, however the way this application
//uses this package is safe and this vulnerability can be ignored


import fs from 'fs'
import https from 'https'
import http from 'http'

import api  from './routes/api';
//import processDocs from './vuetifydocs/process.js';



const args = process.argv.slice(2);
console.log(JSON.stringify(args));

const DIST_DIR = path.join(__dirname, "dist");
const PORT = 3000;
const useSSL = true; //process.env.NODE_ENV != 'development'; //args.find(a=>(a.toLowerCase()=='-usessl'))!=null;

mongoose.connect(config.database, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false }, (err) => {
  if (err) {
      console.error(err);
  } else {
      console.log("Connected to the mongodb");
//      processDocs();
  }
});

var spaServer = null;
const spaApp = express();
console.log(__dirname + '\\spa');
spaApp.use (function (req, res, next) {
  if (req.secure) {
          // request was via https, so do no special handling
          next();
  } else {
          // request was via http, so redirect to https
          res.redirect('https://' + req.headers.host + req.url + (process.env.SSL_PORT=="8443"?":8443":""));
  }
});
spaApp.use(express.static(__dirname + '\\spa'));
var logger0 = function(req, res, next) {
  console.log('Req:'+req.method);
  console.log('Path:'+req.path);
  console.log('Params:'+JSON.stringify(req.params));
  next(); // Passing the request to the next handler in the stack.
}
spaApp.use(logger0);
spaApp.enable("trust proxy");

var key_config = null;
/*
var options = {
  key: fs.readFileSync('copperCerts/privkey1.pem'),
  cert: fs.readFileSync('copperCerts/cert1.pem'),
  ca: [
    fs.readFileSync('copperCerts/root.pem', 'utf8'),
    fs.readFileSync('copperCerts/chain.pem', 'utf8')
  ]
};
*/
if (useSSL) {
  try {
    key_config = {
      key: fs.readFileSync('privkey.pem'),
      cert: fs.readFileSync('cert.pem'),
      ca:[
        fs.readFileSync('fullchain.pem'),
        fs.readFileSync('chain.pem')
      ]
    }
  } catch (e) {
    console.log('Failed to read a pem file: '+e);
  }
  var server = http.createServer(spaApp);
  var secureServer = https.createServer(key_config, spaApp);
  secureServer.listen(process.env.SSL_PORT, function () {
    console.log('SPA app listening on port 443 with SSL.');
  })
  server.listen(process.env.HTTP_PORT);
} else {
  console.log('SPA running on port 80')
  spaServer = spaApp.listen(80);
}


//ClearingHouse.getClaimsStatus();
const app = express();

//app.use(pdf);
app.use(cors({
  exposedHeaders: ['Content-Disposition']
}));
//Serving the files on the dist folder
app.use(express.static(DIST_DIR));

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
  });
  
  var logger2 = function(req, res, next) {
    console.log('Req:'+req.method);
    console.log('Path:'+req.path);
    next(); // Passing the request to the next handler in the stack.
  }
  app.use(logger2);
  app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));
//  app.use(logger('dev'));
  app.use(passport.initialize());
    
  app.use('/api', api());

  //Send index.html when the user access the web
app.get("*", (req, res) => {
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

app.use(function(req, res, next) {
    next(createError(404));
  });
  
  // error handler
  app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
  
    // render the error page
    res.status(err.status || 500);
    res.render('error');
  });

if (useSSL) {
  https.createServer(key_config, app)
  .listen(PORT, function () {
    console.log('REST server listening on port 3000 with SSL.')
  })
} else {
  app.listen(PORT);
}

