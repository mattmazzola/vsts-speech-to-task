import Ember from 'ember';
import fetch from 'fetch';

export default Ember.Controller.extend({
  session: Ember.inject.service('session'),
  vsts: Ember.inject.service('vsts'),

  init() {
    this._super();

    this.set('account', 'mattmazzola')
    this.set('area', 'schultztables')
    this.set('itemType', 'Task')
    this.set('tag', 'VSTS-Speech-to-Task')
    this.set('queryName', 'VSTS-Speech-to-Task')
  },

  actions: {
    invalidateSession() {
      this.get('session').invalidate();
    },

    createWorkItem() {
      this.get('vsts').createWorkItem({
        account: this.get('account'),
        title: this.get('title'),
        description: this.get('description'),
        itemType: this.get('itemType'),
        area: this.get('area'),
        tag: this.get('tag')
      })
    },

    createQuery() {
      this.get('vsts').createQuery({
        account: this.get('account'),
        area: this.get('area'),
        name: this.get('queryName'),
        tag: this.get('tag')
      })
    }
  }
});
