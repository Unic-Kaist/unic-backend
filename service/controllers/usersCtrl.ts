import { Request, Response } from "express";
import {
  getUserByTag,
  getUser,
  putUser,
} from "../../service/providers/ddbProvider";
import { validateAPIKey } from "../validators/apiKeyValidator";
import { verifyJWTToken } from "../providers/cognitoProvider";
import logger from "../../logger";
import { User } from "../models/User";

const queryUserByTag = async (req: Request, res: Response) => {
  const userTag = req.params.userTag;

  try {
    const result = await getUserByTag(userTag);

    return res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    logger.error(`Error occured during queryUserByTag: ${err.message}`);
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during queryUserByTag: ${err.message}`,
    });
  }
};

const queryUser = async (req: Request, res: Response) => {
  const userId = req.params.userId;
  try {
    const result = await getUser(userId);

    return res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    logger.error(`Error occured during queryUser: ${err.message}`);
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during queryUser: ${err.message}`,
    });
  }
};

const saveUser = async (req: Request, res: Response) => {
  const userData = req.body.data;
  const apiKey = req.query.API_KEY as string;
  const { accessToken, device } = req.body;
  const { userId, userTag } = userData;

  if (!validateAPIKey(apiKey)) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid API Key.`,
    });
  }

  if (!userId || !userTag)
    return res.json({
      success: false,
      message: "Validation Error: userId & userTag must exist",
    });

  const validJWTToken = await verifyJWTToken(accessToken, userId);

  if (!validJWTToken) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid JWT Token.`,
    });
  }

  try {
    let user = new User(userData);

    const response = await putUser(user);

    return res.json({
      success: true,
      data: response.makeObject(),
    });
  } catch (err: any) {
    logger.error(`Error occured during saveUser: ${err.message}`);
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during saveUser: ${err.message}`,
    });
  }
};

export { saveUser, queryUser, queryUserByTag };
