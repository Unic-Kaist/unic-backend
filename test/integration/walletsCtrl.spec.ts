import chai from 'chai';
import request from 'supertest';
import express from 'express';
import { Express } from 'express-serve-static-core';
import config from '../../config.json';
import { getWallet, putWallet } from '../../service/providers/ddbProvider';
import { queryWallet, queryWalletByUserIdAndChain, saveWallet } from '../../service/controllers/walletsCtrl';
import { testContractAddress, testUserId } from '../testConstants';
import { generateTestJWTToken } from '../../service/providers/cognitoProvider';

let app: Express;
let accessToken: string;
let userId: string;
const assert = chai.assert;

const ETHEREUM = 'ethereum';

describe('==== WALLETS CONTROLLER ====', (): void => {
  before(async () => {
    process.env.ENV = 'test';

    app = express();
    app.use(express.urlencoded({ extended: false, limit: '50mb' }));
    app.use(express.json({ limit: '50mb' }));
    app.get('/query_wallet/:address/:chain', queryWallet);
    app.get('/query_wallets_by_user_id_and_chain/:userId/:chain', queryWalletByUserIdAndChain);
    app.post('/save_wallet', saveWallet);

    const { jwtToken, sub } = await generateTestJWTToken();
    accessToken = jwtToken;
    userId = sub;
  });

  context('when save_wallet is called', (): void => {
    it('should make propoer POST request and save the wallet data', async () => {
      const res = await request(app)
        .post(`/save_wallet?API_KEY=${config.allowedAPIKeys[1]}`)
        .send({
          accessToken: accessToken,
          userId: userId,
          data: {
            address: testContractAddress,
            chain: 'ethereum',
            userId: testUserId
          }
        });

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.address, testContractAddress);
      assert.equal(res.body.data.chain, ETHEREUM);
      assert.equal(res.body.data.userId, testUserId);

      const newlyCreated = await getWallet(testContractAddress, ETHEREUM);

      assert.equal(newlyCreated.address, testContractAddress);
      assert.equal(newlyCreated.chain, ETHEREUM);
      assert.equal(newlyCreated.userId, testUserId);
    });
  });

  context('when query_wallet is called', (): void => {
    it('should get relevant wallet returned', async () => {
      const res = await request(app).get(`/query_wallet/${testContractAddress}/${ETHEREUM}`).expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.address, testContractAddress);
      assert.equal(res.body.data.chain, ETHEREUM);
      assert.equal(res.body.data.userId, testUserId);
    });

    it('should get empty object when such wallet does not exist', async () => {
      const res = await request(app).get(`/query_wallet/${'bad_example'}/${ETHEREUM}`).expect(200);

      assert.equal(res.body.success, true);
      assert.equal(Object.keys(res.body.data).length, 0);
    });
  });

  context('when query_wallets_by_user_id_and_chain is called', (): void => {
    it('should get relevant wallet returned', async () => {
      const res = await request(app).get(`/query_wallets_by_user_id_and_chain/${testUserId}/${ETHEREUM}`).expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length > 1, true);
      assert.equal(res.body.data[0].chain, ETHEREUM);
      assert.equal(res.body.data[0].userId, testUserId);
      assert.equal(res.body.data[1].chain, ETHEREUM);
      assert.equal(res.body.data[1].userId, testUserId);
    });

    it('should get empty object when such wallet does not exist', async () => {
      const res = await request(app)
        .get(`/query_wallets_by_user_id_and_chain/${'bad_example'}/${ETHEREUM}`)
        .expect(200);

      assert.equal(res.body.success, true);
      assert.equal(Object.keys(res.body.data).length, 0);
    });
  });
});
