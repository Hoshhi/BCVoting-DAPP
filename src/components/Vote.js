import React from 'react';
import { Grid, Typography, TextField, Button, IconButton, makeStyles } from '@material-ui/core';
import { DataGrid } from '@material-ui/data-grid';
import ForwardIcon from '@material-ui/icons/Forward';
import { DeleteOutlined } from '@material-ui/icons';
import { getAll } from '../logic/BCVoting';
import { storeVoter, getVoter, hasVoting, addVoting } from '../logic/LocalStorage';
import { useHistory, useParams } from "react-router-dom";


// IMPORT W3 etc
/* global BigInt */
// const BCVoting = artifacts.require("BCVoting");
// const BCVotingFactory = artifacts.require("BCVotingFactory");
// const FastEC = artifacts.require("FastEcMul");
var contract = require("truffle-contract");

const BCVotingJSON = require("../build/contracts/BCVoting.json");
const BCVotingFactoryJSON = require("../build/contracts/BCVotingFactory.json");
const FastECJSON = require("../build/contracts/FastEcMul.json");
const ECJSON = require("../build/contracts/EC.json");

const BCVoting = contract(BCVotingJSON);
const BCVotingFactory = contract(BCVotingFactoryJSON);
const FastEC = contract(FastECJSON);
const EC = contract(ECJSON);

var Web3 = require('web3');
var _ = require('underscore');
var W3 = new Web3();

W3.setProvider(window.web3.currentProvider);
BCVotingFactory.setProvider(window.web3.currentProvider);

const ec = require('simple-js-ec-math');
var Voter = require("../library/voter.js");
var Authority = require("../library/authority.js");
var ac = require("../library/config.js"); // Config of unit test authenticator
var auth = new Authority(ac.CANDIDATES_CNT, ac.VOTERS_CNT, ac.Gx, ac.Gy, ac.NN, ac.PP, ac.DELTA_T, ac.DEPOSIT_AUTHORITY, ac.FAULTY_VOTERS);

var Utils = require("../library/utils.js");
var utils = new Utils()

function h(a) { return W3.utils.soliditySha3({ v: a, t: "bytes", encoding: 'hex' }); }

function retype(a) { if (typeof a == 'bigint') { return BigInt.asUintN(127, a) } else { return a } } // make empty when we will have Bigint library in solidity
var STAGE = Object.freeze({ "SETUP": 0, "SIGNUP": 1, "PRE_VOTING": 2, "VOTING": 3, "FT_RESOLUTION": 4, "TALLY": 5 });

// END IMPORT W3


