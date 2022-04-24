import React, { Component } from "react";
import VotingContract from "./contracts/Voting.json";
import getWeb3 from "./getWeb3";

import "./App.css";

class App extends Component {
  state = { statusMap: null, owner: null, status: 0, web3: null, accounts: null, contract: null, proposals: null, winner: null };


  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = VotingContract.networks[networkId];
      const instance = new web3.eth.Contract(
        VotingContract.abi,
        deployedNetwork && deployedNetwork.address,
      );

      // getting the events  
      let options = {
        fromBlock: 0,                  //Number || "earliest" || "pending" || "latest"
        toBlock: 'latest'
      };
      const proposalsEvt = await instance.getPastEvents('ProposalRegistered', options);

      const owner = await instance.methods.owner().call();

      const statusMap = new Map();
      statusMap.set('0', 'Enregitrement des votants');
      statusMap.set('1', 'Enregitrement des propositions');
      statusMap.set('2', "Fin de l'enregitrement des propositions");
      statusMap.set('3', 'Session de vote');
      statusMap.set('4', 'Fin de la session de vote');
      statusMap.set('5', 'Résultat de vote');

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.

      this.setState({ statusMap, owner, web3, accounts, contract: instance, proposals: proposalsEvt }, this.runExample);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  runExample = async () => {
    const { accounts, contract } = this.state;

    const status = await contract.methods.workflowStatus().call(); 
    // Update state with the result.
    this.setState({ status: status });
    if (this.state.status == 5) {
      this.updateWinner();
    }
   
    // getting the events  
    let options = {
      fromBlock: 0,                  //Number || "earliest" || "pending" || "latest"
      toBlock: 'latest'
    };
    const proposalsEvt = await contract.getPastEvents('ProposalRegistered', options);

    const p = proposalsEvt.map( (proposal, i) => {
      proposal.selected = false;
      proposal.index = i;
      return proposal;
    });
    this.setState({ proposals:p });
    
  };

  // Ajouter un Votant
  addVoter = async () => {
    const { accounts, contract} = this.state;
    let voterAdress = document.getElementById("voterAdress").value;
    await contract.methods.addVoter(voterAdress).send({ from: accounts[0] });
    document.getElementById("voterAdress").value = "";
  };

  // Ajouter une propositions
  addProposal = async () => {
    const { accounts, contract} = this.state;
    let proposalDescrition = document.getElementById("proposalDescrition").value;
    await contract.methods.addProposal(proposalDescrition).send({ from: accounts[0] });
    document.getElementById("proposalDescrition").value = "";
  };

  // Ajouter une propositions
  setVote = async () => {
      const { accounts, contract, proposals } = this.state;
      //FIXME get the proposal checkedId
      const pSelected = proposals.findIndex(item => item.selected);
      console.log('pSelected ', pSelected);
     
      await contract.methods.setVote(pSelected).send({ from: accounts[0] });
  };

  // Comptabiliser les votes
  tallyVotes = async () => {
      const { accounts, contract} = this.state;
      await contract.methods.tallyVotes().send({ from: accounts[0] });
      this.updateStatus();
      this.updateWinner();
  };

  updateStatus = async () => {
    const { contract} = this.state;
    const status = await contract.methods.workflowStatus().call();
    // Update state with the result.
    this.setState({ status: status });
  }

  updateWinner = async () => {
    const {contract} = this.state;
    
      const winnerId = await contract.methods.winningProposalID().call();
      console.log(winnerId);
      try {
        const winnerProposal = await contract.methods.getOneProposal(winnerId).call();
        console.log(winnerProposal.description);
        this.setState({ winner: '#' + winnerId + ' ' + winnerProposal.description });
      } catch (error) {
        this.setState({ winner: '' });
      }
    
  }

  // Démarrer l'enregistrement des propositions
  startProposalsRegistering = async () => {
    const { accounts, contract} = this.state;
    await contract.methods.startProposalsRegistering().send({ from: accounts[0] });
    this.updateStatus();
  };
  
  endProposalsRegistering = async () => {
    const { accounts, contract} = this.state;
    await contract.methods.endProposalsRegistering().send({ from: accounts[0] });
    this.updateStatus();
  };

  startVotingSession = async () => {
    const { accounts, contract} = this.state;
    await contract.methods.startVotingSession().send({ from: accounts[0] });
    this.updateStatus();
  };

