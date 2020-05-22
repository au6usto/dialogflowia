// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const axios = require('axios');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  // console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  // console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function getSpreadSheetData(url) {
    return axios.get(url);
  }

  function postSpreadSheetData(url, data) {
    return axios.post(url, data);
  }
  
  function getListadoEspecialidades(agent) {
    return getSpreadSheetData('http://ia2020.ddns.net/sheet/Especialidades').then( res => {
      	res.data.map(especialidad => {
            agent.add(especialidad.IdEspecialidad + ' - ' + especialidad.Especialidad);
        });
    });
  }

  function getListadoMedicos(agent) {
    return getSpreadSheetData('http://ia2020.ddns.net/sheet/Medicos').then( res => {
      	res.data.map(medico => {
            agent.add(medico.IdMedico + ' - ' + medico.Apellido + ', ' + medico.Nombre + ' - ' + medico.Atencion);
        });
    });
  }

  function getListadoTurnosMedicoSede(agent) {
    return getSpreadSheetData('http://ia2020.ddns.net/Turnos/Medicos/' + agent.parameters.IdMedico + '/Sede/' + agent.parameters.IdSede).then( res => {
      	res.data.map(turno => {
            agent.add(turno.IdTurno + ' - ' + turno.Fecha + ', ' + turno.HoraInicio + ' - ' + turno.HoraFin);
        });
    });
  }

  function isPacienteExistente(agent) {
    return getSpreadSheetData('http://ia2020.ddns.net/Paciente/' + agent.parameters.number).then( res => {
      	res.data.map(paciente => {
            agent.add(paciente.IdPaciente + ' - ' + paciente.Apellido + ', ' + paciente.Nombre + ' - ' + paciente.NroAfiliado);
        });
    });
  }

  function savePaciente(agent) {
    let data = {
      IdPaciente: agent.parameters.IdPaciente,
      IdMedico: agent.parameters.IdMedico,
      IdSede: agent.parameters.IdSede,
      IdTurno: agent.parameters.IdTurno,
    };
    
    return postSpreadSheetData('http://ia2020.ddns.net/Paciente/').then( res => {
      if (res.data.success) {
        agent.add(`El turno fue asignado correctamente`);    
      } else {
        agent.add(`No se pudo asignar el turno, intente nuevamente.`);
      }
      	res.data.map(paciente => {
            agent.add(paciente.IdPaciente + ' - ' + paciente.Apellido + ', ' + paciente.Nombre + ' - ' + paciente.NroAfiliado);
        });
    });
  }
 
  function fallback(agent) {
    agent.add(`No te entendí`);
    agent.add(`Disculpa, puedes intentar de nuevo?`);
  }

  // // Uncomment and edit to make your own intent handler
  // // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function yourFunctionHandler(agent) {
  //   agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor!`);
  //   agent.add(new Card({
  //       title: `Title: this is a card title`,
  //       imageUrl: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
  //       text: `This is the body text of a card.  You can even use line\n  breaks and emoji! 💁`,
  //       buttonText: 'This is a button',
  //       buttonUrl: 'https://assistant.google.com/'
  //     })
  //   );
  //   agent.add(new Suggestion(`Quick Reply`));
  //   agent.add(new Suggestion(`Suggestion`));
  //   agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
  // }

  // // Uncomment and edit to make your own Google Assistant intent handler
  // // uncomment `intentMap.set('your intent name here', googleAssistantHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function googleAssistantHandler(agent) {
  //   let conv = agent.conv(); // Get Actions on Google library conv instance
  //   conv.ask('Hello from the Actions on Google client library!') // Use Actions on Google library
  //   agent.add(conv); // Add Actions on Google library responses to your agent's response
  // }
  // // See https://github.com/dialogflow/fulfillment-actions-library-nodejs
  // // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('UsuarioEsPaciente - Si/No se - EspecificaDNI', isPacienteExistente);
  intentMap.set('UsuarioIngresaEspecialidad - ListadoCompleto', getListadoEspecialidades);
  intentMap.set('UsuarioIngresaEspecialidad - FiltraProfesional', getListadoMedicos);
  intentMap.set('UsuarioIngresaEspecialidad - FiltraFecha', getListadoTurnosMedicoSede);
  intentMap.set('UsuarioPideTurno', savePaciente);
  intentMap.set('Default Fallback Intent', fallback);
  // intentMap.set('your intent name here', yourFunctionHandler);
  // intentMap.set('your intent name here', googleAssistantHandler);
  agent.handleRequest(intentMap);
});
