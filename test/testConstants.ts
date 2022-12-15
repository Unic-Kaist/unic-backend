const testUserId = 'test@test.com';
const testUserId2 = 'test2@test.com';
const testUserId3 = 'test3@test.com';

const testTag = 'testTag1';
const testTag2 = 'testTag2';
const testTag3 = 'testTag3';

const testNewUser = {
  userId: testUserId,
  userTag: testTag,
  profilePhoto: 'TestProfilePhoto',
  coverPhoto: 'TestCoverPhoto',
  description: 'My name is Scott Martin.',
}

const testNewUser2 = {
  userId: testUserId2,
  userTag: testTag2,
  profilePhoto: 'TestProfilePhoto',
  coverPhoto: 'TestCoverPhoto',
  description: 'My name is Scott Martin.',
  socialLinks: {"discord": "https://discord/martin"}
}

const testHash = 'd2162051fd02af07ccf5d3df7ef2342f952a10efb909fd878062caf700fb0641';
const testHash2 = 'KJHGHJKJHKJH';
const testHash3 = 'MJNBVFGHJKJH';

const testContractAddress = 'test_0x1235ljksef';
const testMinterAddress = 'test_0x2341535ljksef';
const testMinterAddress2 = 'test_0x2341535ljksef123234';
const testTokenId = 99731;

const testNewErc721Asst = {
  assetHash: testHash,
  contractAddress: testContractAddress,
  tokenId: testTokenId
}

const testCollectionId = 'testCollectionId';
const testCollectionId2 = 'testCollectionId2';

const testCollectionName = 'TEST_COLLECTION';

const testNFTId = 'test_0x1235ljksef_1';
const testNFTId2 = 'test_0x1235ljksef_2';
const testNFTId3 = 'test_0x1235ljksef_3';

const testDotId = 'testDotId';
const testDotIdBase = 'test.dot.id';

const testAssetId = 'testAssetId';

const testImage1 = 'https://unic-collections.s3.us-west-1.amazonaws.com/test/test1.jpeg';
const testImage2 = 'https://unic-collections.s3.us-west-1.amazonaws.com/test/test2.jpeg';
const testImage3 = 'https://unic-collections.s3.us-west-1.amazonaws.com/test/test3.jpeg';
const testImage4 = 'https://unic-collections.s3.us-west-1.amazonaws.com/test/test4.jpeg';

export {
  testTag, testTag2, testTag3, testContractAddress, testMinterAddress, testMinterAddress2, testNewUser2,
  testTokenId, testUserId, testUserId2, testUserId3, testNewUser, testHash, testAssetId,
  testHash2, testHash3, testNewErc721Asst, testCollectionId, testCollectionId2,
  testCollectionName, testNFTId, testNFTId2, testNFTId3, testDotId, testDotIdBase,
  testImage1, testImage2, testImage3, testImage4,
}