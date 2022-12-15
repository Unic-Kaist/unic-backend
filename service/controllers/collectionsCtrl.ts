import { Request, Response } from "express";
import {
  COLLECTIONS_TABLE,
  getMostRecentCollection,
  getCollectionsByCategory,
  getCollectionsByCreatorAddress,
  putCollection,
  getCollectionByAddress,
  scanTable,
  getNFTsByCollectionId,
  likeCollection,
  unlikeCollection,
  getUserLikedCollections,
  getUserLikedCollection
} from "../providers/ddbProvider";
import { verifyJWTToken } from "../providers/cognitoProvider";
import { validateAPIKey } from "../validators/apiKeyValidator";
import { Collection } from "../models/Collection";
import _ from "lodash";
import logger from "../../logger";
import { NFT } from "../models/NFT";

const getAllCollections = async (req: Request, res: Response) => {
  const apiKey = req.query.API_KEY as string;
  let queryParams = req.query.QUERY_PARAMS as any;
  queryParams = JSON.parse(queryParams);

  if (!validateAPIKey(apiKey)) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid API Key.`,
    });
  }

  try {
    let collections = await scanTable(COLLECTIONS_TABLE);

    if (!queryParams.filterTestOverride) {
      collections = collections.filter(
        (c: Collection) => !c.category?.includes("test")
      );
    }

    if (queryParams.isCreatedByUnic) {
      collections = collections.filter((c: Collection) => c.isCreatedByUnic);
    }

    return res.json({
      success: true,
      data: collections,
    });
  } catch (err: any) {
    logger.error(`Error occured during getAllCollections: ${err.message}`);
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during getAllCollections: ${err.message}`,
    });
  }
};

const queryCollection = async (req: Request, res: Response) => {
  const collectionId = req.params.collectionId;

  try {
    const collection = await getMostRecentCollection(collectionId);

    return res.json({
      success: true,
      data: collection,
    });
  } catch (err: any) {
    logger.error(`Error occured during queryCollection: ${err.message}`);
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during queryCollection: ${err.message}`,
    });
  }
};

const queryCollectionByAddress = async (req: Request, res: Response) => {
  const address = req.params.address;

  try {
    const collection = await getCollectionByAddress(address);

    return res.json({
      success: true,
      data: collection,
    });
  } catch (err: any) {
    logger.error(`Error occured during queryCollection: ${err.message}`);
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during queryCollection: ${err.message}`,
    });
  }
};

const queryCollections = async (req: Request, res: Response) => {
  const apiKey = req.query.API_KEY as string;
  let queryParams = req.query.QUERY_PARAMS as any;

  if (!validateAPIKey(apiKey)) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid API Key.`,
    });
  }

  if (!queryParams) {
    return res.json({
      success: false,
      message: `Validation Error: QUERY_PARAMS must be provided.`,
    });
  }

  queryParams = JSON.parse(queryParams);

  const isCreatedByUnic = queryParams.isCreatedByUnic;
  const category = queryParams.category;
  const creatorAddress = queryParams.creatorAddress;
  const filterTestOverride = queryParams.filterTestOverride;
  const chain = queryParams.chain as string;

  if (!category && !creatorAddress) {
    return res.json({
      success: false,
      message: `Validation Error: either category or creatorAddress must be provided.`,
    });
  }

  try {
    let results: Collection[] = [];

    if (category) {
      if (category === "all") {
        results = await scanTable(COLLECTIONS_TABLE);
      } else {
        results = await getCollectionsByCategory(category);
      }

      if (creatorAddress) {
        results = results.filter((collection: Collection) => {
          return collection.creatorAddress === creatorAddress;
        });
      }
    } else if (!category && creatorAddress) {
      results = await getCollectionsByCreatorAddress(creatorAddress);
    }

    if (isCreatedByUnic) {
      results = results.filter((collection: Collection) => {
        return collection.isCreatedByUnic;
      });
    }

    if (!filterTestOverride) {
      results = results.filter(
        (c: Collection) => !c.category?.includes("test")
      );
    }

    if (chain) {
      results = results.filter((c: Collection) => c.chain === chain);
    }

    return res.json({
      success: true,
      data: results,
    });
  } catch (err: any) {
    logger.error(`Error occured during queryCollections: ${err.message}`);
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during queryCollections: ${err.message}`,
    });
  }
};

const createCollection = async (req: Request, res: Response) => {
  const collectionData = req.body.data;
  const { accessToken, userId, device } = req.body;
  const apiKey = req.query.API_KEY as string;

  if (!validateAPIKey(apiKey)) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid API Key.`,
    });
  }

  const validJWTToken = await verifyJWTToken(accessToken, userId);

  if (!validJWTToken) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid JWT Token.`,
    });
  }
    // default value of shippingRequired = false , owner~allowed = true , mintPrice = do default value
    if (!collectionData.hasOwnProperty('shippingRequired')) {
      collectionData.shippingRequired = false
    }
    if (!collectionData.hasOwnProperty('ownerSignatureMintAllowed')) {
      collectionData.ownerSignatureMintAllowed = true
    }

  try {
    const collection = new Collection(collectionData);
    collection.version = 1;
    collection.createdAt = Date.now();
    collection.updatedAt = Date.now();
    collection.isLatest = true;

    const response = await putCollection(collection);

    return res.json({
      success: true,
      data: response.makeObject(),
    });
  } catch (err: any) {
    logger.error(`Error occured during createCollection: ${err.message}`);
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during createCollection: ${err.message}`,
    });
  }
};

const updateCollection = async (req: Request, res: Response) => {
  const collectionData = req.body.data;
  const apiKey = req.query.API_KEY as string;
  const { accessToken, userId, device } = req.body;

  if (!validateAPIKey(apiKey)) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid API Key.`,
    });
  }

  const validJWTToken = await verifyJWTToken(accessToken, userId);

  if (!validJWTToken) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid JWT Token.`,
    });
  }

  try {
    const collection = new Collection(collectionData);

    collection.version = 1;
    collection.updatedAt = Date.now();
    collection.isLatest = true;

    // TODO: collection versioning is not supported at the moment.
    // collection.version = collection.version + 1;

    const response = await putCollection(collection);

    // TODO: collection versioning is not supported at the moment.
    // put previous version to mark isLatest false
    // const oldCollection = _.cloneDeep(collection);
    // oldCollection.version--;
    // oldCollection.isLatest = false;
    // await putCollection(oldCollection);

    return res.json({
      success: true,
      data: response.makeObject(),
    });
  } catch (err: any) {
    logger.error(`Error occured during updateCollection: ${err.message}`);
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during updateCollection: ${err.message}`,
    });
  }
};

