import React from 'react';

import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import HomeIcon from '@material-ui/icons/Home';
import AddCircleIcon from '@material-ui/icons/AddCircle';
import HowToVoteIcon from '@material-ui/icons/HowToVote';
import EditIcon from '@material-ui/icons/Edit';

import { Link } from "react-router-dom";
import { Typography } from '@material-ui/core';

export const mainListItems = (
    <div>
        {/* <Link to="/">
            <ListItem button >
                <ListItemIcon>
                    <HomeIcon />
                </ListItemIcon>
                <Typography color="secondary">Home</Typography>
            </ListItem>
        </Link> */}
        <Link to="/vote">
            <ListItem button >
                <ListItemIcon>
                    <HowToVoteIcon />
                </ListItemIcon>
                <Typography color="secondary">Participate</Typography>
            </ListItem>
        </Link>
        <Link to="/manage">
            <ListItem button >
                <ListItemIcon>
                    <EditIcon />
                </ListItemIcon>
                <Typography color="secondary">Manage election</Typography>
            </ListItem>
        </Link>
        <Link to="/create">
            <ListItem button >
                <ListItemIcon>
                    <AddCircleIcon />
                </ListItemIcon>
                <Typography color="secondary">New election</Typography>
            </ListItem>
        </Link>
    </div>
);

export const secondaryListItems = (
    <>
    </>
);
