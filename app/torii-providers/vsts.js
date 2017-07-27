import Ember from 'ember';
import fetch from 'fetch';
import Oauth2Bearer from 'torii/providers/oauth2-bearer';
import {configurable} from 'torii/configuration';
 
export default Oauth2Bearer.extend({
  name:    'vsts-oauth2implicit',
  baseUrl: 'https://app.vssps.visualstudio.com/oauth2/authorize',

  requiredUrlParams: ['display'],

  responseParams: ['code'],

  responseType: "Assertion",
  scope: configurable('scopes', 'email'),
  state: "randomState",

  display: 'popup',
  redirectUri: configurable('redirectUri', function(){
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

      const body = {
        authorizationCode: authData.authorizationToken.code,
        redirectUri: this.get('redirectUri')
      }

      console.log(body)

      return fetch('https://vsts-speech-to-task-service.azurewebsites.net/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }).then((authenticationResponse) => {
        return authenticationResponse.json()
          .then(json => {
            if (!authenticationResponse.ok) {
              throw new Error(json)
            }
            
            return json
          })
      });
    });
  },

  fetch(authData) {
      return authData;
  }
});
