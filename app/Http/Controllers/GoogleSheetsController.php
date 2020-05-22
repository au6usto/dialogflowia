<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Sheets;

class GoogleSheetsController extends Controller
{
    private $spreadSheetId = '1xaORRQBAxi4Mly_9yccQvgc2KBVpdMWAJTRBkcXRrMI';

    public function getSheetsData($sheetId)
    {
        $sheets = Sheets::spreadsheet($this->spreadSheetId)
          ->sheet($sheetId)
          ->get();

        $header = $sheets->pull(0);

        $rows = Sheets::collection($header, $sheets);

        return $rows->reverse()->take(10);
    }

    public function getSpreadSheet($sheetId)
    {
        return $this->getSheetsData($sheetId);
    }

    public function getPaciente($dni)
    {
        $sheetId = 'Pacientes';
        $pacientes = collect($this->getSheetsData($sheetId));
        return $pacientes->where('Dni', $dni)->first();
    }

    public function appendDataSheet(Request $request)
    {
        $sheetId = 'TurnosMedicosAsignados';

        $datos = $request->all();
        $paciente = [
          'IdTurno' = 2, 
          'DNI' => $datos['dni'],
          'Apellido' => $datos['apellido'],
          'Nombre' => $datos['name'],
          'Obra Social' => $datos['obraSocial'],
          'Medico' => $datos['medico'],
          'turno' => $datos['turno'],
          'dia' => $datos['dia'],
          'hora' => $datos['hora'],
          'Sala' => $datos['sala'],
          'Consultorio' => $datos['consultorio']

       ];

        Sheets::spreadsheet($this->spreadSheetId)
              ->sheetById($sheetId)
              ->append([$paciente]);
    }
}
