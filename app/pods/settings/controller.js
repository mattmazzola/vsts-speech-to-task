import Ember from 'ember';
import fetch from 'fetch';

const {
  computed,
  inject
} = Ember

export default Ember.Controller.extend({
  session: inject.service('session'),
  vsts: inject.service('vsts'),
  lastWorkItem: null,

  lastWorkItemUrl: computed('lastWorkItem', function () {
    const lastWorkItem = this.get('lastWorkItem')
    return lastWorkItem ? `https://${lastWorkItem.account}.visualstudio.com/${lastWorkItem.fields['System.AreaPath']}/_workitems?id=${lastWorkItem.id}` : ''
  }),

  account: computed('model', function () {
    return this.get('model.firstObject')
  }),

  project: computed('account', function () {
    return this.get('account.projects.firstObject')
  }),

  itemType: computed('project', function () {
    return this.get('project.itemTypes.firstObject')
  }),
  
  init() {
    this._super();
    this.set('queryName', 'VSTS-Speech-to-Task')
  },

  actions: {
    invalidateSession() {
      this.get('session').invalidate();
    },

    createWorkItem() {
      const newItem = {
        title: this.get('title'),
        description: this.get('description')
      };

      this.get('vsts').createWorkItem(newItem)
        .then(workItem => {
          workItem.account = this.get('vsts.account.accountName')
          this.set('title', '')
          this.set('description', '')
          this.set('lastWorkItem', workItem)
        })
    },

    createQuery() {
      this.get('vsts').createQuery({
        name: this.get('queryName')
      })
    },

    dismiss() {
      this.set('lastWorkItem', null)
    },

    selectAccount(account) {
      this.set('account', account)
    },

    selectProject(project) {
      this.set('project', project)
    },

    selectItemType(itemType) {
      this.set('itemType', itemType)
    }
  }
});
