const https = require("https");

exports.handler = (event, context, callback) => {
  let buffer = "";
  let bucketName = event.bucketname;
  let fileName = event.filecode + ".json";
  https.get(
    "https://storage.googleapis.com/" + bucketName + "/" + fileName,
    function (response) {
      response
        .on("data", function (data) {
          buffer += data;
        })
        .on("end", function () {
          var myJSON = JSON.parse(buffer);
          callback(null, myJSON);
        });
    }
  );
  // callback(null, event.bucketName);
};
