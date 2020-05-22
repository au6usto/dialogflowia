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

        // $header = $sheets->pull(0);

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
        return $this->getSheetsData($sheetId)->firstWhere('Dni', $dni);
    }

    public function getMedicosEspecialidad($especialidad)
    {
        $sheetId = 'Medicos';
        return $this->getSheetsData($sheetId)->where('Especialidad', $especialidad);
    }

    public function getTurnosMedico($idMedico)
    {
        $sheetId = 'TurnosMedicos';
        return $this->getSheetsData($sheetId)->where('IdMedico', $idMedico);
    }

    public function storePaciente(Request $request)
    {
        $datos = $request->all();
        
        //Registro paciente
        $pacientes = $this->getSheetsData('Pacientes'd);
        $paciente = $pacientes->firstWhere('DNI', $datos['dni']);
        if (!$paciente) {
            $IdPaciente = $pacientes->first() + 1;
            $paciente = [
                'IdPaciente' => $IdPaciente,
                'Dni' => $datos['Dni'],
                'Apellido' => $datos['Apellido'],
                'Nombre' => $datos['Nombre'],
                'Telefono' => $datos['Telefono'],
                'Correo' => $datos['Correo'],
                'ObraSocial' => $datos['ObraSocial'],
                'NroAfiliado' => $datos['NroAfiliado'],
             ];
            Sheets::spreadsheet($this->spreadSheetId)
              ->sheetById('Pacientes')
              ->append([$paciente]);
        } else {
            $IdPaciente = $pacientes->firstWhere('DNI', $datos['dni'])['IdPaciente'];
        }

        $turnos = $this->getSheetsData('TurnosMedicos')->all();
        foreach ($turnos as $turno) {
            if ((int) $turno['IdTurno'] === (int) $datos['IdTurno']) {
                $turno['Estado'] = 'Ocupado';
                $turno['IdPaciente'] = $IdPaciente;
            }
        }

        //registro turno
        Sheets::spreadsheet($this->spreadSheetId)
              ->sheetById('TurnosMedicos')
              ->update([$turnos]);
    }

    // public function appendDataSheet(Request $request)
    // {
    //     $sheetId = 'TurnosMedicosAsignados';

    //     $datos = $request->all();
    //     $paciente = [
    //       'IdTurno' => 2,
    //       'DNI' => $datos['dni'],
    //       'Apellido' => $datos['apellido'],
    //       'Nombre' => $datos['name'],
    //       'Obra Social' => $datos['obraSocial'],
    //       'Medico' => $datos['medico'],
    //       'turno' => $datos['turno'],
    //       'dia' => $datos['dia'],
    //       'hora' => $datos['hora'],
    //       'Sala' => $datos['sala'],
    //       'Consultorio' => $datos['consultorio']

    //    ];

    //     Sheets::spreadsheet($this->spreadSheetId)
    //           ->sheetById($sheetId)
    //           ->append([$paciente]);
    // }
}
