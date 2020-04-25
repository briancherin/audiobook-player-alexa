const AWS = require('aws-sdk');

const jwt_decode = require('jwt-decode');

const aws_params = require('./aws_params');

function init(accessToken) {

    const decodedToken = jwt_decode(accessToken);
    console.log(decodedToken);
    
    const params = aws_params.params;

    AWS.config.region = 'us-east-1';
    AWS.config.credentials = new AWS.CognitoIdentityCredentials(params);

    const s3 = new AWS.S3({apiVersion: '2006-03-01'});

    const params2 = {
        Bucket: "audiobook-player-files-audiobkenv"
    }

    s3.listObjects(params2, function(err, data) {
        if (err) console.log(err);
        else console.log(data);
    });

    /*AWS.config.credentials.get(function(err) {
        if (err) {
            console.log(err);
        } else {
            console.log('success');
            console.log("Cognito Identity Id: " + AWS.config.credentials.identityId);
        }
    });*/

}
module.exports = {
    init
}