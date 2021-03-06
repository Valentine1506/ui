import Ember from 'ember';
import C from 'ui/utils/constants';

export default Ember.Service.extend({
  'tab-session': Ember.inject.service('tab-session'),

  publicUrl: function() {
    return this.get('store').find('service').then((services) => {
      let master = services.filterBy('name', C.MESOS.MASTER_SERVICE)[0];
      if ( master )
      {
        let ips = master.get('endpointsMap')[C.MESOS.MASTER_PORT];
        if ( ips && ips.length ) {
          return 'http://' + ips[0] + ':' + C.MESOS.MASTER_PORT;
        }
      }

      return Ember.RSVP.reject('No mesos-master endpoint found');
    });
  },

  masterUrl: function() {
    let projectId = this.get(`tab-session.${C.TABSESSION.PROJECT}`);
    return this.get('app.mesosEndpoint').replace('%PROJECTID%', projectId);
  }.property('app.mesosEndpoint',`tab-session.${C.TABSESSION.PROJECT}`),

  isReady: function() {
    return this.get('store').find('environment').then((stacks) => {
      return this.get('store').find('service').then((services) => {
        let eId = C.EXTERNALID.KIND_SYSTEM + C.EXTERNALID.KIND_SEPARATOR + C.EXTERNALID.KIND_MESOS;
        let stack = stacks.filterBy('externalId', eId)[0];
        if ( stack )
        {
          let matching = services.filterBy('environmentId', stack.get('id'));
          let expect = matching.get('length');
          let healthy = matching.filterBy('healthState', 'healthy').get('length');
          if ( expect > 0 && expect === healthy )
          {
            return this.get('store').rawRequest({
              url: `${this.get('masterUrl')}/${C.MESOS.HEALTH}`
            }).then(() => {
              return true;
            });
          }
        }

        return false;
      });
    }).catch(() => {
      return Ember.RSVP.resolve(false);
    });
  },
});
