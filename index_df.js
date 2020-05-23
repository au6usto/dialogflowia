// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';

const functions = require('firebase-functions');
const { WebhookClient } = require('dialogflow-fulfillment');
const { Card, Suggestion } = require('dialogflow-fulfillment');
const axios = require('axios');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({ request, response });

    const urlService = 'http://ia2020.ddns.net/';

    //axios GET
    function getSpreadSheetData(url) {
        return axios.get(urlService + url);
    }
    //axios POST
    function postSpreadSheetData(url, data) {
        return axios.post(urlService + url, data);
    }
    //Format Data
    function getMedicoInfo(medico) {
        return medico.ApellidoNombre + ' - Obras Sociales: ' + medico.ObrasSociales + ' - Precio Consulta: ' + medico.PrecioConsulta + ' - Horario: ' + medico.Atencion;
    }

    function getTurnoInfo(turno) {
        return turno.IdTurno + ' - ' + turno.Fecha + ', ' + turno.HoraInicio + ' - ' + turno.ApellidoNombre;
    }

    function getPacienteInfo(paciente) {
        return paciente.Apellido + ', ' + paciente.Nombre + ' - ' + paciente.NroAfiliado;
    }
    //Intents
    function getListadoMedicosDeEspecialidad(agent) {
        if (typeof agent.parameters.especialidad !== 'undefined' && agent.parameters.especialidad !== '') {
            agent.add('Buscando médicos con Especialidad ' + agent.parameters.especialidad);
            return getSpreadSheetData('MedicosEspecialidad/' + agent.parameters.especialidad).then(res => {
                if (typeof res.data.data.length !== 'undefined' && res.data.data.length > 0) {
                    agent.add('Los médicos disponibles para la especialidad ' + agent.parameters.especialidad + ' son:');
                    res.data.data.map(medico => {
                        agent.add(getMedicoInfo(medico));
                    });
                    agent.add('Por favor elija un Médico');
                    // return getSpreadSheetData('Medico/' + agent.parameters.profesional).then( res => {
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

    function indicaProfesional(agent) {
        if (typeof agent.parameters.profesional !== 'undefined' && agent.parameters.profesional !== '') {
           return getSpreadSheetData('Medico/' + agent.parameters.profesional).then( res => {
                if (typeof res.data.data.MatriculaProfesional !== 'undefined' && res.data.data.MatriculaProfesional > 0) {
                  agent.add('El médico elegido es:');
                  agent.add(getMedicoInfo(res.data.data));
                  agent.parameters.MatriculaProfesional = res.data.data.MatriculaProfesional;
                } else {
                  agent.add('Eligió un médico incorrecto');
                }
              });
        } else {
            agent.add('Lo siento, tiene que elegir un profesional');
        }
    }

    function getListadoTurnosDeMedico(agent) {
        return getSpreadSheetData('Medicos/Turnos/' + agent.parameters.MatriculaProfesional).then(res => {
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
        if (typeof agent.parameters.profesional !== 'undefined' && agent.parameters.profesional !== '') {
            return getSpreadSheetData('Medicos/Apellido/' + agent.parameters.profesional).then(res => {
                if (typeof res.data.success !== 'undefined' && res.data.success) {
                    let medico = res.data.data;
                    agent.add('Los datos del médico son los siguientes: ');
                    agent.add(getMedicoInfo(medico));
                    agent.parameters.MatriculaProfesional = medico.MatriculaProfesional;
                    agent.parameters.profesional = medico.ApellidoNombre;
                } else {
                    agent.add('No se encontró ningún médico disponible con el Apellido elegido.');
                }
            });
        }
    }

    function getListadoMedicosObraSocial(agent) {
        return getSpreadSheetData('Medicos/ObraSocial/' + agent.parameters.ObraSocial).then(res => {
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
        return getSpreadSheetData('Medicos/Fecha/' + agent.parameters.Fecha).then(res => {
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
        agent.add('asdaasd');
        let url = urlService;
        if (typeof agent.parameters.MatriculaProfesional !== 'undefined' && agent.parameters.MatriculaProfesional !== '') {
            url = url + 'Turnos/Fecha/' + agent.parameters.Fecha + '/Medico/' + agent.parameters.MatriculaProfesional;
        } else {
            url = url + 'Turnos/Fecha/' + agent.parameters.Fecha;
        }

        agent.add(url);
        return getSpreadSheetData(url).then(res => {
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
        return getSpreadSheetData('Paciente/' + agent.parameters.number).then(res => {
            if (typeof res.data.data.Apellido !== 'undefined') {
                agent.add('¡Muy bien! Sus datos son: ');
                agent.add(getPacienteInfo(res.data.data));
                agent.add('Su turno fue registrado con éxito');
                //agent.setContext({ name: 'UsuarioRegistro-followup', parameters: { city: 'Rome' }});
            } else {
                agent.setContext({ name: 'UsuarioRegistro-followup', parameters: {} });
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

        return postSpreadSheetData('Paciente/', data).then(res => {
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

    // Run the proper function handler based on the matched Dialogflow intent name
    let intentMap = new Map();
    intentMap.set('UsuarioIngresaEspecialidad - ListadoCompleto', getListadoMedicosDeEspecialidad);
    intentMap.set('UsuarioIngresaEspecialidad - ListadoCompleto - IndicaProfesional', indicaProfesional);
    intentMap.set('UsuarioIngresaEspecialidad - FiltraProfesional', getListadoMedicosPorApellido);
    intentMap.set('UsuarioIngresaEspecialidad - FiltraFecha', getListadoFechasMedico);
    intentMap.set('UsuarioIngresaEspecialidad - FiltraObraSocial', getListadoMedicosObraSocial);
    intentMap.set('UsuarioEligeFecha', getListadoTurnosDeMedico);
    intentMap.set('UsuarioEsPaciente - Si/No se - EspecificaDNI', isPacienteExistente);
    intentMap.set('UsuarioPideTurno', savePaciente);
    intentMap.set('Default Fallback Intent', fallback);
    agent.handleRequest(intentMap);
});
