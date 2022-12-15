import chai from 'chai';
import request from 'supertest';
import express from 'express';
import { Express } from 'express-serve-static-core';
import config from '../../config.json';
import {
  getAssetsByNFTId,
  getNFT,
  deleteNFT,
  deleteAsset,
  putNFT,
  likeNFT,
  unlikeNFT,
  getUserLikedNFT
} from '../../service/providers/ddbProvider';
import { getObject } from '../../service/providers/s3Provider';
import {
  queryNFT,
  queryNFTbyDotId,
  queryNFTsbyCollectionId,
  queryNFTsbyCollectionAddress,
  createNFT,
  createAssetsAndSaveNfts,
  incrementNFTScanCount,
  incrementNFTViewCount,
  queryNFTSByCollectionAddressesAndTokenIds,
  NFTLikeAction,
  NFTUnlikeAction,
  updateNFT
} from '../../service/controllers/nftsCtrl';
import {
  testContractAddress,
  testCollectionId,
  testMinterAddress,
  testNFTId,
  testNFTId2,
  testNFTId3,
  testDotId,
  testDotIdBase,
  testUserId,
  testUserId2
} from '../testConstants';
import { generateTestJWTToken } from '../../service/providers/cognitoProvider';
import { NFT } from '../../service/models/NFT';

let app: Express;
let accessToken: string;
let userId: string;
const assert = chai.assert;

const testNFTsList: NFT[] = [];

