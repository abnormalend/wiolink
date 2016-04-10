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
var wioBaseURL = "https://iot.seeed.cc/v1/node/";
var wioAirQuality = "GroveAirqualityA0/quality?access_token=";
var wioTemperature = "GroveTempHumD0/temperature_f?access_token=";
var wioHumidity = "GroveTempHumD0/humidity?access_token=";
var wioApiKey = "";
exports.handler = function(event, context) {

var paramsApiWiolink = {
    AttributesToGet: ["wiolink"],
    TableName : 'furnace',
    Key : { 'key' : {"S" : apiKey}}
  };
  
  console.log();

  db.getItem(paramsApiWiolink, function(err, data) {
    if (err) {
      console.log(err); // an error occurred
      } 
    else {
        //console.log(data); // successful response
        wioApiKey = data.Item.wiolink.S;
        //console.log(wioApiKey);
        wioAirQualityFullURL = wioBaseURL + wioAirQuality + wioApiKey;
        wioHumidityFullURL = wioBaseURL + wioHumidity + wioApiKey;
        wioTemperatureFullURL = wioBaseURL + wioTemperature + wioApiKey;
        //console.log(wioAirQualityFullURL);
        https.get(wioAirQualityFullURL, function(result) {
            result.on("data", function(chunk) {
                    myOutput = JSON.parse(chunk);
                    //console.log(myOutput.quality);
                    myAirQuality = myOutput.quality;
            });
            https.get(wioHumidityFullURL, function(result){
                result.on("data",function(chunk){
                    myOutput = JSON.parse(chunk);
                    myHumidity = myOutput.humidity;
                    //console.log(myHumidity);
                });
                https.get(wioTemperatureFullURL, function(result){
                result.on("data",function(chunk){
                    myOutput = JSON.parse(chunk);
                    //console.log(myOutput);
                    myTemperature = myOutput.fahrenheit_degree;
                    //console.log(myTemperature);
                    //save this to DynamoDB
                    var saveWeather = {
                        TableName : 'furnace',
                        Item : {
                            "key": { 'S': 'insideConditions' },
                            "insideTemp": { 'S': myTemperature.toString() },
                            "humidity": { 'S': myHumidity.toString() },
                            "airQuality": { 'S': myAirQuality.toString() }
                        }
                        };
                    var buttWatchParams = {
                      MetricData: [
                          {
                            MetricName: 'insideTemp',
                              Value: myTemperature.toString()
                            },
                         {
                            MetricName: 'humidity',
                              Value: myHumidity.toString()
                            },
                        {
                            MetricName: 'airQuality', 
                              Value: myAirQuality.toString()
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
                                    context.done(null,"saved to dynamodb");
                                }
                            });
                            
                    buttwatch.putMetricData(buttWatchParams, function(err, data) {
                      if (err) console.log(err, err.stack); // an error occurred
                      else     console.log(data);           // successful response
                    });
                });
                });
            });
        });
      }
  });
   

};
