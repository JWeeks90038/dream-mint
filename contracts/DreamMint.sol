// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DreamMint is ERC721URIStorage, Ownable {
    uint256 public nextTokenId;
    uint256 public mintFee = 0;

    event DreamMinted(address indexed to, uint256 indexed tokenId, string tokenURI);
    event DreamRemixed(address indexed to, uint256 indexed newTokenId, uint256 parent1, uint256 parent2, string newTokenURI);

    constructor() ERC721("DreamMint", "DREAM") Ownable(msg.sender) {}

    function setMintFee(uint256 _fee) external onlyOwner {
        mintFee = _fee;
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function mintDream(address to, string memory tokenURI) public payable returns (uint256) {
        require(msg.value >= mintFee, "Insufficient mint fee");
        uint256 tokenId = nextTokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        nextTokenId++;
        emit DreamMinted(to, tokenId, tokenURI);
        return tokenId;
    }

    function remixDreams(address to, uint256 tokenId1, uint256 tokenId2, string memory newTokenURI) public payable returns (uint256) {
        require(ownerOf(tokenId1) == msg.sender && ownerOf(tokenId2) == msg.sender, "Must own both parent dreams");
        require(msg.value >= mintFee, "Insufficient remix fee");
        uint256 tokenId = nextTokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, newTokenURI);
        nextTokenId++;
        emit DreamRemixed(to, tokenId, tokenId1, tokenId2, newTokenURI);
        return tokenId;
    }
}
