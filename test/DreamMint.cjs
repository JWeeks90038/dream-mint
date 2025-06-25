const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DreamMint", function () {
  it("should mint a dream NFT and set the correct tokenURI", async function () {
    const [owner, user1] = await ethers.getSigners();
    const DreamMint = await ethers.getContractFactory("DreamMint");
    const contract = await DreamMint.deploy();
    await contract.waitForDeployment();

    const dreamURI = "ipfs://testdreamuri";
    const mintTx = await contract.mintDream(user1.address, dreamURI);
    await mintTx.wait();

    expect(await contract.ownerOf(0)).to.equal(user1.address);
    expect(await contract.tokenURI(0)).to.equal(dreamURI);
  });
});
