import React from 'react';
import { Grid, Typography, makeStyles, Card, CardContent } from '@material-ui/core';
import { DeleteOutlined, Store } from '@material-ui/icons';
import { useHistory, useParams } from "react-router-dom";
import BuildIcon from '@material-ui/icons/Build';
import { getFactories, addFactory } from '../logic/LocalStorage'
import AddCircleIcon from '@material-ui/icons/AddCircle';

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
    factoryCard: {
        cursor: 'pointer',
        textAlign: 'center',
        height: '100',
    },
}));

const NewFactoryCard = (props) => {
    const classes = useStyles();

    const createFactory = async () => {
        EC.setProvider(window.web3.currentProvider);
        FastEC.setProvider(window.web3.currentProvider);
        BCVoting.setProvider(window.web3.currentProvider);
        FastEC.detectNetwork();
        const ec = await EC.new({ from: props.w3Account });
        await FastEC.link('EC', ec.address)
        const fastEc = await FastEC.new({ from: props.w3Account });
        BCVotingFactory.setNetwork(window.web3.currentProvider.networkVersion);
        await BCVotingFactory.link('EC', ec.address);
        await BCVotingFactory.link('FastEcMul', fastEc.address);
        const factory = await BCVotingFactory.new(ec.address, fastEc.address, { from: props.w3Account });
        props.factoryCreated(factory.address);
    }


    return (
        <Card className={classes.factoryCard} onClick={createFactory} variant='outlined' >
            <CardContent>
                <AddCircleIcon />
            </CardContent>
            <CardContent>
                <Typography>
                    NEW FACTORY
                </Typography>
            </CardContent>
        </Card>
    )
}

const FactoryCard = (props) => {
    const [votingsCreated, setVotingsCreated] = React.useState(0);
    const classes = useStyles();
    const history = useHistory();

    const goToFactory = () => {
        history.push(`/factory/${props.address}`);
    }

    const getFactoryInfo = async () => {
        const factory = await BCVotingFactory.at(props.address);
        const createdVotings = await factory.getCntOfVotings();
        setVotingsCreated(BigInt(createdVotings).toString());
    }

    React.useEffect(() => getFactoryInfo(), []);

    return (
        <Card className={classes.factoryCard} variant='outlined' onClick={goToFactory} >
            <CardContent>
                <BuildIcon />
            </CardContent>
            <CardContent>
                <Typography className={classes.monoSpace}>
                    {props.address}
                </Typography>
                <Typography display='inline'>
                    votings created:
                </Typography>
                <Typography className={classes.monoSpace} display='inline'>
                    {" " + votingsCreated}
                </Typography>
            </CardContent>
        </Card>
    )
}

const SelectFactory = (props) => {
    const [factories, setFactories] = React.useState([]);

    const loadFactories = () => {
        console.log(getFactories())
        setFactories(getFactories());
    }

    const factoryCreated = (f) => {
        console.log(f);
        addFactory(f);
        console.log(getFactories())
        loadFactories();
    }

    React.useEffect(loadFactories, []);

    return (
        <Grid container spacing={3}>
            {factories.map(f => (
                <Grid item xs={6}>
                    <FactoryCard {...props} address={f} />
                </Grid>
            ))}

            <Grid item xs={3}>
                <NewFactoryCard {...props} factoryCreated={factoryCreated} />
            </Grid>
        </Grid >
    )
}

export default SelectFactory