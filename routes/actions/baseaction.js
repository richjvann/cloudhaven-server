import { Router } from 'express';
import passport from 'passport';
import passportObj from '../../config/passport'
import { checkRoleWithPassport } from '../../checkroles'
import AuditLog from '../../models/auditlog'

passportObj(passport);

import jwt from 'jsonwebtoken';

export default class BaseController{
    constructor() {
        this.router = new Router();
        this.authData = {};
        this.roles = [];
    }
    setRoles() {
      for (var i=0; i < arguments.length; i++) {
        this.roles.push(arguments[i]);
      }
    }

    getToken(headers) {
      return true; //FIXME - remove this line to re-enable roles
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
    }

    getUser() {
      return (this.authData && this.authData.user) ? this.authData.user.name : '';
    }

    authenticate(params) {
      return checkRoleWithPassport(this.authData, params.overrideRoles || this.roles, passport, params.tag );
    }

    post( params, handler) {
      this.router.post( params.path, this.authenticate(params), (req, res) => {
        if (this.getToken(req.headers)) {
          handler( req, res );
        } else {
          res.status(403).send({success: false, msg: 'Unauthorized' + (params.tag?(` at(${params.tag})`):'')});
        }
      })
    }
    put( params, handler) {
      this.router.put( params.path, this.authenticate(params), (req, res) => {
        if (this.getToken(req.headers)) {
          handler( req, res );
        } else {
          res.status(403).send({success: false, msg: 'Unauthorized' + (params.tag?(` at(${params.tag})`):'')});
        }
      })
    }
    get( params, handler) {
      this.router.get( params.path, this.authenticate(params), (req, res) => {
        if (this.getToken(req.headers)) {
          handler( req, res );
        } else {
          res.status(403).send({success: false, msg: 'Unauthorized' + (params.tag?(` at(${params.tag})`):'')});
        }
      })
    }
    delete( params, handler) {
      this.router.delete( params.path, this.authenticate(params), (req, res) => {
        if (this.getToken(req.headers)) {
          handler( req, res );
        } else {
          res.status(403).send({success: false, msg: 'Unauthorized' + (params.tag?(` at(${params.tag})`):'')});
        }
      })
    }

    logAuditData( model, recordId, operation, dataObj) {
      var publicIdFldMap = {}
      var obj = { user:this.authData.user.id, model:model, operation: operation };
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
    
    copyAttributes( src, dst, key ) {
      const skipAttributes = {id:true, _id:true, createdAt:true, updatedAt:true, __v:true}
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
  
    route(){
    }
    
}  