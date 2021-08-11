import mongoose from 'mongoose';
import moment from 'moment';
import passport from 'passport';
import config from '../config/database';
import passportObj from '../config/passport'
import express from 'express';
import jwt from 'jsonwebtoken';
import User from "../models/user";
import EmailVerifyCode from "../models/emailverifycode";
import { UserDataMgr } from './actions/userdata.js'
import { MultiInstanceUserDataMgr } from './actions/multiinstanceuserdatamgr.js';
import { AppStoreMgr } from './actions/appstoremgr.js'
import { MessageMgr } from './actions/messagemgr.js'
import { CalendarMgr } from './actions/calendarmgr.js'
import { ConversationMgr } from './actions/conversation.js'
import { UserInfo } from './actions/userinfo.js'
import { UserSearch } from './actions/usersearch.js'
import { Reports } from './actions/reports.js'
import { OrganizationUserMgr } from './actions/organizationuser'
import { OrganizationGroupMgr } from './actions/organizationgroup'
import { UserSubscription } from './actions/usersubscription'
import { OrganizationAppMgr } from './actions/organizationapplication'
import { OrganizationComponentMgr } from './actions/organizationcomponent'
import { OrganizationMixinMgr } from './actions/organizationmixin'
import { Organizations } from './actions/organizations'
import { ChangePassword } from './actions/chgpwd'
import { MetaDataMgr } from './actions/componentmetadata'
import cityStateLookup from '../services/citystatelookup'
import { AuditLogReview } from './actions/auditlogreview'
import { EventLogReview } from './actions/eventlogreview'
import userSrvc from '../services/user'
import emailSender from '../services/emailsender'
var bcrypt = require('bcryptjs');


const randString = () => {
  const len = 12;
  let randStr = '';
  for (let i=0; i< len; i++) {
    const ch = Math.floor((Math.random() * 10) + 1);
    randStr += ch;
  }
  return randStr;
}

import { UserController, OrganizationController } from './controllers';


