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
Route::get('/Paciente/{dni}', 'GoogleSheetsController@getPaciente');
Route::post('/Paciente', 'GoogleSheetsController@storePaciente');
Route::get('/MedicosEspecialidad/{especialidad}', 'GoogleSheetsController@getMedicosEspecialidad');
Route::get('/Turnos/Medico/{idMedico}', 'GoogleSheetsController@getTurnosMedico');
Route::get('/home', 'HomeController@index')->name('home');
