import BaseAction from './baseaction'
import Roles from '../../models/workflowroles'
import User from '../../models/user';
import MultiInstanceUserData from '../../models/multiinstanceuserdata';
import {fail} from "../../js/utils"
import mongoose, { Mongoose } from 'mongoose';
import moment from 'moment';


export class MultiInstanceUserDataMgr extends BaseAction{
  constructor(){
    super();
    this.setRoles(Roles.SysAdmin, Roles.User);
  }

  route() {
    this.post({path:"/getcollection", overrideRoles:[Roles.ANY]}, (req, res) => {
      var userId = req.body.owner?mongoose.Types.ObjectId(req.body.owner):null;
      var orgId = req.body.organizationId?mongoose.Types.ObjectId(req.body.organizationId):null;
      var filter = {};
      if (userId) filter.owner = userId;
      if (orgId) filter.organization = orgId;
      if (req.body.key) filter.key = req.body.key;

      MultiInstanceUserData.find(filter)
      .then((dataList)=>{
        if (dataList) {
          res.json({success:true, dataList:dataList.sort((a,b)=>(a.created_at<b.created_at?1:(a.created_at>b.created_at?-1:0)))})
        } else {
          res.json({success:false, errMsg: 'Not found.'});
        }
      })
      .catch(error=>{
        res.json({success:false, errMsg:error+''});
      });
    });

    // {userId:'', organizationId, key: '', content: ''}
    this.post({path:"/create", overrideRoles:[Roles.ANY]}, (req, res) => {
      var userId = mongoose.Types.ObjectId(req.body.owner);
      var orgId = mongoose.Types.ObjectId(req.body.organizationId);

      MultiInstanceUserData.create({
        owner:userId,
        organization: orgId,
        key: req.body.key || '',
        content: req.body.content})
      .then(data=>{
        if (data) {
          res.json({success:true, data:data});
        } else {
          res.json({success:false})
        }
      })
      .catch(error =>{
        res.json({success:false, errMsg:error+''});
      })
    });

    //delete by userId and _id or userId, organizationId and key
    this.post({path:"/delete", overrideRoles:[Roles.ANY]}, (req, res) => {
      var userId = mongoose.Types.ObjectId(req.body.owner);
      var _id = req.body._id?mongoose.Types.ObjectId(req.body._id):null;
      var orgId = req.body.organizationId?mongoose.Types.ObjectId(req.body.organizationId):null;
      var filter = {owner:userId};
      if (_id) {
        filter._id = _id;
      } else {
        filter.organization = orgId;
        filter.key = req.body.key;
      }
      (_id?MultiInstanceUserData.deleteOne(filter):MultiInstanceUserData.deleteMany(filter))
      .then(result=>{
        res.json({success:true, result:result});
      })
      .catch(error =>{
        res.json({success:false, errMsg:error+''});
      })
    });

    return this.router;
  }
}
