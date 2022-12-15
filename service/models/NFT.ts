export class NFT {
  nftId!: string;
  tokenId!: number;
  dotId!: string;
  description!: string;
  name!: string;
  standard!: string;
  scanCount!: number;
  viewCount!: number;
  supply!: number;
  collectionAddress!: string;
  collectionId!: string;
  marketplaceURL!: string;
  mintPrice!: number;
  creatorSignature!: string;
  amount!: number;
  imageURL!: string;
  ownerAddress!: string;
  creatorAddress!: string;
  isMinted!: boolean;

  constructor(nftData: object = {}) {
    Object.assign(this, nftData);
  }

  public makeObject() {
    return {
      nftId: this.nftId,
      tokenId: this.tokenId,
      dotId: this.dotId,
      description: this.description,
      name: this.name,
      standard: this.standard,
      scanCount: this.scanCount,
      viewCount: this.viewCount,
      supply: this.supply,
      collectionAddress: this.collectionAddress,
      collectionId: this.collectionId,
      marketplaceURL: this.marketplaceURL,
      mintPrice: this.mintPrice,
      creatorSignature: this.creatorSignature,
      amount: this.amount,
      imageURL: this.imageURL,
      ownerAddress: this.ownerAddress,
      creatorAddress: this.creatorAddress,
      isMinted: this.isMinted
    }
  }
}