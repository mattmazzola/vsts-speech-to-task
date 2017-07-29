import Ember from 'ember';
import fetch from 'fetch';

const {
  computed,
  inject
} = Ember

export default Ember.Service.extend({
  session: inject.service('session'),
  modelPromise: null,
  model: null,

  init() {
    this._super();
    this.set('tag', 'VSTS-Speech-to-Task')
    this.set('queryName', 'VSTS-Speech-to-Task')
  },

  account: computed('model', function () {
    return this.get('model.firstObject')
  }),

  project: computed('account', function () {
    return this.get('account.projects.firstObject')
  }),

  itemType: computed('project', function () {
    return this.get('project.itemTypes.firstObject')
  }),

  getModel() {
    if (this.get('modelPromise')) {
      return this.get('modelPromise')
    }

    const userId = this.get('session.data.authenticated.id')
    if (!userId) {
      throw new Error(`You attempted to get the VSTS before the session was authenticaed. You must have an access token and user id to query VSTS`)
    }

    const modelPromise = this.findAccounts(userId)
      .then(accounts => {
        return Promise.all(accounts.map(account => {
          return this.findProjects(account.accountName)
            .then(projects => {
              return Promise.all(projects.map(project => {
                return this.findWorkItemTypes(account.accountName, project.name)
                  .then(itemTypes => {
                    project.itemTypes = itemTypes
                    return project
                  })
              }))
            })
            .then(projects => {
              account.projects = projects
              return account
            })
        }))
      })
      .then(model => {
        this.set('model', model)
        return model
      })

    this.set('modelPromise', modelPromise)

    return modelPromise
  },

  findAccounts(userId) {
    const accessToken = this.get('session.data.authenticated.access_token');

    return fetch(`https://app.vssps.visualstudio.com/_apis/Accounts?ownerId=${userId}&api-version=3.2-preview`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })
      .then(r => this.handleResponse(r))
      .then(json => json.value)
  },

  findProjects(accountName) {
    return this.getJson(`https://${accountName}.visualstudio.com/DefaultCollection/_apis/projects?api-version=1.0`)
      .then(json => json.value)
  },

  findWorkItemTypes(accountName, project) {
    return this.getJson(`https://${accountName}.visualstudio.com/DefaultCollection/${project}/_apis/wit/workItemTypes?api-version=1.0`)
      .then(json => json.value)
  },

  createWorkItem(itemData) {
    console.log(`CreateWorkItem: input: ${JSON.stringify(itemData, null, '  ')}`)
    const defaults = {
      account: this.get('account.accountName'),
      itemType: this.get('itemType.name'),
      project: this.get('project.name'),
      tag: this.get('tag')
    };

    const merged = Object.assign({}, defaults, itemData)
    console.log(`CreateWorkItem merged: ${JSON.stringify(merged, null, '  ')}`)
    const { account, project, title, description, itemType, tag } = merged

    const accessToken = this.get('session.data.authenticated.access_token');

    return this.patchJson(`https://${account}.visualstudio.com/DefaultCollection/${project}/_apis/wit/workitems/$${itemType}?api-version=1.0`, [
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
  },

  createQuery(queryData) {
    console.log(`createQuery: input: ${JSON.stringify(queryData, null, '  ')}`)
    const defaults = {
      account: this.get('account.accountName'),
      project: this.get('project.name'),
      tag: this.get('tag')
    };

    const merged = Object.assign({}, defaults, queryData)
    console.log(`createQuery merged: ${JSON.stringify(merged, null, '  ')}`)
    const { account, project, name, tag } = merged

    return this.postJson(`https://${account}.visualstudio.com/DefaultCollection/${project}/_apis/wit/queries/My%20Queries?api-version=1.0`, {
      "name": name,
      "wiql": `Select [System.Id], [System.WorkItemType], [System.Title], [System.State], [System.AreaPath], [System.IterationPath], [System.Tags] From WorkItems Where [System.Tags] Contains "${tag}" order by [Microsoft.VSTS.Common.Priority] asc, [System.CreatedDate] desc`
    })
  },

  getJson(url) {
    const accessToken = this.get('session.data.authenticated.access_token');

    return fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })
      .then(r => this.handleResponse(r))
  },

  patchJson(url, body) {
    const accessToken = this.get('session.data.authenticated.access_token');

    return fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json-patch+json'
      },
      body: JSON.stringify(body)
    })
      .then(r => this.handleResponse(r))
  },

  postJson(url, body) {
    const accessToken = this.get('session.data.authenticated.access_token');

    return fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
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
