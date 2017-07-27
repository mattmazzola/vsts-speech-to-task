import Ember from 'ember';
import fetch from 'fetch';
import Oauth2Bearer from 'torii/providers/oauth2-bearer';
import { configurable } from 'torii/configuration';
import moment from 'moment';

export default Oauth2Bearer.extend({
  name: 'vsts-oauth2implicit',
  baseUrl: 'https://app.vssps.visualstudio.com/oauth2/authorize',

  requiredUrlParams: ['display'],

  responseParams: ['code'],

  responseType: "Assertion",
  scope: configurable('scopes', 'email'),
  state: "randomState",

  display: 'popup',
  redirectUri: configurable('redirectUri', function () {
    // A hack that allows redirectUri to be configurable
    // but default to the superclass
    return this._super();
  }),

  open() {
    return this._super().then(authData => {
      // If the user hit 'cancel' or closed the pop-up throw error
      if (!authData.authorizationToken) {
        throw new Error('User canceled authorization');
      }

      return this.acquireToken(this.get('redirectUri'), { authorizationCode: authData.authorizationToken.code })
        .then(accessTokenJson => {
          return this.getProfile(accessTokenJson.access_token)
            .then(profileJson => Object.assign({}, profileJson, accessTokenJson))
        });
    });
  },

  fetch(authData) {
    const [head, body, tail] = authData.access_token.split('.')
    const tokenData = JSON.parse(atob(body))
    const tokenExpirationMoment = moment(tokenData.exp * 1000)
    const now = moment()
    const allowedDuration = moment.duration(40, 'minutes');

    if ((tokenExpirationMoment - now) < allowedDuration.asMilliseconds()) {
      const redirectUri = this.get('redirectUri')
      return this.acquireToken(this.get('redirectUri'), { refreshToken: authData.refresh_token })
        .then(refreshTokenJson => Object.assign(authData, authData))
    }

    return authData;
  },

  acquireToken(redirectUri, body) {
    return fetch('https://vsts-speech-to-task-service.azurewebsites.net/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(Object.assign({
        redirectUri
      }, body))
    }).then((authenticationResponse) => {
      return authenticationResponse.json()
        .then(json => {
          if (!authenticationResponse.ok) {
            throw new Error(json.message || json.ErrorDescription || JSON.stringify(json))
          }

          return json
        })
    })
  },

  getProfile(accessToken) {
    return fetch('https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=1.0', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })
      .then(response => {
        return response.json()
          .then(json => {
            if (!response.ok) {
              throw new Error(json.message || json.ErrorDescription || JSON.stringify(json))
            }

            return json
          })
      })
  }
});
