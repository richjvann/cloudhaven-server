import BaseAction from './baseaction'
import Roles from '../../models/workflowroles'
import AppStore from '../../models/appstore';
import User from '../../models/user';
import {fail} from "../../js/utils"
import mongoose, { Mongoose } from 'mongoose';
import appstore from '../../models/appstore';

export class AppStoreMgr extends BaseAction{
  constructor(){
    super();
    this.setRoles(Roles.SysAdmin, Roles.User);
  }

  route() {
    // {organizationId, collection, key, jsonData]}
    this.post({path:"/upsert"}, (req, res) => {
      var orgId = mongoose.Types.ObjectId(req.body.organizationId);
      AppStore.updateOne({organization:orgId, table:req.body.table, key: req.body.key}, req.body, {upsert:true})
      .then((result)=>{
        res.json({success:result.ok==1, nModified:result.nModified});
      })
      .catch(err =>{
        res.json({success:false, errMsg:err})
      });
    });

    //body: :organizationId, table, key, searchOperator
    this.post({path:'/read'}, (req, res) =>{
      var orgId = mongoose.Types.ObjectId(req.body.organizationId);
      var searchFilter = {organization:orgId, table:req.body.table};
      if (req.body.key) {

      }
      if (req.body.searchOperator == 'startswith') {
        seaarchFilter.key = {$regex:req.body.key};
      } else if (req.body.searchOperator == 'contains') {
        seaarchFilter.key = {$regex:"/"+req.body.key};
      } else if (req.body.key) {
        searchFilter.key = req.body.key;
      }
      AppStore.find( searchFilter )
      .then(results =>{
        res.json({success:true, data:results});
      })
      .catch(err =>{
        res.json({success:false, errMsg:err})
      });
    })

    this.post({path:'/delete'}, (req, res) => {
      AppStore.deleteOne({table: req.body.table, _id:mongoose.Types.ObjectId(req.body.id)})
      .then(results =>{
        res.json({success:true});
      })
      .catch(err =>{
        res.json({success:false, errMsg:err})
      });
    })
    return this.router;
  }
}
