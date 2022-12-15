import chai from 'chai';

import {User} from '../../service/models/User';
import {ERC721Asset} from '../../service/models/ERC721Asset';
import {getUser, putUser} from '../../service/providers/ddbProvider';
import {testUserId, testUserId2, testUserId3, testTag3, testNewUser, testNewUser2,
   testHash, testHash2, testHash3, testNewErc721Asst} from '../testConstants';

const assert = chai.assert;

describe('==== DYNAMODB PROVIDER ====', () :void => {
  before(() :void =>  {
    process.env.ENV = 'test';
  });

  context('when getUser is invoked with an userId input', () :void => {
    it ('should get the corresponding user', async () => {
      let testUser = await getUser(testUserId3);
      assert.equal(testUser.userId, testUserId3);
      assert.equal(testUser.userTag, testTag3);
      return;
    });
  });

  context('when putUser is invoked to add a new user', () :void => {
    it ('should return proper putResponse', async () => {
      let result = await putUser(new User(testNewUser));
      assert.equal(result.userId, testNewUser.userId);
      assert.equal(result.userTag, testNewUser.userTag);
      return;
    });

    it ('should have created user in db', async () => {
      let testUser = await getUser(testUserId);
      assert.equal(testUser.userId, testUserId);
      return;
    });
  });

  context('when putUser is invoked to update the user with socialLinks', () => {
    it ('should put user data return proper response', async () => {
      let result = await putUser(new User(testNewUser2));
      assert.equal(result.userId, testNewUser2.userId);
      return;
    });

    it ('should have updated user in db', async () => {
      let result = await getUser(testUserId2);
      assert.equal(result.userId, testUserId2);
      assert.equal(result.socialLinks, JSON.stringify(testNewUser2.socialLinks));
      return;
    });
  });
});
