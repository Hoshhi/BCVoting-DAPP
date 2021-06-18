import React from 'react';
import getWeb3 from "./getWeb3";
/* global BigInt */

import {
  BrowserRouter as Router,
  Switch,
  Route,
} from 'react-router-dom';

import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';

import MainPageFrame from './components/MainPageFrame';
import SelectVotingTo from './components/SelectVotingTo';
import ManageElection from './components/ManageElection';
import SelectFactory from './components/SelectFactory';
import Factory from './components/Factory';
import Vote from './components/Vote';


const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#4B644A',
    },
    secondary: {
      main: '#89A894',
    },
  },
});

export default function App() {
  const [w3Account, setW3Account] = React.useState("");

  const getW3 = () => {
    getWeb3().then(web3 => {
      console.log(web3)
      web3.eth.getAccounts().then(accounts => {
        setW3Account(accounts[0]);
      })
    })
  }

  React.useEffect(() => {
    getW3();
  }, [])

  React.useEffect(() => {
    console.log(w3Account);
  }, [w3Account])

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <MainPageFrame metaMaskClick={getW3}>
          <Switch>
            <Route path="/create">
              <SelectFactory w3Account={w3Account} />
            </Route>
            <Route path="/factory/:id">
              <Factory w3Account={w3Account} />
            </Route>


            <Route exact path="/manage">
              <SelectVotingTo to={"manage"} w3Account={w3Account} />
            </Route>
            <Route path="/manage/:id">
              <ManageElection w3Account={w3Account} />
            </Route>

            <Route exact path="/vote">
              <SelectVotingTo to={"vote"} w3Account={w3Account} />
            </Route>
            <Route path="/vote/:id">
              <Vote w3Account={w3Account} />
            </Route>

          </Switch>
        </MainPageFrame>
      </Router>
    </ThemeProvider>
  );
}