  endVotingSession = async () => {
    const { accounts, contract} = this.state;
    await contract.methods.endVotingSession().send({ from: accounts[0] });
    this.updateStatus();
  };

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }

    const isOwner = () => {
      console.log('owner: ' + this.state.owner);
      console.log('account0: ' + this.state.accounts[0]);
      return this.state.accounts[0] == this.state.owner;
    }

    let voterRegistration;
    let endProposalsRegistering;
    let startVotingSession;
    let endVotingSession;
    let tallyVotes;
    let addProposal;
    let votingSession;
    let result;

    // Afficahge voterRegistration
    if ( this.state.status == 0 && isOwner() ) {
      voterRegistration = 
      <div id="voter-reg">
        <div>
          <h3>Ajouter un votant</h3>
          Entrer l'adresse du votant<input type="text" id="voterAdress" />
          <button onClick={this.addVoter}>Valider</button>
        </div>
        <br/>
        <div><button onClick={this.startProposalsRegistering}> Démarrer l'enregitrement des Propositions</button></div> 
      </div>;
    }

    // affichage Enregistrer une Proposition
    if (this.state.status == 1) {
      addProposal = 
      <div>
        <h3>Enregistrer une Proposition</h3>
        Entrer la Proposition<input type="text" id="proposalDescrition" />
        <button onClick={this.addProposal}>Valider</button>
      </div>
      
      if (isOwner()) {
        endProposalsRegistering = <div><button onClick={this.endProposalsRegistering}> Arrêter l'enregitrement des Propositions</button></div> ;
      }
    }

    // Afficher bouton startVotingSession
    if (this.state.status == 2 ) {
      if (isOwner()) {
        startVotingSession = 
        <div>        
        <div>Liste des propositions</div>
        {
          this.state.proposals == null ? <p>Pas de propositions</p> : 
            <div style={{display: 'flex',  justifyContent:'center', alignItems:'center'}}>
              <table style={{paddingBottom: '20px'}}>
              { this.state.proposals.map( (proposal, index) => (
                <tr key={proposal.index}>
                  <td>{'#' + proposal.index}</td>  <td style={{textAlign: 'left'}}>{proposal.returnValues.proposalDescription}</td>
                </tr>
              ) ) }
            </table></div>
        }
        <div><button onClick={this.startVotingSession}> Démarrer la session de vote</button></div> 
        </div>
      } else {
        startVotingSession =
        <div>
        <div>Liste des propositions</div>
        {
          this.state.proposals == null ? <p>Pas de propositions</p> : 
            <div style={{display: 'flex',  justifyContent:'center', alignItems:'center'}}>
              <table style={{paddingBottom: '20px'}}>
              { this.state.proposals.map( (proposal, index) => (
                <tr key={proposal.index}>
                  <td>{'#' + proposal.index}</td>  <td style={{textAlign: 'left'}}>{proposal.returnValues.proposalDescription}</td>
                </tr>
              ) ) }
            </table></div>
        }
        
        </div>
        
      }
      
    } 

    // Afficher session de vote
    if (this.state.status == 3 ) {
      votingSession = 
        <div>
        <h3>Voter une proposition</h3>
        {
          this.state.proposals == null ? <p>Pas de propositions</p> : 
            <div style={{display: 'flex',  justifyContent:'center', alignItems:'center'}}>
              <table style={{paddingBottom: '20px'}}>
              { this.state.proposals.map( (proposal, index) => (
                <tr key={proposal.index}>
                  <td>{'#' + proposal.index}</td>  <td style={{textAlign: 'left'}}>{proposal.returnValues.proposalDescription}</td>

                  <td><input checked={proposal.selected} value={index} type="checkbox" 
                    onChange={(e) => {
                      const c = e.target.checked;
                      const prop = this.state.proposals.map( (item) => {
                        
                        if (item.index === proposal.index) 
                          item.selected = c
                        else
                          item.selected = false;
                        return item;
                      });
                      console.log(c);
                      console.log(prop);
                      this.setState({ proposals:prop });
                    }
                      } /></td>
                </tr>
              ) ) }
            </table></div>
        }
        <button onClick={this.setVote}>Voter</button>
        </div>

      if ( isOwner() ) {
        endVotingSession = <div><button onClick={this.endVotingSession}> Arrêter la session de vote</button></div> ;
      } 
    } 

    if ( this.state.status == 4 ) {
      
      if (isOwner())
        tallyVotes = <div> <div>Attente de résultat</div><br /><button onClick={this.tallyVotes}> Comptabiliser les votes</button></div> ;
      else
      tallyVotes = <div>Attente de résultat</div>
    } 

    if ( this.state.status == 5 ) {
      result = <div><span>Le gagnant est: {this.state.winner}</span></div> ;
    } 

    return (
      <div className="App">
        
        <h2>Système de  Vote</h2>
        
        <p>Utilisateur: {this.state.accounts[0]}</p>
        
        <div>Etape: {this.state.statusMap.get(this.state.status)}</div>
       
       {voterRegistration}
        
       {addProposal}
        <br />
       {endProposalsRegistering}
        <br />
        {startVotingSession}

        {votingSession}
        <br />
        {endVotingSession}

        <div>

        <br />
        {tallyVotes}
        <br/>
        {result}
        </div>
  

       
        
      </div>
    );
  }
}

export default App;
