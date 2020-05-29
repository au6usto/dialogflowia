// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';

const functions = require('firebase-functions');
const { WebhookClient } = require('dialogflow-fulfillment');
const { Card, Suggestion } = require('dialogflow-fulfillment');
const axios = require('axios');
const { google } = require('googleapis');


process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
process.env.DEBUG = 'dialogflow:*'; // It enables lib debugging statements

// JSON otorgado cuando se crea la credencial
// en google platform al configurar la API de
// google calendar
const serviceAccount = {};

const spreadsheetId = "1xaORRQBAxi4Mly_9yccQvgc2KBVpdMWAJTRBkcXRrMI";


// Set up Google Calendar service account credentials
const serviceAccountAuth = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: 'https://www.googleapis.com/auth/spreadsheets'
});

const sheets = google.sheets('v4');

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({ request, response });



    const urlService = "http://ia2020.ddns.net/";

    //axios GET
    function getSpreadSheetData(url) {
        return axios.get(urlService + url);
    }

    function updateValues(range, values, update = true) {
        let sendObject = {
            spreadsheetId: spreadsheetId,
            auth: serviceAccountAuth,
            range: range,
            includeValuesInResponse: true,
            responseDateTimeRenderOption: "FORMATTED_STRING",
            responseValueRenderOption: "UNFORMATTED_VALUE",
            valueInputOption: "RAW",
            resource: {
                values: values
            }
        };
        if (update) {
            sheets.spreadsheets.values.update(sendObject, function (err, res) {
                if (err) {
                    console.log(err);
                    return res.status(400).send({
                        message: errorHandler.getErrorMessage(err)
                    });
                }
                console.log(res);
            });
        } else {
            sendObject.insertDataOption = "INSERT_ROWS";
            sheets.spreadsheets.values.append(sendObject, function (err, res) {
                if (err) {
                    console.log(err);
                    return res.status(400).send({
                        message: errorHandler.getErrorMessage(err)
                    });
                }
                console.log(res);
            });
        }
    }

    function isSet(property) {
        return typeof property !== "undefined" && property !== '';
    }

    function lengthOverZero(res) {
        return typeof res.length !== "undefined" && res.length > 0;
    }

    //Format Data
    function getMedicoInfo(medico) {
        return `${medico.ApellidoNombre} - Obras Sociales: ${medico.ObrasSociales} - Precio Consulta: ${medico.PrecioConsulta} - Horario: ${medico.Atencion}`;
    }

    //Intents
    function usuarioPideTurno(agent) {
        agent.add(`Muy bien. Las especialidades que brindamos en nuestro centro médico son:`);
        agent.add(new Suggestion(`Clínico`));
        agent.add(new Suggestion(`Nutrición`));
        agent.add(new Suggestion(`Psicología`));
        agent.add(new Suggestion(`Urología`));
        agent.add(`¿Cuál de ellas desea consultar?`);
    }

    function usuarioIngresaEspecialidad(agent) {
        if (isSet(agent.parameters.especialidad)) {
            return getSpreadSheetData(`sheet/Especialidades`).then(res => {
                if (lengthOverZero(res.data.data)) {
                    if (res.data.data.includes(agent.parameters.esecialidad)) {
                        agent.add(`Muy bien. Por favor, indique a continuación uno de los siguientes parámetros de búsqueda:`);
                        agent.add(`- nombre y/o apellido del especialista al que desea consultar`);
                        agent.add(`- fecha especifica para visualizar los especialistas que poseen turnos disponibles en la misma`);
                        agent.add(`- obra social que posee para visualizar los especialistas que trabajan con ella`);
                        agent.add(`- solicitar consultar el listado completo de especialistas que trabajan en la misma.`);
                    } else {
                        agent.add(`Lo siento. Recuerde que las especialidades que brindamos en esta institución son:`);
                        res.data.data.map(especialidad => {
                            agent.add(new Suggestion(especialidad.Especialidad));
                        });
                        agent.add(`¿Desea consultar algunas de ellas? De ser así, por favor especifique cuál de ellas`);
                        agent.setContext({ 'name': 'UsuarioSolicitaTurno', 'lifespan': 1, 'parameters': { 'especialidad': agent.parameters.especialidad } })
                    }
                } else {
                    agent.add(`No se encontró ningún médico disponible para la especialidad elegida`);
                }
            });
        } else {
            agent.add(`Lo siento, tiene que elegir una especialidad`);
        }
    }

    function getListadoMedicosDeEspecialidad(agent) {
        if (isSet(agent.parameters.especialidad)) {
            agent.add(`Buscando médicos con Especialidad ${agent.parameters.especialidad}`);
            return getSpreadSheetData(`MedicosEspecialidad/${agent.parameters.especialidad}`).then(res => {
                if (lengthOverZero(res.data.data)) {
                    agent.add(`Los médicos disponibles para la especialidad ${agent.parameters.especialidad} son:`);
                    res.data.data.map(medico => {
                        agent.add(getMedicoInfo(medico));
                    });
                    agent.add(`A continuación, indique el nombre y/o apellido del profesional al que desea consultar`);
                } else {
                    agent.add(`No se encontró ningún médico disponible para la especialidad elegida`);
                }
            });
        } else {
            agent.add(`Lo siento, tiene que elegir una especialidad`);
        }
    }

    function listadoCompletoIndicaProfesional(agent) {
        //Si tiene fecha y profesional
        if (isSet(agent.parameters.profesional)) {
            return getSpreadSheetData(`Medicos/Apellido/${agent.parameters.profesional}`).then(res => {
                if (isSet(res.data.data.MatriculaProfesional)) {
                    agent.add(`Los datos del profesional son los siguientes:`);
                    agent.add(getMedicoInfo(res.data.data));
                    agent.add(`A continuación, por favor indíqueme el día a consultar que le resultará más conveniente`);
                    agent.setContext({
                        'name': 'UsuarioEligioProfesional',
                        'lifespan': 1,
                        'parameters': {
                            'MatriculaProfesional': res.data.data.MatriculaProfesional
                        }
                    });
                } else {
                    agent.add(`Disculpe, no he comprendido a qué profesional se refiere. Asegúrese de indicar correctamente el nombre y/o apellido del profesional al que desea consultar`);
                    agent.setContext({
                        'name': 'UsuarioIngresaEspecialidad-ListadoCompleto-followup',
                        'lifespan': 1,
                        'parameters': {
                            'profesional': agent.parameters.profesional
                        }
                    });
                }
            });
        } else {
            agent.add(`Disculpe, no he comprendido a qué profesional se refiere. Asegúrese de indicar correctamente el nombre y/o apellido del profesional al que desea consultar`);
            agent.setContext({
                'name': 'UsuarioIngresaEspecialidad-ListadoCompleto-followup',
                'lifespan': 1,
                'parameters': {
                    'profesional': agent.parameters.profesional
                }
            });
        }
    }

    function filtraFechaIndicaProfesional(agent) {
        //Si tiene fecha y profesional
        if (isSet(agent.parameters.date) && isSet(agent.parameters.profesional)) {
            return getSpreadSheetData(`Turnos/Apellido/${agent.parameters.profesional}/Fecha/${agent.parameters.date}`).then(res => {
                if (lengthOverZero(res.data.data)) {
                    agent.add(`Los turnos disponibles son:`);
                    res.data.data.map(turno => {
                        agent.add(`${turno.IdTurno} - ${turno.Fecha} | ${turno.HoraInicio}`);
                    });
                    agent.add(`Indique el número del turno que desea solicitar`);
                } else {
                    agent.add(`Disculpe, no he comprendido a qué profesional se refiere. Asegúrese de indicar correctamente el nombre y/o apellido del profesional al que desea consultar`);
                    agent.setContext({
                        'name': 'UsuarioIngresaEspecialidad-FiltraFecha-followup',
                        'lifespan': 1,
                        'parameters': {
                            'profesional': agent.parameters.profesional,
                            'date': agent.parameters.date,
                        }
                    });
                }
            });
        } else {
            agent.add(`Lo siento, tiene que elegir un profesional`);
        }
    }

    function usuarioEligeFecha(agent) {
        //Si tiene fecha y profesional
        if (isSet(agent.parameters.date) && isSet(agent.parameters.profesional)) {
            return getSpreadSheetData(`Turnos/Apellido/${agent.parameters.profesional}/Fecha/${agent.parameters.date}`).then(res => {
                if (lengthOverZero(res.data.data)) {
                    agent.add(`Los turnos disponibles son:`);
                    res.data.data.map(turno => {
                        agent.add(`${turno.IdTurno} | ${turno.Fecha} | ${turno.HoraInicio}`);
                    });
                    agent.add(`¿Desea solicitar alguno de los turnos previamente mencionados?`);
                } else {
                    if (isSet(agent.parameters.profesional)) {
                        return getSpreadSheetData(`Medicos/Apellido/${agent.parameters.profesional}`).then(res => {
                            if (isSet(res.data.success) && res.data.success) {
                                let medico = res.data.data;
                                agent.add(`El profesional elegido no atiende en la fecha especificada. Recuerde que sus horarios de atención son:`);
                                agent.add(getMedicoInfo(medico));
                                agent.add(`Por favor, indique a continuación una fecha válida`);
                                agent.setContext({ 'name': 'UsuarioEligioProfesional', 'parameters': { 'MatriculaProfesional': medico.MatriculaProfesional } });
                            } else {
                                agent.add(`No se encontró ningún médico disponible con el Apellido elegido.`);
                            }
                        });
                    } else {
                        agent.add(`Lo siento, tiene que elegir un profesional`);
                    }
                }
            });
        } else {
            agent.add(`Lo siento, tiene que elegir un profesional`);
        }
    }

    function filtraObraSocialIndicaProfesional(agent) {
        //Si tiene Obra Social y Especialidad
        if (isSet(agent.parameters.ObraSocial) && isSet(agent.parameters.profesional)) {
            return getSpreadSheetData(`Medico/${agent.parameters.profesional}/ObraSocial/${agent.parameters.ObraSocial}`).then(res => {
                if (res.data.success) {
                    agent.add(`Los datos del profesional son los siguientes:`);
                    agent.add(getMedicoInfo(res.data.data));
                    agent.add(`A continuación, por favor indíqueme el día a consultar que le resultará más conveniente.`);
                } else {
                    agent.add(`Disculpe, no he comprendido a qué profesional se refiere. Asegúrese de indicar correctamente el nombre y/o apellido del profesional al que desea consultar`);
                    agent.setContext({
                        'name': 'UsuarioIngresaEspecialidad-FiltraObraSocial-followup',
                        'lifespan': 1,
                        'parameters': {
                            'profesional': agent.parameters.profesional,
                            'ObraSocial': agent.parameters.ObraSocial,
                        }
                    });
                }
            });
        } else {
            agent.add(`Lo siento, tiene que elegir un Profesional y una Obra Social`);
        }
    }

    function getListadoMedicosPorApellido(agent) {
        if (isSet(agent.parameters.profesional)) {
            return getSpreadSheetData(`Medicos/Apellido/${agent.parameters.profesional}`).then(res => {
                if (isSet(res.data.success) && res.data.success) {
                    let medico = res.data.data;
                    agent.add(`Los datos del profesional son los siguientes: `);
                    agent.add(getMedicoInfo(medico));
                    agent.add(`A continuación, por favor indíqueme el día a consultar que le resultará más conveniente.`);
                    // agent.setContext({ `name`: `UsuarioEligioProfesional`, `parameters`: { `MatriculaProfesional` : medico.MatriculaProfesional } });
                } else {
                    agent.add(`No se encontró ningún médico disponible con el Apellido elegido.`);
                }
            });
        }
    }

    function getListadoMedicosObraSocial(agent) {
        if (isSet(agent.parameters.ObraSocial) && isSet(agent.parameters.especialidad)) {
            agent.add(`Buscando médicos con Obra Social ${agent.parameters.ObraSocial}`);
            return getSpreadSheetData(`Medicos/ObraSocial/${agent.parameters.ObraSocial}/Especialidad/${agent.parameters.especialidad}`).then(res => {
                if (lengthOverZero(res.data.data)) {
                    agent.add(`Los profesionales de la especialidad ${agent.parameters.especialidad} que trabajan con la Obra Social ${agent.parameters.ObraSocial} son:`);
                    res.data.data.map(medico => {
                        agent.add(getMedicoInfo(medico));
                    });
                    agent.add(`A continuación, indique el nombre y/o apellido del profesional al que desea consultar.`);
                } else {
                    agent.add(`No se encontró ningún médico disponible para la Obra Social elegida`);
                }
            });
        } else {
            agent.add(`Lo siento, tiene que elegir una Obra Social`);
        }
    }

    function usuarioEligeTurno(agent) {
        if (isSet(agent.parameters.turno) && isSet(agent.parameters.date) && isSet(agent.parameters.profesional)) {
            return getSpreadSheetData(`Turno/${agent.parameters.turno}/Medico/${agent.parameters.profesional}/Fecha/${agent.parameters.date}`).then(res => {
                if (res.data.success) {
                    agent.add(`¡Muy bien! ¿Posee alguna de las Obras Sociales con las que trabaja el profesional? En caso de tenerla, por favor indíqueme a continuación cuál de ellas es.`);
                } else {
                    agent.add(`No encontré ningún turno con el número ingresado. Por favor, indíquemelo nuevamente.`);
                    agent.setContext({ 'name': "UsuarioEligeFecha-SiEligeTurno-followup", 'lifespan': 1, 'parameters': {} });
                }
            });
        } else {
            agent.add(`Lo siento, tiene que elegir un número de Turno`);
        }
    }

    function usuarioEligeTurnoPoseeOS(agent) {
        if (isSet(agent.parameters.ObraSocial) && isSet(agent.parameters.profesional)) {
            return getSpreadSheetData(`Medico/${agent.parameters.profesional}/ObraSocial/${agent.parameters.ObraSocial}`).then(res => {
                if (res.data.success) {
                    agent.add(`Excelente. Para poder completar el registro del turno es necesario identificarlo. ¿Podría indicarme a continuación cuál es su DNI, por favor?`);
                } else {
                    agent.add(`Lo siento, ${agent.parameters.profesional} no trabaja con dicha Obra Social. ¿Desea proseguir con el registro del turno como particular?`);
                }
            });
        } else {
            agent.add(`Lo siento, tiene que elegir una Obra Social y un profesional`);
        }
    }

    function getListadoFechasMedico(agent) {
        if (isSet(agent.parameters.especialidad) && isSet(agent.parameters.date)) {
            return getSpreadSheetData(`Medicos/Fecha/${agent.parameters.date}/Especialidad/${agent.parameters.especialidad}`).then(res => {
                if (lengthOverZero(res.data.data)) {
                    agent.add(`Los profesionales de la especialidad  ${agent.parameters.especialidad} disponibles en dicha fecha son: `);
                    res.data.data.map(medico => {
                        agent.add(getMedicoInfo(medico));
                    });
                    agent.add(`A continuación, indique el nombre y/o apellido del profesional al que desea consultar.`);
                } else {
                    agent.add(`No se encontró ningún médico disponible para la Fecha y Especialidad elegidas. ¿Puedo ayudarlo en algo más?`);
                }
            });
        } else {
            agent.add(`Ingrese nuevamente una Fecha.`);
        }
    }

    function usuarioIndicaDNI(agent) {
        return getSpreadSheetData(`Paciente/` + agent.parameters.dni).then(res => {
            if (res.data.success) {
                return getSpreadSheetData(`Paciente/${agent.parameters.dni}/Turno/${agent.parameters.turno}`).then(res => {
                    if (res.data.success) {
                        let registro = res.data.data;
                        let values = [
                            ["Ocupado", agent.parameters.dni]
                        ];
                        let range = `TurnosMedicos!H${registro.Fila}:G${registro.Fila}`;
                        updateValues(range, values);
                        agent.add(`¡Perfecto ${registro.Paciente}!`);
                        agent.add(`Su turno ha sido registrado con éxito. Recomiendo anotar la siguiente información para recordarlo el día de la consulta.`);
                        agent.add(`Fecha: ${registro.Fecha}`);
                        agent.add(`Hora: ${registro.HoraInicio}`);
                        agent.add(`Dr/a ${registro.ApellidoNombre}`);
                        agent.add(`Lugar: ${registro.Direccion}`);
                        agent.add(`Piso: ${registro.Piso}`);
                        agent.add(`Consultorio: ${registro.Consultorio}`);
                        agent.add(`Turno: ${registro.IdTurno}`);
                        agent.add(`¿Puedo ayudarte en algo más?`);
                    } else {
                        agent.add(`No se pudo asignar el Turno en este momento. Intente nuevamente`);
                    }
                });
            } else {
                agent.add(`He detectado que es su primera vez en la institución.`);
                agent.add(`Para poder completar el registro del turno será necesario registrarlo como paciente.`);
                agent.add(`Para ello, ingrese a continuación los siguientes datos personales:`);
                agent.add(`- Nombre y Apellido completo`);
                agent.add(`- teléfono`);
                agent.add(`- correo electrónico (opcional).`);
                if (isSet(agent.parameters.ObraSocial) && agent.parameters.ObraSocial !== "No Tiene") {
                    agent.add(`- Número de afiliado de Obra Social.`);
                }
            }
        });
    }

    function savePaciente(agent) {
        return getSpreadSheetData(`Paciente/${agent.parameters.dni}/Turno/${agent.parameters.turno}`).then(res => {
            if (res.data.success) {
                let registro = res.data.data;
                let fila = registro.Fila;
                let values = [
                    ["Ocupado", `${agent.parameters.dni}`]
                ];
                let range = `TurnosMedicos!H${fila}:G${fila}`;
                updateValues(range, values);

                values = [
                    [`${agent.parameters.dni}`, `${agent.parameters['last-name']} ${agent.parameters['given-name']}`, `${agent.parameters['phone-number']}`, agent.parameters.email, agent.parameters.ObraSocial, agent.parameters.afiliado]
                ];

                range = "Pacientes";
                updateValues(range, values, false);
                agent.add(`¡Perfecto ${agent.parameters['last-name']} ${agent.parameters['given-name']} !`);
                agent.add(`Su turno ha sido registrado con éxito. Recomiendo anotar la siguiente información para recordarlo el día de la consulta.`);
                agent.add(`Fecha: ${registro.Fecha}`);
                agent.add(`Hora: ${registro.HoraInicio}`);
                agent.add(`Dr/a ${registro.ApellidoNombre}`);
                agent.add(`Lugar: ${registro.Direccion}`);
                agent.add(`Piso: ${registro.Piso}`);
                agent.add(`Consultorio: ${registro.Consultorio}`);
                agent.add(`Turno: ${registro.IdTurno}`);
                agent.add(`¿Puedo ayudarte en algo más?`);
            } else {
                agent.add(`No se pudo asignar el turno, intente nuevamente.`);
            }
        });
    }

    function turnosDePacienteCancelacion(agent) {
        //Si tiene fecha y profesional
        if (isSet(agent.parameters.dni)) {
            return getSpreadSheetData(`Paciente/${agent.parameters.dni}/Turnos`).then(res => {
                if (lengthOverZero(res.data.data)) {
                    agent.add(`Los turnos registrados hasta el momento son:`);
                    res.data.data.map(turno => {
                        agent.add(`${turno.IdTurno} - ${turno.Fecha} | ${turno.HoraInicio} - ${turno.ApellidoNombre} - ${turno.Especialidad} - ${turno.Sede}`);
                    });
                    agent.add(`Indique el número de turno que desea cancelar`);
                } else {
                    agent.add(`No posee turnos a cancelar ¿Puedo ayudarte en algo más?`);
                }
            });
        } else {
            agent.add(`Lo siento, tiene que ingresar un DNI`);
        }
    }

    function turnosDePacienteConsulta(agent) {
        //Si tiene fecha y profesional
        if (isSet(agent.parameters.dni)) {
            return getSpreadSheetData(`Paciente/${agent.parameters.dni}/Turnos`).then(res => {
                if (lengthOverZero(res.data.data)) {
                    agent.add(`Los turnos registrados hasta el momento son:`);
                    res.data.data.map(turno => {
                        agent.add(`${turno.IdTurno} - ${turno.Fecha} | ${turno.HoraInicio} - ${turno.ApellidoNombre} - ${turno.Especialidad} - ${turno.Sede}`);
                    });
                    agent.add(`¿Puedo ayudarte en algo más?`);
                } else {
                    agent.add(`No posee turnos ¿Puedo ayudarte en algo más?`);
                }
            });
        } else {
            agent.add(`Lo siento, tiene que ingresar un DNI`);
        }
    }

    function cancelarTurno(agent) {
        return getSpreadSheetData(`Paciente/${agent.parameters.dni}/Turno/${agent.parameters.turno}/cancelar`).then(res => {
            if (isSet(res.data.data.Fila)) {
                let fila = res.data.data.Fila;
                let values = [
                    ["Disponible", ""]
                ];
                let range = `TurnosMedicos!H${fila}:G${fila}`;
                updateValues(range, values);

                agent.add(`¡Perfecto!`);
                agent.add(`Su turno ha sido cancelado con éxito.`);
                agent.add(`¿Puedo ayudarte en algo más?`);
            } else {
                agent.add(`No se pudo cancelar el turno, intente nuevamente.`);
            }
        });
    }


    function fallback(agent) {
        agent.add(`No te entendí`);
        agent.add(`Disculpa, puedes intentar de nuevo?`);
    }

    // Run the proper function handler based on the matched Dialogflow intent name
    let intentMap = new Map();
    intentMap.set(`UsuarioPideTurno`, usuarioPideTurno);
    intentMap.set(`UsuarioIngresaEspecialidad`, usuarioIngresaEspecialidad);
    intentMap.set(`UsuarioIngresaEspecialidad-ListadoCompleto`, getListadoMedicosDeEspecialidad);
    intentMap.set(`UsuarioIngresaEspecialidad-ListadoCompleto-IndicaProfesional`, listadoCompletoIndicaProfesional);
    intentMap.set(`UsuarioIngresaEspecialidad-FiltraFecha-IndicaProfesional`, filtraFechaIndicaProfesional);
    intentMap.set(`UsuarioIngresaEspecialidad-FiltraProfesional`, getListadoMedicosPorApellido);
    intentMap.set(`UsuarioIngresaEspecialidad-FiltraFecha`, getListadoFechasMedico);
    intentMap.set(`UsuarioIngresaEspecialidad-FiltraObraSocial`, getListadoMedicosObraSocial);
    intentMap.set(`UsuarioIngresaEspecialidad-FiltraObraSocial-IndicaProfesional`, filtraObraSocialIndicaProfesional);
    intentMap.set(`UsuarioEligeFecha`, usuarioEligeFecha);
    intentMap.set(`UsuarioIndicaDNI`, usuarioIndicaDNI);
    intentMap.set(`UsuarioEligeTurno`, usuarioEligeTurno);
    intentMap.set(`UsuarioEligeTurno-PoseeObraSocial`, usuarioEligeTurnoPoseeOS);
    intentMap.set(`UsuarioRegistro`, savePaciente);
    intentMap.set(`UsuarioPideCancelarTurno-VerificaTurnos`, turnosDePacienteCancelacion);
    intentMap.set(`UsuarioPideCancelarTurno-VerificaTurnos-IndicaTurno`, cancelarTurno);
    intentMap.set(`UsuarioPideConsultarTurno-VisualizaTurno`, turnosDePacienteConsulta);
    intentMap.set(`Default Fallback Intent`, fallback);
    agent.handleRequest(intentMap);
});
