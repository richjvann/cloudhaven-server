import BaseAction from './baseaction'
import {fail} from "../../js/utils"
import Organization from '../../models/organization'
import User from '../../models/user'
import Roles from '../../models/workflowroles'
import mongoose from 'mongoose'

export class OrganizationUserMgr extends BaseAction{
  constructor(){
    super();
    this.setRoles(Roles.SysAdmin, Roles.User);
  }
  
  route() {
    this.get({path:'/currentuserorgs'}, (req, res) =>{
      User.findOne({_id:this.authData.user._id}, {orgMemberships:1})
      .populate({path:'orgMemberships.organization',
        model:'Organization',
        populate: [
          {path: 'groups.members', model: 'User'},
          {path:'applications.accessControl.organizations.organization', model: 'Organization'}
        ]
      })
      .then(user =>{
        res.json({success:true, orgMemberships: user.orgMemberships});
      })
      .catch(error => {
        res.json({success:false, errMsg:error})
      })
    });

    this.post({path:'/createorg'}, (req, res) =>{
      Organization.findOne({$or:[{name:{$eq:req.body.name}},{organizationId:{$eq:req.body.organizationId}}]})
      .then(foundOrg=>{
        if (foundOrg) {
          if (req.body.joinExisting) {
            return foundOrg;
          } else {
            return null;
          }
        } else {
          return Organization.create({
            name: req.body.name,
            organizationId: req.body.organizationId})
        }
      })
      .then(org=>{
        if (org) {
          User.findOneAndUpdate({
            _id: this.authData.user._id,
            orgMemberships:{$not:{$elemMatch:{organization:org._id}}}
          }, {$push:{orgMemberships:{isAdmin:true, organization:org._id}}, $set:{status:'Active'}}, {new:true})
          .then(newUser =>{
            res.json({success:true, newUser:newUser});
          })
        } else {
          res.json({success:false, orgAlreadyExists:true});
        }
      })
      .catch(error =>{
        res.json({success:false, errMsg:error});
      })
    });

    //name, organizationId, componentsUrl
    this.post({path:'/updateorg'}, (req, res) =>{
      var orgId = mongoose.Types.ObjectId(req.body._id);
      Organization.updateOne({_id:orgId}, {$set:{
        name:req.body.name,
        organizationId:req.body.organizationId,
        componentsUrl: req.body.componentsUrl
      }}, {new:true})
      .then(result=>{
        if (result.ok>0) {
          res.json({success:true});
        } else {
          res.json({success:false, errMsg: 'Organization updated failed.'});

        }
  })
      .catch(error =>{
        res.json({success:false, errMsg:error});
      })
    });

    this.get({path:"/"}, (req, res) => {
      var contact = req.body.organizationContact;
      if (this.getToken(req.headers)) {
        User.findOne({email:contact.hasLoginAccess?contact.contactInfo.email:'dummyemailvalue'})
        .then(result=>{
          if (result) {
            res.json({success:false, errMsg:'A user already exists for '+contact.contactInfo.email});
          } else {
            return Organization.findOneAndUpdate(
              { _id:mongoose.Types.ObjectId(req.body.organizationId), 
//                contacts:{$not:{$elemMatch:{'contacts.name':contact.name, 'contacts.contactInfo.email':contact.contactInfo.email}}}}, 
                contacts:{$not:{$elemMatch:{'name':contact.name, 'contactInfo.email':contact.contactInfo.email}}}}, 
              {$push:{contacts:contact}}, {new:true})
            .then(organization=>{
              if (!organization) {
                res.json({success:false, errMsg:'Failed to add contact.'});
              } else {
                if (contact.hasLoginAccess) {
                  var addedContact = organization.contacts.find(c=>(c.name==contact.name && c.contactInfo.email==contact.contactInfo.email));
                  User.create({name:contact.name, email:contact.contactInfo.email, organization:organization.id,  password:(new Date().getTime()+''), roles:['ORGANIZATION']})
                  .then(result=>{
                    res.json({success:true, contacts:organization.contacts});
                  })
                  .catch(error=>{
                    res.json({success:false, errMsg:error+''});
                  })
                } else {
                  res.json({success:true, contacts:organization.contacts});
                }
              }
            })
          }
        })
        .then(null, fail(res));
      } else {
        res.status(403).send({success: false, msg: 'Unauthorized.'});
      }
    });
    this.put({path:"/:organizationId/:contactId"}, (req, res) => {
      var updContact = {contactInfo:{}};
      this.copyAttributes(req.body, updContact);
      var update = Object.keys(updContact).reduce((mp,fld)=>{
        mp['contacts.$[elem].'+fld] = updContact[fld];
        return mp;
      },{});
      mongoose.Promise.all([
        Organization.findById(req.params.organizationId),
        User.findOne({organization:req.params.organizationId, contactId:req.params.contactId}),
        User.findOne({email:updContact.contactInfo.email})])
      .then(results=>{
        var organization = results[0];
        var user = results[1];
        var userWithEmail = results[2];
        var promises = [];
        var origContact = organization.contacts.find(c=>(c.id==req.params.contactId));
        var userAdded = false;
        if ((user || origContact.hasLoginAccess) && !updContact.hasLoginAccess) {
          promises.push(User.remove({organization:req.params.organizationId, contactId:req.params.contactId}));
        } else if (!user && updContact.hasLoginAccess) {
          userAdded = true;
          promises.push(User.create({name:updContact.name, email:updContact.contactInfo.email, organization:req.params.organizationId, contactId:req.params.contactId, password:(new Date().getTime()+''), roles:['ORGANIZATION']}));
        } else if (updContact.hasLoginAccess) {
          if (userWithEmail && user.id != userWithEmail.id) {
            res.json({success:false, errMsg: 'A user already exists for '+updContact.contactInfo.email});
            return;
          }
        }
        if (!userAdded && user) {
          promises.push(User.findByIdAndUpdate(user.id, {$set:{email:updContact.contactInfo.email}}));
        }
        mongoose.Promise.all(promises)
        .then(results => {
          Organization.findByIdAndUpdate(req.params.organizationId, {$set:update}, {new:true, arrayFilters:[{'elem._id':mongoose.Types.ObjectId(req.params.contactId)}]})
          .then((result)=>{
            res.json({success:true})
          })
          .catch((error)=>{
            if (error.code == 11000) {
              res.json({success:false, errMsg: 'Duplicate organization.'})
            }
          })
        })
        .catch(error=>{
          if (error.code == 11000 && error.message.indexOf('email_1')>0) {
            res.json({success:false, errMsg: 'Login access denied (another user already exists with this email.'})
          } else {
            res.json({success:false, errMsg:error.message})
          }
          console.log(error);
        })
      })
    });
    this.delete({path:"/:organizationId/:contactId"}, (req, res) => {
      var promises = [];
      promises.push(Organization.findByIdAndUpdate( req.params.organizationId, {$pull:{contacts:{_id:req.params.contactId}}} ));
      promises.push(User.remove({organization:req.params.organizationId, contactId:req.params.contactId}));
      mongoose.Promise.all(promises)
      .then(results=>{
        if (results[0] && results[1].n>0) {
          res.json({success:true});
        }
      })
      .catch(error=>{
        res.json({success:false, errMsg:error+''});
      })
    });

    return this.router;
  }
}
