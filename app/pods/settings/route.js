import Ember from 'ember';
import AuthenticatedRouteMixin from 'ember-simple-auth/mixins/authenticated-route-mixin';

const {
  inject
} = Ember;

export default Ember.Route.extend(AuthenticatedRouteMixin, {
  vsts: inject.service('vsts'),

  model() {
    return this.get('vsts').getModel()
  }
});
