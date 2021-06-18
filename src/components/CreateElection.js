import React from 'react';
import { Grid, Typography, TextField, Button, IconButton, makeStyles } from '@material-ui/core';
import { DataGrid } from '@material-ui/data-grid';
import ForwardIcon from '@material-ui/icons/Forward';
import SaveIcon from '@material-ui/icons/Save';
import { DeleteOutlined, Store } from '@material-ui/icons';
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

const useStyles = makeStyles(theme => ({
    dataGrid: {
        color: theme.color,
    },
    monoSpace: {
        fontFamily: [
            'Source Code Pro',
            'monospace',
        ].join(','),
    }
}));

const VotersInput = (props) => {
    const classes = useStyles();
    const [votersString, setVotersString] = React.useState("");

    const confirmVoters = () => {
        let accounts = votersString.split(/\r?\n/);
        accounts = accounts.map(a => (a.match(/0x[0-9A-Fa-f]{40}/).pop()))
        setVotersString(accounts.join('\n'));
        props.setVoters(accounts)
    }

    return (
        <>
            <Grid item xs={12}>
                <TextField
                    label="Set Voters"
                    className={classes.monoSpace}
                    variant="outlined"
                    fullWidth
                    multiline
                    InputProps={{
                        classes: {
                            input: classes.monoSpace,
                        },
                    }}
                    rows={10}
                    value={votersString}
                    onChange={e => setVotersString(e.target.value)}
                />
            </Grid>
            <Grid item xs={3}>
                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={votersString === ""}
                    endIcon={<SaveIcon />}
                    onClick={() => {
                        confirmVoters();
                    }}
                >
                    Set
                </Button>
            </Grid>
        </>
    )
}

const CandidateInput = (props) => {
    const [candidateName, setCandidateName] = React.useState("");

    return (
        <>
            <Grid item xs={7}>
                <TextField
                    label="Add Candidate"
                    variant="outlined"
                    fullWidth
                    size="small"
                    value={candidateName}
                    onChange={e => setCandidateName(e.target.value)}
                    onKeyUp={e => {
                        if (e.key === 'Enter' && candidateName !== "") {
                            props.onConfirm(candidateName);
                            setCandidateName("");
                        }
                    }}
                />
            </Grid>
            <Grid item xs={3}>
                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={candidateName === ""}
                    endIcon={<ForwardIcon />}
                    onClick={() => {
                        props.onConfirm(candidateName);
                        setCandidateName("");
                    }}
                >
                    Add
                </Button>
            </Grid>
        </>
    )
}

const CandidateCell = (params) => {
    const [hover, setHover] = React.useState(false);

    return (
        <React.Fragment>
            <Grid
                container
                justify="space-between"
                alignItems="center"
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
            >
                <Grid item>

                    <Typography color="primary">{params.value}</Typography>

                </Grid>
                <Grid item>
                    {hover &&
                        <IconButton
                            onClick={() => {
                                params.row.deleteSelf();
                            }}
                        >
                            <DeleteOutlined />
                        </IconButton>
                    }
                </Grid>

            </Grid>
        </React.Fragment >
    );
}

const cols = [
    { field: 'id', },
    {
        field: 'name',
        flex: 1,
        disableClickEventBubbling: true,
        editable: true,
        renderCell: params => <CandidateCell {...params} />,
    },
]

const CreateElection = (props) => {
    const [candidates, setCandidates] = React.useState([]);
    const [voters, setVoters] = React.useState([]);
    const classes = useStyles();
    let history = useHistory();
    const { id } = useParams()

    const addCandidate = (name) => {
        setCandidates(prev => (
            [...prev,
            {
                name,
                id: prev.length,
                votes: 0,
                deleteSelf: () => removeCandidate(prev.length)
            }
            ]
        ));
    }

    const removeCandidate = (id) => {
        setCandidates(prev =>
            prev.filter((c) => c.id !== id)
                .map((c, i) => {
                    c.id = i;
                    return c;
                })
        )

    }

    const newSetup = async () => {
        EC.setProvider(window.web3.currentProvider);
        FastEC.setProvider(window.web3.currentProvider);
        BCVoting.setProvider(window.web3.currentProvider);
        console.log(window.web3)
        FastEC.detectNetwork();
        const ec = await EC.new({ from: props.w3Account });
        await FastEC.link('EC', ec.address)
        const fastEc = await FastEC.new({ from: props.w3Account });
        BCVotingFactory.setNetwork(window.web3.currentProvider.networkVersion);
        await BCVotingFactory.link('EC', ec.address);
        await BCVotingFactory.link('FastEcMul', fastEc.address);
        const factory = await BCVotingFactory.new({ from: props.w3Account });
        history.push(`/create/${factory.address}`);
        return factory;
    }

    const getBCVotingFactory = async () => {
        console.log(id);
        if (!id) {
            return await newSetup();

        }
        return await BCVotingFactory.at(id);
    }


    const createVote = async () => {
        localStorage.setItem('candidates', JSON.stringify(candidates));

        // creation of BC Voting
        const contractFactory = await getBCVotingFactory()
        var elections = await contractFactory.createBCVoting(
            auth.candidates, auth.cand_generators_1D_array,
            auth.deltaT, ac.MPC_BATCH_SIZE, { from: props.w3Account, gas: 16.5 * 1000 * 1000 }
        );
        // const voting = await BCVoting.deployed();

        console.log(await contractFactory.allVotings(2));
        // contractFactory.allVotings.call(function (err, res) {
        // document.getElementById('amt').innerText = res;
        // });

        console.log(elections)
        // add voters to voting
        // await elections.enrollVoters(voters, { from: props.w3Account, value: auth.deposit });



    }

    return (
        <Grid container alignItems="flex-start"
            spacing={3}>
            <Grid item container spacing={3} xs={6} >
                <Grid item xs={12}>

                    <Typography color="primary" variant="h5">
                        Setup
                    </Typography>
                </Grid>

                <CandidateInput onConfirm={addCandidate} />
                <VotersInput setVoters={setVoters} />

            </Grid>

            <Grid item container spacing={3} xs={6}>
                <Grid item xs={12}>
                    <Typography color="primary" variant="h5">
                        Candidates
                    </Typography>
                </Grid>
                <Grid item xs={12}>
                    <DataGrid
                        className={classes.dataGrid}
                        autoHeight
                        pageSize={8}
                        rows={candidates}
                        columns={cols}
                        disableSelectionOnClick
                        sortModel={[
                            {
                                field: 'id',
                                sort: 'desc',
                            },
                        ]}
                    />
                </Grid>
                <Grid item xs={12}>
                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        onClick={createVote}
                    >
                        Create
                    </Button>
                </Grid>
            </Grid>
        </Grid >
    )
}

export default CreateElection