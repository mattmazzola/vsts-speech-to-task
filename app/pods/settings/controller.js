import Ember from 'ember';
import fetch from 'fetch';

export default Ember.Controller.extend({
  session: Ember.inject.service('session'),
  vsts: Ember.inject.service('vsts'),

  actions: {
    invalidateSession() {
      this.get('session').invalidate();
    },
    
    createWorkItem() {
      this.get('vsts').createWorkItem({
        title: this.get('title'),
        description: this.get('description'),
        itemType: this.get('itemType'),
        area: this.get('area')
      })
    }
  }
});
