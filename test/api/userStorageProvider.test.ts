import { expect } from '../setup';  // Adjust path as needed
import KeycloakAPI, { ServerSettings } from '../../lib/index'; // Adjust imports as necessary

const settings: ServerSettings = require('../../.keycloakSettings.json'); // Adjust path as needed

describe("User Storage Provider Management API Tests", function() {
  let api: KeycloakAPI;

  let createdUserId: string = '';

  before(function() {
    api = new KeycloakAPI(settings);
  });

  afterEach(function() {
  });


  it("should sync users successfully", async function() {
    
    // Call the actual method on the api object
    const result = await api.userStorageProvider.syncUsers('msp', '74f07dc4-cdad-444c-b643-c76d6e9377d3', 'triggerFullSync');

    console.log(JSON.stringify(result));
    
    // expect(api.users.create).to.have.been.calledWith('msp', userData);
    expect(result).to.include({ success: true });
  });

});