export default function() {
  passportObj(passport);
  const router = express.Router();

  router.get('/citystatelookup/:zip', (req, res) => {
    cityStateLookup(req.params.zip)
    .then(cityStateObj=>{
      res.json(cityStateObj);
    })
   });
  router.post('/emailtest', (req, res) => {
    NotificationService.sendEmail( req.body.testEmail, 'Email Test', 'This is a test email from SRSS.', process.env.EMAIL_USER )
    .then(ok =>{
      res.json({succeeded:ok});
    })
  });
  
    router.post('/signup', (req, res) => {
      User.create({
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        password: req.body.password,
        roles: ['USER']
      })
      .then(newUser =>{
        return EmailVerifyCode.create({
          mode: 'email',
          email: newUser.email,
          code: randString()
        });  
      })
      .then(newVCode =>{
        emailSender.sendAccountVerificationEmail({email:newVCode.email, code: newVCode.code});
        res.json({success: true, verificationEmail:newVCode.email});
      })
      .catch(err =>{
          if (err.name == 'ValidationError') {
            res.json({success:false, errMsg: err.message})
          } else if (err.name == 'MongoError' && err.code == 11000) {
            res.json({success: false, errMsg: `A user with email ${req.body.email} already exists - please use a different email.`});
          } else {
            res.json({success:false, errMsg: err.message})
          }
      });
    });

    router.get('/isemailverifypending/:email', (req, res) => {
      User.findOne({email:req.params.email})
      .then(user => {
        res.json({success: true, user:user});
      })
      .catch(err =>{
        res.json({success:false});
      })
    });

    router.get('/resendverificationemail/:email', (req, res) => {
      EmailVerifyCode.deleteMany({email:req.params.email, mode:'email'})
      .then(results => {
        return EmailVerifyCode.create({
          mode: 'email',
          email: req.params.email,
          code: randString()
        })
      })
      .then(newVCode =>{
        emailSender.sendAccountVerificationEmail({email:newVCode.email, code: newVCode.code});
        res.json({success: true, verificationEmail:newVCode.email});
      })
    });

    router.get('/verifyaccount/:email/:code', (req, res) => {
      EmailVerifyCode.findOne({mode:'email', email:req.params.email, code: req.params.code})
      .then( vCode => {
        var promises = [];
        if (vCode) {
          promises.push(User.findOneAndUpdate({email:req.params.email, status:'Email Verification Pending'},
          {$set:{status:'Need Organization Assignment'}}));
        }
        return mongoose.Promise.all(promises);
      })
      .then(result =>{
        var badCodeHTML = `
        <html>
        <head>
          <meta http-equiv="Refresh" content="0; url='${process.env.CLIENT_DOMAIN}?verifyexpired=true'" />
        </head>
        <body>
          <p>This account verification link is not valid (expires after 10 minutes).</p>
        </body>
        </html>`;
        var redirectHTML = `
        <html>
        <head>
          <meta http-equiv="refresh" content="0; URL='${process.env.CLIENT_DOMAIN}?fromemailverify=true" />
        </head>
        <body>
          <p>If you are not redirected in five seconds, <a href="${process.env.CLIENT_DOMAIN}">click here</a>.</p>
        </body>
      </html>`;

      res.set('Content-Type', 'text/html');
      res.send(result.length==1?redirectHTML:badCodeHTML)
      })
    })
  
    router.get('/sendpwdresetemail/:email', (req, res) => {
      EmailVerifyCode.deleteMany({email:req.params.email, mode:'password'})
      .then(results => {
        return EmailVerifyCode.create({
          mode: 'password',
          email: req.params.email,
          code: randString()
        })
      })
      .then(newVCode =>{
        emailSender.sendPasswordResetEmail({email:newVCode.email, code: newVCode.code});
        res.json({success: true, verificationEmail:newVCode.email});
      })
    });

    router.get('/requestpwdreset/:email/:code', (req, res) => {
      EmailVerifyCode.findOne({mode:'password', email:req.params.email, code: req.params.code})
      .then( vCode => {
        var badCodeHTML = `
        <html>
        <body>
          <p>This password reset link is not valid (expires after 10 minutes).</p>
        </body>
      </html>`;

      res.set('Content-Type', 'text/html');
      res.send(vCode?emailSender.getPasswordResetForm(vCode.email, vCode.code):badCodeHTML);
      })
    })

    router.post("/resetpwd", (req, res) => {
      EmailVerifyCode.findOne({mode:'password', email:req.body.email, code: req.body.code})
      .then( vCode => {
        if (!vCode) {
          res.json({success:false, errMsg:'Password reset email expired.'});
        } else {
          bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                return res.json({success:false, errMsg:err});
            }
            bcrypt.hash(req.body.newPassword, salt, function (err, hash) {
              if (err) {
                return res.json({success:false, errMsg:err});
              }
              var filter = req.body._id?{_id:req.body._id}:{email:req.body.email};
              User.findOneAndUpdate(filter, {$set:{password:hash}})
              .then(result=>{
                res.json({success:result?true:false})
              })
              .catch(err =>{
                res.json({success:false, errMsg:err});
              });
            });
          });
        }
      });  
    });
    
    router.post('/login', (req, res) => {
      User.findOne({email: req.body.email},
        {email:1, password:1, status:1, firstName:1, middleName:1, lastName:1, name:1, roles:1, subscribedApps:1})
      .then(user => {
        if (!user) {
          res.status(401).send({success: false, msg: 'Authentication failed. User not found.'});
        } else {
          // check if password matches
          user.comparePassword(req.body.password, function (err, isMatch) {
            if (isMatch && !err) {
              // if user is found and password is right create a token
              var token = jwt.sign(user.toJSON(), config.secret,  {expiresIn: '24h'} );
              // return the information including token as JSON
              res.json({success: true, token: 'JWT ' + token, user:user});
              userSrvc.createUserMessageFolders( user._id );
            } else {
              res.status(401).send({success: false, msg: 'Authentication failed. Wrong password.'});
            }
          });
        }
      })
      .catch(err=>{
        res.status(401).send({success: false, msg: `Authentication failed. Error: ${err}.`});
      })
    });
  
    router.use( '/users', new UserController().route());
    router.use( '/organizations', new OrganizationController().route());
  
    router.use( '/auditlog', new AuditLogReview().route());
    router.use( '/eventlog', new EventLogReview().route());

    router.use( '/userinfo', new UserInfo().route());
    router.use( '/usersearch', new UserSearch().route());
    router.use( '/userdata', new UserDataMgr().route());
    router.use( '/multiinstanceuserdatamgr', new MultiInstanceUserDataMgr().route());
    router.use( '/appstoremgr', new AppStoreMgr().route());
    router.use( '/messagemgr', new MessageMgr().route());
    router.use( '/calendarmgr', new CalendarMgr().route());
    router.use( '/conversation', new ConversationMgr().route());
    router.use( '/componentmetadata', new MetaDataMgr().route());
    router.use( '/reports', new Reports().route());
    router.use( '/organizationuser', new OrganizationUserMgr().route());
    router.use( '/organizationgroup', new OrganizationGroupMgr().route());
    router.use( '/usersubscription', new UserSubscription().route());
    router.use( '/organizationapplication', new OrganizationAppMgr().route());
    router.use( '/organizationcomponent', new OrganizationComponentMgr().route());
    router.use( '/organizationmixin', new OrganizationMixinMgr().route());
    router.use( '/organizationlist', new Organizations().route());
    router.use( '/chgpwd', new ChangePassword().route());
    
    
    return router;
  }
