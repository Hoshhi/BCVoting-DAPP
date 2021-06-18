import React from 'react';
import { Grid, Typography, TextField, Button, IconButton, makeStyles, Card, CardContent } from '@material-ui/core';
import { DataGrid } from '@material-ui/data-grid';
import ForwardIcon from '@material-ui/icons/Forward';
import SaveIcon from '@material-ui/icons/Save';
import { DeleteOutlined, Store } from '@material-ui/icons';
import { useHistory, useParams } from "react-router-dom";
import HowToVoteIcon from '@material-ui/icons/HowToVote';
import { getAll } from '../logic/BCVoting'

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
                    {/* {hover &&
                        <IconButton
                            onClick={() => {
                                params.row.deleteSelf();
                            }}
                        >
                            <DeleteOutlined />
                        </IconButton>
                    } */}
                </Grid>

            </Grid>
        </React.Fragment >
    );
}

const ElectionCard = (props) => {
    const classes = useStyles();
    const history = useHistory();
    const goToElections = () => {
        history.push(`/elections/${props.address}`);
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
const colsResult = [
    { field: 'id', },
    { field: 'result', },
    {
        field: 'name',
        flex: 1,
        disableClickEventBubbling: true,
        renderCell: params => <CandidateCell {...params} />,
    },
]

const CreateElection = (props) => {
    const [votings, setVotings] = React.useState([]);
    const [voting, setVoting] = React.useState(null);
    const [candidates, setCandidates] = React.useState([]);
    const [stage, setStage] = React.useState(-1);
    const [authority, setAuthority] = React.useState("");
    const [votersCnt, setVotersCnt] = React.useState(0);
    const [epkSent, setEpkSent] = React.useState(0);
    const [completed, setCompleted] = React.useState(false);
    const [results, setResults] = React.useState({});
    const classes = useStyles();
    let history = useHistory();
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

    const getBCVoting = async () => {
        BCVoting.setProvider(window.web3.currentProvider);
        setVoting(await BCVoting.at(id));
    }

    React.useEffect(() => getBCVoting(), []);

    const getVotingInfo = async () => {
        if (voting === null) return;
        getResults();
        const count = Number(BigInt(await voting.getCntOfCandidates.call()));
        const cnd = await getAll(voting.candidates, count);
        setCandidates(cnd.map((c, i) => ({ id: i, name: c })));
        const stage = await voting.stage();
        const authority = await voting.authority();
        const epkSent = await voting.getCntOfEphPKs.call();
        const votersCnt = await voting.getCntOfEligibleVoters.call();

        setAuthority(authority);
        setStage(Number(BigInt(stage)))
        setEpkSent(Number(BigInt(epkSent)));
        setVotersCnt(Number(BigInt(votersCnt)));
    }
    React.useEffect(() => getVotingInfo(), [voting]);

    const setVoters = async (voters) => {
        console.log(props.w3Account, voters)
        await voting.enrollVoters(voters, { from: props.w3Account, value: auth.deposit });
        getVotingInfo();
    }
    const computeMPC = async () => {
        await voting.buildRightMarkers4MPC({ from: props.w3Account });
        var markersCnt = await voting.getCntOfMarkersMPC.call()
        console.log(markersCnt);
        let act_left = [utils.toPaddedHex(auth._G.x, 32), utils.toPaddedHex(auth._G.y, 32), 1];

        for (let j = 0; j < votersCnt / 2; j++) {
            let invModArrs_MPC = await voting.modInvCache4MPCBatched.call(j * 2, act_left);
            act_left = invModArrs_MPC[2];
            await voting.computeMPCKeys(
                invModArrs_MPC[1],
                invModArrs_MPC[0], { from: props.w3Account }
            );
        }
        getVotingInfo();

    }

    const computeTally = async () => {
        FastEC.setProvider(window.web3.currentProvider);
        FastEC.detectNetwork();
        const contractFastEC = await FastEC.at(await voting.associatedFastEC())
        while (true) {
            try {
                let tally = [2, 0];
                // for (let i = 0; i < candidates.length; i++) {
                //     tally.push(Math.floor(Math.random() * (votersCnt + 1)));
                // }
                console.log(tally);

                var decomp = [];
                for (let j = 0; j < candidates.length; j++) {
                    var tmpItems = await contractFastEC.decomposeScalar.call(W3.utils.numberToHex(tally[j].toString(10)), ac.NN, ac.LAMBDA);
                    decomp.push(BigInt(tmpItems[0]));
                    decomp.push(BigInt(tmpItems[1]));
                }

                var invModArrs = await voting.modInvCache4Tally.call(utils.BIarrayToHexUnaligned(decomp), { from: props.w3Account });
                var receipt = await voting.computeTally(utils.BIarrayToHexUnaligned(decomp), invModArrs, { from: props.w3Account });
                console.log(`\t \\/== Gas used in computeTally by authority:`, receipt.receipt.gasUsed);
                console.log(tally);
                getVotingInfo();
                break;
            } catch {
                console.log('well, try again');
            }
        }
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
        <Grid container alignItems="flex-start"
            spacing={3}>
            <Grid item container spacing={3} xs={6} >
                {authority !== props.w3Account ? <>
                    <Grid item xs={12}>
                        <Typography color="primary" variant="h5">
                            You are not the authority.
                        </Typography>
                        <Typography color="primary" variant="h6" display='inline'>
                            Authority address:
                        </Typography>
                        <Typography className={classes.monoSpace} color="primary" variant="h5" display='inline'>
                            {" " + authority}
                        </Typography>
                    </Grid>
                </> : <>
                        <Grid item xs={12}>
                            <Typography color="primary" variant="h5">
                                You are the authority.
                    </Typography>
                        </Grid>
                        {stage === 0 && <>
                            <Grid item xs={12}>
                                <Typography color="primary" variant="h5" >
                                    Voting stage: Setup
                        </Typography>

                            </Grid>
                            <VotersInput setVoters={setVoters} />
                        </>}
                        {stage === 1 && <>
                            <Grid item xs={12}>
                                <Typography color="primary" variant="h5" >
                                    Voting stage: SignUp
                        </Typography>
                                <Typography display='inline'>All voters must now submit their ephemeral keys</Typography>
                                <Typography display='inline'>{": " + epkSent}/{votersCnt}</Typography>
                            </Grid>
                        </>}
                        {stage === 2 && <>
                            <Grid item xs={12}>
                                <Typography color="primary" variant="h5" >
                                    Voting stage: PRE-VOTING
                        </Typography>
                                <Typography> You must now compute MPC keys </Typography>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    onClick={computeMPC}
                                >
                                    Compute MPC
                        </Button>
                            </Grid>
                        </>}
                        {stage === 3 && <>
                            <Grid item xs={12}>
                                <Typography color="primary" variant="h5" >
                                    Voting stage: VOTING
                        </Typography>
                                <Typography>Voters must now submit their votes</Typography>
                            </Grid>
                        </>}
                        {stage === 5 && <>
                            <Grid item xs={12}>
                                <Typography color="primary" variant="h5" >
                                    Voting stage: TALLY
                                </Typography>
                                {!completed ? <>
                                    <Typography>You must now brute-force the tally</Typography>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        fullWidth
                                        onClick={computeTally}
                                    >
                                        Compute Tally
                                    </Button>
                                </> : <>
                                        <Typography>Voting completed</Typography>
                                    </>}
                            </Grid>
                        </>}
                    </>}
            </Grid>

            <Grid item container spacing={3} xs={6}>
                <Grid item xs={12}>
                    <Typography color="primary" variant="h5">
                        Candidates
                    </Typography>
                    <Grid item xs={12}>
                        <DataGrid
                            className={classes.dataGrid}
                            autoHeight
                            pageSize={8}
                            rows={completed ? candidates.map((v, i) => { v.result = results[i]; return v }) : candidates}
                            columns={completed ? colsResult : cols}
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
            </Grid>
        </Grid >
    )
}

export default CreateElection