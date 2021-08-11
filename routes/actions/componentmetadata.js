import BaseAction from './baseaction'
import {fail} from "../../js/utils"
import ComponentMetaData from '../../models/componentmetadata'
import Roles from '../../models/workflowroles'

export class MetaDataMgr extends BaseAction{
  constructor(){
    super();
    this.setRoles(Roles.SysAdmin, Roles.User);
  }
  route() {
    this.get({path:"/:library/:component"}, (req, res) => {
      ComponentMetaData.findOne({library:req.params.library, component: req.params.component})
      .then(metaData=>{
        res.json({success:true, metaData:metaData})
      })
      .catch(err=>{
        res.json({success:false, errMsg:err+''});
      })
    });
    return this.router;
  }
}

