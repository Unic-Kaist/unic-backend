import { Request, Response } from "express";
import logger from "../../logger";
import { validateAPIKey } from "../validators/apiKeyValidator";
import {
  getWallet,
  getWalletsByUserIdAndChain,
  putWallet,
} from "../providers/ddbProvider";
import { getUser } from "../../service/providers/ddbProvider";

import { Wallet } from "../models/Wallet";
import { verifyJWTToken } from "../providers/cognitoProvider";

const saveWallet = async (req: Request, res: Response) => {
  const walletData = req.body.data;
  const apiKey = req.query.API_KEY as string;
  const { accessToken, userId, device } = req.body;

  if (!validateAPIKey(apiKey)) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid API Key.`,
    });
  }

  const { address, chain } = walletData;

  if (!address || !chain)
    return res.json({
      success: false,
      message: "Validation Error: address & chain must exist",
    });

  const validJWTToken = await verifyJWTToken(accessToken, userId);

  if (!validJWTToken) {
    return res.json({
      success: false,
      message: `Validation Error: Invalid JWT Token.`,
    });
  }

  try {
    walletData.connectedTime = Date.now();
    const wallet = new Wallet(walletData);
    const response = await putWallet(wallet);

    return res.json({
      success: true,
      data: response.makeObject(),
    });
  } catch (err: any) {
    logger.error(`Error occured during saveWallet: ${err.message}`);
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during saveWallet: ${err.message}`,
    });
  }
};

const queryWallet = async (req: Request, res: Response) => {
  const address = req.params.address;
  const chain = req.params.chain;

  try {
    const wallet = await getWallet(address, chain);

    return res.json({
      success: true,
      data: wallet,
    });
  } catch (err: any) {
    logger.error(`Error occured during queryWallet: ${err.message}`);
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during queryWallet: ${err.message}`,
    });
  }
};

const queryWalletByUserIdAndChain = async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const chain = req.params.chain;

  try {
    const wallets = await getWalletsByUserIdAndChain(userId, chain);

    return res.json({
      success: true,
      data: wallets.sort((a: Wallet, b: Wallet) => a.connectedTime - b.connectedTime),
    });
  } catch (err: any) {
    logger.error(
      `Error occured during queryWalletByUserIdAndChain: ${err.message}`
    );
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during queryWalletByUserIdAndChain: ${err.message}`,
    });
  }
};

const queryUserByWallet = async (req: Request, res: Response) => {
  const address = req.params.address;
  const chain = req.params.chain;

  try {
    const wallet = await getWallet(address, chain);

    if (!wallet || !wallet.userId) {
      return res.json({
        success: false,
        message: `Validation Error: given wallet does not exist or userId does not exist in wallet data.`,
      });
    }

    const result = await getUser(wallet.userId);

    return res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    logger.error(`Error occured during queryUserByWallet: ${err.message}`);
    logger.error(err.stack);

    return res.json({
      success: false,
      message: `Error occured during queryUserByWallet: ${err.message}`,
    });
  }
};

export {
  saveWallet,
  queryWallet,
  queryWalletByUserIdAndChain,
  queryUserByWallet,
};