describe('==== NFTS CONTROLLER ====', (): void => {
  before(async () => {
    process.env.ENV = 'test';

    app = express();
    app.use(express.urlencoded({ extended: false, limit: '50mb' }));
    app.use(express.json({ limit: '50mb' }));
    app.get('/query_nft/:nftId', queryNFT);
    app.get('/query_nft_by_dot_id/:dotId', queryNFTbyDotId);
    app.get('/query_nfts_by_collection_id/:collectionId', queryNFTsbyCollectionId);
    app.get('/query_nfts_by_collection_address/:collectionAddress', queryNFTsbyCollectionAddress);
    app.get('/query_nfts_by_collection_addresses_and_token_ids', queryNFTSByCollectionAddressesAndTokenIds);

    app.post('/save_nft', createNFT);
    app.post('/update_nft/:nftId', updateNFT);
    app.post('/create_assets_and_save_nfts', createAssetsAndSaveNfts);
    app.post('/increment_nft_scan_count/:nftId', incrementNFTScanCount);
    app.post('/increment_nft_view_count/:nftId', incrementNFTViewCount);
    app.post('/like_nft/:nftId/:userId', NFTLikeAction);
    app.post('/unlike_nft/:nftId/:userId', NFTUnlikeAction);

    const { jwtToken, sub } = await generateTestJWTToken();
    accessToken = jwtToken;
    userId = sub;

    await deleteNFT(testNFTId3);

    for (let i = 0; i <= 30; i++) {
      const newNFT = new NFT({
        nftId: `batchGETTestNFT${i}`,
        collectionAddress: `0xBatchGETTestCollection`,
        tokenId: i,
        name: `Batch GET Test NFT ${i}`
      });
      testNFTsList.push(newNFT);
      await putNFT(newNFT);
    }
  });

  after(async () => {
    for (let nft of testNFTsList) {
      await deleteNFT(nft.nftId);
    }
  });

  context('when query_nft_user_relation is called - GET', (): void => {
    it('should make proper GET request and retrive specific like_nft record', async () => {
      const { nftId, userId } = await getUserLikedNFT(testNFTId, testUserId);
      assert.equal(nftId, testNFTId);
      assert.equal(userId, testUserId);
      const response = await getUserLikedNFT('nftId_to_fail', 'userId_to_fail');
      assert.equal(response, undefined);
    });
  });
  context('when like_nft is called - POST', (): void => {
    it('should make proper POST request and save like_nft record', async () => {
      const { success: reachedEndpoint } = await likeNFT(testNFTId2, testUserId2);
      const { nftId, userId } = await getUserLikedNFT(testNFTId2, testUserId2);
      assert.equal(reachedEndpoint, true);
      assert.equal(nftId, testNFTId2);
      assert.equal(userId, testUserId2);
    });
  });
  context('when unlike_nft is called - POST', (): void => {
    it('should delete like_nft record from DDB', async () => {
      const res = await unlikeNFT(testNFTId2, testUserId2);
      const retrivedLikeNFT = await getUserLikedNFT(testNFTId2, testUserId2);
      assert.equal(res.success, true);
      assert.equal(retrivedLikeNFT, undefined);
    });
  });
  context('when query_nft is called', (): void => {
    it('should get relevant nft returned', async () => {
      const res = await request(app).get(`/query_nft/${testNFTId}`).expect(200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.nftId, testNFTId);
    });
  });

  context('when query_nft_by_dot_id is called', (): void => {
    it('should get relevant nft returned', async () => {
      const res = await request(app).get(`/query_nft_by_dot_id/${testDotIdBase}`).expect(200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.nftId, testNFTId);
      assert.equal(res.body.data.dotId.includes(testDotIdBase), true);
    });
  });

  context('when query_nfts_by_collection_id is called', (): void => {
    it('should get relevant nfts returned that belongs to the given collection', async () => {
      const res = await request(app).get(`/query_nfts_by_collection_id/${testCollectionId}`).expect(200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length > 1, true);
      const sorted = res.body.data.sort((a: any, b: any) => a.nftId.localeCompare(b.nftId));
      assert.equal(sorted[0].nftId, testNFTId);
      assert.equal(sorted[0].dotId.includes(testDotIdBase), true);
      assert.equal(sorted[0].collectionId, testCollectionId);
      assert.equal(sorted[1].nftId, testNFTId2);
      assert.equal(sorted[1].dotId.includes(testDotIdBase), true);
      assert.equal(sorted[1].collectionId, testCollectionId);
    });
  });

  context('when query_nfts_by_collection_address is called', (): void => {
    it('should get relevant nfts returned that belongs to the given collection', async () => {
      const res = await request(app).get(`/query_nfts_by_collection_address/${testContractAddress}`).expect(200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length > 1, true);
      const sorted = res.body.data.sort((a: any, b: any) => a.nftId.localeCompare(b.nftId));
      assert.equal(sorted[0].nftId, testNFTId);
      assert.equal(sorted[0].dotId.includes(testDotIdBase), true);
      assert.equal(sorted[0].collectionId, testCollectionId);
      assert.equal(sorted[0].collectionAddress, testContractAddress);
      assert.equal(sorted[1].nftId, testNFTId2);
      assert.equal(sorted[1].dotId.includes(testDotIdBase), true);
      assert.equal(sorted[1].collectionId, testCollectionId);
      assert.equal(sorted[1].collectionAddress, testContractAddress);
    });
  });

  context('when save_nft is called - POST and PUT', (): void => {
    it('should make proper POST request and save the nft data', async () => {
      const res = await request(app)
        .post(`/save_nft?API_KEY=${config.allowedAPIKeys[1]}`)
        .send({
          accessToken: accessToken,
          userId: userId,
          data: {
            nftId: testNFTId3,
            tokenId: 3,
            collectionId: testCollectionId,
            dotId: testDotIdBase,
          }
        });

      assert.equal(res.body.success, true);

      const newlyCreated = await getNFT(testNFTId3);
      //check isMinted value is created as default
      assert.equal(newlyCreated.isMinted, false);
      assert.equal(newlyCreated.nftId, testNFTId3);
      assert.equal(newlyCreated.collectionId, testCollectionId);
      assert.equal(newlyCreated.dotId, testDotIdBase);

      await deleteNFT(testNFTId3); // clean up
    });
  });

  context('when create_assets_and_save_nfts is called - POST', (): void => {
    it('should create relevant NFTs, save metadata to S3, and create assets records', async () => {
      const res = await request(app)
        .post(`/create_assets_and_save_nfts?API_KEY=${config.allowedAPIKeys[1]}`)
        .send({
          accessToken: accessToken,
          userId: userId,
          data: [
            {
              nftData: {
                nftId: testNFTId3,
                tokenId: 3,
                creatorAddress: testMinterAddress,
                standard: 'ERC-1155',
                imageURL: 'https://original-assets.s3.us-west-1.amazonaws.com/test/profile_pic.png',
                collectionAddress: testContractAddress,
                collectionId: testCollectionId,
                dotId: testDotIdBase,
                isMinted : true
              },
              assetCreatorAddress: testMinterAddress,
              assetCreatorId: testUserId,
              assets: [
                {
                  assetId: `${Date.now() + Math.random()}`, visibility: true, processed: 0,
                  assetURL: 'https://original-assets.s3.us-west-1.amazonaws.com/test/profile_pic.png',
                  assetType: 'image'
                }
              ],
              traits: [{ trait_type: 'test', value: 'test' }]
            }
          ]
        });

      const newlyCreated = await getNFT(testNFTId3);
      //check isMinted value is constructed via request param
      assert.equal(newlyCreated.isMinted , true);
      assert.equal(newlyCreated.nftId, testNFTId3);
      assert.equal(newlyCreated.collectionId, testCollectionId);
      assert.equal(newlyCreated.collectionAddress, testContractAddress);
      assert.equal(newlyCreated.dotId, testDotIdBase);

      const createdMetatdata = await getObject(
        'unic-collections',
        `${newlyCreated.creatorAddress}/${newlyCreated.collectionId}/${newlyCreated.tokenId}.json`
      );

      assert.equal(createdMetatdata.ContentType, 'application/json');
      assert.isNotEmpty(createdMetatdata.Body);

      const createdAssets = await getAssetsByNFTId(newlyCreated.nftId);

      assert.equal(createdAssets.length > 0, true);
      assert.equal(createdAssets[0].nftId, newlyCreated.nftId);
      assert.equal(createdAssets[0].assetType, 'image');
      //test whether createdAsset match requested creator address & creator id
      assert.equal(createdAssets[0].creatorAddress, testMinterAddress);
      assert.equal(createdAssets[0].creatorId, testUserId);

      await deleteNFT(testNFTId3); // clean up
      await deleteAsset(createdAssets[0].assetId); // clean up
    });
  });

  context('when increment_nft_scan_count is called', (): void => {
    it('should increment scan count by 1', async () => {
      const before = await getNFT(testNFTId);
      const beforeScanCount = before.scanCount;

      const res = await request(app)
        .post(`/increment_nft_scan_count/${testNFTId}/?API_KEY=${config.allowedAPIKeys[1]}`)
        .send({
          accessToken: accessToken,
          userId: userId
        });

      assert.equal(res.body.success, true);

      const after = await getNFT(testNFTId);

      const afterScanCount = after.scanCount;

      assert.equal(afterScanCount > beforeScanCount, true);
      assert.equal(afterScanCount - beforeScanCount, 1);
    });
  });

  context('when increment_nft_view_count is called', (): void => {
    it('should increment view count by 1', async () => {
      const before = await getNFT(testNFTId);
      const beforeViewCount = before.viewCount;

      const res = await request(app)
        .post(`/increment_nft_view_count/${testNFTId}/?API_KEY=${config.allowedAPIKeys[1]}`)
        .send({
          accessToken: accessToken,
          userId: userId
        });

      assert.equal(res.body.success, true);

      const after = await getNFT(testNFTId);
      const afterViewCount = after.viewCount;

      assert.equal(afterViewCount > beforeViewCount, true);
      assert.equal(afterViewCount - beforeViewCount, 1);
    });
  });

  context('when query_nfts_by_collection_addresses_and_token_ids is called', (): void => {
    it('should return list of relevant nfts given addresses and token ids', async () => {
      const res = await request(app)
        .get(
          `/query_nfts_by_collection_addresses_and_token_ids?QUERY_PARAMS=${JSON.stringify(testNFTsList)}&API_KEY=${
            config.allowedAPIKeys[1]
          }`
        )
        .expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length >= 30, true);
    });
  });

  context('when like_nft is called', (): void => {
    it('should create a new userLikedNFT record', async () => {});
  });

  context('when unlike_nft is called', (): void => {
    it('should delete userLikedNFT record', async () => {});
  });

  context('when update_nft is called', (): void => {
    it('should update description, name, and marketplaceURL', async () => {
      const timestamp = Date.now();

      const res = await request(app)
        .post(`/update_nft/${testNFTId}/?API_KEY=${config.allowedAPIKeys[1]}`)
        .send({
          accessToken: accessToken,
          userId: userId,
          data: {
            name: `Test NFT Update NAME ${timestamp}`,
            description: `Test NFT Update DESCRIPTION ${timestamp}`,
            marketplaceURL: `Test NFT Update MARKETPLACEURL ${timestamp}`,
            isMinted : true
          }
        });

      assert.equal(res.body.success, true);
      const after = await getNFT(testNFTId);
      assert.equal(after.isMinted, true);
      assert.equal(after.name.includes(`${timestamp}`), true);
      assert.equal(after.description.includes(`${timestamp}`), true);
      assert.equal(after.marketplaceURL.includes(`${timestamp}`), true);
    });
  });
});