const queryCollectionScanAndViewCount = async (req: Request, res: Response) => {
  const collectionId = req.params.collectionId;

  try {
    const relevantNFTs = await getNFTsByCollectionId(collectionId);

    let totalScanCount = 0, totalViewCount = 0;

    relevantNFTs.forEach((nft:NFT) => {
      totalScanCount = totalScanCount + (nft.scanCount || 0);
      totalViewCount = totalViewCount + (nft.viewCount || 0);
    });

    return res.json({
      success: true,
      data: {totalScanCount: totalScanCount, totalViewCount: totalViewCount},
    });
  } catch (err: any) {
    logger.error(`Error occured during queryCollection: ${err.message}`);
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during queryCollection: ${err.message}`,
    });
  }
}

const collectionLikeAction = async (req: Request, res: Response) => {
  const collectionId = req.params.collectionId;
  const userId = req.params.userId;
  const apiKey = req.query.API_KEY as string;
  const { accessToken, device } = req.body;

  if (!validateAPIKey(apiKey)) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid API Key.`,
    });
  }

  if (!collectionId || !userId) {
    return res.json({
      success: false,
      message: `Validation Error: collectionId and userId must be present.`,
    });
  }

  const validJWTToken = await verifyJWTToken(accessToken, req.body.userId);

  if (!validJWTToken) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid JWT Token.`,
    });
  }

  try {
    await likeCollection(collectionId, userId);

    return res.json({
      success: true
    });
  } catch (err: any) {
    logger.error(
      `Error occured during collectionLikeAction for ${collectionId} / ${userId}: ${err.message}`
    );
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during collectionLikeAction: ${err.message}`,
    });
  }
}

const collectionUnlikeAction = async (req: Request, res: Response) => {
  const collectionId = req.params.collectionId;
  const userId = req.params.userId;
  const apiKey = req.query.API_KEY as string;
  const { accessToken, device } = req.body;

  if (!validateAPIKey(apiKey)) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid API Key.`,
    });
  }

  if (!collectionId || !userId) {
    return res.json({
      success: false,
      message: `Validation Error: collectionId and userId must be present.`,
    });
  }

  const validJWTToken = await verifyJWTToken(accessToken, req.body.userId);

  if (!validJWTToken) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid JWT Token.`,
    });
  }

  try {
    await unlikeCollection(collectionId, userId);

    return res.json({
      success: true
    });
  } catch (err: any) {
    logger.error(
      `Error occured during collectionUnlikeAction for ${collectionId} / ${userId}: ${err.message}`
    );
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during collectionUnlikeAction: ${err.message}`,
    });
  }
}

const queryCollectionUserRelation = async (req: Request, res: Response) => {
  const collectionId = req.params.collectionId;
  const userId = req.params.userId;
  const apiKey = req.query.API_KEY as string;

  if (!validateAPIKey(apiKey)) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid API Key.`,
    });
  }

  if (!collectionId || !userId) {
    return res.json({
      success: false,
      message: `Validation Error: collectionId and userId must be present.`,
    });
  }

  try {
    const relation = {isLiked: false};
    const likedCollection = await getUserLikedCollection(collectionId, userId);

    if (likedCollection && likedCollection.collectionId && likedCollection.userId) {
      relation.isLiked = true;
    }

    return res.json({
      success: true,
      data: relation
    });
  } catch(err: any) {
    logger.error(
      `Error occured during queryNFTUserRelation for ${collectionId} / ${userId}: ${err.message}`
    );
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during queryNFTUserRelation: ${err.message}`,
    });
  }
}

const queryUserLikedCollections = async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const apiKey = req.query.API_KEY as string;

  if (!validateAPIKey(apiKey)) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid API Key.`,
    });
  }

  try {
    const userLikedCollections = await getUserLikedCollections(userId);
    let results: Collection[] = [];
    results = await Promise.all(userLikedCollections.map((record: any) => getMostRecentCollection(record.collectionId)));
    return res.json({
      success: true,
      data: results
    })
  } catch(err: any) {
    logger.error(
      `Error occured during queryUserLikedCollections for ${userId}: ${err.message}`
    );
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during queryUserLikedCollections: ${err.message}`,
    });
  }
}

export {
  collectionLikeAction, collectionUnlikeAction, queryUserLikedCollections,
  getAllCollections,
  queryCollection,
  queryCollectionByAddress,
  queryCollections,
  createCollection,
  updateCollection,
  queryCollectionScanAndViewCount,
  queryCollectionUserRelation
};
