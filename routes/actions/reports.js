import BaseAction from './baseaction'
import Roles from '../../models/workflowroles'

export class Reports extends BaseAction{
  constructor(){
    super();
    this.setRoles(Roles.SysAdmin);
  }

  route() {
    return this.router;
  }
}
