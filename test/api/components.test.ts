import { expect } from '../setup';  // Adjust path as needed
import KeycloakAPI, { ServerSettings } from '../../lib/index'; // Adjust imports as necessary

const settings: ServerSettings = require('../../.keycloakSettings.json'); // Adjust path as needed

describe("Components Management API Tests", function() {
  let api: KeycloakAPI;

  let createdUserId: string = '';

  before(function() {
    api = new KeycloakAPI(settings);
  });

  afterEach(function() {
  });

  it("should list components successfully", async function() {
    
    // Call the actual method on the api object
    const result = await api.components.list('msp');

    console.log(JSON.stringify(result));
    
    // expect(api.users.create).to.have.been.calledWith('msp', userData);
    expect(result).to.include({ success: true });
  });


});
