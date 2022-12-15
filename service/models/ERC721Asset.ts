export class ERC721Asset {
  assetHash!: string;
  contractAddress!: string;
  tokenId!: number;
  imageURI!: string;
  tokenURI!:string;
  name!:string;
  symbol!:string;
  description!: string;
  ownerAddress!: string;
  ownerId!: string;
  minterAddress!: string;
  minterId!: string;
  tokenAmount!: number;
  likes!: number;

  constructor(assetData: object = {}) {
    Object.assign(this, assetData);
  }

  makeObject() :object {
    return {
      assetHash: this.assetHash,
      contractAddress: this.contractAddress,
      tokenId: this.tokenId,
      imageURI: this.imageURI,
      tokenURI: this.tokenURI,
      name: this.name,
      symbol: this.symbol,
      description: this.description,
      ownerAddress: this.ownerAddress,
      ownerId: this.ownerId,
      minterAddress: this.minterAddress,
      minterId: this.minterId,
      tokenAmount: this.tokenAmount,
      likes: this.likes,
    }
  }
}
