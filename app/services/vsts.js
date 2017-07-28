import Ember from 'ember';
import fetch from 'fetch';

export default Ember.Service.extend({
  session: Ember.inject.service('session'),

  createWorkItem(itemData) {
    console.log(itemData)

    const { account, area, title, description, itemType, tag } = itemData
    const accessToken = this.get('session.data.authenticated.access_token');

    return fetch(`https://${account}.visualstudio.com/DefaultCollection/${area}/_apis/wit/workitems/$${itemType}?api-version=1.0`, {
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
          "path": "/fields/System.Description",
          "value": description
        },
        {
          "op": "add",
          "path": "/fields/System.Tags",
          "value": tag
        }
      ])
    })
      .then(r => this.handleResponse(r))
  },

  createQuery(queryData) {
    const { account, area, name, tag } = queryData
    const accessToken = this.get('session.data.authenticated.access_token');

    return fetch(`https://${account}.visualstudio.com/DefaultCollection/${area}/_apis/wit/queries/My%20Queries?api-version=1.0`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "name": name,
        "wiql": `Select [System.Id], [System.WorkItemType], [System.Title], [System.State], [System.AreaPath], [System.IterationPath], [System.Tags] From WorkItems Where [System.Tags] Contains "${tag}" order by [Microsoft.VSTS.Common.Priority] asc, [System.CreatedDate] desc`
      })
    })
      .then(r => this.handleResponse(r))
  },

  handleResponse(response) {
    return response.json()
      .then(json => {
        if (!response.ok) throw new Error(json.message || json.ErrorDescription || JSON.stringify(json))
        console.log(json)
        return json
      })
  }
});
