import { expect } from '../setup';  // Adjust path as needed
import KeycloakAPI, { ServerSettings } from '../../lib/index'; // Adjust imports as necessary
import User from '../../lib/types/user';

const settings: ServerSettings = require('../../.keycloakSettings.json'); // Adjust path as needed

const userData: User = {
    email: 'user@domain.com',
    enabled: true,
    firstName: 'Foo',
    lastName: 'Bar',
    username: 'foobar'
  };
  
describe("User Management API Tests", function() {
  let api: KeycloakAPI;

  let createdUserId: string = '';

  before(function() {
    api = new KeycloakAPI(settings);
  });

  afterEach(function() {
  });

  // it("should create a user successfully", async function() {
    
  //   // Call the actual method on the api object
  //   const result = await api.users.create('msp', userData);

  //   // expect(api.users.create).to.have.been.calledWith('msp', userData);
  //   expect(result).to.include({ success: true });
  // });

  // it("should get a user successfully", async function() {
    
  //   // Call the actual method on the api object
  //   const list = await api.users.list('msp', { username: userData.username });
  //   const [ result ] = list.data;

  //   // expect(api.users.create).to.have.been.calledWith('msp', userData);
  //   expect(result).to.include(userData);
  // });

  // it("should delete a user successfully", async function() {
    
  //   // Call the actual method on the api object
  //   const result = await api.users.delete('msp', createdUserId)
  //   .catch((e) => {
  //     console.error(e);
  //   });

  //   // expect(api.users.create).to.have.been.calledWith('msp', userData);
  //   expect(result).to.include({ success: true });
  // });

});
