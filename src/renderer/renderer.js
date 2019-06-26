var app = require('electron').remote;
var dialog = app.dialog;
var fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const googleOauth2 = require('../common/libs/auth.js').ElectronGoogleOAuth2;
const Exam = require('../common/libs/exam.js').exam;
const XML = require('../common/libs/xml.js').xml;

let googleOauth = null;
let filename = null;

$("#convertButton").click(function () {
    var fileId = $("#docID").val();
    exportFile(fileId);
});

$("#loginButton").click(async function() {

    const contents = await getCredentials();
    googleOauth = new googleOauth2(contents.credentials.client_id, contents.credentials.client_secret, ['https://www.googleapis.com/auth/drive.readonly']);
    await googleOauth.openAuthWindowAndGetTokens();
    var userToken = googleOauth.getIDToken();
    $('#userData #userPicture').attr("src", userToken['picture']);
    $('#userData #name').text(userToken['name']);
});

$("#displayButton").click(function () {
    fs.readFile(filename, 'utf-8', (err, data) => {
        if(err){
            alert("An error ocurred reading the file :" + err.message);
            return;
        }
        var html = $($.parseHTML(data));
        $(".textcontainer").html(html);
    });
});

$("#xmlButton").click(function() {
    var html = null;
    fs.readFile(filename, 'utf-8', (err, data) => {
        if(err){
            alert("An error ocurred reading the file :" + err.message);
            return;
        }
        var exam = new Exam(data);
        exam.parse();
        var questions = exam.getQuestions();
        var xml = new XML(questions);
        var contents = xml.getXML();
        var fileName = "test.xml";
        fs.writeFile(fileName, contents, (err) => {
            if (err) {
                console.log(err);
            }
        })
    });
})

/**
 * Retrieve credentials from file (client-id, client-secret).
 */
async function getCredentials() {
    return new Promise(function(resolve, reject) {
        fs.readFile(path.join(__dirname, '../..', 'client-secret.json'), function processClientSecrets(err, content) {
            if (err) {
                reject(err);
            } else {
                console.log(JSON.parse(content));
                resolve(JSON.parse(content));
            }
        });
    });
}

/**
 * Export the file from google drive (to html).
 */
function exportFile(fileId) {
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
    return google.drive({version: 'v3', auth: googleOauth.getClient()});
}

/**
 * 
 * @param {object} drive the drive object (with access verified)
 * @param {string} fileId the ID of the file to download
 * @param {function} callback the function to call upon success
 */
function downloadFile (drive, fileId, callback) {

    const filePath = path.join(__dirname, 'test' + uuid.v4() + '.html');
    filename = filePath;
    const dest = fs.createWriteStream(filePath);
    try {
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
    } catch (err) {
        console.log(err);
    }
}