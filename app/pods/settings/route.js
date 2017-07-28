import Ember from 'ember';
import AuthenticatedRouteMixin from 'ember-simple-auth/mixins/authenticated-route-mixin';

const {
  inject
} = Ember;

export default Ember.Route.extend(AuthenticatedRouteMixin, {
  session: inject.service('session'),
  vsts: inject.service('vsts'),

  model() {
    const vsts = this.get('vsts')
    const userId = this.get('session.data.authenticated.id')

    return vsts.findAccounts(userId)
      .then(accounts => {
        return Promise.all(accounts.map(account => {
          return vsts.findProjects(account.accountName)
            .then(projects => {
              return Promise.all(projects.map(project => {
                return vsts.findWorkItemTypes(account.accountName, project.name)
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
  }
});
