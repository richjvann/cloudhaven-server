const docs = require("./index.js");
const cheerio = require('cheerio');
import ComponentMetaData from '../models/componentmetadata'
import promiseSequential from 'promise-sequential';

function process() {
  var list = Object.keys(docs);
  var promises = [];
  var components = [];
  list.forEach(componentName=>{
    console.log(componentName);
    var html = docs[componentName].default;
    if (!html || !html.trim()) return;
    components.push(componentName);
    const $ = cheerio.load(html);
    var props = [];
    var rows = $("#api-props").next().find( "table > tbody > tr");
    if (rows) rows.each((index, tr)=>{
      var propObj = {};
      var tdList = $(tr).not(".extra-row").find("td");
      propObj.name = $(tdList[0]).find("a").text();
      if (propObj.name) {
        props.push(propObj);
        propObj.dataType = $(tdList[1]).text();
        propObj.defaultValue = $(tdList[2]).text();
        propObj.description = $(tdList[3]).find("p").html();
      }
    })

    var slots = [];
    var rows = $("#api-slots").next().find( "table > tbody > tr");
    if (rows) rows.each((index, tr)=>{
      var slotObj = {};
      var tdList = $(tr).not(".extra-row").find("td");
      slotObj.name = $(tdList[0]).find("a").text();
      if (slotObj.name) {
        slots.push(slotObj);
        slotObj.description = $(tdList[1]).find("p").html();
      }
    })
  
    var events = [];
    var rows = $("#api-events").next().find( "table > tbody > tr");
    if (rows) rows.each((index, tr)=>{
      var eventObj = {};
      var tdList = $(tr).not(".extra-row").find("td");
      eventObj.name = $(tdList[0]).find("a").text();
      if (eventObj.name) {
        events.push(eventObj);
        eventObj.description = $(tdList[1]).find("p").html();
      }
    })

    var metaData = {library: 'vuetify', component: componentName, props:props, slots:slots, events:events };
    promises.push(()=>ComponentMetaData.findOneAndUpdate({library:'vuetify', component: componentName},
      {$set:metaData}, {upsert:true}));
    var x = '';
    var y = x;
  })

  promiseSequential(promises)
  .then(results=>{
    for (var i=0;i<results.length;i++) {
      console.log(components[i]+':'+results[i]);
    }
    var xxx = results;
    var y = xxx;
  })
  .catch(err=>{
    console.log(err);
  })

}


export default process