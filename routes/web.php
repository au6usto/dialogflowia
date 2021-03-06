<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    return view('welcome');
});

Auth::routes();

Route::get('/sheet/{sheetId}', 'GoogleSheetsController@getSpreadSheet');
Route::get('/Paciente/{dni}/Turno/{IdTurno}/cancelar', 'GoogleSheetsController@cancelarTurno');
Route::get('/Paciente/{dni}/Turno/{IdTurno}', 'GoogleSheetsController@storePaciente');
Route::get('/Paciente/{dni}/Turnos', 'GoogleSheetsController@getTurnosPaciente');
Route::get('/Paciente/{dni}', 'GoogleSheetsController@getPaciente');
Route::get('/MedicosEspecialidad/{especialidad}', 'GoogleSheetsController@getMedicosEspecialidad');
Route::get('/Medicos/Turnos/{idMedico}', 'GoogleSheetsController@getTurnosMedico');
Route::get('/Turnos/Fecha/{fecha}/Medico/{IdMedico}', 'GoogleSheetsController@getTurnosFechaMedico');
Route::get('/Medicos/Fecha/{fecha}/Especialidad/{especialidad}', 'GoogleSheetsController@getMedicosFechaEspecialidad');
Route::get('/Turnos/Fecha/{fecha}', 'GoogleSheetsController@getTurnosFechaMedico');
Route::get('/Turnos/Apellido/{apellido}/Fecha/{fecha}', 'GoogleSheetsController@getTurnosApellidoFecha');
Route::get('/Turnos/Fecha/{anio}/{mes}/{dia}', 'GoogleSheetsController@getTurnosFecha');
Route::get('/Medicos/Fecha/{fecha}', 'GoogleSheetsController@getMedicosFecha');
Route::get('/Medicos/ObraSocial/{obraSocial}/Especialidad/{especialidad}', 'GoogleSheetsController@getMedicosObraSocial');
Route::get('/Medico/{apellido}/ObraSocial/{obraSocial}', 'GoogleSheetsController@isObraSocialDeMedico');
Route::get('/Medicos/Apellido/{apellido}', 'GoogleSheetsController@getMedicosApellido');
Route::get('/Turnos/ObraSocial/{obraSocial}', 'GoogleSheetsController@getTurnosObraSocial');
Route::get('/Turno/{IdTurno}/Medico/{apellido}/Fecha/{fecha}', 'GoogleSheetsController@isTurnoMedicoFecha');
Route::get('/Turno/{IdTurno}', 'GoogleSheetsController@isTurno');
Route::get('/home', 'HomeController@index')->name('home');
