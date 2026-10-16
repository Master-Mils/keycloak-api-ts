import { expect } from 'chai';

import { buildQuery, idFromLocation, path } from '../../lib/api/http';

describe('http helpers', () => {
  describe('buildQuery', () => {
    it('returns an empty string without params', () => {
      expect(buildQuery()).to.equal('');
      expect(buildQuery({})).to.equal('');
    });

    it('skips undefined and null values and encodes the rest', () => {
      expect(buildQuery({ q: 'dept:R&D', max: 10, exact: false, email: undefined, first: null })).to.equal(
        '?q=dept%3AR%26D&max=10&exact=false',
      );
    });
  });

  describe('idFromLocation', () => {
    it('extracts the last path segment', () => {
      expect(idFromLocation('http://kc/admin/realms/test/users/1234-abcd')).to.equal('1234-abcd');
      expect(idFromLocation('http://kc/admin/realms/test/roles/my%20role')).to.equal('my role');
    });

    it('returns undefined without a location', () => {
      expect(idFromLocation(undefined)).to.equal(undefined);
    });
  });

  describe('path', () => {
    it('encodes interpolated segments only', () => {
      expect(path`/${'my realm'}/roles/${'a/b'}`).to.equal('/my%20realm/roles/a%2Fb');
    });
  });
});
