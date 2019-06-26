const googleOauth2 = require('./auth.js').ElectronGoogleOAuth2;
const {OAuth2Client} = require('google-auth-library');
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
            this.oauth = new googleOauth2(
                contents.credentials.client_id,
                contents.credentials.client_secret,
                ['https://www.googleapis.com/auth/drive.readonly']
            );

            var oauthToken = await this.oauth.openAuthWindowAndGetTokens();
            this.access_token = oauthToken.access_token;
            this.refresh_token = oauthToken.refresh_token;
            this.id_token = oauthToken.id_token;
            this.expiry_date = oauthToken.expiry_date;
            this.id_token = await this.verify(contents.credentials.client_id, this.id_token);
            return this.id_token;
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Verify and decode the user token returned by the login.
     *
     * @param {string} clientid the client ID of the app
     * @param {object} token the user token returned from the authorization
     */
    async verify(clientid, token) {
        const client = new OAuth2Client(clientid);
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: clientid,
        });
        return ticket.getPayload();
    }

    /**
     * Retrieve credentials from file (client-id, client-secret).
     */
    async getCredentials() {
        return new Promise(function(resolve, reject) {
            fs.readFile(path.join(__dirname, '../../..', 'client-secret.json'), function processClientSecrets(err, content) {
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

module.exports = { tokens: Tokens };
