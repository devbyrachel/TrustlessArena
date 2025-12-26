// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint8, euint64, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract TrustlessArena is ZamaEthereumConfig {
    uint64 public constant INITIAL_GOLD = 1000;

    uint64 public constant SOLDIER_1_COST = 100;
    uint64 public constant SOLDIER_2_COST = 200;
    uint64 public constant SOLDIER_3_COST = 400;
    uint64 public constant SOLDIER_4_COST = 1000;

    error AlreadyJoined(address player);
    error NotJoined(address player);

    struct PlayerState {
        bool joined;
        euint64 gold;
        euint8 builtSoldierType;
    }

    mapping(address => PlayerState) private _players;

    function join() external {
        address player = msg.sender;
        if (_players[player].joined) revert AlreadyJoined(player);

        _players[player].joined = true;
        _players[player].gold = FHE.asEuint64(INITIAL_GOLD);
        _players[player].builtSoldierType = FHE.asEuint8(0);

        FHE.allowThis(_players[player].gold);
        FHE.allow(_players[player].gold, player);

        FHE.allowThis(_players[player].builtSoldierType);
        FHE.allow(_players[player].builtSoldierType, player);
    }

    function buildSoldier(externalEuint8 encryptedSoldierType, bytes calldata inputProof) external {
        address player = msg.sender;
        if (!_players[player].joined) revert NotJoined(player);

        euint8 soldierType = FHE.fromExternal(encryptedSoldierType, inputProof);

        ebool is1 = FHE.eq(soldierType, FHE.asEuint8(1));
        ebool is2 = FHE.eq(soldierType, FHE.asEuint8(2));
        ebool is3 = FHE.eq(soldierType, FHE.asEuint8(3));
        ebool is4 = FHE.eq(soldierType, FHE.asEuint8(4));
        ebool isValid = FHE.or(is1, FHE.or(is2, FHE.or(is3, is4)));

        euint64 cost = FHE.select(
            is1,
            FHE.asEuint64(SOLDIER_1_COST),
            FHE.select(
                is2,
                FHE.asEuint64(SOLDIER_2_COST),
                FHE.select(is3, FHE.asEuint64(SOLDIER_3_COST), FHE.select(is4, FHE.asEuint64(SOLDIER_4_COST), FHE.asEuint64(0)))
            )
        );

        ebool hasEnoughGold = FHE.ge(_players[player].gold, cost);
        ebool canBuild = FHE.and(isValid, hasEnoughGold);

        _players[player].gold = FHE.select(canBuild, FHE.sub(_players[player].gold, cost), _players[player].gold);
        _players[player].builtSoldierType = FHE.select(canBuild, soldierType, _players[player].builtSoldierType);

        FHE.allowThis(_players[player].gold);
        FHE.allow(_players[player].gold, player);

        FHE.allowThis(_players[player].builtSoldierType);
        FHE.allow(_players[player].builtSoldierType, player);
    }

    function hasJoined(address player) external view returns (bool) {
        return _players[player].joined;
    }

    function getEncryptedGold(address player) external view returns (euint64) {
        return _players[player].gold;
    }

    function getEncryptedBuiltSoldierType(address player) external view returns (euint8) {
        return _players[player].builtSoldierType;
    }
}