const Vote = (props) => {
    const [selectedCandidates, setSelectedCandidates] = React.useState([]);
    const [selectionModel, setSelectionModel] = React.useState([]);
    let voter = null;
    const [voting, setVoting] = React.useState(null);
    const [candidates, setCandidates] = React.useState([]);
    const [stage, setStage] = React.useState(0);
    const [authority, setAuthority] = React.useState("");
    const [votersCnt, setVotersCnt] = React.useState(0);
    const [epkSent, setEpkSent] = React.useState(0);
    const [eligible, setEligible] = React.useState(false);
    const [sentEPK, setSentEPK] = React.useState(false);
    const [voted, setVoted] = React.useState(false);
    const [completed, setCompleted] = React.useState(false);
    const [results, setResults] = React.useState({});

    const { id } = useParams();

    const setupVoter = () => {
        if (voter !== null) return;
        let v = getVoter(id, props.w3Account);
        if (v === null) {
            v = new Voter(0, auth.G, auth.cand_generators, candidates.length, auth.curve, props.w3Account, ac.VOTER_DEPOSIT);
            storeVoter(id, props.w3Account, v);
        }
        voter = v;
    }

    const changeVoterId = (id) => {
        console.log(voter)
        voter.setId(id);
        storeVoter(id, props.w3Account, voter);
        console.log(voter);
    }

    const getBCVoting = async () => {
        BCVoting.setProvider(window.web3.currentProvider);
        setVoting(await BCVoting.at(id));
        !hasVoting(id) && addVoting(id);
        console.log("wtf")

    }

    const getVotingInfo = async () => {
        if (voting === null) return;
        // getResults();
        const count = Number(BigInt(await voting.getCntOfCandidates.call()));
        const cnd = await getAll(voting.candidates, count);
        setCandidates(cnd.map((c, i) => ({ id: i, name: c })));
        const stage = await voting.stage();
        const authority = await voting.authority();
        const epkSent = await voting.getCntOfEphPKs.call();
        const votersCnt = await voting.getCntOfEligibleVoters.call();
        const eligible = await voting.eligibleVoters(props.w3Account);
        const sentEPK = await voting.votersWithEphKey(props.w3Account);
        // const voted = await voting.votersWithEphKey(props.w3Account);
        setAuthority(authority);
        setStage(Number(BigInt(stage)))
        setEpkSent(Number(BigInt(epkSent)));
        setVotersCnt(Number(BigInt(votersCnt)));
        setEligible(eligible);
        setSentEPK(sentEPK);
    }


    React.useEffect(() => getVotingInfo(), [voting]);
    React.useEffect(() => getBCVoting(), []);

    const submitEpk = async () => {
        setupVoter();
        await voting.submitEphemeralPK(voter.Gx_as_pair, { from: props.w3Account, value: voter.deposit });
        getVotingInfo();
    }

    const submitVote = async () => {
        setupVoter();
        const voterId = await voting.idxVoters(props.w3Account);
        console.log(voterId);
        changeVoterId(parseInt(voterId));
        voter.setCandidates(candidates);

        console.log(selectedCandidates[0].id);
        let ephPKs = [];
        for (let i = 0; i < votersCnt; ++i) {
            let tmp = {};
            tmp.x = await voting.ephemeralPKs(i, 0);
            tmp.y = await voting.ephemeralPKs(i, 1);
            tmp.x = BigInt(tmp.x)
            tmp.y = BigInt(tmp.y)
            ephPKs.push(tmp);

        }

        voter.computeMpcPK(ephPKs);

        let args = voter.getBlindedVote(selectedCandidates[0].id);
        FastEC.setProvider(window.web3.currentProvider);
        FastEC.detectNetwork();
        const contractFastEC = await FastEC.at(await voting.associatedFastEC())

        var decomp = [];
        for (let j = 0; j < ac.CANDIDATES_CNT; j++) {
            var tmpItems = await contractFastEC.decomposeScalar.call(args[3][j], ac.NN, ac.LAMBDA);
            decomp.push(BigInt(tmpItems[0]));
            decomp.push(BigInt(tmpItems[1]));
        }

        args[3] = utils.BIarrayToHexUnaligned(decomp); // update proof_r in arguments of SC (should be 2x longer)
        decomp = [];
        for (let j = 0; j < ac.CANDIDATES_CNT; j++) {
            tmpItems = await contractFastEC.decomposeScalar.call(args[0][j], ac.NN, ac.LAMBDA);
            decomp.push(BigInt(tmpItems[0]));
            decomp.push(BigInt(tmpItems[1]));
        }
        args[4] = utils.BIarrayToHexUnaligned(decomp); // update proof_d in arguments of SC (should be 2x longer)
        var tmpPars = args.slice(1);
        var invModArrs = await voting.modInvCache4SubmitVote.call(...(tmpPars.slice(1)), { from: props.w3Account });
        await voting.submitVote(...tmpPars, invModArrs, { from: props.w3Account, gas: 50111555 });
        getVotingInfo();
    }

    const getResults = async () => {
        let results = await voting.getPastEvents('TallyCompleted');
        if (results.length === 1) {
            let res = []
            for (let i = 0; i < results[0].args.tally.length; ++i) {
                res.push(results[0].args.tally[i]);
            }
            setCompleted(true);
            setResults(res)
        }
    }

    return (
        <Grid container spacing={3}>
            <Grid item xs={9}>
                <DataGrid
                    autoHeight
                    pageSize={8}
                    rows={completed ? candidates.map((v, i) => { v.result = results[i]; return v }) : candidates}
                    columns={completed ? [{ field: 'id' }, { field: 'result' }, { field: 'name', flex: 1 }] : [{ field: 'id' }, { field: 'name', flex: 1 }]}
                    checkboxSelection={stage === 3}
                    selectionModel={selectionModel}
                    onSelectionModelChange={(newSelection) => {
                        setSelectionModel(newSelection.selectionModel);
                        setSelectedCandidates(candidates.filter(c => newSelection.selectionModel.includes(c.id)));
                    }}
                    disableCellSelection
                />
            </Grid>

            <Grid item xs={3}>
                {!eligible ? <>
                    <Grid item xs={12}>
                        <Typography color="primary" variant="h5">
                            You are not eligible voter.
                        </Typography>
                    </Grid>
                </> : <>
                        <Grid item xs={12}>
                            <Typography color="primary" variant="h5">
                                You are an eligible voter.
                        </Typography>
                        </Grid>
                        {stage === 1 && <>
                            <Grid item xs={12}>
                                <Typography color="primary" variant="h5" >
                                    Voting stage: SignUp
                        </Typography>
                                <Typography display='inline'>All voters must now submit their ephemeral keys</Typography>
                                <Typography display='inline'>{": " + epkSent}/{votersCnt}</Typography>
                                {sentEPK ? <>
                                    <Typography color="primary" variant="h5">
                                        You already sent yours.
                                </Typography>
                                </> : <>
                                        <Typography color="primary" variant="h5">
                                            Please, submit yours.
                                </Typography>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            fullWidth
                                            onClick={submitEpk}
                                        >
                                            Submit EPK
                                </Button>
                                    </>}
                            </Grid>
                        </>}
                        {stage === 2 && <>
                            <Grid item xs={12}>
                                <Typography color="primary" variant="h5" >
                                    Voting stage: PRE-VOTING
                            </Typography>
                                <Typography> Authority must now compute MPC keys </Typography>
                            </Grid>
                        </>}
                        {stage === 3 && <>
                            <Grid item xs={12}>
                                <Typography color="primary" variant="h5" >
                                    Voting stage: VOTING
                            </Typography>
                                <Typography>Voters must now submit their votes</Typography>
                                {voted ? <>
                                    <Typography color="primary" variant="h5">
                                        You already voted.
                                </Typography>
                                </> : <>
                                        <Typography color="primary" variant="h5">
                                            Please, vote.
                                </Typography>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            fullWidth
                                            onClick={submitVote}
                                            disabled={selectedCandidates.length !== 1}
                                        >
                                            Vote
                                </Button>
                                    </>}
                            </Grid>
                        </>}
                        {stage === 5 && <>
                            <Grid item xs={12}>
                                <Typography color="primary" variant="h5" >
                                    Voting stage: TALLY
                                </Typography>
                                {!completed ? <>
                                    <Typography>Authority must now brute-force the tally</Typography>
                                </> : <>
                                        <Typography>Voting completed</Typography>
                                    </>}
                            </Grid>
                        </>}
                    </>}
            </Grid>
        </Grid>
    )
}

export default Vote;