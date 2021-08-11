import { Router } from 'express';
import {ok, fail} from "../js/utils";
import passport from 'passport';
import passportObj from '../config/passport'
import AuditLog from '../models/auditlog';
import { checkRoleWithPassport } from '../checkroles'
import mongoose from 'mongoose'
passportObj(passport);

import jwt from 'jsonwebtoken';

const MAX_RESULTS = 100;

/**
  Generic controller that provides CRUD operations for a given Mongoose model
*/
export default class BaseController{

  /**
    @param model Mongoose model
    @param key primary key of the model that will be used for searching, removing
    and reading
  */
  constructor(model, key, readRoles, writeRoles){
    this.model = model;
    this.rawModelName = model.modelName;
    this.modelName = model.modelName.toLowerCase();
    this.key = key;
    this.readRoles = readRoles;
    this.writeRoles = writeRoles;
    this.authData = {};
  }

  authenticate(roles, tag) {
    return checkRoleWithPassport(this.authData, roles, passport, tag )
  }

  logAuditData( recordId, operation, dataObj) {
    var publicIdFldMap = {}
    var obj = { user:this.authData.user.id, model:this.rawModelName, operation: operation };
    if (dataObj) {
      obj.data = JSON.stringify(dataObj);
      var publicIdFld = publicIdFldMap[obj.model];
      if (publicIdFld) {
        var publicId = dataObj[publicIdFld];
        if (publicId) {
          obj.publicId = publicId;
        }
        obj.isPHI = true;
      }
    }
    if (recordId) obj.recordId = recordId;
    AuditLog
    .create( obj )
    .then(auditLogObj => {
      var x = auditLogObj;
    })
    .then(null, error=>{
      console.log(error);
    })
  }

  getToken(headers) {
    if (headers && headers.authorization) {
      var parted = headers.authorization.split(' ');
      if (parted.length === 2) {
        return parted[1];
      } else {
        return null;
      }
    } else {
      return null;
    }
  };
  copyAttributes( src, dst, key ) {
    const skipAttributes = {_id:true, createdAt:true, updatedAt:true, __v:true}
    if (key) skipAttributes[key] = true;
    for (var attribute in src){
      if (attribute == 'contactInfo') {
        this.copyAttributes( src.contactInfo, dst.contactInfo, key);
      } else {
        if (src.hasOwnProperty(attribute) && attribute !== key && !skipAttributes[attribute]){
          dst[attribute] = src[attribute];
        }
      }
    }
  }

  create(data) {
    return this.model
      .create(data)
      .then((modelInstance) => {
        this.logAuditData( modelInstance.id, 'create', data);
        return modelInstance;
      });
  }

  read(id) {
    var filter = {};
    filter[this.key] = id;
    return this.model
    .findOne(filter)
    .then((modelInstance) => {
      this.logAuditData( id, 'read', modelInstance);
      return modelInstance;
    });
  }

  list() {
      return this.model
      .find({})
      .limit(MAX_RESULTS)
      .then((modelInstances) => {
        return modelInstances;
      });
  }

  delete(id) {
    this.logAuditData( id, 'delete');
    const filter = {};
    filter[this.key] = id;
    return this.model
      .deleteOne(filter)
      .then(() => {
        return {};
      })
  }


  /**
   */
  update(id, data) {
    this.logAuditData( id, 'update', data);
    var filter = {};
    filter[this.key] = id;
    return this.model
      .findOne(filter)
      .then((modelInstance) => {
        this.copyAttributes(data, modelInstance, this.key);
        return modelInstance.save();
      })
      .then((modelInstance) => {
        return modelInstance;
      })
      .catch(err=>{
        console.log(err+'');
      })
  }

  route(){
    const router = new Router();
//    router.get("/", passport.authenticate('jwt', { session: false}), (req, res) => {
    router.get("/list", this.authenticate(this.readRoles, this.model+' list'), (req, res) => {
      var authData = this.authData;
      if (this.getToken(req.headers)) {
        this.list()
        .then(ok(res))
        .then(null, fail(res));
      } else {
        res.status(403).send({success: false, msg: 'Unauthorized.'});
      }
    });

    router.post("/", this.authenticate(this.writeRoles, this.model+' create'), (req, res) => {
      if (this.getToken(req.headers)) {
        this
        .create(req.body)
        .then(ok(res))
        .catch((err)=>{
          if (err.message.indexOf('duplicate key')>=0) {
            res.json({success:false, errMsg: 'Error: Duplicate key value.'});
          } else {
            res.json({success:false, errMsg: err.message});
          }
          console.log(err);
        }) 
        .then(null, fail(res));
      } else {
        res.status(403).send({success: false, msg: 'Unauthorized.'});
      }
    });

    router.get("/:key", this.authenticate(this.readRoles, this.model+' read'), (req, res) => {
      if (this.getToken(req.headers)) {
        this
        .read(req.params.key)
        .then(ok(res))
        .then(null, fail(res));
      } else {
        res.status(403).send({success: false, msg: 'Unauthorized.'});
      }
    });

    router.put("/:key", this.authenticate(this.writeRoles, this.model+' update'), (req, res) => {
      if (this.getToken(req.headers)) {
        this
        .update(req.params.key, req.body)
        .then(ok(res))
        .catch((err)=>{
          if (err.message.indexOf('duplicate key')>=0) {
            res.json({success:false, errMsg: 'Error: Duplicate key value.'});
          } else {
            res.json({success:false, errMsg: err.message});
          }
          console.log(err);
        }) 
        .then(null, fail(res));
      } else {
        res.status(403).send({success: false, msg: 'Unauthorized.'});
      }
    });

    router.delete("/:key", this.authenticate(this.writeRoles, this.model+' delete'), (req, res) => {
      if (this.getToken(req.headers)) {
        this
        .delete(req.params.key)
        .then(ok(res))
        .then(null, fail(res));
      } else {
        res.status(403).send({success: false, msg: 'Unauthorized.'});
      }
    });

    return router;
  }
}
