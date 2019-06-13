var app = require('electron').remote;
var dialog = app.dialog;
var fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const ElectronGoogleOAuth2 = require('./auth.js');
const client = require('./setup-token.js');

let googleOauth = null;

let token = {access_token: "", refresh_token: "", id_token: "", expiry_date: ""};

$("#openButton").click(function () {
    exportFile();
});

$("#loginButton").click(async function() {

    googleOauth = new client.tokens();
    googleOauth.authorize();
});

/**
 * Export the file from google drive (to html).
 */
function exportFile() {
    var fileId = '1YDcrJ4-oPNuJKvG8iPsZile7a9PlSMkrZ6b_yrhRy_Y';
    var drive = setupDrive();

    downloadFile(drive, fileId, (filepath) => {
        console.log('test file downloaded, saved to: ' + filepath);
    });

}

/**
 * Setup the drive object with the access token.
 */
function setupDrive () {
    const { google } = require('googleapis');

    var OAuth2Client = new google.auth.OAuth2;
    OAuth2Client.setCredentials({access_token: googleOauth.getAccessToken()});
    return google.drive({version: 'v3', auth: OAuth2Client});
}

/**
 * 
 * @param {object} drive the drive object (with access verified)
 * @param {string} fileId the ID of the file to download
 * @param {function} callback the function to call upon success
 */
function downloadFile (drive, fileId, callback) {
    const filePath = path.join(__dirname, 'test' + uuid.v4() + '.html');
    const dest = fs.createWriteStream(filePath);
    // let progress = 0;
    drive.files.export({
        fileId: fileId,
        mimeType: 'text/html'
    }, {
        responseType: 'stream'
    },function(err, response){
        if(err) throw err;
  
        response.data.on('error', err => {
            console.error('Error downloading file.');
            throw err;
        }).on('end', () => {
            callback(filePath);
        })
        .pipe(dest);
    });
}