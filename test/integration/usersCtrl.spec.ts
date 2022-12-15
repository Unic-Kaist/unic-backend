import chai from 'chai';
import request from 'supertest';
import express from 'express';
import { Express } from 'express-serve-static-core';
import config from '../../config.json';

import { deleteUser, getUser } from '../../service/providers/ddbProvider';
import { queryUser, queryUserByTag, saveUser } from '../../service/controllers/usersCtrl';
import { testUserId, testTag, testTag2, testTag3 } from '../testConstants';
import { generateTestJWTToken } from '../../service/providers/cognitoProvider';

let app: Express;
let accessToken: string;
let userId: string;
const assert = chai.assert;

let newTestUserId = 'newtest@test.com';
let newTestProfilePhoto = 'testProfilePhoto';
let newTestCoverPhoto = 'Tester';

describe('==== USERS CONTROLLER ====', (): void => {
  before(async () => {
    process.env.ENV = 'test';

    app = express();
    app.use(express.urlencoded({ extended: false, limit: '50mb' }));
    app.use(express.json({ limit: '50mb' }));
    app.get('/query_user/:userId', queryUser);
    app.get('/query_user_by_tag/:userTag', queryUserByTag);
    app.post('/save_user', saveUser);

    const { jwtToken, sub } = await generateTestJWTToken();
    accessToken = jwtToken;
    userId = sub;

    await deleteUser(newTestUserId);
  });

  context('when query_user is called', (): void => {
    it('should get relevant user', async () => {
      const res = await request(app).get(`/query_user/${testUserId}`).expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.userId, testUserId);
    });

    it('should get empty object when given arguments do not exist', async () => {
      const res = await request(app).get(`/query_user/${'non_existent'}`).expect(200);

      assert.equal(res.body.success, true);
      assert.equal(Object.keys(res.body.data).length, 0);
    });
  });

  context('when query_user_by_tag is called', (): void => {
    it('should get relevant user', async () => {
      const res = await request(app).get(`/query_user_by_tag/${testTag3}`);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.userTag, testTag3);
    });

    it('should get empty object when given arguments do not exist', async () => {
      const res = await request(app).get(`/query_user_by_tag/${'non_existent'}`).expect(200);

      assert.equal(res.body.success, true);
      assert.equal(Object.keys(res.body.data).length, 0);
    });
  });

  context('when save_user is called', (): void => {
    it('should make proper post request and reponse - add a new user to DB', async () => {
      const res = await request(app)
        .post(`/save_user?API_KEY=${config.allowedAPIKeys[1]}`)
        .send({
          accessToken: accessToken,
          userId: userId,
          data: {
            userId: userId,
            userTag: testTag2,
            profilePhoto: newTestProfilePhoto,
            coverPhoto: newTestCoverPhoto
          }
        });

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.userId, userId);
      assert.equal(res.body.data.userTag, testTag2);
      assert.equal(res.body.data.profilePhoto, newTestProfilePhoto);
      assert.equal(res.body.data.coverPhoto, newTestCoverPhoto);

      const newlyCreated = await getUser(userId);

      assert.equal(newlyCreated.userId, userId);
      assert.equal(newlyCreated.profilePhoto, newTestProfilePhoto);
      assert.equal(newlyCreated.coverPhoto, newTestCoverPhoto);

      await deleteUser(userId);
    });
  });

  it('should make proper post request and reponse - add a new user to DB, with social links', async () => {
    const res = await request(app)
      .post(`/save_user?API_KEY=${config.allowedAPIKeys[1]}`)
      .send({
        accessToken: accessToken,
        userId: userId,
        data: {
          userId: userId,
          userTag: testTag2,
          socialLinks: { discord: 'https://dicsord/martin' },
          profilePhoto: newTestProfilePhoto,
          coverPhoto: newTestCoverPhoto
        }
      });

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.userId, userId);
    assert.equal(res.body.data.userTag, testTag2);
    assert.equal(res.body.data.profilePhoto, newTestProfilePhoto);
    assert.equal(res.body.data.coverPhoto, newTestCoverPhoto);

    const newlyCreated = await getUser(userId);

    assert.equal(newlyCreated.userId, userId);
    assert.equal(newlyCreated.profilePhoto, newTestProfilePhoto);
    assert.equal(newlyCreated.coverPhoto, newTestCoverPhoto);
    assert.equal(newlyCreated.socialLinks.includes('discord'), true);

    await deleteUser(userId);
  });
});
