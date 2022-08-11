import KeycloakAPI from '../index';

import ServerSettings from '../lib/interfaces/server-settings';

import * as dotenv from 'dotenv';

const env = dotenv.config();
const config = env.parsed ? env.parsed.CONFIG : '';
const settings = JSON.parse(config);
const kcApi = new KeycloakAPI(settings);

kcApi
  .authentication
  .flows
  .list('txrh')
  .then(async (flows) => {
    for (const flow of flows) {
      if (flow.authenticationExecutions) {
        for (let execution of flow.authenticationExecutions) {
          if (execution.flowAlias) {
            execution = Object.assign(execution, {
              executionInfo: await kcApi
                .authentication
                .flows
                .executions
                .get('txrh', execution.flowAlias)
                .then((executionInfo) => {
                  return executionInfo;
                })
            }
            );
          };
          console.log(JSON.stringify(execution));
        }
      }
    }
  });



kcApi
  .clients
  .list('txrh')
  .then((clients) => {
    console.log(JSON.stringify(clients));
  });


