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
  
  function getListadoMedicosDeEspecialidad(agent) {
    return getSpreadSheetData('http://ia2020.ddns.net/MedicosEspecialidad/' + agent.parameters.especialidad).then( res => {
      console.log(res.data.data);
      // if (typeof res.data.data.Apellido !== 'undefined') {
        agent.add('Los médicos disponibles para la especialidad ' + agent.parameters.especialidad + ' son:');
        res.data.data.map(medico => {
          agent.add(medico.IdMedico + ' - ' + medico.Apellido + ', ' + medico.Nombre + ' - Obras Sociales: ' + medico.ObrasSociales + ' - Precio Consulta: ' + medico.PrecioConsulta + ' - Horario: ' + medico.Atencion);
        });
        agent.setContext({ name: 'UsuarioIngresaEspecialidad-FiltraProfesional-followup', parameters: {}});
      // } else {
      //   agent.add('No se encontró ningún médico disponible para la especialidad elegida.');
      // }
    });
  }

  function getListadoMedicos(agent) {
    return getSpreadSheetData('http://ia2020.ddns.net/sheet/Medicos').then( res => {
      	res.data.map(medico => {
            agent.add(medico.IdMedico + ' - ' + medico.Apellido + ', ' + medico.Nombre + ' - ' + medico.Atencion);
        });
    });
  }

  function getListadoTurnosDeMedico(agent) {
    return getSpreadSheetData('http://ia2020.ddns.net/Medico/Turnos/' + agent.parameters.IdMedico).then( res => {
      if (typeof res.data.Apellido !== 'undefined') {
        agent.add('Los turnos disponibles para el médico elegido son: ');
        res.data.map(turno => {
          agent.add(turno.IdTurno + ' - ' + turno.Fecha + ', ' + turno.HoraInicio + ' - ' + turno.Apellido + ', ' + turno.Nombre);
        });
        agent.setContext({ name: 'UsuarioEligeFecha-followup', parameters: {}});
      } else {
        agent.add('No se encontró ningún turno disponible para el médico elegido.');
      }
    });
  }

  function getListadoMedicosPorApellido(agent) {
    return getSpreadSheetData('http://ia2020.ddns.net/Medicos/Apellido/' + agent.parameters.Apellido).then( res => {
      if (typeof res.data.Apellido !== 'undefined') {
        agent.add('Los turnos disponibles para el Apellido elegido son: ');
        res.data.map(turno => {
          agent.add(turno.IdTurno + ' - ' + turno.Fecha + ', ' + turno.HoraInicio + ' - ' + turno.Apellido + ', ' + turno.Nombre  + ', ' + turno.Especialidad);
        });
        agent.setContext({ name: 'IndicaProfesional-followup', parameters: {}});
      } else {
        agent.add('No se encontró ningún turno disponible para el médico elegido.');
      }
    });
  }

  function getListadoMedicosObraSocial(agent) {
    return getSpreadSheetData('http://ia2020.ddns.net/Medicos/ObraSocial/' + agent.parameters.ObraSocial).then( res => {
      if (typeof res.data.Apellido !== 'undefined') {
        agent.add('Los medicos disponibles para la Obra Social elegida son: ');
        res.data.map(medico => {
          agent.add(medico.IdMedico + ' - ' + medico.Apellido + ', ' + medico.Nombre  + ' - ' + medico.Especialidad);
        });
        agent.setContext({ name: 'IndicaProfesional-followup', parameters: {}});
      } else {
        agent.add('No se encontró ningún Médico disponible para la Obra Social elegida.');
      }
    });
  }

  function getListadoMedicosFecha(agent) {
    return getSpreadSheetData('http://ia2020.ddns.net/Medicos/Fecha/' + agent.parameters.Fecha).then( res => {
      if (typeof res.data.Apellido !== 'undefined') {
        agent.add('Los turnos disponibles para la Fecha elegida son: ');
        res.data.map(turno => {
          agent.add(turno.IdTurno + ' - ' + turno.Fecha + ', ' + turno.HoraInicio + ' - ' + turno.Apellido + ', ' + turno.Nombre  + ', ' + turno.Especialidad);
        });
        agent.setContext({ name: 'IndicaProfesional-followup', parameters: {}});
      } else {
        agent.add('No se encontró ningún turno disponible para el médico elegido.');
      }
    });
  }

  function getListadoFechasMedico(agent) {
    return getSpreadSheetData('http://ia2020.ddns.net/Turnos/Fecha/' + agent.parameters.Fecha + '/Medico/' + agent.parameters.IdMedico).then( res => {
      if (typeof res.data.Apellido !== 'undefined') {
        agent.add('Los turnos disponibles para la Fecha y el Médico elegido son: ');
        res.data.map(turno => {
          agent.add(turno.IdTurno + ' - ' + turno.Fecha + ', ' + turno.HoraInicio + ' - ' + turno.Apellido + ', ' + turno.Nombre  + ', ' + turno.Especialidad  + ', ' + turno.PrecioConsulta);
        });
        agent.setContext({ name: 'IndicaProfesional-followup', parameters: {}});
      } else {
        agent.add('No se encontró ningún turno disponible para la Fecha y Médico elegidos.');
      }
    });
  }

  function isPacienteExistente(agent) {
    return getSpreadSheetData('http://ia2020.ddns.net/Paciente/' + agent.parameters.number).then( res => {
      if (typeof res.data.Apellido !== 'undefined') {
        agent.add('¡Muy bien! Sus datos son: ');
        agent.add(res.data.Apellido + ', ' + res.data.Nombre + ' - ' + res.data.NroAfiliado);
        agent.add('Su turno fue registrado con éxito');
        //agent.setContext({ name: 'UsuarioRegistro-followup', parameters: { city: 'Rome' }});
      } else {
        agent.setContext({ name: 'UsuarioRegistro-followup', parameters: { }});
      }
    });
  }

  function savePaciente(agent) {
    let data = {
      Dni: agent.parameters.Dni,
      Apellido: agent.parameters.Apellido,
      Nombre: agent.parameters.Nombre,
      Telefono: agent.parameters.Telefono,
      Correo: agent.parameters.Correo,
      ObraSocial: agent.parameters.ObraSocial,
      NroAfiliado: agent.parameters.NroAfiliado,
      IdTurno: agent.parameters.IdTurno
    };
    
    return postSpreadSheetData('http://ia2020.ddns.net/Paciente/', data).then( res => {
      if (res.data.success) {
        agent.add(`El paciente fue creado y su turno fue asignado correctamente`);    
      } else {
        agent.add(`No se pudo asignar el turno, intente nuevamente.`);
      }
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
  intentMap.set('UsuarioIngresaEspecialidad - ListadoCompleto', getListadoMedicosDeEspecialidad);
  intentMap.set('UsuarioIngresaEspecialidad - FiltraProfesional', getListadoMedicosPorApellido);
  intentMap.set('UsuarioIngresaEspecialidad - FiltraFecha', getListadoFechasMedico);
  intentMap.set('UsuarioIngresaEspecialidad - FiltraObraSocial', getListadoMedicosObraSocial);
  intentMap.set('UsuarioEligeFecha', getListadoTurnosDeMedico);
  intentMap.set('UsuarioEsPaciente - Si/No se - EspecificaDNI', isPacienteExistente);
  intentMap.set('UsuarioPideTurno', savePaciente);
  intentMap.set('Default Fallback Intent', fallback);
  // intentMap.set('your intent name here', yourFunctionHandler);
  // intentMap.set('your intent name here', googleAssistantHandler);
  agent.handleRequest(intentMap);
});
