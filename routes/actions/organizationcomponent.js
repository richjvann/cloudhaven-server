import BaseAction from './baseaction'
import {fail} from "../../js/utils"
import Organization from '../../models/organization'
import Roles from '../../models/workflowroles'
import mongoose from 'mongoose'
import axios from 'axios'

export class OrganizationComponentMgr extends BaseAction{
  constructor(){
    super();
    this.setRoles(Roles.SysAdmin, Roles.User);
  }
  
  route() {
    //Get organization component details
    //status, organizationComps:[{organizationId:'', componentId:''}, ...]}
    this.post({path:"/getcomponents"}, (req, res) => {
      var organizationComponents = req.body.organizationComps.reduce((mp,e)=>{
        var compList = mp[e.organizationId] || (mp[e.organizationId] = []);
        compList.push(e.componentId);
        return mp;
      },{});
      var organizationIds = Object.keys(organizationComponents);
      Organization.find({organizationId:{$in:organizationIds}}, {_id:1, organizationId:1, components:1, componentsUrl:1})
      .then((organizations)=>{
        if (!organizations || organizations.length<organizationIds.lengrh) {
          res.json({success:false, errMsg:'Failed to find all component organizations.'});
        } else {
          var promises = [];
          var localStoredComponents = [];
          var compOrgs = [];
          organizations.forEach(v=>{
            var validCompMap = v.components.reduce((mp,c)=>{
              if (c.status == (req.body.status||'Published'))
              mp[c.componentId] = c;
              return mp;
            },{})
            var fetchComponentIds = organizationComponents[v.organizationId].filter(cId=>{
              var comp = validCompMap[cId];
              if (comp) {
                if (comp.source == 'CloudHaven') {
                  localStoredComponents.push({stringContent:comp.content, componentId: cId, organizationId: v.organizationId});
                } else {
                  return true;
                }
                return false;
              }
            });
            if (v.componentsUrl && fetchComponentIds.length>0) {
              compOrgs.push(v.organizationId)
              promises.push(axios.post(v.componentsUrl, {componentIds:fetchComponentIds}));
            }
          })
          mongoose.Promise.all(promises)
          .then((results)=>{
            if (!results) {
              res.json({success:false});
            } else {
              var retComponents = [];
              for (var i=0;i<results.length;i++) {
                r = results[i];
                orgId = compOrgs[i];
                retComponents = retComponents.concat(r.data.map(comp=>{
                  var uiConfig = Object.assign({organizationId:orgId}, comp.uiConfig)
                  return uiConfig;
                }));
              }
              res.json({success:true, components: retComponents, rawComponents:localStoredComponents});
            }
          })
        }
      })
    });
    this.post({path:"/"}, (req, res) => {
      var operation = req.body.operation;
      var component = {componentId: req.body.componentId, source: req.body.source, status: 
        req.body.status, keywords: req.body.keywords, documentation:req.body.documentation, content: req.body.content,
        accessControl: req.body.accessControl,
        props:JSON.parse(req.body.props), slots:JSON.parse(req.body.slots), events:JSON.parse(req.body.events)};
      (()=>{
        if (operation == 'add') {
          return Organization.findOneAndUpdate(
            { _id:mongoose.Types.ObjectId(req.body.organization_Id), 
            components:{$not:{$elemMatch:{'componentId':component.componentId}}}}, 
            {$push:{components:component}}, {new:true})
        } else {
          var update = Object.keys(component).reduce((mp,fld)=>{
            mp['components.$[elem].'+fld] = component[fld];
            return mp;
          },{});
          return Organization.findOneAndUpdate({_id:mongoose.Types.ObjectId(req.body.organization_Id)},
            {$set:update}, {new:true, arrayFilters:[{'elem._id':mongoose.Types.ObjectId(req.body.component_Id)}]})
        }
      })()
      .then(organization=>{
        if (!organization) {
          res.json({success:false, errMsg:`Failed to ${operation} component (may be duplicate).`});
        } else {
          res.json({success:true, components:organization.components});
        }
      })
      .then(null,/*fail(res)*/(error)=>{
        console.log(error);
      })
    });
    this.delete({path:"/:organization_Id/:component_Id"}, (req, res) => {
      var orgId = mongoose.Types.ObjectId(req.params.organization_Id);
      var compId = mongoose.Types.ObjectId(req.params.component_Id)
      Organization.updateOne( {_id: orgId}, {$pull:{components:{_id:compId}}} )
      .then(result=>{
        if (result && result.ok>0) {
          res.json({success:true});
        }
      })
      .catch(error=>{
        res.json({success:false, errMsg:error+''});
      })
    });

    this.get({path:'/getcomponentkeywords'}, (req, res) =>{
      Organization.find({}, {'components.keywords':1})
      .then(orgs =>{
        var kwMap = orgs.reduce((mp,org)=>{
          org.components.forEach(comp=>{
            comp.keywords.forEach(kw=>{
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
db.organizations.find({components:{$elemMatch:{$and:[
{keywords:{$elemMatch:{$in:['apple','orange']}}},
{isApproved:true}, {status:'Published'}
]}}}, {name:1})
    */
    this.post({path:'/searchcomponents'}, (req, res) =>{
      var filter = {components:{$elemMatch:{$and:[{isApproved:true}, {status:'Published'}]}}};
      if (req.body.keywordsFilter && req.body.keywordsFilter.length>0) {
        filter.components.$elemMatch.$and.push({keywords:{$elemMatch:{$in:req.body.keywordsFilter}}});
      }
      if (req.body.nameFilter) {
        filter.components.$elemMatch.$and.push({componentId:{$regex:req.body.nameFilter}});
      }
      Organization.find(filter, {name:1, organizationId:1, components:{componentId:1, keywords:1, documentation:1, props:1, slots:1, events:1}})
      .then(orgs=>{
        var components = orgs.reduce((ar, org) => {
          org.components.forEach(comp => {
            if (!req.body.keywords || req.body.keywords.length==0 || _.intersection([req.body.keywords,comp.keywords]).length>0) {
              if (!req.body.nameFilter || comp.componentId.indexOf(req.body.nameFilter)>=0) {
                var obj = {organizationName: org.name, organizationId: org.organizationId,
                  componentId:comp.componentId, documentation: comp.documentation, props:comp.props, slots: comp.slots, events:comp.events};
                obj.key = obj.organizationName+'-'+obj.componentId;
                ar.push(obj);
              }
            }
          })
          return ar;
        },[])
        components = components.sort((a,b)=>(a.key<b.key?-1:(a.key>b.key?1:0)))
        res.json({success:true, components:components});
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
