console.log('Loading function');

var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
var db = new AWS.DynamoDB();
var buttwatch = new AWS.CloudWatch();
var https = require('https');


var tableName = "furnace";
var keyName = "key";
var weatherKey = "currentWeather";
var apiKey = "apikeys";
var myLat = 0;
var myLong = 0;
var wioBaseURL = "https://iot.seeed.cc/v1/node/resources?access_token=";

exports.handler = function(event, context) {

var paramsApiWeather = {
    AttributesToGet: ["darksky"],
    TableName : 'furnace',
    Key : { 'key' : {"S" : apiKey}}
  };
  
var paramsWeather = {
    AttributesToGet: ["latitude","longitude"],
    TableName : 'furnace',
    Key : { "key" : {"S" : "location"}}
  };
  
  console.log();

  db.getItem(paramsWeather, function(err, data) {
    if (err) {
      console.log(err); // an error occurred
      } 
    else {
     //console.log(data); // successful response
     myLat = data.Item.latitude.N;
     myLong  = data.Item.longitude.N;
     //console.log(myLat);
     //console.log(myLong);
     
     db.getItem(paramsApiWeather,function(err,data){
         if (err) {
             console.log(err);
         }
         else{
            //console.log(data); 
            myDarkSky = data.Item.darksky.S;
            //console.log("darkskyAPI: " + myDarkSky);
            
            //use what we retrieved to make a lookup.
            baseURL="https://api.forecast.io/forecast/" + myDarkSky + "/";
            fullURL=baseURL + myLat + "," + myLong + "?exclude=minutely,hourly,daily,alerts,flag";
            //console.log(fullURL);
            
          
            https.get(fullURL, function(result) {
                console.log('Success, with: ' + result.statusCode);
                //console.log(res);
                result.on("data", function(chunk) {
                    // console.log("BODY: " + chunk);
                    myOutput = JSON.parse(chunk);
                    //console.log("TEMP: " + myOutput.currently.temperature);
                    
                    
                    //save this to DynamoDB
                    var saveWeather = {
                        TableName : 'furnace',
                        Item : {
                            "key": { 'S': 'currentWeather' },
                            "outsideTemp": { 'S': myOutput.currently.temperature.toString() }
                        }
                        };
                    
                    var buttWatchParams = {
                      MetricData: [
                          {
                            MetricName: 'outsideTemp', /* required */
                             
                              Unit: 'None',
                              Value: myOutput.currently.temperature.toString() /* required */
                            },
                            /* more items */
                          ],
                          Namespace: 'brentshouse' /* required */
                        
                    };
                    db.putItem(saveWeather, function(err, data) {
                                if(err){ 
                                    console.log(err);
                                }
                                else{
                                    context.done(null,myOutput.currently.temperature);
                                }
                            });
                    buttwatch.putMetricData(buttWatchParams, function(err, data) {
                      if (err) console.log(err, err.stack); // an error occurred
                      else     console.log(data);           // successful response
                    });
                    
                });
            }).on('error', function (err) {
                console.log('Error, with: ' + err.message);
                context.done("Failed");
            });
         }
     });
      }
  });
   

};
