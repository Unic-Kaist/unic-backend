import chai from 'chai';
import request from 'supertest';
import express from 'express';
import { Express } from 'express-serve-static-core';
import config from '../../config.json';

import {
  createAsset,
  createAssets,
  makeAssetHash,
  createPreSignedURL,
  queryAssetsByNFTId,
  updateAsset,
  deleteAssetById
} from '../../service/controllers/assetsCtrl';
import { deleteAsset, getAsset } from '../../service/providers/ddbProvider';

import {
  testContractAddress,
  testMinterAddress,
  testTokenId,
  testHash,
  testUserId,
  testNFTId,
  testImage1,
  testImage2,
  testImage3,
  testAssetId
} from '../testConstants';
import { generateTestJWTToken } from '../../service/providers/cognitoProvider';

let app: Express;
let accessToken: string;
let userId: string;

const assert = chai.assert;

describe('==== ASSETS CONTROLLER ====', (): void => {
  before(async () => {
    process.env.ENV = 'test';

    app = express();
    app.use(express.urlencoded({ extended: false, limit: '50mb' }));
    app.use(express.json({ limit: '50mb' }));
    app.get('/query_assets_by_nft_id/:nftId', queryAssetsByNFTId);
    app.post('/create_pre_signed_url', createPreSignedURL);
    app.post('/save_assets', createAssets);
    app.post('/update_asset/:assetId', updateAsset);
    app.delete('/delete_asset_by_id/:assetId', deleteAssetById);

    const { jwtToken, sub } = await generateTestJWTToken();
    accessToken = jwtToken;
    userId = sub;
  });

  context('when query_assets_by_nft_id is called', (): void => {
    it('should get relevant assets by given nftId ', async () => {
      let response = await request(app).get(`/query_assets_by_nft_id/${testNFTId}`);

      assert.equal(response.body.success, true);
      assert.equal(response.body.data.length > 0, true);

      assert.equal(response.body.data[0].nftId, testNFTId);
      assert.equal(response.body.data[0].assetType, 'image');
    });
  });

  context('when create_pre_signed_url is called with assetIds', (): void => {
    it('should return corresponding pre-signed s3 urls', async () => {
      const res = await request(app)
        .post(`/create_pre_signed_url?API_KEY=${config.allowedAPIKeys[1]}`)
        .send({
          accessToken: accessToken,
          userId: userId,
          data: {
            userId: userId,
            assets: [
              { assetType: 'image', assetId: '12', fileType: 'image/png' },
              { assetType: 'image', assetId: '23', fileType: 'image/jpg' },
              { assetType: 'image', assetId: '45', fileType: 'image/jpeg' }
            ]
          }
        })
        .expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length, 3);
    });
  });

  context('when save_assets is called', (): void => {
    it('should create asset records and save to DDB', async () => {
      const res = await request(app)
        .post(`/save_assets?API_KEY=${config.allowedAPIKeys[1]}`)
        .send({
          accessToken: accessToken,
          userId: userId,
          data: {
            nftId: testNFTId,
            assetCreatorAddress: testMinterAddress,
            assetCreatorId: testUserId,
            assets: [
              {
                assetId: `${Date.now() + Math.random()}`,
                visibility: true,
                processed: 0,
                assetType: 'image',
                assetURL: testImage1
              },
              {
                assetId: `${Date.now() + Math.random()}`,
                visibility: true,
                processed: 0,
                assetType: 'image',
                assetURL: testImage2
              },
              {
                assetId: `${Date.now() + Math.random()}`,
                visibility: true,
                processed: 0,
                assetType: 'image',
                assetURL: testImage3
              }
            ]
          }
        })
        .expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length, 3);
      assert.equal(res.body.data[0].assetType, 'image');
      assert.equal(res.body.data[1].assetType, 'image');
      assert.equal(res.body.data[2].assetType, 'image');
      assert.isNotEmpty(res.body.data[0].ipfsHash);
      assert.isNotEmpty(res.body.data[1].ipfsHash);
      assert.isNotEmpty(res.body.data[2].ipfsHash);

      for (let asset of res.body.data) {
        let newlyCreated = await getAsset(asset.assetId);
        assert.equal(newlyCreated.assetId, asset.assetId);
        assert.equal(newlyCreated.assetType, asset.assetType);
        assert.equal(newlyCreated.assetURL, asset.assetURL);
        assert.equal(newlyCreated.creatorAddress, asset.creatorAddress);
        assert.equal(newlyCreated.creatorId, asset.creatorId);
        assert.isNotEmpty(newlyCreated.ipfsHash);
      }

      for (let asset of res.body.data) {
        await deleteAsset(asset.assetId);
      }
    });
  });

  context('when update_asset is called', (): void => {
    it('should update relevant asset with given data fields', async () => {
      const beforeAsset = await getAsset(testAssetId);
      const res = await request(app)
        .post(`/update_asset/${testAssetId}?API_KEY=${config.allowedAPIKeys[1]}`)
        .send({
          accessToken: accessToken,
          userId: userId,
          data: {
            visibility: !beforeAsset.visibility
          }
        })
        .expect(200);

      assert.equal(res.body.success, true);

      const afterAsset = await getAsset(testAssetId);
      assert.notEqual(beforeAsset.visibility, afterAsset.visibility);
    });
  });

  context('when delete_asset_by_id is called with assetId', (): void => {
    it('should delete the asset record from DDB', async () => {
      const newAsset = await createAsset(
        {
          assetId: `${Date.now() + Math.random()}`,
          visibility: true,
          processed: 0,
          assetType: 'image',
          assetURL: testImage1
        },
        testNFTId,
        testMinterAddress,
        testUserId
      );

      const newlyCreated = await getAsset(newAsset.assetId);

      assert.equal(newlyCreated.assetId, newAsset.assetId);

      const res = await request(app)
        .delete(`/delete_asset_by_id/${newlyCreated.assetId}?API_KEY=${config.allowedAPIKeys[1]}`)
        .expect(200);

      assert.equal(res.body.success, true);

      const shouldBeDeleted = await getAsset(newAsset.assetId);

      assert.isEmpty(shouldBeDeleted);
    });
  });
});
