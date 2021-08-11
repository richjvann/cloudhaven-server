import BaseAction from './baseaction'
import {fail} from "../../js/utils"
import Organization from '../../models/organization'
import Roles from '../../models/workflowroles'
import mongoose from 'mongoose'
import axios from 'axios'

export class OrganizationMixinMgr extends BaseAction{
  constructor(){
    super();
    this.setRoles(Roles.SysAdmin, Roles.User);
  }
  
  route() {
    //Get organization mixin details
    //status, mixinRequests:[{organizationId:'', mixinId:''}, ...]}
    this.post({path:"/getmixins"}, (req, res) => {
      var orgMixins = req.body.mixinRequests.reduce((mp,e)=>{
        var mixinList = mp[e.organizationId] || (mp[e.organizationId] = []);
        mixinList.push(e.mixinId);
        return mp;
      },{});
      var organizationIds = Object.keys(orgMixins);
      Organization.find({organizationId:{$in:organizationIds}}, {_id:1, organizationId:1, mixins:1, mixinsUrl:1})
      .then((organizations)=>{
        if (!organizations || organizations.length>organizationIds.length) {
          res.json({success:false, errMsg:'Failed to find all mixin organizations.'});
        } else {
          var promises = [];
          var localStoredMixinMap = {};
          var mixinOrgs = [];
          organizations.forEach(v=>{
            var validCompMap = v.mixins.reduce((mp,c)=>{
              if (c.status == (req.body.status||'Published'))
              mp[c.mixinId] = c;
              return mp;
            },{})
            var fetchMixinIds = orgMixins[v.organizationId].filter(mxnId=>{
              var mixin = validCompMap[mxnId];
              if (mixin) {
                if (mixin.source == 'CloudHaven') {
                  var key = v.organizationId+':'+mxnId;
                  localStoredMixinMap[key] = mixin.content;
                } else {
                  return true;
                }
                return false;
              }
            });
            if (v.mixinsUrl && fetchMixinIds.length>0) {
              mixinOrgs.push(v.organizationId)
              promises.push(axios.post(v.mixinsUrl, {mixinIds:fetchMixinIds}));
            }
          })
          mongoose.Promise.all(promises)
          .then((results)=>{
            if (!results) {
              res.json({success:false});
            } else {
              var retMixinMap = {};
              for (var i=0;i<results.length;i++) {
                r = results[i];
                orgId = mixinOrgs[i];
                r.data.forEach(mixin=>{
                  var key = orgId+':'+mixin.mixinId;
                  retMixinMap[key] = mixin;
                });
              }
              res.json({success:true, mixinMap: retMixinMap, rawMixinMap:localStoredMixinMap});
            }
          })
        }
      })
    });
    this.post({path:"/"}, (req, res) => {
      var operation = req.body.operation;
      var mixin = {mixinId: req.body.mixinId, source: req.body.source, status: 
        req.body.status, keywords: req.body.keywords, documentation:req.body.documentation, content: req.body.content};
      (()=>{
        if (operation == 'add') {
          return Organization.findOneAndUpdate(
            { _id:mongoose.Types.ObjectId(req.body.organization_Id), 
            mixins:{$not:{$elemMatch:{'mixinId':mixin.mixinId}}}}, 
            {$push:{mixins:mixin}}, {new:true})
        } else {
          var update = Object.keys(mixin).reduce((mp,fld)=>{
            mp['mixins.$[elem].'+fld] = mixin[fld];
            return mp;
          },{});
          return Organization.findOneAndUpdate({_id:mongoose.Types.ObjectId(req.body.organization_Id)},
            {$set:update}, {new:true, arrayFilters:[{'elem._id':mongoose.Types.ObjectId(req.body.mixin_Id)}]})
        }
      })()
      .then(organization=>{
        if (!organization) {
          res.json({success:false, errMsg:`Failed to ${operation} mixin (may be duplicate).`});
        } else {
          res.json({success:true, mixins:organization.mixins});
        }
      })
      .then(null,/*fail(res)*/(error)=>{
        console.log(error);
      })
    });
    this.delete({path:"/:organization_Id/:mixin_Id"}, (req, res) => {
      var orgId = mongoose.Types.ObjectId(req.params.organization_Id);
      var mixinId = mongoose.Types.ObjectId(req.params.mixin_Id)
      Organization.updateOne( {_id: orgId}, {$pull:{mixins:{_id:mixinId}}} )
      .then(result=>{
        if (result && result.ok>0) {
          res.json({success:true});
        }
      })
      .catch(error=>{
        res.json({success:false, errMsg:error+''});
      })
    });

    this.get({path:'/getmixinkeywords'}, (req, res) =>{
      Organization.find({}, {'mixins.keywords':1})
      .then(orgs =>{
        var kwMap = orgs.reduce((mp,org)=>{
          org.mixins.forEach(mixin=>{
            mixin.keywords.forEach(kw=>{
              mp[kw] = kw;
            })
          })
          return mp;
        }, {})
        res.json({success:true, keywords:Object.keys(kwMap).sort((a,b)=>(a<b?-1:(a>b?1:0)))});
      })
      .catch(error =>{
        res.json({success:false, errMsg:error+''});
      })
    });

    //keywordsFilter:[], nameFilter:''
    /*
db.organizations.find({mixins:{$elemMatch:{$and:[
{keywords:{$elemMatch:{$in:['apple','orange']}}},
{isApproved:true}, {status:'Published'}
]}}}, {name:1})
    */
    this.post({path:'/searchmixins'}, (req, res) =>{
      var filter = {mixins:{$elemMatch:{$and:[{isApproved:true}, {status:'Published'}]}}};
      if (req.body.keywordsFilter && req.body.keywordsFilter.length>0) {
        filter.mixins.$elemMatch.$and.push({keywords:{$elemMatch:{$in:req.body.keywordsFilter}}});
      }
      if (req.body.nameFilter) {
        filter.mixins.$elemMatch.$and.push({mixinId:{$regex:req.body.nameFilter}});
      }
      Organization.find(filter, {name:1, organizationId:1, mixins:{mixinId:1, keywords:1, documentation:1}})
      .then(orgs=>{
        var mixins = orgs.reduce((ar, org) => {
          org.mixins.forEach(mixin => {
            if (!req.body.keywords || req.body.keywords.length==0 || _.intersection([req.body.keywords,mixin.keywords]).length>0) {
              if (!req.body.nameFilter || mixin.mixinId.indexOf(req.body.nameFilter)>=0) {
                var obj = {organizationName: org.name, organizationId: org.organizationId,
                  mixinId:mixin.mixinId, documentation: mixin.documentation};
                obj.key = obj.organizationName+'-'+obj.mixinId;
                ar.push(obj);
              }
            }
          })
          return ar;
        },[])
        mixins = mixins.sort((a,b)=>(a.key<b.key?-1:(a.key>b.key?1:0)))
        res.json({success:true, mixins:mixins});
      })
      .catch(error =>{
        var errMsg = error+'';
        res.json({success:false, errMsg:errMsg})
      })
    })

    /*this.post("/apppost", (req, res) => {
//      if (this.getToken(req.headers)) {
      var app = req.body.app;
      if (req.body.httpMethod=='GET') {
        axios.get(app.url+'/'+req.body.postId)
        .then((response)=>{
          res.json(response.data);
        })
      } else if (req.body.httpMethod=='POST') {
        axios.post(app.url+'/'+req.body.postId, req.body.postData)
        .then((response)=>{
          res.json(response.data);
        })
      }

**      } else {
        res.status(403).send({success: false, msg: 'Unauthorized.'});
      }**
    });*/
      
    return this.router;
  }
}
