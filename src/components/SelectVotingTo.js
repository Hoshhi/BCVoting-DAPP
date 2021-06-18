import React from 'react';
import { Grid, Typography, makeStyles, Card, CardContent } from '@material-ui/core';
import { DeleteOutlined, Store } from '@material-ui/icons';
import { useHistory, useParams } from "react-router-dom";
import BuildIcon from '@material-ui/icons/Build';
import { getVotings, addVoting } from '../logic/LocalStorage'
import AddCircleIcon from '@material-ui/icons/AddCircle';
import HowToVoteIcon from '@material-ui/icons/HowToVote';
import EditIcon from '@material-ui/icons/Edit';
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


const useStyles = makeStyles(theme => ({
    dataGrid: {
        color: theme.color,
    },
    monoSpace: {
        fontFamily: [
            'Source Code Pro',
            'monospace',
        ].join(','),
    },
    votingCard: {
        cursor: 'pointer',
        textAlign: 'center',
        height: '100',
    },
}));


const VotingCard = (props) => {
    const [stage, setStage] = React.useState(-1);
    const classes = useStyles();
    const history = useHistory();

    const goToVoting = () => {
        history.push(`/${props.to}/${props.address}`);
    }

    const getVotingInfo = async () => {
        BCVoting.setProvider(window.web3.currentProvider);

        const voting = await BCVoting.at(props.address);
        const stage = await voting.stage();
        setStage(Number(BigInt(stage)))
    }

    React.useEffect(() => getVotingInfo(), []);

    return (
        <Card className={classes.votingCard} variant='outlined' onClick={goToVoting} >
            <CardContent>
                {props.to === "vote" ?
                    <HowToVoteIcon />
                    :
                    <EditIcon />
                }
            </CardContent>
            <CardContent>
                <Typography className={classes.monoSpace}>
                    {props.address}
                </Typography>
                <Typography display='inline'>
                    voting stage:
                </Typography>
                <Typography className={classes.monoSpace} display='inline'>
                    {" " + stage}
                </Typography>
            </CardContent>
        </Card>
    )
}

const SelectVoting = (props) => {
    const [votings, setVotings] = React.useState([]);

    const loadVotings = () => {
        console.log(getVotings())
        setVotings(getVotings());
    }

    React.useEffect(loadVotings, []);

    return (
        <Grid container spacing={3}>
            {votings.map(f => (
                <Grid item xs={6}>
                    <VotingCard {...props} address={f} />
                </Grid>
            ))}
        </Grid >
    )
}

export default SelectVoting