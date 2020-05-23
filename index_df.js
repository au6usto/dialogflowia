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

  function getMedicoInfo(medico) {
    return medico.ApellidoNombre + ' - Obras Sociales: ' + medico.ObrasSociales + ' - Precio Consulta: ' + medico.PrecioConsulta + ' - Horario: ' + medico.Atencion;
  }

  function getTurnoInfo(turno) {
    return turno.IdTurno + ' - ' + turno.Fecha + ', ' + turno.HoraInicio + ' - ' + turno.ApellidoNombre;
  }

  function getPacienteInfo(paciente) {
    return paciente.Apellido + ', ' + paciente.Nombre + ' - ' + paciente.NroAfiliado;
  }
  
  function getListadoMedicosDeEspecialidad(agent) {
    if (typeof agent.parameters.especialidad !== 'undefined' && agent.parameters.especialidad !== '') {
      agent.add('Buscando médicos con Especialidad ' + agent.parameters.especialidad);
      return getSpreadSheetData('http://ia2020.ddns.net/MedicosEspecialidad/' + agent.parameters.especialidad).then( res => {
        if (typeof res.data.data.length !== 'undefined' && res.data.data.length > 0) {
          agent.add('Los médicos disponibles para la especialidad ' + agent.parameters.especialidad + ' son:');
          res.data.data.map(medico => {
            agent.add(getMedicoInfo(medico));
          });
          agent.add('Por favor elija un Médico');
          // return getSpreadSheetData('http://ia2020.ddns.net/Medico/' + agent.parameters.profesional).then( res => {
          //     if (typeof res.data.data.MatriculaProfesional !== 'undefined' && res.data.data.MatriculaProfesional > 0) {
          //       agent.add('El médico elegido es:');
          //       agent.add(getMedicoInfo(res.data.data));
          //       agent.parameters.MatriculaProfesional = res.data.data.MatriculaProfesional;
          //     } else {
          //       agent.add('Eligió un médico incorrecto');
          //     }
          //   });
        } else {
          agent.add('No se encontró ningún médico disponible para la especialidad elegida');
        }
      });
    } else {
      agent.add('Lo siento, tiene que elegir una especialidad');
    }
  }

  function getListadoTurnosDeMedico(agent) {
    return getSpreadSheetData('http://ia2020.ddns.net/Medico/Turnos/' + agent.parameters.MatriculaProfesional).then( res => {
      if (typeof res.data.data.length !== 'undefined' && res.data.data.length > 0) {
        agent.add('Los turnos disponibles para el médico elegido son: ');
        res.data.data.map(turno => {
          agent.add(getTurnoInfo(turno));
        });
      } else {
        agent.add('No se encontró ningún turno disponible para el médico elegido.');
      }
    });
  }

  function getListadoMedicosPorApellido(agent) {
    return getSpreadSheetData('http://ia2020.ddns.net/Medicos/Apellido/' + agent.parameters.Apellido).then( res => {
      let medico = res.data.data;
      if (typeof res.data.data.ApellidoNombre !== 'undefined') {
        agent.add('Los turnos disponibles para el Apellido elegido son: ');
          agent.add(getMedicoInfo(medico));
          agent.parameters.MatriculaProfesional = medico.MatriculaProfesional;
          agent.parameters.profesional = medico.ApellidoNombre;
      } else {
        agent.add('No se encontró ningún médico disponible con el Apellido elegido.');
      }
    });
  }

  function getListadoMedicosObraSocial(agent) {
    return getSpreadSheetData('http://ia2020.ddns.net/Medicos/ObraSocial/' + agent.parameters.ObraSocial).then( res => {
      if (typeof res.data.data.ApellidoNombre !== 'undefined') {
        agent.add('Los medicos disponibles para la Obra Social elegida son: ');
        res.data.data.map(medico => {
          agent.add(getMedicoInfo(medico));
        });
      } else {
        agent.add('No se encontró ningún Médico disponible para la Obra Social elegida.');
      }
    });
  }

  function getListadoMedicosFecha(agent) {
    return getSpreadSheetData('http://ia2020.ddns.net/Medicos/Fecha/' + agent.parameters.Fecha).then( res => {
      if (typeof res.data.data.ApellidoNombre !== 'undefined') {
        agent.add('Los turnos disponibles para la Fecha elegida son: ');
        res.data.data.map(turno => {
          agent.add(getTurnoInfo(turno));
        });
      } else {
        agent.add('No se encontró ningún turno disponible para el médico elegido.');
      }
    });
  }

  function getListadoFechasMedico(agent) {
    return getSpreadSheetData('http://ia2020.ddns.net/Turnos/Fecha/' + agent.parameters.Fecha + '/Medico/' + agent.parameters.MatriculaProfesional).then( res => {
      if (typeof res.data.data.Apellido !== 'undefined') {
        agent.add('Los turnos disponibles para la Fecha y el Médico elegido son: ');
        res.data.data.map(turno => {
          agent.add(getTurnoInfo(turno));
        });
      } else {
        agent.add('No se encontró ningún turno disponible para la Fecha y Médico elegidos.');
      }
    });
  }

  function isPacienteExistente(agent) {
    return getSpreadSheetData('http://ia2020.ddns.net/Paciente/' + agent.parameters.number).then( res => {
      if (typeof res.data.data.Apellido !== 'undefined') {
        agent.add('¡Muy bien! Sus datos son: ');
        agent.add(getPacienteInfo(res.data.data));
        agent.add('Su turno fue registrado con éxito');
        //agent.setContext({ name: 'UsuarioRegistro-followup', parameters: { city: 'Rome' }});
      } else {
        agent.setContext({ name: 'UsuarioRegistro-followup', parameters: { }});
      }
    });
  }

  function savePaciente(agent) {
    let data = {
      DNI: agent.parameters.number,
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
