const ElectronGoogleOAuth2 = require('./auth.js');
var fs = require('fs');
const path = require('path');

class Tokens {

    /**
     * Currently unused.
     */
    constructor() {
    }

    /**
     * Open a google oauth2 window and authorize application.
     */
    async authorize() {

        try {
            const contents = await this.getCredentials();
            console.log(contents);
            this.oauth = new ElectronGoogleOAuth2.ElectronGoogleOAuth2(
                contents.credentials.client_id,
                contents.credentials.client_secret,
                ['https://www.googleapis.com/auth/drive.readonly']
            );
    
            this.oauth.openAuthWindowAndGetTokens()
            .then(oauthToken => {
                this.access_token = oauthToken.access_token;
                this.refresh_token = oauthToken.refresh_token;
                this.id_token = oauthToken.id_token;
                this.expiry_date = oauthToken.expiry_date;
            });
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Retrieve credentials from file (client-id, client-secret).
     */
    async getCredentials() {
        return new Promise(function(resolve, reject) {
            fs.readFile(path.join(__dirname, '..', 'client-secret.json'), function processClientSecrets(err, content) {
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
     * Return the user's access token.
     */
    getAccessToken() {
        return this.access_token;
    }
    
}

// TODO: cleanup the export section to follow standard practice.
module.exports = { tokens: Tokens };
