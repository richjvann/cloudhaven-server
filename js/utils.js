import moment from 'moment';

export function safeRef(o) {
  try {
    return o?o:{};
  } catch (e) {
    return {};
  }
}

export function randomId( n ) {
    var shuffleConfig = [18,14,11,1,21,10,12,7,16,4,13,0,17,5,6,2,15,3,9,8];
    var sN = n.toString(2);
    while (sN.length<19) {
      sN = '0'+sN;
    }
    var sN2 = [];
    for (var idx in shuffleConfig) {
      sN2[shuffleConfig[idx]] = sN[idx];
    }
    var sN2 = parseInt(sN2.join(''), 2).toString()
    while (sN2.length<6) {
        sN2 = '0'+sN2;
      }
      return sN2
}

/**
  Returns a function that will write the result as a JSON to the response
*/
export function ok(res){
  return (data) => {
    res.json(data);
  };
};

export function fail(res){
  return (error) => {
    if (error.code == 11000 || error.code == 11001) {
      res.json({success:false, errMsg:'Save failed: duplicate record.'})
    } else if (error.name === 'ValidationError' || error.message) {
      res.json({success:false, errMsg:error.message})
    } else {
      res.sendStatus(404).end();
    }
  };
};

export function round(n, decimalPlaces) {
if (isNaN(n)) return 'NaN';

if (decimalPlaces === 0) {
  decimalPlaces = 0;
} else if (!decimalPlaces) {
  decimalPlaces = 6;
}
var isNegative = (n<0);
if (isNegative) n = -n;
var retVal = Number((n||0).toFixed(decimalPlaces));
if (isNegative & Number(retVal) === 0) isNegative = false;
return Number((isNegative ? '-' : '')+retVal).toFixed(decimalPlaces);
}

export function roundFloat(n, decimalPlaces) {
if (isNaN(n)) return 'NaN';

if (decimalPlaces === 0) {
  decimalPlaces = 0;
} else if (!decimalPlaces) {
  decimalPlaces = 6;
}
var isNegative = (n<0);
if (isNegative) n = -n;
var retVal = Number((n||0).toFixed(decimalPlaces));
if (isNegative & Number(retVal) === 0) isNegative = false;
return parseFloat(Number((isNegative ? '-' : '')+retVal).toFixed(decimalPlaces));

}


