import Ember from 'ember';
import fetch from 'fetch';

export default Ember.Service.extend({
  session: Ember.inject.service('session'),

  createWorkItem({ area, title, description, itemType }) {
    console.log(area, title, description, itemType)
  }
});
