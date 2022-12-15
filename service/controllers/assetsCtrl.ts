import { Request, Response } from 'express';
import { Asset } from '../models/Asset';
import AssetInfo from '../models/AssetInfo';
import { verifyJWTToken } from '../providers/cognitoProvider';
import { generatePreSingedURL, getObject } from '../providers/s3Provider';
import { putAsset, getAssetsByNFTId, deleteAsset, getAsset, updateAssetFields } from '../providers/ddbProvider';
import { validateAPIKey } from '../validators/apiKeyValidator';
import { assetInfoListValidator } from '../validators/assetValidator';

import * as crypto from 'crypto';
import md5 from 'md5';
import s3ParseUrl from '../utils/s3ParseUrl';
import FormData from 'form-data';

import logger from '../../logger';
import { pinFileToIPFS } from '../providers/ipfsProvider';

const makeAssetHash = (contractAddress: string, tokenId: number): string => {
  return crypto
    .createHash('sha256')
    .update(contractAddress + tokenId)
    .digest('hex');
};

const createPreSignedURL = async (req: Request, res: Response) => {
  const { userId, assets } = req.body.data;
  const { accessToken, device } = req.body;
  const apiKey = req.query.API_KEY as string;

  if (!validateAPIKey(apiKey)) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid API Key.`
    });
  }

  if (!userId || !assets || !assets.length)
    return res.json({
      success: false,
      message: `Validation Error: userId & assets (list of asset type and ids) must be present.`
    });

  const validJWTToken = await verifyJWTToken(accessToken, userId);

  if (!validJWTToken) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid JWT Token.`
    });
  }

  try {
    const presingedURLs = await Promise.all(
      assets.map((asset: any) => generatePreSingedURL(userId, asset.assetType, asset.assetId, asset.fileType))
    );

    return res.json({
      success: true,
      data: presingedURLs
    });
  } catch (err: any) {
    logger.error(`Error occured during createPreSignedURL: `);
    logger.error(err.stack);
    return res.json({
      success: false,
      message: `Error occured during createPreSignedURL.`
    });
  }
};

const queryAssetsByNFTId = async (req: Request, res: Response) => {
  const nftId = req.params.nftId;

  try {
    const result = await getAssetsByNFTId(nftId);

    return res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    logger.error(`Error occured during queryAssetsByNFTId: `);
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during queryAssetsByNFTId.`
    });
  }
};

const createAssets = async (req: Request, res: Response) => {
  //changed creatorAddress -> assetCreatorAddress & add assetCreatorId for req param
  const { nftId, assetCreatorAddress, assets, assetCreatorId } = req.body.data;
  const { accessToken, userId, device } = req.body;
  const apiKey = req.query.API_KEY as string;

  if (!validateAPIKey(apiKey)) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid API Key.`
    });
  }

  if (!nftId || !assetCreatorAddress || !assets || !assets.length || !assetCreatorId)
    return res.json({
      success: false,
      message: `Validation Error: nftId & creatorAddress & assets (list of asset types and urls) must be present.`
    });

  const validJWTToken = await verifyJWTToken(accessToken, userId);

  if (!validJWTToken) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid JWT Token.`
    });
  }

  if (!assetInfoListValidator(assets)) {
    return res.json({
      success: false,
      message: `Validation Error: asset info must contain assetURL & assetType.`
    });
  }

  try {
    let newAssets = await Promise.all(
      assets.map((assetInfo: AssetInfo) => createAsset(assetInfo, nftId, assetCreatorAddress, assetCreatorId))
    );
    return res.json({
      success: true,
      data: newAssets
    });
  } catch (err: any) {
    logger.error(`Error occured during createAssets: ${err.message}`);
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during createAssets. ${err.message}`
    });
  }
};

const updateAsset = async (req: Request, res: Response) => {
  const assetUpdateData = req.body.data;
  const assetId = req.params.assetId;
  const apiKey = req.query.API_KEY as string;
  const { accessToken, userId, device } = req.body;

  if (!validateAPIKey(apiKey)) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid API Key.`
    });
  }

  if (!assetId) {
    return res.json({
      success: false,
      message: `Validation Error: assetId must exist.`
    });
  }

  const validJWTToken = await verifyJWTToken(accessToken, userId);

  if (!validJWTToken) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid JWT Token.`
    });
  }

  const { visibility } = assetUpdateData;

  try {
    const beforeUpdate = await getAsset(assetId);

    const updateItems = {
      visibility: beforeUpdate.visibility !== visibility ? visibility : beforeUpdate.visibility
    };

    await updateAssetFields(assetId, updateItems);

    return res.json({
      success: true
    });
  } catch (err: any) {
    logger.error(`Error occured during updateAsset: ${err.message}`);
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during updateAsset. ${err.message}`
    });
  }
};
// added assetCreatorId param as its newly added
const createAsset = async (
  assetInfo: AssetInfo,
  nftId: string,
  assetCreatorAddress: string,
  assetCreatorId: string
): Promise<Asset> => {
  try {
    let assetObj = {
      assetId: assetInfo.assetId,
      assetType: assetInfo.assetType,
      assetURL: assetInfo.assetURL,
      creatorAddress: assetCreatorAddress,
      creatorId: assetCreatorId,
      visibility: assetInfo.visibility,
      processed: assetInfo.processed,
      nftId,
      ipfsHash: '',
      ipfsURL: ''
    };

    if (assetInfo.assetURL) {
      const { bucket, region, key } = s3ParseUrl(assetInfo.assetURL);

      if (bucket.length && key.length) {
        const object = await getObject(bucket, key);
        const formData = new FormData();
        formData.append('file', object.Body, {
          contentType: object.ContentType,
          filename: assetInfo.assetId
        });

        const [ipfsRes] = await Promise.all([pinFileToIPFS(formData)]);

        assetObj.ipfsHash = ipfsRes.IpfsHash;
      }
    }

    let asset = new Asset(assetObj);

    let newAsset = await putAsset(asset);
    return newAsset;
  } catch (err: any) {
    logger.error(`Error occured during createAsset: `);
    logger.error(err.stack);
    throw err;
  }
};

const deleteAssetById = async (req: Request, res: Response) => {
  const assetId = req.params.assetId;
  const apiKey = req.query.API_KEY as string;

  if (!validateAPIKey(apiKey)) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid API Key.`
    });
  }

  try {
    await deleteAsset(assetId);

    return res.json({
      success: true,
      message: 'Asset successfully deleted'
    });
  } catch (err: any) {
    logger.error(`Error occured during deleteAssetById: `);
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during deleteAssetById.`
    });
  }
};

export {
  queryAssetsByNFTId,
  createAsset,
  updateAsset,
  createAssets,
  deleteAssetById,
  makeAssetHash,
  createPreSignedURL
};
