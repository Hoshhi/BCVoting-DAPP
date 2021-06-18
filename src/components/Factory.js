import React from 'react';
import { Grid, Typography, TextField, Button, IconButton, makeStyles, Card, CardContent } from '@material-ui/core';
import { DataGrid } from '@material-ui/data-grid';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import SaveIcon from '@material-ui/icons/Save';
import { DeleteOutlined, Store } from '@material-ui/icons';
import { useHistory, useParams } from "react-router-dom";
import HowToVoteIcon from '@material-ui/icons/HowToVote';


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
        wordWrap: 'break-word',
    },
    votingCard: {
        cursor: 'pointer',
        textAlign: 'center',
    },
}));

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
                    endIcon={<ArrowDownwardIcon />}
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

const ElectionCard = (props) => {
    const classes = useStyles();
    const history = useHistory();
    const goToElections = () => {
        history.push(`/manage/${props.address}`);
    }

    return (
        <Card className={classes.votingCard} variant='outlined' onClick={goToElections} >
            <CardContent>
                <HowToVoteIcon />
            </CardContent>
            <CardContent>
                <Typography className={classes.monoSpace}>
                    {props.address}
                </Typography>
                <Typography>
                </Typography>
            </CardContent>
        </Card>
    )
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
    const [votings, setVotings] = React.useState([]);
    const [factory, setFactory] = React.useState(null);
    const classes = useStyles();
    const { id } = useParams();

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

    const getBCVotingFactory = async () => {
        let f = await BCVotingFactory.at(id);
        setFactory(f)
    }

    React.useEffect(() => getBCVotingFactory(), []);

    const getFactoryVotings = async () => {
        if (factory === null) return;

        let cnt = await factory.getCntOfVotings();
        let votings = [];

        for (let i = 0; i < cnt; ++i) votings.push(await factory.allVotings(i));
        setVotings(votings);
    }

    React.useEffect(() => getFactoryVotings(), [factory]);

    const createVote = async () => {
        await factory.createBCVoting(
            candidates.map(c => c.name),
            auth.cand_generators_1D_array,
            auth.deltaT,
            2, // BatchSize - should be configurable?
            { from: props.w3Account, gas: 16.5 * 1000 * 1000 }
        );
        setCandidates([]);
        getFactoryVotings();
    }

    return (
        <Grid container alignItems="flex-start"
            spacing={3}>
            <Grid item container spacing={3} xs={8} >
                <Grid item xs={12}>
                    <Typography color="primary" variant="h5">
                        New voting
                    </Typography>
                </Grid>
                <Grid item xs={12}>
                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        onClick={createVote}
                        disabled={candidates.length === 0}
                    >
                        Create voting
                    </Button>
                </Grid>
                <CandidateInput onConfirm={addCandidate} />
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
            </Grid>

            <Grid item container spacing={3} xs={4}>
                <Grid item xs={12}>
                    <Typography color="primary" variant="h5">
                        Created votings
                    </Typography>
                </Grid>
                {votings.map(v => (
                    <Grid item xs={12}>
                        <ElectionCard id={v} address={v} />
                    </Grid>
                ))}
            </Grid>
        </Grid >
    )
}

export default CreateElection