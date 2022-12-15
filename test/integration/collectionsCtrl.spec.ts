import chai from 'chai';
import request from 'supertest';
import express from 'express';
import { Express } from 'express-serve-static-core';
import config from '../../config.json';
import {
  getMostRecentCollection,
  getCollectionWithVersion,
  putCollection,
  deleteCollection,
  getNFTsByCollectionId,
  likeCollection,
  unlikeCollection,
  getUserLikedCollection
} from '../../service/providers/ddbProvider';
import {
  queryCollection,
  queryCollections,
  createCollection,
  updateCollection,
  getAllCollections,
  queryCollectionByAddress,
  queryCollectionScanAndViewCount
} from '../../service/controllers/collectionsCtrl';
import {
  testContractAddress,
  testMinterAddress,
  testCollectionId,
  testCollectionId2,
  testCollectionName,
  testMinterAddress2,
  testUserId,
  testUserId2,
  testUserId3
} from '../testConstants';
import { generateTestJWTToken, verifyJWTToken } from '../../service/providers/cognitoProvider';

const assert = chai.assert;

let app: Express;
let accessToken: string;
let userId: string;

describe('==== COLLECTIONS CONTROLLER ====', (): void => {
  before(async () => {
    process.env.ENV = 'test';

    app = express();
    app.use(express.urlencoded({ extended: false, limit: '50mb' }));
    app.use(express.json({ limit: '50mb' }));
    app.get('/query_collection/:collectionId', queryCollection);
    app.get('/query_collection_by_address/:address', queryCollectionByAddress);
    app.get('/query_collections', queryCollections);
    app.get('/query_collections_all', getAllCollections);
    app.get('/query_collection_scan_and_view_count/:collectionId', queryCollectionScanAndViewCount);
    app.post('/save_collection', createCollection);
    app.put('/save_collection', updateCollection);

    const { jwtToken, sub } = await generateTestJWTToken();
    accessToken = jwtToken;
    userId = sub;

    await deleteCollection(testCollectionId, 1);
    await deleteCollection(testCollectionId, 2);
  });

  context('when query_collection_user_relation is called - GET', (): void => {
    it('should make proper GET request and retrive specific like_collection record', async () => {
      const { collectionId, userId } = await getUserLikedCollection(testCollectionId, testUserId);

      assert.equal(collectionId, testCollectionId);
      assert.equal(userId, testUserId);
      const response = await getUserLikedCollection('collectionId_to_fail', 'userId_to_fail');

      assert.equal(response, undefined);
    });
  });

  context('when like_collection is called - POST', (): void => {
    it('should make proper POST request and save like_collection record', async () => {
      const { success: reachedEndpoint } = await likeCollection(testCollectionId2, testUserId2);
      const { collectionId, userId } = await getUserLikedCollection(testCollectionId2, testUserId2);

      assert.equal(reachedEndpoint, true);
      assert.equal(collectionId, testCollectionId2);
      assert.equal(userId, testUserId2);
    });
  });

  context('when unlike_collection is called - POST', (): void => {
    it('should make proper POST request and delete like_collection record from DDB', async () => {
      const { success: reachedEndpoint } = await unlikeCollection(testCollectionId2, testUserId2);
      const retrivedLikeCollection = await getUserLikedCollection(testCollectionId2, testUserId2);
      assert.equal(reachedEndpoint, true);
      assert.equal(retrivedLikeCollection, undefined);
    });
  });

  context('when save_collection is called - POST and PUT', (): void => {
    it('should make proper POST request and save the collection data', async () => {
      const res = await request(app)
        .post(`/save_collection?API_KEY=${config.allowedAPIKeys[1]}`)
        .send({
          accessToken: accessToken,
          userId: userId,
          data: {
            collectionId: testCollectionId,
            address: testContractAddress,
            creatorAddress: testMinterAddress,
            name: testCollectionName,
            category: 'test_category',
            mintPrice: 5000
          }
        });

      assert.equal(res.body.success, true);

      const newlyCreated = await getCollectionWithVersion(testCollectionId, 1);
      assert.equal(newlyCreated.collectionId, testCollectionId);
      assert.equal(newlyCreated.version, 1);
      assert.equal(newlyCreated.name, testCollectionName);
      assert.equal(newlyCreated.isLatest, true);
      assert.equal(newlyCreated.mintPrice, 5000),
      //test whether ownerSigMintAllowed & shippingRequired is created as default
      assert.equal(newlyCreated.shippingRequired, false);
      assert.equal(newlyCreated.ownerSignatureMintAllowed, true);
    });

    it('should make proper PUT request and update the collection data', async () => {
      const res = await request(app)
        .put(`/save_collection?API_KEY=${config.allowedAPIKeys[1]}`)
        .send({
          accessToken: accessToken,
          userId: userId,
          data: {
            collectionId: testCollectionId,
            address: testContractAddress,
            creatorAddress: testMinterAddress,
            name: testCollectionName + '_2',
            category: 'test_category',
            version: 1,
            shippingRequired: true,
            ownerSignatureMintAllowed: false,
            mintPrice: 10000
          }
        });

      assert.equal(res.body.success, true);

      // TODO: collection versioning is not supported at the moment.
      const updated = await getCollectionWithVersion(testCollectionId, 1);
      assert.equal(updated.collectionId, testCollectionId);
      assert.equal(updated.version, 1); // TODO: collection versioning is not supported at the moment.
      assert.equal(updated.name, testCollectionName + '_2');
      assert.equal(updated.isLatest, true);
      assert.equal(updated.mintPrice, 10000),
      //test whether ownerSigMintAllowed & shippingRequired is overrided by request param
      assert.equal(updated.shippingRequired, true);
      assert.equal(updated.ownerSignatureMintAllowed, false);

      // const old = await getCollectionWithVersion(testCollectionId, 1);
      // assert.equal(old.isLatest, false);
      // assert.equal(old.version, 1);
    });
  });

  context('when query_collection is called', (): void => {
    it('should get relevant most recent collection returned', async () => {
      const res = await request(app).get(`/query_collection/${testCollectionId}`).expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.collectionId, testCollectionId);
      assert.equal(res.body.data.version, 1);
    });
  });

  context('when query_collection_by_address is called', (): void => {
    it('should get relevant most recent collection returned', async () => {
      const res = await request(app).get(`/query_collection_by_address/${testContractAddress}`).expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.collectionId, testCollectionId);
      assert.equal(res.body.data.address, testContractAddress);
      assert.equal(res.body.data.version, 1);
    });
  });

  context('when query_collections is called with category & isCreatedByUnic', (): void => {
    it('should return relevant collections matching category and, createdy by Unic', async () => {
      const res = await request(app)
        .get(
          `/query_collections?QUERY_PARAMS=${JSON.stringify({
            filterTestOverride: true,
            isCreatedByUnic: true,
            category: 'test_category',
            chain: 'ethereum'
          })}&API_KEY=${config.allowedAPIKeys[1]}`
        )
        .expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length, 2);
      assert.equal(res.body.data[0].category, 'test_category');
      assert.equal(res.body.data[1].category, 'test_category');
      assert.equal(res.body.data[0].isCreatedByUnic, true);
      assert.equal(res.body.data[1].isCreatedByUnic, true);
    });
  });

  context('when query_collections is called with creatorAddress & isCreatedByUnic', (): void => {
    it('should return relevant collections matching creatorAddress and created by Unic', async () => {
      const res = await request(app)
        .get(
          `/query_collections?QUERY_PARAMS=${JSON.stringify({
            filterTestOverride: true,
            isCreatedByUnic: true,
            creatorAddress: testMinterAddress2
          })}&API_KEY=${config.allowedAPIKeys[1]}`
        )
        .expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length, 2);
      assert.equal(res.body.data[0].creatorAddress, testMinterAddress2);
      assert.equal(res.body.data[1].creatorAddress, testMinterAddress2);
      assert.equal(res.body.data[0].isCreatedByUnic, true);
      assert.equal(res.body.data[1].isCreatedByUnic, true);
    });
  });

  context('when query_collections_all is called', (): void => {
    it('should return all collections', async () => {
      const res = await request(app)
        .get(
          `/query_collections_all?QUERY_PARAMS=${JSON.stringify({
            filterTestOverride: true,
            isCreatedByUnic: true
          })}&API_KEY=${config.allowedAPIKeys[1]}`
        )
        .expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length > 3, true);
      assert.equal(res.body.data[0].isCreatedByUnic, true);
      assert.equal(res.body.data[1].isCreatedByUnic, true);
    });
  });

  context('when query_collection_scan_and_view_count is called', (): void => {
    it('should return accumulated scan and view count for relevant nfts', async () => {
      const res = await request(app)
        .get(`/query_collection_scan_and_view_count/${testCollectionId}?API_KEY=${config.allowedAPIKeys[1]}`)
        .expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.totalScanCount > 0, true);
      assert.equal(res.body.data.totalViewCount > 0, true);
    });
  });
});
