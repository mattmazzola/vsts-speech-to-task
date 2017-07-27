import Ember from 'ember';
import fetch from 'fetch';

export default Ember.Service.extend({
  session: Ember.inject.service('session'),

  createWorkItem(itemData) {
    console.log(itemData)

    const { account, area, title, description, itemType, tag } = itemData
    const accessToken = this.get('session.data.authenticated.access_token');

    fetch(`https://${account}.visualstudio.com/DefaultCollection/${area}/_apis/wit/workitems/$${itemType}?api-version=1.0`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json-patch+json'
      },
      body: JSON.stringify([
        {
          "op": "add",
          "path": "/fields/System.Title",
          "value": title
        },
        {
          "op": "add",
          "path": "/fields/System.Tags",
          "value": tag
        }
      ])
    })
      .then(response => {
        return response.json().then(json => {
          if (!response.ok) throw new Error(json.message || json.ErrorDescription)
          console.log(json)
          return json
        })
      })

  }
});
