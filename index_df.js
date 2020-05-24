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
        return paciente.ApellidoNombre;
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
                } else {
                    agent.add('No se encontró ningún médico disponible para la especialidad elegida');
                }
            });
        } else {
            agent.add('Lo siento, tiene que elegir una especialidad');
        }
    }

    function listadoCompletoIndicaProfesional(agent) {
        //Si tiene fecha y profesional
        if (typeof agent.parameters.profesional !== 'undefined' && agent.parameters.profesional !== '') {
           return getSpreadSheetData('Medicos/Apellido/' + agent.parameters.profesional).then( res => {
                if (typeof res.data.data.MatriculaProfesional !== 'undefined' && res.data.data.MatriculaProfesional > 0) {
                  agent.add('El médico elegido es:');
                  agent.add(getMedicoInfo(res.data.data));
                  agent.setContext({ 
                      'name': 'UsuarioEligioProfesional', 
                      'lifespan': 1,
                      'parameters': { 
                          'MatriculaProfesional' : res.data.data.MatriculaProfesional 
                        } 
                    });
                  agent.add('Ok. A continuación, indique el día a consultar que le resultara más conveniente.');
                } else {
                  agent.add('Eligió un médico incorrecto');
                }
              });
        } else {
            agent.add('Lo siento, tiene que elegir un profesional');
        }
    }

    function filtraFechaIndicaProfesional(agent) {
        //Si tiene fecha y profesional
        if (typeof agent.parameters.date !== 'undefined' && agent.parameters.date !== '' && 
        typeof agent.parameters.profesional !== 'undefined' && agent.parameters.profesional !== '') {
            return getSpreadSheetData('Turnos/Apellido/' + agent.parameters.profesional + '/Fecha/' + agent.parameters.date).then( res => {
                 if (typeof res.data.data.length !== 'undefined' && res.data.data.length > 0) {
                   agent.add('Los turnos disponibles son:');
                   res.data.data.map(turno => {
                        agent.add(getTurnoInfo(turno));
                    });
                   agent.add('Indique el número de turno que desea elegir');
                 } else {
                   agent.add('Eligió un médico incorrecto');
                 }
               });
         } else {
            agent.add('Lo siento, tiene que elegir un profesional');
        }
    }

    function usuarioEligeFecha(agent) {
        return filtraFechaIndicaProfesional(agent);
    }

    function filtraObraSocialIndicaProfesional(agent) {
        //Si tiene Obra Social y Especialidad
        if (typeof agent.parameters.ObraSocial !== 'undefined' && agent.parameters.ObraSocial !== '' && 
        typeof agent.parameters.especialidad !== 'undefined' && agent.parameters.especialidad !== '') {
            return getSpreadSheetData('Medicos/ObraSocial/' + agent.parameters.ObraSocial + '/Especialidad/' + agent.parameters.especialidad).then( res => {
                 if (typeof res.data.data.length !== 'undefined' && res.data.data.length > 0) {
                   agent.add('Los médicos disponibles son:');
                   res.data.data.map(medico => {
                        agent.add(getMedicoInfo(medico));
                    });
                   agent.add('Por favor elija un médico');
                 } else {
                   agent.add('Eligió un médico incorrecto');
                 }
               });
         } else {
            agent.add('Lo siento, tiene que elegir un profesional');
        }
    }

    // function getListadoTurnosDeMedico(agent) {
    //     return getSpreadSheetData('Medicos/Turnos/' + agent.parameters.MatriculaProfesional).then(res => {
    //         if (typeof res.data.data.length !== 'undefined' && res.data.data.length > 0) {
    //             agent.add('Los turnos disponibles para el médico elegido son: ');
    //             res.data.data.map(turno => {
    //                 agent.add(getTurnoInfo(turno));
    //             });
    //         } else {
    //             agent.add('No se encontró ningún turno disponible para el médico elegido.');
    //         }
    //     });
    // }

    function getListadoMedicosPorApellido(agent) {
        if (typeof agent.parameters.profesional !== 'undefined' && agent.parameters.profesional !== '') {
            return getSpreadSheetData('Medicos/Apellido/' + agent.parameters.profesional).then(res => {
                if (typeof res.data.success !== 'undefined' && res.data.success) {
                    let medico = res.data.data;
                    agent.add('Los datos del médico son los siguientes: ');
                    agent.add(getMedicoInfo(medico));
                    agent.add('Ok. A continuación, indique el día a consultar que le resultara más conveniente.');
                    agent.setContext({ 'name': 'UsuarioEligioProfesional', 'parameters': { 'MatriculaProfesional' : medico.MatriculaProfesional } });
                } else {
                    agent.add('No se encontró ningún médico disponible con el Apellido elegido.');
                }
            });
        }
    }

    function getListadoMedicosObraSocial(agent) {
        if (typeof agent.parameters.ObraSocial !== 'undefined' && agent.parameters.ObraSocial !== '' &&
        typeof agent.parameters.especialidad !== 'undefined' && agent.parameters.especialidad !== '') {
            agent.add('Buscando médicos con Obra Social ' + agent.parameters.ObraSocial);
            return getSpreadSheetData('Medicos/ObraSocial/' + agent.parameters.ObraSocial + '/Especialidad/' + agent.parameters.especialidad).then(res => {
                if (typeof res.data.data.length !== 'undefined' && res.data.data.length > 0) {
                    agent.add('Los médicos disponibles para la Obra Social ' + agent.parameters.ObraSocial + ' con Especialidad ' + agent.parameters.especialidad + ' son:');
                    res.data.data.map(medico => {
                        agent.add(getMedicoInfo(medico));
                    });
                    agent.add('Por favor elija un Médico');
                } else {
                    agent.add('No se encontró ningún médico disponible para la Obra Social elegida');
                }
            });
        } else {
            agent.add('Lo siento, tiene que elegir una Obra Social');
        }
    }

    function usuarioEligeTurno(agent) {
        if (typeof agent.parameters.turno !== 'undefined' && agent.parameters.turno !== '') {
            return getSpreadSheetData('Turno/' + agent.parameters.turno).then(res => {
                if (res.data.success) {
                    agent.add('¡Muy bien! ¿Posee Obra Social? En Caso de Tenerla, por favor indique a continuación cuál de ellas es.');
                } else {
                    agent.add('No se encontró ningún Turno con el número ingresado');
                }
            });
        } else {
            agent.add('Lo siento, tiene que elegir un número de Turno');
        }
    }

    function usuarioEligeTurnoPoseeOS(agent) {
        if (typeof agent.parameters.ObraSocial !== 'undefined' && agent.parameters.ObraSocial !== '' && 
        typeof agent.parameters.profesional !== 'undefined' && agent.parameters.profesional !== '') {
            return getSpreadSheetData('Medico/' + agent.parameters.profesional + '/ObraSocial/' + agent.parameters.ObraSocial).then(res => {
                if (res.data.success) {
                    agent.add('Por favor ingrese su DNI');
                } else {
                    agent.add('Lo siento, ' + agent.parameters.profesional + ', no trabaja con dicha Obra Social. ¿Desea proseguir con el registro del turno como particular?');
                }
            });
        } else {
            agent.add('Lo siento, tiene que elegir una Obra Social');
        }
    }

    // function getListadoMedicosFecha(agent) {
    //     return getSpreadSheetData('Medicos/Fecha/' + agent.parameters.Fecha).then(res => {
    //         if (typeof res.data.data.ApellidoNombre !== 'undefined') {
    //             agent.add('Los turnos disponibles para la Fecha elegida son: ');
    //             res.data.data.map(turno => {
    //                 agent.add(getTurnoInfo(turno));
    //             });
    //         } else {
    //             agent.add('No se encontró ningún turno disponible para el médico elegido.');
    //         }
    //     });
    // }

    // function getTurnosFechasMedico(agent) {
    //     let url = '';
    //     if (typeof agent.parameters.MatriculaProfesional !== 'undefined' && agent.parameters.MatriculaProfesional !== '' && agent.parameters.MatriculaProfesional !== 'MatriculaProfesional') {
    //         url = 'Turnos/Fecha/' + agent.parameters.Fecha + '/Medico/' + agent.parameters.MatriculaProfesional;
    //     } else {
    //         url = 'Turnos/Fecha/' + agent.parameters.Fecha;
    //     }

    //     agent.add(url);
    //     return getSpreadSheetData(url).then(res => {
    //         if (typeof res.data.data.length !== 'undefined' && res.data.data.length > 0) {
    //             agent.add('Los turnos disponibles para la Fecha y el Médico elegido son: ');
    //             res.data.data.map(turno => {
    //                 agent.add(getTurnoInfo(turno));
    //             });
    //         } else {
    //             agent.add('No se encontró ningún turno disponible para la Fecha y Médico elegidos.');
    //         }
    //     });
    // }
  
  function getListadoFechasMedico(agent) {
        let url = '';
        if (typeof agent.parameters.especialidad !== 'undefined' && agent.parameters.especialidad !== '' &&
           typeof agent.parameters.date !== 'undefined' && agent.parameters.date !== '') {
            url = 'Medicos/Fecha/' + agent.parameters.date + '/Especialidad/' + agent.parameters.especialidad;
        return getSpreadSheetData(url).then(res => {
            if (typeof res.data.data.length !== 'undefined' && res.data.data.length > 0) {
                agent.add('Los médicos disponibles para la Fecha ' + agent.parameters.date + ' y la Especialidad  ' + agent.parameters.especialidad + ' son: ');
                res.data.data.map(medico => {
                    agent.add(getMedicoInfo(medico));
                });
                agent.add('Por favor elija un profesional');
            } else {
                agent.add('No se encontró ningún médico disponible para la Fecha y Especialidad elegidas.');
            }
        });
        } else {
            agent.add('Ingrese nuevamente una Fecha.');
        }
    }

    function isPacienteExistente(agent) {
        console.log(JSON.stringify(agent.parameters));
        return getSpreadSheetData('Paciente/' + agent.parameters.dni).then(res => {
            console.log(JSON.stringify(res.data));
            if (res.data.success) {
                let data = {
                    DNI: agent.parameters.dni,
                    IdTurno: agent.paramenters.turno
                };
                return postSpreadSheetData('Turno', data).then(res => {
                     if (res.data.success) {
                        agent.add('¡Perfecto ' + getPacienteInfo(res.data.data) + '!');
                        agent.add('Su turno ha sido registrado con éxito. Recomiendo anotar la siguiente información para recordarlo el día de la consulta.');
                        agent.add('Fecha: ' + res.data.Fecha);
                        agent.add('Hora: ' + res.data.HoraInicio);
                        agent.add('Dr/a ' + res.data.ApellidoNombre);
                        agent.add('Lugar: ' + res.data.Direccion);
                        agent.add('Piso: ' + res.data.Piso);
                        agent.add('Consultorio: ' + res.data.Consultorio);
                        agent.add('Turno: ' + res.data.IdTurno);
                    } else {
                        agent.add('No se pudo asignar el Turno en este momento. Intente nuevamente');
                    }
                });
            } else {
                agent.add('He detectado que es su primera vez en la institució. Para poder completar el registro será necesario registrarlo como paciente. Para ello, ingrese los siguietenes datos: Nombre y Apellido completo, teléfono, correo electrónico(opcional)');
            }
        });
    }

    function savePaciente(agent) {
        let data = {
            DNI: agent.parameters.dni,
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
    intentMap.set('UsuarioIngresaEspecialidad-ListadoCompleto', getListadoMedicosDeEspecialidad);
    intentMap.set('UsuarioIngresaEspecialidad-ListadoCompleto-IndicaProfesional', listadoCompletoIndicaProfesional);
    intentMap.set('UsuarioIngresaEspecialidad-FiltraFecha-IndicaProfesional', filtraFechaIndicaProfesional);
    intentMap.set('UsuarioIngresaEspecialidad-FiltraProfesional', getListadoMedicosPorApellido);
    intentMap.set('UsuarioIngresaEspecialidad-FiltraFecha', getListadoFechasMedico);
    intentMap.set('UsuarioIngresaEspecialidad-FiltraObraSocial', getListadoMedicosObraSocial);
    intentMap.set('UsuarioIngresaEspecialidad-FiltraObraSocial-IndicaProfesional', filtraObraSocialIndicaProfesional);
    intentMap.set('UsuarioEligeFecha', usuarioEligeFecha);
    intentMap.set('UsuarioIndicaDNI', isPacienteExistente);
    intentMap.set('UsuarioEligeTurno', usuarioEligeTurno);
    intentMap.set('UsuarioEligeTurno-PoseeObraSocial', usuarioEligeTurnoPoseeOS);
    intentMap.set('UsuarioRegistro', savePaciente);
    intentMap.set('Default Fallback Intent', fallback);
    agent.handleRequest(intentMap);
});
