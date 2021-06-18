import Voter from "../library/voter";

const fID = 'factories';
const vID = 'votings';
const ec = require('simple-js-ec-math');

/* global BigInt */

// BigInt.prototype.toJSON = function () { return this.toString };

// FACOTRIES

export const assertFactories = () => {
    if (!localStorage.getItem(fID)) localStorage.setItem(fID, "[]")
}

export const getFactories = () => {
    assertFactories();
    return JSON.parse(localStorage.getItem(fID));
}

export const hasFactory = (factory) => {
    assertFactories();
    return getFactories().includes(factory);
}

export const addFactory = (factory) => {
    assertFactories();
    localStorage.setItem(fID, JSON.stringify(getFactories().concat(factory)));
}

export const removeFactory = (factory) => {
    assertFactories();
    localStorage.setItem(fID, JSON.stringify(getFactories().filter(f => f !== factory)));
}

export const clearFactories = () => {
    localStorage.setItem(fID, "[]")
}

// VOTINGS

export const assertVotings = () => {
    if (!localStorage.getItem(vID)) localStorage.setItem(vID, "[]")
}

export const getVotings = () => {
    assertVotings();
    return JSON.parse(localStorage.getItem(vID));
}

export const hasVoting = (factory) => {
    assertVotings();
    return getVotings().includes(factory);
}

export const addVoting = (factory) => {
    assertVotings();
    localStorage.setItem(vID, JSON.stringify(getVotings().concat(factory)));
}

export const removeVoting = (factory) => {
    assertVotings();
    localStorage.setItem(vID, JSON.stringify(getVotings().filter(f => f !== factory)));
}

export const clearVotings = () => {
    localStorage.setItem(vID, "[]")
}

export const storeVoter = (votingAddr, voterAddr, voter) => {
    const json = JSON.stringify(voter.getInfoToStore(), (key, value) =>
        typeof value === "bigint" ? `BIGINT::${value}` : value
    );

    localStorage.setItem(`${votingAddr}-${voterAddr}`, json);
}

export const getVoter = (votingAddr, voterAddr) => {
    const json = localStorage.getItem(`${votingAddr}-${voterAddr}`);
    if (json === null) return null;

    const backAgain = JSON.parse(json, (key, value) => {
        if (typeof value === "string" && value.startsWith('BIGINT::')) {
            return BigInt(value.substr(8));
        }
        return value;
    });
    const voter = new Voter(-1, 0, 0, 0, 0, 0, 0);
    voter.setStoredInfo(backAgain);
    return voter;
}
