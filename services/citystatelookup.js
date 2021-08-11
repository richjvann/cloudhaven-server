import axios from 'axios'
import xmljs from 'xml-js'


var uspsURL = 'http://production.shippingapis.com/ShippingAPI.dll'; //https://secure.shippingapis.com/ShippingAPI.dll/ShippingAPI.dll

function getElement( xmlDoc, tag) {
  try {
    return xmlDoc.getElementsByTagName(tag)[0].childNodes[0].nodeValue;
  } catch (e) {
    return '';
  }
}
export default function(zip) {
  var promise = new Promise(function( resolve, reject){
    var zip5 = zip.substring(0,5);
    var retObj = {city:'', state:''};
    axios.get(uspsURL+'?API=CityStateLookup&XML=<CityStateLookupRequest USERID="337RICHV6846"><ZipCode ID="0"><Zip5>'+zip5+'</Zip5></ZipCode></CityStateLookupRequest>')
    .then(response =>{
      var cityStateObj = JSON.parse(xmljs.xml2json(response.data, {compact:true, spaces:2}));
      if (cityStateObj.CityStateLookupResponse.ZipCode.Error) {
        resolve({errMsg:'Invalid zipcode.'})
      } else {
        retObj = { city:cityStateObj.CityStateLookupResponse.ZipCode.City._text, 
          state:cityStateObj.CityStateLookupResponse.ZipCode.State._text};
        resolve(retObj);
      }
    })
  })
  .catch(error=>{
    resolve(retObj);
  })
  return promise;
}